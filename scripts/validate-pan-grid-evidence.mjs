import { readdir, readFile, writeFile, copyFile } from "node:fs/promises";
import { join } from "node:path";

const directory = join(process.cwd(), "test-results/p1-viewport-pan-grid-runtime");
const head = process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD;
if (!/^[a-f0-9]{40}$/.test(head ?? "")) throw new Error("Exact source head is required.");
const fail = message => { throw new Error(message); };
const equal = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const bounded = (value, maximum = 1) => Number.isFinite(value) && value >= 0 && value <= maximum;
const finiteArray = (a, length) => Array.isArray(a) && a.length === length && a.every(Number.isFinite);
const files = await readdir(directory);
const panFiles = files.filter(n => n.startsWith("pan-") && n.endsWith(".json"));
const gridFiles = files.filter(n => n.startsWith("grid-") && n.endsWith(".json"));
const frameFiles = files.filter(n => n.startsWith("frames-") && n.endsWith(".json"));
if (panFiles.length !== 26 || gridFiles.length !== 20 || frameFiles.length !== 40) fail("Incomplete Pan/grid/DPR matrix.");
const read = async name => {
  const r = JSON.parse(await readFile(join(directory, name), "utf8"));
  if (r.exactHeadSha !== head || !equal(r.errors, [])) fail(`Invalid provenance/console result: ${name}`);
  return r;
};
const pans = [], grids = [], frames = [];
for (const name of panFiles) {
  const r = await read(name);
  if (r.trajectories.length !== 8 || ![r.worstResidual, r.worstReverseResidual, r.equivalence].every(v => bounded(v))) fail(`Failed endpoint Pan oracle: ${name}`);
  pans.push({ filename: name, state: r.state, width: r.width, residual: r.worstResidual, reverse: r.worstReverseResidual, equivalence: r.equivalence });
}
for (const dpr of [1, 1.25, 1.5, 2]) for (const width of [1440, 640]) for (const state of ["default", "fit", "shallow", "y-", "x+-y+-z+"]) {
  const name = `frames-${width}-dpr${dpr}-${state}.json`, r = await read(name);
  if (r.dpr !== dpr || r.width !== width || r.state !== state || !equal(r.paths.map(p => p.speed), ["normal", "slow"])) fail(`Invalid frame case: ${name}`);
  const metrics = [];
  for (const path of r.paths) {
    if (path.anchors.length !== 3 || path.samples.length <= (path.speed === "slow" ? 40 : 4)) fail(`Missing continuous frames: ${name}`);
    let worstResidual = 0, reversal = 0, wobble = 0, jump = 0, stalls = 0;
    const first = path.samples[0];
    for (let i = 0; i < path.samples.length; i++) {
      const f = path.samples[i], previous = path.samples[i - 1];
      if (!finiteArray(f.viewMatrix, 16) || !finiteArray(f.projectionMatrix, 16) || !finiteArray(f.target, 3) || !finiteArray(f.position, 3)
        || !Number.isFinite(f.canvas.sceneId) || f.canvas.dpr !== dpr || !equal(f.canvas, first.canvas) || !equal(f.inertia, [0, 0, 0, 0, 0])
        || !equal([f.alpha, f.beta, f.radius, f.fov, f.mode, f.ortho], [first.alpha, first.beta, first.radius, first.fov, first.mode, first.ortho])) fail(`Invalid render/invariance: ${name}`);
      if (previous && (f.frame <= previous.frame || f.timeMs < previous.timeMs || f.pointer.sequence < previous.pointer.sequence)) fail(`Non-monotonic telemetry: ${name}`);
      if (f.projected.length !== 3) fail(`Missing projected anchors: ${name}`);
      for (let a = 0; a < 3; a++) {
        const p = f.projected[a], origin = path.anchors[a].projected;
        if (![p.x, p.y, p.z, f.pointer.x, f.pointer.y].every(Number.isFinite)) fail(`Invalid projection: ${name}`);
        const rx = p.x - origin.x - (f.pointer.x - path.origin.x), ry = p.y - origin.y - (f.pointer.y - path.origin.y);
        worstResidual = Math.max(worstResidual, Math.hypot(rx, ry)); wobble = Math.max(wobble, Math.abs(ry));
        if (previous) {
          const input = f.pointer.x - previous.pointer.x, movement = p.x - previous.projected[a].x;
          reversal = Math.max(reversal, Math.max(0, -movement)); jump = Math.max(jump, Math.abs(movement - input));
          if (input > 1 && Math.abs(movement) < 0.01) stalls++;
        }
      }
    }
    if (!bounded(worstResidual) || !bounded(reversal, 0.01) || !bounded(wobble) || !bounded(jump) || stalls !== 0) fail(`Render-frame jitter/lag: ${name}`);
    metrics.push({ speed: path.speed, frameCount: path.samples.length, worstResidual, reversal, wobble, jump, stalls });
  }
  frames.push({ filename: name, dpr, width, state, metrics });
}
for (const name of gridFiles) {
  const r = await read(name), baseline = r.baseline.viewport.visualPresentation, geometry = baseline.gridGeometry;
  if (r.captures.length !== 52 || r.trajectories.length !== 4 || geometry?.renderer !== "rigid-world-line-systems"
    || geometry.phaseOriginMm !== 0 || baseline.gridMinorSpacingMm !== 1000 || baseline.gridMajorSpacingMm !== 5000) fail(`Incomplete rigid grid: ${name}`);
  const bounds = baseline.workplaneBounds;
  for (const [family, spacing] of [[geometry.minor, 1000], [geometry.major, 5000]]) {
    if (!Number.isFinite(family.meshId) || family.linesMm.length < 2 || !finiteArray(family.verticesMeters, family.linesMm.length * 6)) fail(`Invalid uploaded grid: ${name}`);
    family.linesMm.forEach(([a, b], index) => {
      const axis = a[0] === b[0] ? 0 : 1, fixed = a[axis];
      if (fixed % spacing !== 0 || (spacing === 1000 && fixed % 5000 === 0)) fail(`Invalid grid phase: ${name}`);
      for (const p of [a, b]) if (p[0] < bounds.minXMm || p[0] > bounds.maxXMm || p[1] < bounds.minYMm || p[1] > bounds.maxYMm) fail(`Out-of-bounds grid: ${name}`);
      const expected = [a[0] / 1000, -0.001, a[1] / 1000, b[0] / 1000, -0.001, b[1] / 1000];
      if (expected.some((value, i) => Math.abs(value - family.verticesMeters[index * 6 + i]) > 0.000001)) fail(`Canonical/uploaded grid disagreement: ${name}`);
    });
  }
  for (const item of r.captures) {
    const path = r.trajectories.find(p => p.operation === item.operation);
    const window = item.captureWindow;
    if (!path || !window?.start || !window.end || window.end.frame < window.start.frame || window.end.timeMs < window.start.timeMs
      || ![window.start, window.end].every(boundary => path.renderFrames.some(f => f.frame === boundary.frame && f.timeMs === boundary.timeMs))) fail(`Untraceable PNG render window: ${item.filename}`);
    const png = await readFile(join(directory, item.filename));
    if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" || !equal(item.errors, [])) fail(`Invalid PNG/console: ${item.filename}`);
    if (!equal(item.viewport.visualPresentation, baseline) || item.viewport.sceneLifecycleGeneration !== r.baseline.viewport.sceneLifecycleGeneration
      || !equal(item.invariants, r.baseline.invariants) || !equal(item.worldGeometry, r.baseline.worldGeometry)) fail(`Camera-only grid mutation: ${name}`);
  }
  for (const path of r.trajectories) if (path.renderFrames.length <= 12 || path.renderFrames.some(f => !finiteArray(f.viewMatrix, 16) || f.projected.length !== 3)) fail(`Missing continuous grid frames: ${name}`);
  grids.push({ filename: name, theme: r.theme, state: r.state, dpr: r.dpr, geometry, bounds, cameraOnlyRebuildCount: 0, captures: r.captures.map(c => c.filename) });
}
const expectedGridCases = [1, 1.25, 1.5, 2].flatMap(dpr => ["light", "dark"].flatMap(theme =>
  (dpr === 1 ? ["z+", "default", "oblique", "shallow", "wheel", "x+-y+-z+", "fit"] : ["shallow"]).map(state => `grid-dpr${dpr}-${theme}-${state}.json`)));
if (!equal([...gridFiles].sort(), expectedGridCases.sort())) fail("Incomplete theme/DPR grid coverage.");
const baselineInvestigation = JSON.parse(await readFile("e2e/panGridBaselineReproduction.json", "utf8"));
if (baselineInvestigation.productSourceHead !== "b01d2794bdeecc1ae288082722930426e0edfdc2" || baselineInvestigation.caseCount !== 40
  || baselineInvestigation.cases.length !== 40 || baselineInvestigation.cases.some(c => !equal(c.errors, []) || c.paths.length !== 2)) fail("Invalid historical investigation provenance.");
await copyFile("e2e/panGridBaselineReproduction.json", join(directory, "baseline-investigation.json"));
await writeFile(join(directory, "dpr-matrix.json"), JSON.stringify({ exactHeadSha: head, cases: frames }, null, 2));
await writeFile(join(directory, "world-grid-manifest.json"), JSON.stringify({ exactHeadSha: head, cases: grids.map(({ captures, ...g }) => g) }, null, 2));
const manifest = { exactHeadSha: head, artifact: "p1-viewport-pan-grid-runtime", panCases: pans, renderFrameCases: frames,
  gridSequences: grids.map(({ geometry, ...g }) => g), worstResidual: Math.max(...pans.map(p => p.residual)),
  worstReverseResidual: Math.max(...pans.map(p => p.reverse)), worstSubdivisionEquivalence: Math.max(...pans.map(p => p.equivalence)),
  renderFrameWorstResidual: Math.max(...frames.flatMap(f => f.metrics.map(m => m.worstResidual))),
  renderFrameWorstReversal: Math.max(...frames.flatMap(f => f.metrics.map(m => m.reversal))),
  cameraOnlyGridRebuildCount: 0, pngCount: 1040, jsonCount: 90,
  automationGreen: "PASS", contractVerified: "REOPENED / PENDING independent review", productAccepted: "FAIL / PENDING correction review" };
await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2));
await writeFile(join(directory, "README.md"), `# P1 Viewport Pan/Grid Correction Evidence\n\nExact head: ${head}\nAuthoritative review: 5408684275. Both PRs remain Draft/unmerged.\n\n26 original signed/cadence/reverse endpoint cases remain. 40 real-MMB cases cover default/Fit/shallow/exact-side/corner at 1440x900 and 640x800, DPR1/1.25/1.5/2, normal and slow. Each frames JSON records every completed render, latest native input/timing, three fixed anchors, complete actual matrices, pose/span, inertia, sizes and lifecycle. DPR summary recomputes lag/reversal/wobble/jump/stalls from raw telemetry. Baseline is historical product source plus explicitly uncommitted read-only instrumentation, NOT a new exact-head CI claim.\n\n20 continuous grid cases: both themes Top/default/oblique/shallow/wheel/corner/Fit at DPR1, plus shallow in both themes at all other DPRs. Each operation has 13 successive NOT settled PNGs and every-render world-grid intersection projections. 1040 PNGs. World-line manifest records canonical mm lines, uploaded arrays, stable mesh IDs and zero camera-only rebuilds.\n\nInspect temporal sequences; image similarity is NOT the visual oracle. Finite existing workplane edges are distinct from inside-bounds raster/depth/camera defects and were not enlarged. Numeric PASS does not dismiss the owner's jitter report. Contract Verified REOPENED; Product Accepted FAIL/PENDING reviewer inspection. No owner exploratory/manual request.\n`);
console.log(`Pan/grid correction evidence: ${head}, 40 render-frame/DPR cases, 1040 PNGs, max rendered residual ${manifest.renderFrameWorstResidual}px.`);
