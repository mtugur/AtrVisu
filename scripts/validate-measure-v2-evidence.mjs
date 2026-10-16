import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const directory = "test-results/c03-measure-v2-stage-b";
const head = process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD;
assert.match(head ?? "", /^[a-f0-9]{40}$/, "Exact source head is required");
const names = [
  "m20-m29-m30-dock-1440", "m20-m29-m30-dock-1024", "m20-m29-m30-dock-640",
  "m22-m23-m26-m28-overlay", "m25-text-history", "m21-m25-grip-cancel", "m24-semantic-lock",
  "m26-m30-project-reload", "m27-associative-repair", "m28-depth-occluder", "m28-overlay-occluder",
  "m22-angle", "m22-area", "m30-clean-presentation",
  "review-m24-cycle-selection", "review-m24-m25-grip-preview", "review-m24-m25-semantic-edit",
  "review-m24-free-hit", "review-m27-level-orphan", "review-m27-level-orphan-repair",
  "review-m22-angle-orbit-zoom",
  ...[1440, 1024, 640].flatMap(width => [
    `visual-controls-${width}`, `visual-angle-${width}-transient`, `visual-angle-${width}-saved`,
    `visual-angle-${width}-orbit-zoom`, `visual-area-${width}-transient`, `visual-area-${width}-saved`
  ]),
  ...[1440, 1024, 640].flatMap(width => [`stage-b-t05-header-${width}`, `stage-b-t04-depth-${width}`, `stage-b-t04-overlay-${width}`]),
  ...["not-in-viewport", "covered-by-chrome", "scene-occluded"].flatMap(reason => ["pointer", "keyboard"].flatMap(activation =>
    [`stage-b-t03-${reason}-${activation}-locked`, `stage-b-t03-${reason}-${activation}`])),
  "stage-b-t03-top-corners", "stage-b-t03-column", "stage-b-t06-top-history-reload",
  "stage-b-t03-grip-invisible-locked", "stage-b-t03-grip-invisible-confirmed"
];
const files = readdirSync(directory).filter(file => file !== "acceptance-matrix.json");
assert.equal(files.length, names.length * 2, "Evidence must contain exactly the required PNG/JSON pairs");
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
  if (name.startsWith("visual-controls-")) assert.ok(data.controls.length === 3 && data.controls.every(control => control.available >= control.required));
  if (name.startsWith("visual-") && name.endsWith("-transient")) {
    assert.equal(data.graphics.length, 0);
    assert.equal(data.presentation[0]?.text.filter(text => /mm|m2|deg/.test(text.text)).length, 1);
    assert.equal(data.session.completed, true);
  }
  if (name.startsWith("visual-") && (name.endsWith("-saved") || name.endsWith("-orbit-zoom"))) {
    assert.equal(data.graphics.length, 1);
    assert.equal(data.graphics[0].displayMode, "depth");
    assert.equal(data.presentation[0]?.representedByDimensionId, data.graphics[0].id);
    assert.equal(data.presentation[0]?.text.filter(text => /mm|m2|deg/.test(text.text)).length, 0);
    assert.ok(data.fit.saved.x >= data.fit.safe.left && data.fit.saved.x + data.fit.saved.width <= data.fit.safe.right);
    assert.ok(data.fit.saved.y >= data.fit.safe.top && data.fit.saved.y + data.fit.saved.height <= data.fit.safe.bottom);
    assert.ok(data.fit.textPixels > 20, "Saved label must contain actual rendered glyph pixels");
    if (name.endsWith("-saved")) {
      assert.deepEqual(data.beforeSession.points, data.afterSession.points);
      assert.deepEqual(data.beforeSession.result, data.afterSession.result);
    } else assert.notDeepEqual(data.beforeCamera.camera, data.afterCamera.camera);
    if (name.startsWith("visual-area-")) {
      assert.equal(data.graphics[0].labelLines.length, 2);
      assert.ok(data.graphics[0].text.includes(" m2") && !data.graphics[0].text.includes(" mm2"));
    }
  }
  if (name.startsWith("stage-b-t05")) {
    assert.deepEqual(data.before, data.after);
    assert.equal(data.sameCanvas, true);
    for (const observed of [data.defaultGeometry, data.minimumGeometry, data.pinnedGeometry]) {
      assert.ok(observed.controls.length >= 4);
      const h = observed.header;
      for (const c of observed.controls) {
        assert.ok(c.x >= h.x && c.y >= h.y && c.x + c.width <= h.x + h.width + .1 && c.y + c.height <= h.y + h.height + .1);
        for (const other of observed.controls.filter(other => other !== c))
          assert.ok(c.x + c.width <= other.x || other.x + other.width <= c.x || c.y + c.height <= other.y || other.y + other.height <= c.y);
      }
    }
  }
  if (name.startsWith("stage-b-t04")) {
    assert.equal(data.changedChromePixels, 0);
    assert.equal(data.changedLiveChromePixels, 0);
    assert.equal(data.isolation, "isolate");
    assert.equal(data.rendered.displayMode, data.mode);
    assert.deepEqual(data.liveState.camera, data.after.camera);
    assert.deepEqual(data.before.invariants.selectionIds, data.after.invariants.selectionIds);
    assert.ok(Math.abs(data.savedUnderHeader.labelPosition.x + data.canvasBounds.x - data.target.x) < .5);
    assert.ok(Math.abs(data.savedUnderHeader.labelPosition.y + data.canvasBounds.y - data.target.y) < .5);
    assert.ok(data.livePolyline.x > data.header.x && data.livePolyline.x < data.header.x + data.header.width);
    assert.ok(data.livePolyline.y > data.header.y && data.livePolyline.y < data.header.y + data.header.height);
  }
  if (name.startsWith("stage-b-t03-") && data.invisible) {
    assert.deepEqual(data.invisible.lockedReference, data.reference);
    assert.equal(data.invisible.lockedAnchor.visible, false);
    assert.equal(data.invisible.lockedAnchor.confirmable, true);
    assert.equal(data.invisible.points.length, 0);
    assert.ok(["Not in viewport", "Covered by chrome", "Scene-occluded"].includes(data.invisible.lockedAnchor.reason));
    if (!name.endsWith("-locked")) {
      assert.equal(data.session.points.length, 1);
      assert.equal(data.session.points[0].entityId, data.reference.entityId);
      assert.equal(data.session.points[0].anchorKind, data.reference.anchor);
      assert.deepEqual(data.beforeConfirmation, data.after);
    }
  }
  if (name === "stage-b-t03-top-corners") {
    assert.equal(data.observations.filter(point => point.visible && point.anchorKind.endsWith("-top")).length, 4);
    assert.ok(data.references.every(reference => reference.type === "entity-anchor" && reference.anchor.endsWith("-top")));
  }
  if (name === "stage-b-t03-column") {
    assert.equal(new Set(data.picked.map(point => point.anchorKind)).size, 4);
    assert.ok(data.picked.every(point => point.entityId.startsWith("civil:") && point.anchorKind.endsWith("-top")));
    assert.equal(data.entity.transform.planX, -2500);
    assert.equal(data.entity.transform.planY, 1800);
  }
  if (name === "stage-b-t06-top-history-reload") {
    assert.ok(data.transactions > 0 && data.transactions === data.historyAfter - data.historyBefore);
    assert.notDeepEqual(data.saved.endpoints, data.moved.endpoints);
    assert.deepEqual(data.restored.endpoints, data.moved.endpoints);
    assert.deepEqual(data.restored.references, data.saved.references);
    assert.ok(data.restored.references.every(reference => reference.type === "entity-anchor" && reference.anchor.endsWith("-top")));
  }
  if (name === "stage-b-t03-grip-invisible-locked") {
    assert.equal(data.locked.lockedAnchor.visible, false);
    assert.equal(data.locked.lockedAnchor.confirmable, true);
    assert.equal(data.locked.lockedAnchor.reason, "Covered by chrome");
    assert.deepEqual(data.before.invariants, data.beforeConfirmation.invariants);
  }
  if (name === "stage-b-t03-grip-invisible-confirmed") {
    assert.equal(data.edited.references[0].anchor, data.reference.anchor);
    assert.equal(data.edited.references[0].entityId, data.reference.entityId);
    assert.deepEqual(data.edited.references[1], data.original.references[1]);
    assert.equal(data.after.invariants.undoDepth, data.before.invariants.undoDepth + 1);
    assert.deepEqual(data.after.invariants.selectionIds, data.before.invariants.selectionIds);
  }
}
const cases = Object.fromEntries(names.map(name => [name, JSON.parse(readFileSync(join(directory, `${name}.json`), "utf8"))]));
const matrix = {
  T01: ["review-m24-free-hit"],
  T02: ["m22-area", "visual-area-1440-saved", "visual-area-1024-saved", "visual-area-640-saved"],
  T03: names.filter(name => name.startsWith("stage-b-t03-")),
  T04: names.filter(name => name.startsWith("stage-b-t04-")),
  T05: names.filter(name => name.startsWith("stage-b-t05-")),
  T06: ["stage-b-t06-top-history-reload", "m26-m30-project-reload", "m27-associative-repair", "review-m27-level-orphan-repair"]
};
writeFileSync(join(directory, "acceptance-matrix.json"), JSON.stringify({ head, states: { automation: "PNG/JSON assertions verified", contractVerified: "PENDING independent review", productAccepted: "NOT REQUESTED" },
  matrix: Object.fromEntries(Object.entries(matrix).map(([id, required]) => [id, { automatedResult: required.every(name => cases[name]?.head === head && cases[name].errors.length === 0) ? "PASS" : "FAIL", evidence: required }])) }, null, 2));
console.log(`C03 V2 evidence: ${head}, ${names.length} PNG/JSON pairs verified`);
