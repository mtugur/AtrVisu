import { useSyncExternalStore } from "react";
import type { AnnotationObject } from "../../types/annotations";
import type { LayoutLevel } from "../../types/levels";
import type { PlatformEntity } from "../../platform/contracts";
import type { MeasureAction, MeasureAuthority } from "../../measure/measureAuthority";
import { getActiveMeasureDimensionGroup, getMeasureDimensionGroups, getMeasureResult } from "../../measure/measureAuthority";
import { getDimensionResult, resolveDimensionReferences, resolveMeasureReference, MEASURE_ANCHOR_LABELS } from "../../measure/measureReferences";
import { cloneMeasureDimensionStyle, type MeasureAnchorKind, type MeasureDimensionStyle, type MeasureReference } from "../../measure/referenceTypes";
import { formatMeasureValue, type MeasureKind, type MeasurePoint } from "../../measure/measureGeometry";
import { WorkbenchActionButton } from "../workbench/WorkbenchActionButton";
import { MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX } from "../../measure/measurePresentation";
import { formatDimensionValue } from "../../measure/dimensionPresentation";

export type MeasureToolProps = {
  authority: MeasureAuthority;
  onAction: (action: MeasureAction) => void;
  annotations: readonly AnnotationObject[];
  entities: readonly PlatformEntity[];
  levels: readonly LayoutLevel[];
  onKeep: () => void;
  onRenameDimension: (annotationId: string, name: string) => void;
  onSetDimensionVisibility: (annotationId: string, visible: boolean) => void;
  onSetAllDimensionVisibility: (visible: boolean) => void;
  onDeleteDimension: (annotationId: string) => void;
  onUpdateDimensionStyle: (annotationId: string, style: Partial<MeasureDimensionStyle>) => void;
  onUpdateDimensionReference: (annotationId: string, index: number, reference: MeasureReference) => void;
};

const anchorKinds = Object.keys(MEASURE_ANCHOR_LABELS) as MeasureAnchorKind[];
const kindLabels: Record<string, string> = { distance: "Distance", angle: "Angle", area: "Plan Area", dimensions: "Entity Dimensions", pair: "Entity Pair Reference" };

const referenceLabel = (reference: MeasureReference) => {
  if (reference.type === "entity-anchor") return MEASURE_ANCHOR_LABELS[reference.anchor] ?? reference.anchor;
  if (reference.type === "level-point") return "Level " + reference.levelId;
  return "World (" + reference.xMm.toFixed(0) + ", " + reference.yMm.toFixed(0) + ", " + reference.zMm.toFixed(0) + ")";
};

function PointReference({ point, index, confirmed, entities, saved = false }: { point: MeasurePoint; index: number; confirmed: boolean; entities: readonly PlatformEntity[]; saved?: boolean }) {
  const name = entities.find(entity => entity.id === point.entityId)?.name;
  const source = point.anchorKind ? `${MEASURE_ANCHOR_LABELS[point.anchorKind]} (${point.anchorKind})`
    : point.levelId ? `Level ${point.levelId}` : "Free Geometry Hit";
  return <section className="measure-point-reference" aria-label={`${saved ? "Saved " : ""}Reference ${String.fromCharCode(65 + index)} ${confirmed ? "confirmed" : "preview"}`}>
    <strong>{String.fromCharCode(65 + index)} · {confirmed ? "Confirmed" : "Preview"}</strong>
    {point.entityId ? <span>{name ?? "Unavailable entity"} <small>{point.entityId}</small></span> : null}
    <span>{source}</span>
    <dl>{(["X", "Y", "Z"] as const).map((axis, i) => {
      const value = [point.xMm, point.yMm, point.zMm][i];
      return <div key={axis}><dt>World {axis}</dt><dd><data value={value}>{value.toFixed(3)} mm</data></dd></div>;
    })}</dl>
  </section>;
}

function ReferenceEditor({ reference, index, entities, levels, onChange }: {
  reference: MeasureReference; index: number; entities: readonly PlatformEntity[]; levels: readonly LayoutLevel[];
  onChange: (reference: MeasureReference) => void;
}) {
  const label = `Reference ${String.fromCharCode(65 + index)}`;
  const eligible = entities.filter(entity => entity.type === "machine" || entity.type === "civil");
  const point = resolveMeasureReference(reference, entities, levels);
  return <div><div className="measure-reference-row">
    <span>{String.fromCharCode(65 + index)}</span>
    <select aria-label={`${label} type`} value={reference.type} onChange={event => {
      if (event.target.value === "entity-anchor" && eligible[0]) onChange({ type: "entity-anchor", entityId: eligible[0].id, anchor: "front-left-bottom" });
      if (event.target.value === "level-point" && point && levels[0]) onChange({ type: "level-point", levelId: levels[0].id, xMm: point.xMm, yMm: point.yMm });
      if (event.target.value === "world-point" && point) onChange({ type: "world-point", xMm: point.xMm, yMm: point.yMm, zMm: point.zMm });
    }}>
      <option value="entity-anchor" disabled={!eligible.length}>Entity anchor</option>
      <option value="level-point" disabled={!point || !levels.length}>Level point</option>
      <option value="world-point" disabled={!point}>World point</option>
    </select>
    {reference.type === "entity-anchor" ? <>
      <select aria-label={`${label} entity`} value={reference.entityId} onChange={event => onChange({ ...reference, entityId: event.target.value })}>
        {!eligible.some(entity => entity.id === reference.entityId) ? <option value={reference.entityId}>Unavailable: {reference.entityId}</option> : null}
        {eligible.map(entity => <option key={entity.id} value={entity.id}>{entity.name}</option>)}
      </select>
      <select aria-label={`${label} anchor`} value={reference.anchor} onChange={event => onChange({ ...reference, anchor: event.target.value as MeasureAnchorKind })}>
        {anchorKinds.map(anchor => <option key={anchor} value={anchor}>{MEASURE_ANCHOR_LABELS[anchor]}</option>)}
      </select>
    </> : reference.type === "level-point" ? <select aria-label={`${label} Level`} value={reference.levelId} onChange={event => onChange({ ...reference, levelId: event.target.value })}>
      {!levels.some(level => level.id === reference.levelId) ? <option value={reference.levelId}>Unavailable: {reference.levelId}</option> : null}
      {levels.map(level => <option key={level.id} value={level.id}>{level.name}</option>)}
    </select> : <span className="measure-reference-readonly">{referenceLabel(reference)}</span>}
  </div>{point ? <PointReference point={{ ...point, ...(reference.type === "entity-anchor" ? { entityId: reference.entityId, anchorKind: reference.anchor } : {}) }} index={index} confirmed entities={entities} saved /> : null}</div>;
}

export function MeasureTool({ authority, onAction, annotations, entities, levels, onKeep, onRenameDimension, onSetDimensionVisibility, onSetAllDimensionVisibility, onDeleteDimension, onUpdateDimensionStyle, onUpdateDimensionReference }: MeasureToolProps) {
  const session = useSyncExternalStore(authority.subscribe, authority.getSnapshot, authority.getSnapshot);
  const projection = useSyncExternalStore(authority.subscribeProjection, authority.getProjection, authority.getProjection);
  const lockedAnchor = projection.lockedAnchor;
  const selectedDimensionId = useSyncExternalStore(authority.subscribe, authority.getSelectedDimensionId, authority.getSelectedDimensionId);
  const saved = annotations.filter((annotation) => Boolean(annotation.dimension));
  const selected = saved.find((annotation) => annotation.id === selectedDimensionId);
  const selectedDimension = selected?.dimension;
  const sessionResult = session ? getMeasureResult(session) : null;
  const activeGroup = session ? getActiveMeasureDimensionGroup(session) : undefined;
  const canKeep = Boolean(session?.completed && sessionResult && !sessionResult.reason && sessionResult.values.length > 0);
  const resolved = selectedDimension ? resolveDimensionReferences(selectedDimension, entities, levels) : null;
  const selectedResult = selected ? getDimensionResult(selected, entities, levels) : null;
  const style = selectedDimension?.style ?? cloneMeasureDimensionStyle();
  const areaPlane = selectedDimension?.dimensionKind === "area" && selectedDimension.presentationElevationMm !== undefined
    ? {
        source: selectedDimension.presentationSource ?? (selectedDimension.references.every(reference => reference.type === "level-point") ? "level-plane" : "geometry"),
        elevationMm: selectedDimension.presentationElevationMm
      }
    : null;

  return (
    <section className="measure-panel" data-testid="measure-panel" aria-label="Measure">
      <header className="measure-panel-header"><div><span>Engineering Tool</span><h2>Measure</h2></div><WorkbenchActionButton iconId="close" label="Exit Measure" onClick={() => onAction({ type: "exit" })} /></header>
      <section className="measure-session-card" aria-label="Measure Session">
        <div className="measure-panel-section-title"><strong>Measure Session</strong><span>{session ? (session.completed ? "Completed" : "Active") : "Inactive"}</span></div>
        {session ? (
          <>
            <div className="measure-session-layout" data-kind={session.kind} data-source={session.source}>
            <div className="measure-session-inputs">
            <div className="measure-panel-controls">
              <label>Kind<select aria-label="Measurement kind" value={session.kind} onChange={(event) => onAction({ type: "kind", kind: event.target.value as MeasureKind })}>
                <option value="distance">Distance</option><option value="angle">Angle</option><option value="area">Plan Area / Perimeter</option><option value="dimensions">Selected Entity Dimensions</option><option value="pair">Entity Pair Reference</option>
              </select></label>
              <label>Source<select aria-label="Measurement point source" value={session.source} disabled={session.kind === "dimensions" || session.kind === "pair"} onChange={(event) => onAction({ type: "source", source: event.target.value as "geometry" | "level-plane" })}><option value="geometry">Geometry</option><option value="level-plane">Level Plane</option></select></label>
              <label>Reference<select aria-label="Measurement reference mode" value={session.snapMode} disabled={session.kind === "dimensions" || session.kind === "pair"} onChange={(event) => onAction({ type: "snapMode", snapMode: event.target.value as "semantic" | "free" })}><option value="semantic">Semantic Anchors</option><option value="free">Free Geometry Hit</option></select></label>
            </div>
            <div className="measure-segmented" role="group" aria-label="Measure input mode"><button type="button" aria-pressed={session.mode === "pick"} onClick={() => onAction({ type: "mode", mode: "pick" })}>Pick</button><button type="button" aria-pressed={session.mode === "navigate"} onClick={() => onAction({ type: "mode", mode: "navigate" })}>Navigate</button></div>
            <div className="measure-panel-actions"><button type="button" onClick={() => onAction({ type: "restart" })}>Restart</button>{session.kind === "area" ? <button type="button" onClick={() => onAction({ type: "finish" })}>Finish</button> : null}<button type="button" className="measure-keep-button" disabled={!canKeep} aria-describedby={session.kind === "dimensions" && activeGroup ? "measure-keep-active-entity" : undefined} onClick={onKeep}>Keep / Save</button>{session.kind === "dimensions" && activeGroup ? <span id="measure-keep-active-entity">Active: {activeGroup.name}</span> : null}</div>
            <div className="measure-session-summary"><span>{session.source === "level-plane" ? (session.level ? session.level.name + " | FFL " + session.level.elevationMm.toFixed(3) + " mm" : "Level Plane unavailable") : "Geometry / semantic surface reference"}</span>{session.hover?.anchorKind ? <span>Snap: {MEASURE_ANCHOR_LABELS[session.hover.anchorKind]}</span> : null}{session.reason ? <span>{session.reason}</span> : null}</div>
            </div>
            <div className="measure-session-readout">
            {!["dimensions", "pair"].includes(session.kind) ? <div className="measure-point-references">
              {session.points.map((point, index) => <PointReference key={index} point={point} index={index} confirmed entities={session.entityCatalog} />)}
              {!session.completed && session.hover ? <PointReference point={session.hover} index={session.points.length} confirmed={false} entities={session.entityCatalog} /> : null}
            </div> : null}
            {session.kind === "dimensions" ? <div className="measure-entity-results" aria-label="Selected entity dimensions">
              {getMeasureDimensionGroups(session).map(group => <section key={group.id} aria-label={`Dimensions ${group.name}`}>
                <button type="button" aria-pressed={group.id === activeGroup?.id} disabled={!group.eligible} onClick={() => onAction({ type: "activeDimensionEntity", entityId: group.id })}>{group.name}</button>
                <small>{group.id}</small>
                {group.result.reason ? <p role="status">{group.result.reason}</p> : <dl className="measure-values">{group.result.values.map(value => <div key={value.label}><dt>{value.label}</dt><dd>{formatMeasureValue(value)}</dd></div>)}</dl>}
              </section>)}
            </div> : null}
            {session.lockedReference ? <section className="measure-locked-reference" aria-label="Locked Anchor">
              <strong>{lockedAnchor?.entityName ?? session.lockedReference.entityId}</strong>
              <span>{MEASURE_ANCHOR_LABELS[session.lockedReference.anchor] ?? session.lockedReference.anchor}</span>
              <span>{lockedAnchor?.point ? `${lockedAnchor.point.xMm.toFixed(3)}, ${lockedAnchor.point.yMm.toFixed(3)}, ${lockedAnchor.point.zMm.toFixed(3)} mm` : "Reference unavailable"}</span>
              <span role="status">{lockedAnchor?.reason ?? "Not currently visible"}</span>
              <button type="button" disabled={!lockedAnchor?.confirmable} onClick={() => onAction({ type: "confirmLockedAnchor" })}>Confirm Locked Anchor</button>
            </section> : null}
            {sessionResult?.reason ? <p role="status">{sessionResult.reason}</p> : null}
            {sessionResult && session.kind !== "dimensions" ? <dl className="measure-values">{sessionResult.values.map((value, index) => <div key={value.label + "-" + index}><dt>{value.label}</dt><dd>{formatMeasureValue(value)}</dd></div>)}</dl> : null}
            </div>
            </div>
          </>
        ) : <p className="measure-panel-empty">Start Measure from the View command, Quick Toolbar or Command Palette.</p>}
      </section>
      <section className="measure-saved-section" aria-label="Reference Dimensions">
        <div className="measure-panel-section-title"><strong>Reference Dimensions</strong><span>{saved.length}</span></div>
        <div className="measure-panel-actions"><button type="button" disabled={!saved.length} onClick={() => onSetAllDimensionVisibility(true)}>Show All</button><button type="button" disabled={!saved.length} onClick={() => onSetAllDimensionVisibility(false)}>Hide All</button></div>
<div className="measure-dimension-list">{saved.length === 0 ? <p className="measure-panel-empty">No saved dimensions.</p> : saved.map((annotation) => { const dimension = annotation.dimension!; const result = getDimensionResult(annotation, entities, levels); const orphaned = result.reason?.includes("reference") || dimension.status === "orphaned"; return <button key={annotation.id} type="button" className={"measure-dimension-list-item" + (selected?.id === annotation.id ? " is-selected" : "")} onClick={() => { if (!session) onAction({ type: "toggle" }); authority.selectDimension(annotation.id); }}><span><strong>{dimension.name}</strong><small>{kindLabels[dimension.dimensionKind]}</small></span><span>{orphaned ? "Orphaned" : dimension.visible === false ? "Hidden" : result.values[0] ? formatDimensionValue(result.values[0], dimension.style) : "—"}</span></button>; })}</div>
      </section>
      {selected && selectedDimension ? (
        <section className="measure-dimension-editor" aria-label="Reference Dimension Editor">
          <div className="measure-panel-section-title"><strong>Selected Dimension</strong><span>{resolved?.orphaned ? "Orphaned" : "Healthy"}</span></div>
          <label>Name<input value={selectedDimension.name} onChange={(event) => onRenameDimension(selected.id, event.target.value)} /></label>
          <div className="measure-reference-editor"><strong>References</strong>{selectedDimension.references.map((reference, index) => <ReferenceEditor key={index} reference={reference} index={index} entities={entities} levels={levels} onChange={next => onUpdateDimensionReference(selected.id, index, next)} />)}</div>
          {areaPlane ? <dl className="measure-values"><div><dt>Captured Plane</dt><dd>{areaPlane.source === "level-plane" ? "Level Plane" : "Geometry"} | {areaPlane.elevationMm.toFixed(3)} mm</dd></div></dl> : null}
          <div className="measure-style-editor"><strong>Dimension Style</strong><label>Font <input value={style.fontFamily} onChange={(event) => onUpdateDimensionStyle(selected.id, { fontFamily: event.target.value })} /></label><label>Text Mode<select aria-label="Text Mode" value={style.textSizeMode} onChange={(event) => onUpdateDimensionStyle(selected.id, { textSizeMode: event.target.value as "adaptive" | "fixed" })}><option value="adaptive">Adaptive</option><option value="fixed">Fixed</option></select></label><div className="measure-style-grid"><label>Min px<input type="number" min="6" max="64" step="1" value={style.adaptiveMinTextPx} onChange={(event) => onUpdateDimensionStyle(selected.id, { adaptiveMinTextPx: Number(event.target.value) })} /></label><label>Max px<input type="number" min="8" max="96" step="1" value={style.adaptiveMaxTextPx} onChange={(event) => onUpdateDimensionStyle(selected.id, { adaptiveMaxTextPx: Number(event.target.value) })} /></label><label>Line px<input type="number" min="1" max="8" step="0.5" value={style.lineWeightPx} onChange={(event) => onUpdateDimensionStyle(selected.id, { lineWeightPx: Number(event.target.value) })} /></label><label>Arrow px<input type="number" min="3" max="24" step="1" value={style.arrowSizePx} onChange={(event) => onUpdateDimensionStyle(selected.id, { arrowSizePx: Number(event.target.value) })} /></label></div><div className="measure-style-grid"><label>Arrow<select aria-label="Arrow" value={style.arrowStyle} onChange={(event) => onUpdateDimensionStyle(selected.id, { arrowStyle: event.target.value as "arrow" | "tick" })}><option value="arrow">Arrow</option><option value="tick">Tick</option></select></label><label>Precision<select aria-label="Precision" value={style.precision} onChange={(event) => onUpdateDimensionStyle(selected.id, { precision: Number(event.target.value) as 0 | 1 | 2 | 3 })}><option value="0">0</option><option value="1">1</option><option value="2">2</option><option value="3">3</option></select></label><label>Display<select aria-label="Display" value={style.displayMode} onChange={(event) => onUpdateDimensionStyle(selected.id, { displayMode: event.target.value as "depth" | "overlay" })}><option value="depth">Depth</option><option value="overlay">Overlay</option></select></label><label>Halo<input type="checkbox" checked={style.textBackground} onChange={(event) => onUpdateDimensionStyle(selected.id, { textBackground: event.target.checked })} /></label></div></div>
          <div className="measure-style-grid">
            <label>Fixed text px<input type="number" min="1" max="96" value={style.fixedTextPx} onChange={event => onUpdateDimensionStyle(selected.id, { fixedTextPx: Number(event.target.value) })} /></label>
            <label>Text offset px<input type="number" value={style.textOffsetPx} onChange={event => onUpdateDimensionStyle(selected.id, { textOffsetPx: Number(event.target.value) })} /></label>
            <label>Units<select aria-label="Units" value={style.unitPresentation} onChange={event => onUpdateDimensionStyle(selected.id, { unitPresentation: event.target.value as "mm" | "mm-metric" })}><option value="mm">mm</option><option value="mm-metric">mm / m</option></select></label>
            <label>Witness lines<input type="checkbox" checked={style.showWitnessLines} onChange={event => onUpdateDimensionStyle(selected.id, { showWitnessLines: event.target.checked })} /></label>
            <label>Leaders<input type="checkbox" checked={style.showLeaders} onChange={event => onUpdateDimensionStyle(selected.id, { showLeaders: event.target.checked })} /></label>
          </div>
          {selectedResult?.values.length ? <dl className="measure-values">{selectedResult.values.map((value, index) => <div key={index}><dt>{value.label}</dt><dd>{formatMeasureValue(value)}</dd></div>)}</dl> : <p className="measure-panel-empty">{selectedResult?.reason ?? "No result."}</p>}
          <div className="measure-panel-actions"><label className="measure-visibility-toggle"><input type="checkbox" checked={selectedDimension.visible} onChange={(event) => onSetDimensionVisibility(selected.id, event.target.checked)} />Show dimension</label><button type="button" className="danger-action" onClick={() => onDeleteDimension(selected.id)}>Delete</button></div>
        </section>
      ) : null}
    </section>
  );
}

export function MeasureViewportGraphics({ authority }: { authority: MeasureAuthority }) {
  const projection = useSyncExternalStore(authority.subscribeProjection, authority.getProjection, authority.getProjection);
  const session = useSyncExternalStore(authority.subscribe, authority.getSnapshot, authority.getSnapshot);
  if (!session) return null;
  return <div className="measure-layer" data-editor-only="true" data-testid="measure-viewport-graphics" data-represented-dimension-id={projection.representedByDimensionId}>
    <svg className="measure-graphics" viewBox={"0 0 " + Math.max(1, projection.width) + " " + Math.max(1, projection.height)} aria-label="Measure viewport graphics">
      {projection.candidates?.map((candidate, index) => <g key={"candidate-" + index} data-anchor-kind={candidate.label} data-anchor-locked={candidate.locked} opacity={candidate.selected ? 1 : 0.5}>
        <circle cx={candidate.x} cy={candidate.y} r={candidate.selected ? MEASURE_ANCHOR_MARKER_RADIUS_CSS_PX : 4} /><title>{candidate.label}{candidate.locked ? " (locked)" : ""}</title>
        {candidate.selected ? <text x={candidate.x + 10} y={candidate.y - 10}>{candidate.label}{candidate.locked ? " (locked)" : ""}</text> : null}
      </g>)}
      {projection.lines.map((line, index) => <g key={"line-" + index} className={line.preview ? "is-preview" : undefined}><polyline points={line.points.map(point => point.x + "," + point.y).join(" ")} /></g>)}
      {projection.labels?.map((label, index) => <g key={"value-" + index} data-measure-value="true">
        {label.textBackground ? <rect x={label.x - label.width / 2} y={label.y - label.height / 2} width={label.width} height={label.height} className="measure-value-background" /> : null}
        <text textAnchor="middle" dominantBaseline="middle" style={{ fontFamily: label.fontFamily, fontSize: label.textPx, stroke: "none" }}>
          {label.lines.map((line, lineIndex) => <tspan key={lineIndex} x={label.x} y={label.y + (lineIndex - (label.lines.length - 1) / 2) * label.textPx * 1.5}>{line}</tspan>)}
        </text>
      </g>)}
      {projection.markers.map((point, index) => <g key={"marker-" + index} data-measure-marker={point.label} className={point.preview ? "is-preview" : undefined}>
        {!point.offscreen ? <circle cx={point.x} cy={point.y} r="4" /> : null}<text x={point.x + 8} y={point.y - 8}>{point.label}</text>
      </g>)}
    </svg>
  </div>;
}
