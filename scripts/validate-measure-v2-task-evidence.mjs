import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import assert from "node:assert/strict";

const directory = "test-results/c03-measure-v2-task";
const head = process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD;
const baselineHead = "76bac9fac43a3a1ebba1a24285d5c28021c57f00";
assert.match(head ?? "", /^[a-f0-9]{40}$/);
const widths = [1440, 1024, 640];
const names = [...widths.flatMap(width => [
  ...["preview-a", "preview-b", "depth", "overlay", "oblique", "perspective", "reload"].map(state => `A-${state}-${width}`),
  ...["front-left-top", "front-right-top", "back-left-top", "back-right-top", "handoff"].map(state => `B-${state}-${width}`),
  `C-groups-${width}`, `D-kept-${width}`, `D-reload-${width}`
]), "C-civil-mixed-1440", "C-unsupported-mixed-1440", "C-empty-1440"];
const read = (name, folder = directory) => JSON.parse(readFileSync(join(folder, `${name}.json`), "utf8"));
const cases = Object.fromEntries(names.map(name => {
  const data = read(name);
  assert.equal(data.head, head, `${name}: stale delivery head`);
  assert.equal(data.outcome, "PASS"); assert.deepEqual(data.errors, []);
  assert.ok(data.runtime.camera && data.generation && data.session);
  const png = readFileSync(join(directory, `${name}.png`));
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.ok(png.readUInt32BE(16) >= 640 && png.readUInt32BE(20) >= 768);
  if (name.startsWith("A-preview-")) {
    assert.ok(data.actual.entityId && data.actual.anchorKind.endsWith("-top"));
    assert.ok([data.actual.xMm, data.actual.yMm, data.actual.zMm].every(Number.isFinite));
    assert.equal(data.readouts.references.length, name.startsWith("A-preview-a") ? 1 : 2);
    const points = name.startsWith("A-preview-a") ? [data.actual] : [data.session.points[0], data.actual];
    for (const [index, point] of points.entries()) {
      assert.deepEqual(data.readouts.references[index].values, [point.xMm, point.yMm, point.zMm]);
      assert.ok(data.readouts.references[index].text.includes(point.entityId) && data.readouts.references[index].text.includes(point.anchorKind));
    }
    for (const box of [...data.readouts.references, ...data.readouts.metrics]) {
      assert.ok(box.x >= data.readouts.panel.x && box.y >= data.readouts.panel.y && box.right <= data.readouts.panel.right && box.bottom <= data.readouts.panel.bottom,
        `${name}: ${box.name} is clipped by the actual dock viewport`);
    }
    if (name.startsWith("A-preview-b")) for (const label of ["3D Distance", "Plan Distance", "Delta Z"]) assert.ok(data.readouts.metrics.some(metric => metric.name === label));
  }
  if (name.startsWith("A-") && !name.includes("preview")) {
    const [a, b] = data.points;
    assert.notEqual(a.zMm, b.zMm);
    const expected = { "Delta Z": b.zMm - a.zMm, "Plan Distance": Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm),
      "3D Distance": Math.hypot(b.xMm - a.xMm, b.yMm - a.yMm, b.zMm - a.zMm) };
    for (const [label, value] of Object.entries(expected)) {
      assert.ok(Math.abs(data.result.values.find(item => item.label === label)?.value - value) < 1e-8);
      if (!name.startsWith("A-reload-")) assert.ok(Math.abs(data.session.result.values.find(item => item.label === label)?.value - value) < 1e-8);
    }
    assert.deepEqual(data.graphics[0].references, data.saved.references);
    assert.deepEqual(data.graphics[0].endpoints, data.saved.endpoints);
    if (name.startsWith("A-oblique")) {
      assert.notDeepEqual(data.beforeOrbit.camera, data.afterView.camera);
      assert.ok(data.afterView.camera.beta > .2 && data.afterView.camera.beta < Math.PI / 2 - .2);
      assert.deepEqual(data.beforeOrbit.invariants, data.afterView.invariants); assert.equal(data.sameCanvas, true);
    }
    if (name.startsWith("A-perspective")) {
      assert.equal(data.afterPerspective.camera.mode, "perspective");
      assert.deepEqual(data.beforePerspective.invariants, data.afterPerspective.invariants);
    }
  }
  if (name.startsWith("B-")) {
    assert.ok(data.paths.length > 0);
    for (const path of data.paths) {
      assert.equal(path.samples.length, 25);
      assert.equal(path.confirmed.entityId, path.target.entityId); assert.equal(path.confirmed.anchorKind, path.target.anchorKind);
      for (const sample of path.samples) {
        assert.equal(sample.activeEntity, path.target.entityId);
        assert.ok(sample.offered.some(point => point.entityId === path.target.entityId && point.anchorKind === path.target.anchorKind && point.visible));
        assert.deepEqual(sample.offered.find(point => point.entityId === path.target.entityId && point.anchorKind === path.target.anchorKind).worldPoint, path.confirmed);
      }
    }
    if (name.startsWith("B-handoff")) {
      assert.equal(data.paths.length, 4); assert.equal(data.released, true); assert.equal(data.sameCanvas, true);
      assert.deepEqual(data.before, data.after);
      assert.notEqual(data.handoff.activeCandidateEntityId, data.paths[0].target.entityId);
      assert.ok(data.cycled.anchorKind);
    }
  }
  if (name.startsWith("C-groups")) {
    assert.equal(data.groups.length, 2); assert.deepEqual(data.activeBefore, data.after);
    assert.deepEqual(data.session.entry.selectionIds, data.entry.invariants.selectionIds);
    for (const group of data.groups) {
      assert.equal(group.state.activeDimensionEntityId, group.entity.id);
      assert.deepEqual(group.observedReadout, ["widthMm", "depthMm", "heightMm"].map(key => `${group.entity.properties.find(property => property.key === key).value.toFixed(3)} mm`));
    }
  }
  if (name === "C-civil-mixed-1440") {
    assert.deepEqual(data.before, data.after); assert.equal(data.session.entry.selectionIds.length, 2);
    assert.ok(data.single.activeDimensionEntityId.startsWith("civil:"));
    assert.equal(data.session.activeDimensionEntityId, data.entry.invariants.selectionIds[1]);
  }
  if (name === "C-unsupported-mixed-1440") {
    assert.deepEqual(data.before, data.after); assert.equal(data.session.entry.selectionIds.length, 2);
    assert.equal(data.unsupported.type, "group");
    assert.equal(data.entry.invariants.primarySelectionId, data.unsupported.id);
    assert.notEqual(data.session.activeDimensionEntityId, data.unsupported.id);
  }
  if (name === "C-empty-1440") { assert.deepEqual(data.session.entry.selectionIds, []); assert.ok(data.session.result.reason.includes("before entering Measure")); }
  if (name.startsWith("D-")) {
    assert.equal(data.afterKeep.invariants.undoDepth, data.beforeKeep.invariants.undoDepth + 1);
    assert.equal(data.afterKeep.invariants.annotationTransforms.length, data.beforeKeep.invariants.annotationTransforms.length + 1);
    assert.equal(data.graphics.length, 3);
    assert.ok(data.graphics.every(item => item.references.length === 1 && item.references[0].entityId === data.saved[0].references[0].entityId));
  }
  return [name, data];
}));
const afterFiles = readdirSync(directory).filter(name => /\.(png|json)$/.test(name) && name !== "acceptance-matrix.json" && name !== "baseline-unit.json");
assert.equal(afterFiles.length, names.length * 2);
const baseline = ["A-unlocked-reference", "B-candidate-approach", "C-two-selected"];
for (const name of baseline) {
  const data = read(name, join(directory, "baseline"));
  assert.equal(data.servedHead, baselineHead); assert.equal(data.deliveryHead, head);
  assert.equal(data.taskResult, "FAIL"); assert.deepEqual(data.errors, []);
  assert.ok(readFileSync(join(directory, "baseline", `${name}.png`)).length > 1000);
  if (name.startsWith("B-")) assert.ok(data.drops > 0);
  if (name.startsWith("C-")) { assert.equal(data.session.entry.selectionIds.length, 2); assert.deepEqual(data.session.result.values, []); }
}
const unit = read("baseline-unit"); assert.equal(unit.numTotalTests, 5); assert.equal(unit.numFailedTests, 5);
const protectedMatrix = read("acceptance-matrix", "test-results/c03-measure-v2-stage-b");
assert.equal(protectedMatrix.head, head);
for (const id of ["T01", "T02", "T03", "T04", "T05", "T06"]) {
  assert.equal(protectedMatrix.matrix[id]?.automatedResult, "PASS"); assert.ok(protectedMatrix.matrix[id].evidence.length > 0);
}
const matrix = {
  A: names.filter(name => name.startsWith("A-")), B: names.filter(name => name.startsWith("B-")),
  C: names.filter(name => name.startsWith("C-")), D: names.filter(name => name.startsWith("D-")),
  E: names.filter(name => /^(A-oblique|B-handoff|C-groups|D-kept)/.test(name))
};
writeFileSync(join(directory, "acceptance-matrix.json"), JSON.stringify({ head, baselineHead,
  states: { automation: "Exact-head PNG/JSON assertions verified", contractVerified: "PENDING independent review", productAccepted: "NOT REQUESTED" },
  failBefore: baseline, baselineAssertions: "5 expected failures reproduced",
  tasks: Object.fromEntries(Object.entries(matrix).map(([id, evidence]) => [id, { result: evidence.length && evidence.every(name => cases[name]) ? "PASS" : "FAIL", evidence }])),
  protected: protectedMatrix.matrix }, null, 2));
console.log(`C03 renewed evidence: ${head}, ${names.length} corrected + ${baseline.length} baseline PNG/JSON pairs; protected T01-T06 verified`);
