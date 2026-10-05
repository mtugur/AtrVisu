import { test } from "node:test";
import assert from "node:assert/strict";
import { validateMeasureRecord } from "./validate-measure-evidence.mjs";

const head = "a".repeat(40);
const valid = () => ({ name:"M03-distance-result", sourceHead:head, ciRun:"123", scenarios:["M03"], consoleErrors:[],
  before:{invariants:{selectionIds:[]},viewport:{sceneLifecycleGeneration:1},canvasIdentity:{id:1,count:1,connected:true},dpr:1,renderSize:[1440,900],cssSize:[1440,900]},
  after:{invariants:{selectionIds:[]},viewport:{sceneLifecycleGeneration:1},canvasIdentity:{id:1,count:1,connected:true},dpr:1,renderSize:[1440,900],cssSize:[1440,900]},
  session:JSON.stringify({kind:"distance",completed:true,entry:{selectionIds:[]},points:[{xMm:0,yMm:0,zMm:0},{xMm:3000,yMm:4000,zMm:12000}],result:{values:[3000,4000,12000,13000,5000].map(value=>({value}))}}),displayed:"13000.000 mm" });
test("canonical real-observation record validates",()=>assert.doesNotThrow(()=>validateMeasureRecord(valid(),head,"123")));
for (const [name, change, code] of [
  ["stale head",r=>r.sourceHead="b".repeat(40),"PROVENANCE"],
  ["wrong run",r=>r.ciRun="old","PROVENANCE"],
  ["red console",r=>r.consoleErrors=["Maximum update depth"],"RED_CONSOLE"],
  ["domain mutation",r=>r.after.invariants.selectionIds=["civil:x"],"DOMAIN_MUTATION"],
  ["lifecycle",r=>r.after.viewport.sceneLifecycleGeneration=2,"LIFECYCLE"],
  ["replaced canvas",r=>r.after.canvasIdentity.id=2,"CANVAS_IDENTITY"],
  ["unrequested camera",r=>r.after.camera={alpha:1},"CAMERA_MUTATION"],
  ["wrong arithmetic",r=>{const s=JSON.parse(r.session);s.result.values[3].value=999;r.session=JSON.stringify(s);},"ARITHMETIC"],
  ["missing classifier",r=>{r.name="M08-classifier-dpr-1";r.observations=[];},"CLASSIFIER_INCOMPLETE"],
  ["missing dock geometry",r=>{r.name="M09-640-dark-docks-pinned";r.observations={};},"DOCK_PROJECTION"]
]) test(`rejects ${name}`,()=>{const r=valid();change(r);assert.throws(()=>validateMeasureRecord(r,head,"123"),new RegExp(code));});
