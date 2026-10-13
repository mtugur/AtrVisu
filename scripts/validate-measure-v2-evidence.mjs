import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const directory = "test-results/c03-measure-v2-recovery";
const head = process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD;
assert.match(head ?? "", /^[a-f0-9]{40}$/, "Exact source head is required");
const names = [
  "m20-m29-m30-dock-1440", "m20-m29-m30-dock-1024", "m20-m29-m30-dock-640",
  "m22-m23-m26-m28-overlay", "m25-text-history", "m21-m25-grip-cancel", "m24-semantic-lock",
  "m26-m30-project-reload", "m27-associative-repair", "m28-depth-occluder", "m28-overlay-occluder",
  "m22-angle", "m22-area", "m30-clean-presentation",
  "review-m24-cycle-selection", "review-m24-m25-grip-preview", "review-m24-m25-semantic-edit",
  "review-m24-free-hit", "review-m27-level-orphan", "review-m27-level-orphan-repair",
  "review-m22-angle-orbit-zoom"
];
assert.equal(readdirSync(directory).length, names.length * 2, "Evidence must contain exactly the required PNG/JSON pairs");
for (const name of names) {
  const data = JSON.parse(readFileSync(join(directory, `${name}.json`), "utf8"));
  assert.equal(data.head, head, `${name}: stale source head`);
  assert.deepEqual(data.errors, [], `${name}: console must be clean`);
  assert.ok(data.runtime.camera, `${name}: actual camera evidence missing`);
  const png = readFileSync(join(directory, `${name}.png`));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(png.readUInt32BE(16) >= 640 && png.readUInt32BE(20) >= 700);
  if (name.startsWith("m20-")) { assert.deepEqual(data.before, data.after); assert.equal(data.sameCanvas, true); }
  if (name === "m28-overlay-occluder") assert.ok(data.overlayPixels > data.depthPixels + 20);
  if (name === "m30-clean-presentation") { assert.ok(data.activePixels > 50); assert.ok(Math.abs(data.activePixels - data.inactivePixels) <= 10); }
  if (name === "review-m24-cycle-selection") assert.ok(data.chosenAnchor);
  if (name === "review-m24-m25-grip-preview") assert.ok(data.targetEntityId?.startsWith("machine:"));
  if (name === "review-m24-m25-semantic-edit") {
    assert.equal(data.graphics[0]?.references[0]?.type, "entity-anchor");
    assert.equal(data.edited.references[0]?.type, "entity-anchor");
    assert.notDeepEqual(data.original.endpoints[0], data.moved.endpoints[0]);
  }
  if (name === "review-m24-free-hit") assert.ok(data.graphics[0]?.references.every(reference => reference.type === "world-point"));
  if (name === "review-m27-level-orphan") assert.equal(data.graphics.length, 0);
  if (name === "review-m27-level-orphan-repair") assert.ok(data.graphics[0]?.references.every(reference => reference.type === "level-point" && reference.levelId === "ground"));
  if (name === "review-m22-angle-orbit-zoom") {
    assert.notDeepEqual(data.beforeCamera.camera, data.afterCamera.camera);
    assert.equal(data.graphics[0]?.segments.length > 20, true);
  }
}
console.log(`C03 V2 evidence: ${head}, ${names.length} PNG/JSON pairs verified`);
