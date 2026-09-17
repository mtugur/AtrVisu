import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");
const fail = (message) => {
  console.error(`interaction-governance: ${message}`);
  process.exitCode = 1;
};

const requiredFiles = [
  "docs/product/ATRVISU_PRODUCT_CONSTITUTION.md",
  "docs/protocols/MASTER_PLAN_SYNC_PROTOCOL.md",
  "docs/governance/MASTER_PLAN_PROJECTION.md",
  "docs/governance/MASTER_PLAN_SOURCE_FINGERPRINT.md",
  "docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md",
  "docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md",
  "docs/standards/ATRVISU_INTERACTION_STANDARD.md",
  "docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md",
  "docs/checklists/INTERACTION_CHANGE_GATE.md",
  "docs/protocols/CODEX_SYNC_PROTOCOL.md",
  ".github/pull_request_template.md",
  "AGENTS.md"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing required authority file: ${file}`);
}

if (process.exitCode) process.exit(process.exitCode);

const constitution = read("docs/product/ATRVISU_PRODUCT_CONSTITUTION.md");
const masterSync = read("docs/protocols/MASTER_PLAN_SYNC_PROTOCOL.md");
const masterProjection = read("docs/governance/MASTER_PLAN_PROJECTION.md");
const masterFingerprint = read("docs/governance/MASTER_PLAN_SOURCE_FINGERPRINT.md");
const benchmarkStandard = read("docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md");
const benchmarkBaseline = read("docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md");
const interaction = read("docs/standards/ATRVISU_INTERACTION_STANDARD.md");
const delivery = read("docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md");
const checklist = read("docs/checklists/INTERACTION_CHANGE_GATE.md");
const protocol = read("docs/protocols/CODEX_SYNC_PROTOCOL.md");
const prTemplate = read(".github/pull_request_template.md");
const agents = read("AGENTS.md");

const requireText = (label, text, snippets) => {
  for (const snippet of snippets) {
    if (!text.includes(snippet)) fail(`${label} missing invariant: ${snippet}`);
  }
};

requireText("constitution", constitution, [
  "Benchmark-first rule",
  "implementation is blocked",
  "Product acceptance is not CI acceptance",
  "Automation Green",
  "Contract Verified",
  "Product Accepted",
  "The next action is not another tuning pass"
]);

requireText("master-plan sync", masterSync, [
  "Project-level planning sources",
  "cannot reliably constrain implementation",
  "repository-level implementation constitution",
  "repository contract/ADR",
  "The chat itself is not the durable enforcement mechanism"
]);

requireText("master-plan projection", masterProjection, [
  "Office/CAD/engineering user habits are the UI basis",
  "ATRVISU_INTERACTION_STANDARD.md",
  "No-red-console",
  "Current source-sync status"
]);

requireText("master-plan fingerprint", masterFingerprint, [
  "SHA-256 of reviewed DOCX bytes",
  "0ff97ed5c07213b1a875cd3ebdd498cc739c0f07eb35c48b9777cacf9bd58da7",
  "different SHA-256",
  "Repository CI cannot fetch the ChatGPT Project resource by itself"
]);

requireText("benchmark evidence standard", benchmarkStandard, [
  "Naming a product is not sufficient evidence",
  "Required evidence record",
  "Task-similarity rule",
  "Anti-laundering rule",
  "Benchmark research must precede implementation"
]);

requireText("benchmark baseline", benchmarkBaseline, [
  "Visual Components 4.8/4.10",
  "Autodesk Factory Design Utilities",
  "Siemens Tecnomatix / RobotExpert 15",
  "SOLIDWORKS 2025",
  "AutoCAD 3D Move",
  "Free drag is separate from constrained triad movement",
  "Numeric property editing alongside graphical manipulation"
]);

requireText("interaction standard", interaction, [
  "## 3. Plan Move",
  "Direct body drag",
  "body pointer interaction is selection/picking only",
  "Camera angle must not silently change",
  "## 10. Inspector numeric editing",
  "Maximum update depth exceeded",
  "## 13. Runtime console contract",
  "User-reported console stacks are treated as first-class acceptance evidence"
]);

requireText("interaction delivery", delivery, [
  "Contract freeze before code",
  "Normative-file protection",
  "Benchmark evidence before implementation",
  "one normal implementation round",
  "one consolidated correction batch",
  "Tests are derived from the frozen user-observable contract",
  "Existing non-compliant work"
]);

requireText("interaction checklist", checklist, [
  "traceable benchmark evidence record",
  "Benchmark evidence existed before implementation",
  "Correction budget / reviewer independence",
  "Maximum update depth exceeded",
  "Automation Green: PASS / FAIL",
  "Contract Verified: PASS / FAIL",
  "Product Accepted: PASS / FAIL / N/A"
]);

requireText("Codex protocol", protocol, [
  "ATRVISU_PRODUCT_CONSTITUTION.md",
  "MASTER_PLAN_SYNC_PROTOCOL.md",
  "ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md",
  "ATRVISU_INTERACTION_STANDARD.md",
  "INTERACTION_DELIVERY_PROTOCOL.md",
  "Contract yoksa KOD YAZILMAZ",
  "Traceable benchmark evidence record",
  "Rendering library/framework default davranışı benchmark değildir",
  "Correction budget",
  "User-reported runtime error sentetik testte görülmedi diye kapatılamaz"
]);

requireText("PR template", prTemplate, [
  "Interaction declaration",
  "Benchmark evidence record path",
  "Authoritative source(s)",
  "Interaction Standard section",
  "Automation Green",
  "Contract Verified",
  "Product Accepted",
  "Stop-rule check",
  "Normative contract/benchmark files are not being changed post-hoc"
]);

requireText("AGENTS", agents, [
  "ATRVISU_PRODUCT_CONSTITUTION.md",
  "MASTER_PLAN_SYNC_PROTOCOL.md",
  "ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md",
  "ATRVISU_INTERACTION_STANDARD.md",
  "INTERACTION_DELIVERY_PROTOCOL.md",
  "normatif sözleşme yoksa implementasyon yapılmaz",
  "traceable official/credible evidence",
  "Etkileşim Değişikliği Stop Rule",
  "Automation Green",
  "Contract Verified",
  "Product Accepted"
]);

const constitutionOrder = agents.indexOf("docs/product/ATRVISU_PRODUCT_CONSTITUTION.md");
const masterSyncOrder = agents.indexOf("docs/protocols/MASTER_PLAN_SYNC_PROTOCOL.md");
const benchmarkOrder = agents.indexOf("docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md");
const interactionOrder = agents.indexOf("docs/standards/ATRVISU_INTERACTION_STANDARD.md");
const deliveryOrder = agents.indexOf("docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md");
const protocolOrder = agents.indexOf("docs/protocols/CODEX_SYNC_PROTOCOL.md");
if (!(constitutionOrder >= 0 && masterSyncOrder > constitutionOrder && benchmarkOrder > masterSyncOrder && interactionOrder > benchmarkOrder && deliveryOrder > interactionOrder && protocolOrder > deliveryOrder)) {
  fail("AGENTS authority order is not constitution -> master-plan sync -> benchmark evidence -> interaction standard -> interaction delivery -> Codex protocol");
}

const forbiddenWeakeningPatterns = [
  /Automation Green[^\n]{0,80}(?:means|=|is)\s+(?:accepted|complete|merge-ready)/i,
  /framework default[^\n]{0,80}(?:product standard|final UX)/i,
  /user-reported runtime error[^\n]{0,100}(?:ignore|dismiss|close because tests pass)/i,
  /benchmark[^\n]{0,80}(?:after implementation|post-hoc)[^\n]{0,80}(?:acceptable|allowed)/i
];
for (const pattern of forbiddenWeakeningPatterns) {
  for (const [label, text] of [
    ["constitution", constitution],
    ["master-plan sync", masterSync],
    ["benchmark standard", benchmarkStandard],
    ["interaction delivery", delivery],
    ["protocol", protocol],
    ["AGENTS", agents]
  ]) {
    if (pattern.test(text)) fail(`${label} contains governance-weakening language matching ${pattern}`);
  }
}

if (!process.exitCode) {
  console.log("interaction-governance: PASS — source sync, benchmark evidence, frozen interaction contract, delivery stop rules and anti-regression invariants are present");
}
