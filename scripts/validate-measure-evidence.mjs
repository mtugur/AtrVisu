import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const requireEvidence = (condition, message) => { if (!condition) throw new Error(message); };
const finitePoint = p => [p?.xMm, p?.yMm, p?.zMm].every(Number.isFinite);

export const validateMeasureRecord = (record, head, run) => {
  requireEvidence(/^[a-f0-9]{40}$/.test(head ?? "") && record.sourceHead === head && record.ciRun === run, "MEASURE_PROVENANCE_MISMATCH");
  requireEvidence(Array.isArray(record.scenarios) && record.scenarios.length > 0 && record.scenarios.every(id => /^M(0[1-9]|10)$/.test(id)), "MEASURE_SCENARIO_MISSING");
  requireEvidence(same(record.consoleErrors, []), "MEASURE_RED_CONSOLE");
  const { before, after } = record;
  requireEvidence(before?.invariants && same(before.invariants, after?.invariants), "MEASURE_DOMAIN_MUTATION");
  requireEvidence(same(before.machineElevations, after.machineElevations) && same(before.civilElevations, after.civilElevations), "MEASURE_ELEVATION_MUTATION");
  requireEvidence(before.viewport?.sceneLifecycleGeneration === after.viewport?.sceneLifecycleGeneration && Number.isFinite(after.viewport?.sceneLifecycleGeneration), "MEASURE_LIFECYCLE_MUTATION");
  requireEvidence(same(before.canvasIdentity, after.canvasIdentity) && after.canvasIdentity?.count === 1 && after.canvasIdentity?.connected === true, "MEASURE_CANVAS_IDENTITY");
  if (!["M06-floor-dimensions", "M07-navigation", "M10-clean-capture"].includes(record.name)) requireEvidence(same(before.camera, after.camera), "MEASURE_UNREQUESTED_CAMERA_MUTATION");
  requireEvidence([before, after].every(s => [1, 2].includes(s.dpr) && s.renderSize?.every(n => Number.isFinite(n) && n > 0) && s.cssSize?.every(n => Number.isFinite(n) && n > 0)), "MEASURE_VIEWPORT_MISSING");
  const session = JSON.parse(record.session);
  requireEvidence(session.entry?.selectionIds && session.points?.every(finitePoint) && session.result?.values?.every(v => Number.isFinite(v.value)) && typeof record.displayed === "string", "MEASURE_OPERANDS_MISSING");
  requireEvidence(same(session.entry.selectionIds, before.invariants.selectionIds), "MEASURE_SELECTION_OWNERSHIP");
  if (session.kind === "distance" && session.completed) {
    const [a, b] = session.points, delta = [b.xMm-a.xMm, b.yMm-a.yMm, b.zMm-a.zMm];
    const expected = [...delta, Math.hypot(...delta), Math.hypot(delta[0], delta[1])];
    requireEvidence(expected.every((n, i) => Math.abs(n-session.result.values[i]?.value) <= .001), "MEASURE_DISTANCE_ARITHMETIC");
  }
  if (session.kind === "area" && session.completed) {
    requireEvidence(Number.isFinite(session.presentationElevationMm) && session.lines?.[0]?.points.every(p => p.zMm === session.presentationElevationMm), "MEASURE_PLAN_PRESENTATION");
    requireEvidence(session.source === "geometry" ? session.presentationElevationMm === session.points[0].zMm : session.presentationElevationMm === session.level?.elevationMm, "MEASURE_PLAN_AUTHORITY");
  }
  if (record.name.startsWith("M08-classifier")) {
    const paths = record.observations.filter(o => o.cssPath);
    requireEvidence(paths.length === 6, "MEASURE_CLASSIFIER_INCOMPLETE");
    for (const o of paths) {
      const maximum = Math.max(...o.cssPath.map(Math.abs)), expected = maximum <= 4;
      requireEvidence(o.expected === expected && o.press?.confirmed === expected && Math.abs(o.press.maximum-maximum) <= 1e-5 && o.points.length === Number(expected), "MEASURE_CLASSIFIER_ORACLE");
    }
    const cancellations = record.observations.filter(o => o.cancellation);
    requireEvidence(same(cancellations.map(o => o.cancellation), ["pointercancel","lostpointercapture","focus","outside","navigate","restart","exit"]) && cancellations.every(o => o.state.points.length === 0), "MEASURE_CANCELLATION_INCOMPLETE");
  }
  if (record.name.endsWith("docks-pinned")) requireEvidence(record.observations.inspector && record.observations.primary && record.observations.delta <= 1, "MEASURE_DOCK_PROJECTION");
  return session;
};

export function validateMeasureScreenshot(png, snapshot) {
  requireEvidence(png.length > 1024 && png.subarray(0,8).toString("hex") === "89504e470d0a1a0a", "MEASURE_SCREENSHOT_INVALID");
  // Playwright page screenshots use device pixels, while the observed canvas size is CSS pixels.
  requireEvidence(png.readUInt32BE(16) === snapshot.cssSize[0] * snapshot.dpr &&
    png.readUInt32BE(20) >= snapshot.cssSize[1] * snapshot.dpr, "MEASURE_SCREENSHOT_INVALID");
}

export async function validateMeasureEvidence(directory, head, run) {
  const files = (await readdir(directory)).filter(name => name.endsWith(".json") && name !== "manifest.json").sort();
  const required = ["M01-empty-miss", "M01-distance-preview", "M02-native-glb", "M02-locked-visible-hidden-miss", "M02-signed-floor-bottom", "M03-distance-result", "M04-angle", "M05-geometry-area", "M05-level-area", "M05-invalid-area", "M06-dimensions", "M06-pair", "M06-floor-dimensions", "M06-machine-pair", "M07-navigation", "M08-classifier-dpr-1", "M08-classifier-dpr-2", "M10-clean-capture", "M10-migrated-preferences",
    ...[1440,1024,640].flatMap(width => ["light","dark"].flatMap(theme => [`M09-${width}-${theme}`,`M09-${width}-${theme}-docks-pinned`]))];
  requireEvidence(same(files, required.map(n => `${n}.json`).sort()), "MEASURE_MATRIX_INCOMPLETE");
  const records = [], digests = [];
  for (const filename of files) {
    const bytes = await readFile(join(directory, filename)), record = JSON.parse(bytes);
    validateMeasureRecord(record, head, run);
    const pngName = filename.replace(/\.json$/, ".png"), png = await readFile(join(directory, pngName));
    validateMeasureScreenshot(png, record.after);
    records.push({ name: record.name, scenarios: record.scenarios, json: filename, screenshot: pngName });
    for (const [name, buffer] of [[filename,bytes],[pngName,png]]) digests.push({ filename:name, sha256:createHash("sha256").update(buffer).digest("hex"), bytes:buffer.length });
  }
  const manifest = { artifact:"p1-close-measure-tool", exactHead:head, ciRun:run, scenarios:Object.fromEntries(Array.from({length:10},(_,i)=>{const id=`M${String(i+1).padStart(2,"0")}`;return[id,records.filter(r=>r.scenarios.includes(id))];})), records, files:digests,
    evidenceValidation:"PASS", automationGreen:"PENDING complete Quality Gate", contractVerified:"PENDING independent review", productAccepted:"PENDING" };
  await writeFile(join(directory,"manifest.json"),JSON.stringify(manifest,null,2));
  await writeFile(join(directory,"README.md"),`# C03 Measure runtime evidence\n\nSource ${head}; run ${run}. ${records.length} real-input observations and ${records.length} screenshots, with per-file SHA256 in manifest.json.\n\nM01-M10 are driven by public toolbar/menu/palette, layout import, native GLB import, real pointer/keyboard, panel/preference and commercial-export controls. Diagnostics only observe. Pointercancel/capture-loss use real presses plus native PointerEvent/capture cancellation as frozen in section 4.1. M08 records CSS paths separately from DPR/render sizes. M05 records original world XYZ and immutable projected Plan Z.\n\nEvidence validation is not independent Contract Verified or Product Accepted. Both remain PENDING. Whole Quality Gate result is reported on the exact-head PR run, not inferred from screenshots.\n`);
  return manifest;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const manifest = await validateMeasureEvidence(join(process.cwd(),"test-results/p1-close-measure-tool"),process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD,process.env.GITHUB_RUN_ID ?? "local");
  console.log(`Measure evidence valid: ${manifest.exactHead}, ${manifest.records.length} observations, ${manifest.files.length} verified files.`);
}
