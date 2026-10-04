import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const directory = join(process.cwd(), "test-results/p1-viewport-pan-grid-runtime");
const head = process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD;
if (!/^[a-f0-9]{40}$/.test(head ?? "")) throw new Error("Exact source head is required.");
const files = await readdir(directory);
const panFiles = files.filter(name => name.startsWith("pan-") && name.endsWith(".json"));
const gridFiles = files.filter(name => name.startsWith("grid-") && name.endsWith(".json"));
if (panFiles.length !== 26 || gridFiles.length !== 12) throw new Error("Incomplete Pan/grid matrix.");
const pans = [], grids = [];
for (const name of [...panFiles, ...gridFiles]) {
  const record = JSON.parse(await readFile(join(directory, name), "utf8"));
  if (record.exactHeadSha !== head || record.errors.length !== 0) throw new Error(`Invalid provenance/console result: ${name}`);
  if (name.startsWith("pan-")) {
    if (record.trajectories.length !== 8 || [record.worstResidual, record.worstReverseResidual, record.equivalence].some(value => !Number.isFinite(value) || value > 1)) {
      throw new Error(`Incomplete/failed projected Pan oracle: ${name}`);
    }
    pans.push({ filename: name, state: record.state, width: record.width, context: record.context,
      residual: record.worstResidual, reverse: record.worstReverseResidual, equivalence: record.equivalence });
  } else {
    if (record.captures.length !== 20) throw new Error(`Incomplete temporal grid sequence: ${name}`);
    for (const item of record.captures) {
      const png = await readFile(join(directory, item.filename));
      if (png.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a") throw new Error(`Invalid PNG: ${item.filename}`);
      if (item.viewport.visualPresentation.gridSampling.renderer !== "world-space-derivative-antialiasing") throw new Error(`Missing grid renderer diagnostics: ${name}`);
    }
    grids.push({ filename: name, theme: record.theme, state: record.state, captures: record.captures.map(item => item.filename) });
  }
}
const manifest = { exactHeadSha: head, artifact: "p1-viewport-pan-grid-runtime", panCases: pans, gridSequences: grids,
  worstResidual: Math.max(...pans.map(p => p.residual)), worstReverseResidual: Math.max(...pans.map(p => p.reverse)),
  worstSubdivisionEquivalence: Math.max(...pans.map(p => p.equivalence)), pngCount: 240, jsonCount: 39,
  automationGreen: "PASS", contractVerified: "PENDING independent review", productAccepted: "PENDING" };
await writeFile(join(directory, "manifest.json"), JSON.stringify(manifest, null, 2));
await writeFile(join(directory, "README.md"), `# P1 Viewport Pan/Grid Runtime Evidence\n\nExact head: ${head}\n\n26 real-MMB cases (1440x900/640x800 DPR1), eight signed/diagonal/slow/cadence paths per case plus reverse samples. Entry uses actual orbit/wheel/Fit/ViewCube; reset uses captured Viewpoints. Projection probes are read-only and never write the camera.\n\n12 temporal grid sequences, light/dark Top/default/oblique/shallow/wheel/corner, each with normal Pan, slow Pan, orbit and zoom at start/25/50/75/end. 240 PNGs plus camera, world bounds/phase, mesh transforms, sampling policy, domain and lifecycle diagnostics.\n\nNumeric trajectory PASS does not certify temporal visual readability. Independent reviewer must inspect the PNG sequences; Contract Verified and Product Accepted remain PENDING.\n`);
console.log(`Pan/grid evidence: ${head}, 26 Pan cases, 12 grid sequences, 240 PNGs; max residual ${manifest.worstResidual}px.`);
