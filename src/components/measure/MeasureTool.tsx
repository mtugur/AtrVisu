import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { MeasureAction, MeasureAuthority } from "../../measure/measureAuthority";
import { getMeasureResult } from "../../measure/measureAuthority";
import { areaResult, formatMeasureValue, type MeasureKind } from "../../measure/measureGeometry";
import { WorkbenchActionButton } from "../workbench/WorkbenchActionButton";
import { placeMeasureCallout, type MeasureSafeArea } from "../../measure/measurePresentation";
export function MeasureTool({ authority, onAction, safeInsets = { left: 0, right: 0 }, bottomSheetOpen = false }: {
    authority: MeasureAuthority;
    onAction: (action: MeasureAction) => void;
    safeInsets?: MeasureSafeArea;
    bottomSheetOpen?: boolean;
}) {
    const s = useSyncExternalStore(authority.subscribe, authority.getSnapshot, authority.getSnapshot);
    const projection = useSyncExternalStore(authority.subscribeProjection, authority.getProjection, authority.getProjection);
    const sectionRef = useRef<HTMLElement>(null), svgRef = useRef<SVGSVGElement>(null);
    const [calloutHeight, setCalloutHeight] = useState<number>();
    const active = Boolean(s);
    useEffect(() => {
        if (!active || !sectionRef.current || !svgRef.current)
            return;
        const section = sectionRef.current, svg = svgRef.current;
        const update = () => setCalloutHeight(Math.max(20, section.getBoundingClientRect().top - svg.getBoundingClientRect().top - 8));
        update();
        const observer = new ResizeObserver(update);
        observer.observe(section);
        observer.observe(svg);
        return () => observer.disconnect();
    }, [active, safeInsets.left, safeInsets.right, bottomSheetOpen]);
    if (!s)
        return null;
    const result = getMeasureResult(s);
    // A bottom sheet can leave less room than the callouts occupy. The full
    // numeric readout stays visible in the tool instead of stacking duplicates
    // over the HUD or each other. This never moves engineering geometry.
    const labels = projection.lines.filter(line => line.label && line.points.length > 1);
    const floatingLabelsFit = (calloutHeight ?? projection.height) >= labels.length * 48 + 40;
    const dimensionsReason = getMeasureResult({ ...s, kind: "dimensions" }).reason;
    const pairReason = getMeasureResult({ ...s, kind: "pair" }).reason;
    return <div className="measure-layer" data-editor-only="true">
    <svg ref={svgRef} className="measure-graphics" viewBox={`0 0 ${Math.max(1, projection.width)} ${Math.max(1, projection.height)}`} aria-label="Measure viewport graphics" data-testid="measure-graphics">
      {projection.lines.filter(line => line.points.every(p => Number.isFinite(p.x) && Number.isFinite(p.y))).map((line, i) => <g key={i} className={line.preview ? "is-preview" : undefined}>
        <polyline points={line.points.map(p => `${p.x},${p.y}`).join(" ")}/>
        {floatingLabelsFit && line.label && line.points.length > 1 ? (() => {
                const anchor = { x: (line.points[0].x + line.points[1].x) / 2, y: (line.points[0].y + line.points[1].y) / 2 - 8 };
                const width = Math.min(200, Math.max(0, projection.width - safeInsets.left - safeInsets.right - 24));
                const label = placeMeasureCallout(anchor, projection.width, calloutHeight ?? projection.height, safeInsets, width);
                const labelIndex = labels.indexOf(line);
                const y = Math.max(20 + labelIndex * 48, Math.min(label.y - 14, (calloutHeight ?? projection.height) - (labels.length - labelIndex) * 48));
                return <foreignObject x={label.x} y={y} width={width} height="48"><div className="measure-callout">{line.label}</div></foreignObject>;
            })() : null}
      </g>)}
      {projection.markers.map((p, i) => {
            const label = placeMeasureCallout({ x: p.x + 8, y: p.y - 8 }, projection.width, calloutHeight ?? projection.height, safeInsets, 90);
            const status = p.offscreen ? "offscreen" : p.occluded ? "occluded" : label.displaced ? "leader" : "";
            return <g key={i} className={p.preview ? "is-preview" : undefined} data-point-status={status || "visible"}>
          {!p.offscreen && <circle cx={p.x} cy={p.y} r="4"/>}
          {label.displaced && !p.offscreen && <polyline points={`${p.x},${p.y} ${label.x},${label.y}`}/>}
          <text x={label.x} y={label.y}>{p.label}{status ? ` (${status})` : ""}</text>
        </g>;
        })}
    </svg>
    <section ref={sectionRef} className="measure-tool" data-testid="measure-tool" aria-label="Measure" tabIndex={-1}>
      <header><strong>Measure</strong><span>{s.completed ? "Confirmed" : "Preview"}</span><WorkbenchActionButton iconId="close" label="Exit Measure" onClick={() => onAction({ type: "exit" })}/></header>
      <div className="measure-controls">
        <label>Kind<select aria-label="Measurement kind" value={s.kind} onChange={e => onAction({ type: "kind", kind: e.target.value as MeasureKind })}>
          <option value="distance">Distance</option><option value="angle">Angle</option><option value="area">Plan Area / Perimeter</option><option value="dimensions" title={dimensionsReason} disabled={Boolean(dimensionsReason)}>Selected Entity Dimensions</option><option value="pair" title={pairReason} disabled={Boolean(pairReason)}>Entity Pair Reference</option>
        </select></label>
        <div role="group" aria-label="Measure input mode" className="measure-segmented">{(["pick", "navigate"] as const).map(mode => <button key={mode} type="button" aria-pressed={s.mode === mode} onClick={() => onAction({ type: "mode", mode })}>{mode === "pick" ? "Pick" : "Navigate"}</button>)}</div>
        {!["dimensions", "pair"].includes(s.kind) ? <label>Source<select aria-label="Measurement point source" value={s.source} onChange={e => onAction({ type: "source", source: e.target.value as "geometry" | "level-plane" })}><option value="geometry">Geometry</option><option value="level-plane">Level Plane</option></select></label> : null}
        <WorkbenchActionButton iconId="reset" label="Restart Measure" onClick={() => onAction({ type: "restart" })}/>
        {s.kind === "area" ? <button type="button" disabled={s.completed || Boolean(areaResult(s.points).reason)} onClick={() => onAction({ type: "finish" })}>Finish</button> : null}
      </div>
      {dimensionsReason && pairReason ? <div className="measure-source">Entry selection does not support Dimensions or Pair Reference.</div> : null}
      <div className="measure-source" data-testid="measure-source">{s.source === "level-plane" ? s.level ? `${s.level.name} | FFL ${s.level.elevationMm.toFixed(3)} mm` : "Level Plane unavailable" : "Geometry | actual world surface"}{s.kind === "area" && s.presentationElevationMm !== undefined ? ` | Plan presentation Z ${s.presentationElevationMm.toFixed(3)} mm` : ""}</div>
      {["dimensions", "pair"].includes(s.kind) ? <div>{s.entry.entities.map(e => e.name).join(" / ")}{s.kind === "pair" ? " | Reference Point (not surface clearance)" : " | Canonical local dimensions"}</div> : null}
      <dl className="measure-values" data-testid="measure-values">{result.values.map((v, i) => <div key={`${v.label}-${i}`}><dt>{v.label}</dt><dd>{formatMeasureValue(v)}</dd></div>)}</dl>
      <div role="status" className="measure-reason">{s.reason ?? result.reason ?? `${s.points.length} confirmed point${s.points.length === 1 ? "" : "s"}`}</div>
    </section>
  </div>;
}
