import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";

const root = "test-results/c03-measure-recovery", directory = join(root, "delivery");
const head = process.env.ATRVISU_E2E_EXPECTED_SOURCE_HEAD;
const baselineHead = "dc1ac534eff517410f41ebe390ec513b494ebd8b";
assert.match(head ?? "", /^[a-f0-9]{40}$/);
const read = path => JSON.parse(readFileSync(path, "utf8"));
const hash = path => createHash("sha256").update(readFileSync(path)).digest("hex");
const modes = ["true-3d", "plan-xy", "vertical-xz", "vertical-yz", "axis-x", "axis-y", "axis-z"];
const names = [1440, 1024, 640].flatMap(width => [
  `R1-edit-${width}`, `R1-reload-${width}`, `R6-resume-${width}`, `R2-references-${width}`,
  ...modes.map(mode => `R3-${mode}-${width}`), `R4-manual-pair-${width}`, `R5-fan-out-${width}`, `R7-reuse-${width}`
]).concat("R7-locks-1440", "R7-dimensions-keep-once-1440");
const files = [];
for (const name of names) {
  const json = join(directory, name + ".json"), png = join(directory, name + ".png"), data = read(json), pixels = readFileSync(png);
  assert.equal(data.servedHead, head, name + " served stale head"); assert.equal(data.deliveryHead, head);
  assert.equal(data.outcome, "PASS"); assert.deepEqual(data.errors, []);
  assert.ok(data.runtime.camera && data.runtime.invariants);
  assert.deepEqual([...pixels.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  const width = Number(name.split("-").pop());
  assert.equal(pixels.readUInt32BE(16), width); assert.equal(pixels.readUInt32BE(20), width === 1440 ? 900 : width === 1024 ? 768 : 800);
  if (data.readouts) for (const bounds of [...data.readouts.references, ...data.readouts.metrics]) {
    const panel = data.readouts.panel;
    assert.ok(bounds.x >= panel.x && bounds.y >= panel.y && bounds.right <= panel.right && bounds.bottom <= panel.bottom, `${name}: clipped ${bounds.name}`);
  }
  if (name.startsWith("R1-edit")) { assert.equal(data.elevation, "1400"); assert.equal(data.persistedLegacyCollapsedFixture, true); }
  if (name.startsWith("R1-reload")) assert.deepEqual(data.reloaded[0].endpoints, data.changed[0].endpoints);
  if (name.startsWith("R6")) {
    assert.equal(data.sameCanvas, true); assert.ok(data.afterReloadGeneration);
    assert.equal(data.changed[0].endpoints[1].zMm, data.saved.endpoints[1].zMm + 400);
    assert.equal(data.beforeResume.invariants.undoDepth, data.beforeEdit.invariants.undoDepth + 1);
    assert.deepEqual(data.beforeResume.invariants, data.runtime.invariants);
  }
  if (name.startsWith("R2") || name.startsWith("R3")) {
    const { a, b } = data;
    assert.ok(a.entityId && b.entityId && a.anchorKind.endsWith("-top") && b.anchorKind.endsWith("-top"));
    assert.notEqual(a.zMm, b.zMm);
    const result = data.result ?? data.state.result;
    for (const [label, expected] of [["3D Distance", Math.hypot(b.xMm-a.xMm,b.yMm-a.yMm,b.zMm-a.zMm)],
      ["Plan Distance", Math.hypot(b.xMm-a.xMm,b.yMm-a.yMm)], ["Delta Z", b.zMm-a.zMm]])
      assert.ok(Math.abs(result.values.find(value => value.label === label)?.value - expected) < 1e-8, name + " actual arithmetic");
  }
  if (name.startsWith("R3")) {
    const { a, b, mode } = data, dx=b.xMm-a.xMm, dy=b.yMm-a.yMm, dz=b.zMm-a.zMm;
    for (const delta of [dx,dy,dz]) assert.notEqual(delta,0,name+" requires nonzero world-axis deltas");
    const expected = { "true-3d": [Math.hypot(dx,dy,dz),[b.xMm,b.yMm,b.zMm]], "plan-xy": [Math.hypot(dx,dy),[b.xMm,b.yMm,a.zMm]],
      "vertical-xz": [Math.hypot(dx,dz),[b.xMm,a.yMm,b.zMm]], "vertical-yz": [Math.hypot(dy,dz),[a.xMm,b.yMm,b.zMm]],
      "axis-x": [Math.abs(dx),[b.xMm,a.yMm,a.zMm]], "axis-y": [Math.abs(dy),[a.xMm,b.yMm,a.zMm]], "axis-z": [Math.abs(dz),[a.xMm,a.yMm,b.zMm]] }[mode];
    assert.ok(expected); assert.ok(Math.abs(data.measured.value-expected[0]) < 1e-8); assert.deepEqual(data.projected, expected[1]);
    assert.deepEqual(data.state.points, [a,b]); assert.equal(data.sameCanvas, true);
    if (mode === "plan-xy") assert.equal(data.keyboardInterpretation,true,name+" must exercise native keyboard selection");
  }
  if (name.startsWith("R4")) {
    assert.equal(data.sameCanvas, true);
    assert.equal(data.afterKeep.invariants.undoDepth, data.beforeKeep.invariants.undoDepth + 2); // Keep + explicit saved A reassociation.
    assert.equal(data.graphics.length, 1); assert.equal(data.graphics[0].references[0].anchor, data.a.anchorKind);
    assert.notEqual(data.replacement.anchorKind, data.a.anchorKind); assert.notEqual(data.replacementB.anchorKind, data.b.anchorKind);
  }
  if (name.startsWith("R5")) {
    assert.equal(data.fanout.relationships.length,2); assert.ok(data.fanout.relationships.every(item=>item.savedAnnotationId));
    assert.deepEqual(data.fanout.relationships.map(item=>item.points),[[data.a,data.b1],[data.a,data.b2]]);
    assert.equal(data.saved.length,2); assert.equal(data.runtime.invariants.undoDepth,data.beforeKeep.invariants.undoDepth+2);
  }
  if (name.startsWith("R7-reuse")) {
    assert.equal(data.sameCanvas,true); assert.equal(data.graphics.length,3);
    assert.deepEqual(data.chain.relationships[1].points[0],data.chain.relationships[0].points[1]);
  }
  if (name === "R7-dimensions-keep-once-1440") {
    assert.equal(data.after.invariants.undoDepth, data.before.invariants.undoDepth + 1, "first Keep must be one history transaction");
    assert.equal(data.runtime.invariants.undoDepth, data.before.invariants.undoDepth + 2, "explicit Restart must be required for second Keep");
  }
  if (name === "R7-locks-1440") {
    assert.equal(data.sameCanvas,true); assert.deepEqual(data.resumedEntry.selectionIds,[data.lockedEntity.id]);
    assert.notDeepEqual(data.currentSelection,data.resumedEntry.selectionIds);
  }
  files.push({name, pngSha256:hash(png), jsonSha256:hash(json)});
}
assert.equal(readdirSync(directory).filter(name=>/\.(png|json)$/.test(name)).length,names.length*2);
const baselineNames=["missing-workflows","automatic-pair","completed-dead-end","inspector-collapsed-picking"];
for (const name of baselineNames) {
  const data=read(join(root,"baseline",name+".json")); assert.equal(data.servedHead,baselineHead); assert.equal(data.deliveryHead,head);
  assert.equal(data.taskResult,"FAIL"); assert.deepEqual(data.errors,[]); assert.ok(readFileSync(join(root,"baseline",name+".png")).length>1000);
}
const unit=read(join(root,"baseline-unit.json")); assert.equal(unit.numTotalTests,5); assert.equal(unit.numFailedTests,5);
const protectedMatrix=read("test-results/c03-measure-v2-stage-b/acceptance-matrix.json"); assert.equal(protectedMatrix.head,head);
for(const id of ["T01","T02","T03","T04","T05","T06"]) assert.equal(protectedMatrix.matrix[id].automatedResult,"PASS");
const prior=read("test-results/c03-measure-v2-task/acceptance-matrix.json"); assert.equal(prior.head,head);
for(const id of ["A","B","C","D","E"]) assert.equal(prior.tasks[id].result,"PASS");
writeFileSync(join(root,"acceptance-matrix.json"),JSON.stringify({head,baselineHead,baselineNames,baselineUnit:{total:5,expectedFailures:5},
  states:{automation:"Exact-head user-route assertions verified; consult linked Quality Gate for complete run result",contractVerified:"PENDING independent review",productAccepted:"PENDING",independentNormalWindowsChrome:"NOT VERIFIED"},
  tasks:Object.fromEntries([1,2,3,4,5,6,7].map(id=>[`R${id}`,{automatedResult:"PASS",evidence:files.filter(file=>file.name.startsWith(`R${id}-`))}])),
  protected:protectedMatrix.matrix, priorTasks:prior.tasks},null,2));
console.log(`C03 recovery ${head}: ${names.length} delivery pairs + 4 rejected-baseline pairs; 5 negative oracles; A-E/T01-T06 retained`);
