import { useSyncExternalStore } from "react";
import { TECHNICAL_CSS_COLORS } from "../../designSystem";
import type { CameraPresentationSource } from "./cameraTelemetry";
import { domainToBabylonDirection, dot3, getCameraBasis, VIEW_PRESETS, type Point3, type ViewPreset } from "./navigationGeometry";

// A chamfered cube has exactly 6 face, 12 edge and 8 corner polygons. Its
// projected geometry is presentation only; the runtime camera owns the pose.
export const getCubeZoneVertices = (preset: ViewPreset): readonly Point3[] => {
  const axes = (["x", "y", "z"] as const).filter((axis) => preset.direction[axis] !== 0);
  const point = (values: readonly number[]) => {
    const p = { x: 0, y: 0, z: 0 };
    axes.forEach((axis, i) => { p[axis] = Math.sign(preset.direction[axis]) * values[i]; });
    return p;
  };
  if (axes.length === 3) return [[1, .65, .65], [.65, 1, .65], [.65, .65, 1]].map(point);
  const free = (["x", "y", "z"] as const).filter((axis) => !axes.includes(axis));
  if (axes.length === 2) return [[1, .65, -.65], [.65, 1, -.65], [.65, 1, .65], [1, .65, .65]].map((values) => ({ ...point(values), [free[0]]: values[2] }));
  return [[-.65, -.65], [.65, -.65], [.65, .65], [-.65, .65]].map((values) => ({ ...point([1]), [free[0]]: values[0], [free[1]]: values[1] }));
};

export function ViewportNavigationHud({ source, onPreset }: {
  source: CameraPresentationSource;
  onPreset: (id: string) => void;
}) {
  const camera = useSyncExternalStore(source.subscribe, source.getSnapshot, source.getSnapshot);
  const alpha = camera?.alpha ?? Math.PI / 4;
  const beta = camera?.beta ?? Math.PI / 3;
  const basis = getCameraBasis(alpha, beta);
  const project = (p: Point3, scale: number, center: number) => {
    const enginePoint = domainToBabylonDirection(p);
    return { x: center + scale * dot3(enginePoint, basis.right), y: center - scale * dot3(enginePoint, basis.up) };
  };
  const visibleZones = VIEW_PRESETS.filter((preset) => dot3(domainToBabylonDirection(preset.direction), basis.side) > 0.00001)
    .sort((a, b) => dot3(domainToBabylonDirection(a.direction), basis.side) - dot3(domainToBabylonDirection(b.direction), basis.side));
  const orientation = `${alpha.toFixed(6)},${beta.toFixed(6)}`;
  return (
    <div className="viewport-navigation-hud" data-editor-only="true">
      <svg className="viewport-viewcube" viewBox="0 0 120 120" role="group" aria-label="ViewCube" data-testid="viewcube" data-orientation={orientation}>
        {visibleZones.map((preset) => {
          const vertices = getCubeZoneVertices(preset).map((p) => project(p, 33, 60));
          const center = vertices.reduce((sum, p) => ({ x: sum.x + p.x / vertices.length, y: sum.y + p.y / vertices.length }), { x: 0, y: 0 });
          const current = dot3(domainToBabylonDirection(preset.direction), basis.side) > .9998;
          return (
            <g key={preset.id} role="button" tabIndex={0} aria-label={preset.label} aria-pressed={current} data-preset-id={preset.id}
              className={`viewcube-zone is-${preset.kind}${current ? " is-current" : ""}`}
              onClick={() => onPreset(preset.id)}
              onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); onPreset(preset.id); } }}>
              <title>{preset.label}</title>
              <polygon points={vertices.map((p) => `${p.x},${p.y}`).join(" ")} />
              {preset.faceLabel && <text x={center.x} y={center.y} textAnchor="middle" dominantBaseline="central">{preset.faceLabel}</text>}
            </g>
          );
        })}
      </svg>
      <svg className="viewport-axis-triad" viewBox="0 0 96 96" role="img" aria-label="World orientation: X Right, Y Back, Z Top" data-testid="world-axis-triad" data-orientation={orientation}>
        {(["x", "y", "z"] as const).map((axis) => {
          const end = project({ x: axis === "x" ? 1 : 0, y: axis === "y" ? 1 : 0, z: axis === "z" ? 1 : 0 }, 30, 48);
          const color = TECHNICAL_CSS_COLORS[axis === "x" ? "axisX" : axis === "y" ? "axisY" : "axisZ"];
          return <g key={axis} style={{ color }}><line x1="48" y1="48" x2={end.x} y2={end.y} /><circle cx={end.x} cy={end.y} r="2.5" /><text x={end.x + 5} y={end.y - 5}>{axis.toUpperCase()}</text></g>;
        })}
      </svg>
    </div>
  );
}
