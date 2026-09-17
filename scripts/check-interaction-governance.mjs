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
  "docs/standards/ATRVISU_INTERACTION_STANDARD.md",
  "docs/checklists/INTERACTION_CHANGE_GATE.md",
  "docs/protocols/CODEX_SYNC_PROTOCOL.md",
  "AGENTS.md"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing required authority file: ${file}`);
}

if (process.exitCode) process.exit(process.exitCode);

const constitution = read("docs/product/ATRVISU_PRODUCT_CONSTITUTION.md");
const interaction = read("docs/standards/ATRVISU_INTERACTION_STANDARD.md");
const checklist = read("docs/checklists/INTERACTION_CHANGE_GATE.md");
const protocol = read("docs/protocols/CODEX_SYNC_PROTOCOL.md");
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

requireText("interaction checklist", checklist, [
  "Benchmark precedent",
  "Stop implementation",
  "Maximum update depth exceeded",
  "Automation Green: PASS / FAIL",
  "Contract Verified: PASS / FAIL",
  "Product Accepted: PASS / FAIL / N/A"
]);

requireText("Codex protocol", protocol, [
  "ATRVISU_PRODUCT_CONSTITUTION.md",
  "ATRVISU_INTERACTION_STANDARD.md",
  "Contract yoksa KOD YAZILMAZ",
  "Rendering library/framework default davranışı benchmark değildir",
  "Stop rule",
  "User-reported runtime error sentetik testte görülmedi diye kapatılamaz"
]);

requireText("AGENTS", agents, [
  "ATRVISU_PRODUCT_CONSTITUTION.md",
  "ATRVISU_INTERACTION_STANDARD.md",
  "normatif sözleşme yoksa implementasyon yapılmaz",
  "Rendering framework/library default davranışı ürün standardı sayılmaz",
  "Etkileşim Değişikliği Stop Rule",
  "Automation Green",
  "Contract Verified",
  "Product Accepted"
]);

const authorityOrder = agents.indexOf("docs/product/ATRVISU_PRODUCT_CONSTITUTION.md");
const interactionOrder = agents.indexOf("docs/standards/ATRVISU_INTERACTION_STANDARD.md");
const protocolOrder = agents.indexOf("docs/protocols/CODEX_SYNC_PROTOCOL.md");
if (!(authorityOrder >= 0 && interactionOrder > authorityOrder && protocolOrder > interactionOrder)) {
  fail("AGENTS authority order is not constitution -> interaction standard -> protocol");
}

const forbiddenWeakeningPatterns = [
  /Automation Green[^\n]{0,80}(?:means|=|is)\s+(?:accepted|complete|merge-ready)/i,
  /framework default[^\n]{0,80}(?:product standard|final UX)/i
];
for (const pattern of forbiddenWeakeningPatterns) {
  for (const [label, text] of [["constitution", constitution], ["protocol", protocol], ["AGENTS", agents]]) {
    if (pattern.test(text)) fail(`${label} contains governance-weakening language matching ${pattern}`);
  }
}

if (!process.exitCode) {
  console.log("interaction-governance: PASS — authority chain and anti-regression invariants are present");
}
