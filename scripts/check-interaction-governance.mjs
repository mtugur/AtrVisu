import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const files = {
  constitution: "docs/product/ATRVISU_PRODUCT_CONSTITUTION.md",
  interaction: "docs/standards/ATRVISU_INTERACTION_STANDARD.md",
  agents: "AGENTS.md",
  codex: "docs/protocols/CODEX_SYNC_PROTOCOL.md",
  gate: "docs/checklists/INTERACTION_GOVERNANCE_GATE.md",
  packageJson: "package.json",
  workflow: ".github/workflows/quality-gate.yml"
};

const read = (relativePath) => {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Missing required governance file: ${relativePath}`);
  }
  return fs.readFileSync(absolutePath, "utf8");
};

const assertContains = (label, content, required) => {
  for (const value of required) {
    if (!content.includes(value)) {
      throw new Error(`${label} is missing required governance contract text: ${value}`);
    }
  }
};

const constitution = read(files.constitution);
const interaction = read(files.interaction);
const agents = read(files.agents);
const codex = read(files.codex);
const gate = read(files.gate);
const packageJson = JSON.parse(read(files.packageJson));
const workflow = read(files.workflow);

assertContains("Product Constitution", constitution, [
  "Benchmark-first product rule",
  "Familiarity over local cleverness",
  "Scope containment",
  "Automation Green",
  "Contract Verified",
  "Product Accepted",
  "No-red-console is constitutional",
  "implementation is blocked",
  "User fatigue or a desire to stop testing is not acceptance"
]);

assertContains("Interaction Standard", interaction, [
  "Canonical benchmark set",
  "Plan Move — Phase 1 frozen contract",
  "Entity body click = selection",
  "Plan translation authority = explicit Move manipulator",
  "Direct body free-drag is **not** a Phase 1 Plan Move authority",
  "Camera independence",
  "Numeric editing and live external updates",
  "Maximum update depth exceeded",
  "Required regression matrix for Plan Move",
  "https://help.visualcomponents.com/",
  "https://help.solidworks.com/",
  "https://help.autodesk.com/",
  "https://blogs.sw.siemens.com/"
]);

assertContains("AGENTS.md", agents, [
  "docs/product/ATRVISU_PRODUCT_CONSTITUTION.md",
  "docs/standards/ATRVISU_INTERACTION_STANDARD.md",
  "Interaction Değişikliği Stop Rule",
  "Benchmark-first for user-facing interaction",
  "Automation Green",
  "Contract Verified",
  "Product Accepted"
]);

const agentsConstitutionIndex = agents.indexOf("docs/product/ATRVISU_PRODUCT_CONSTITUTION.md");
const agentsInteractionIndex = agents.indexOf("docs/standards/ATRVISU_INTERACTION_STANDARD.md");
const agentsGeneralStandardsIndex = agents.indexOf("İlgili diğer dosyalar: `docs/standards/*`");
if (!(agentsConstitutionIndex >= 0 && agentsInteractionIndex > agentsConstitutionIndex && agentsGeneralStandardsIndex > agentsInteractionIndex)) {
  throw new Error("AGENTS.md mandatory read order must place Product Constitution and Interaction Standard before general standards.");
}

assertContains("Codex Sync Protocol", codex, [
  "Görev Öncesi Zorunlu Paket",
  "Benchmark precedent",
  "Interaction Standard section",
  "Deviation ADR",
  "No-Invention Rule",
  "Scope Drift Rule",
  "Automation Green",
  "Contract Verified",
  "Product Accepted",
  "User Manual Burden Rule"
]);

assertContains("Interaction Governance Gate", gate, [
  "Hard fail",
  "Benchmark precedent",
  "RUNTIME FAILURE",
  "AUTOMATION GREEN — CONTRACT REVIEW PENDING",
  "CONTRACT VERIFIED — PRODUCT ACCEPTANCE PENDING",
  "PRODUCT ACCEPTED — READY FOR MERGE DECISION"
]);

if (packageJson.scripts?.["check:interaction-governance"] !== "node ./scripts/check-interaction-governance.mjs") {
  throw new Error("package.json must expose check:interaction-governance.");
}

if (!workflow.includes("npm run check:interaction-governance")) {
  throw new Error("Quality Gate must execute check:interaction-governance.");
}

console.log("Interaction governance contract: PASS");
