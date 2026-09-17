import fs from "node:fs";

const eventName = process.env.GITHUB_EVENT_NAME;
const eventPath = process.env.GITHUB_EVENT_PATH;

if (eventName !== "pull_request" || !eventPath || !fs.existsSync(eventPath)) {
  console.log("pr-governance: SKIP — not a pull_request event");
  process.exit(0);
}

const event = JSON.parse(fs.readFileSync(eventPath, "utf8"));
const body = event.pull_request?.body ?? "";
const fail = (message) => {
  console.error(`pr-governance: ${message}`);
  process.exitCode = 1;
};

const section = (heading, nextHeading) => {
  const start = body.indexOf(heading);
  if (start < 0) return "";
  const from = start + heading.length;
  const end = nextHeading ? body.indexOf(nextHeading, from) : -1;
  return body.slice(from, end >= 0 ? end : body.length);
};

const fieldValue = (text, label) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`^- ${escaped}:\\s*(.+)$`, "mi"));
  return match?.[1]?.trim() ?? "";
};

for (const heading of [
  "## Scope",
  "## Authority",
  "## Interaction declaration",
  "## Runtime / console",
  "## Validation",
  "## Stop-rule check"
]) {
  if (!body.includes(heading)) fail(`missing required PR section: ${heading}`);
}

const scope = section("## Scope", "## Authority");
for (const label of ["Primary product objective", "Phase / product layer", "Bounded module", "Explicit out of scope"]) {
  const value = fieldValue(scope, label);
  if (!value || /^(?:n\/?a|none|tbd|pending)$/i.test(value)) {
    fail(`Scope field must be concrete: ${label}`);
  }
}

const authority = section("## Authority", "## Interaction declaration");
if (!/- \[[xX]\] Read `AGENTS\.md`/.test(authority)) fail("AGENTS read checkbox is not checked");
if (!/- \[[xX]\] Read `docs\/product\/ATRVISU_PRODUCT_CONSTITUTION\.md`/.test(authority)) fail("Product Constitution read checkbox is not checked");
if (!fieldValue(authority, "Relevant standards / exact sections")) fail("Relevant standards / exact sections is empty");
if (!fieldValue(authority, "Existing canonical authorities preserved")) fail("Existing canonical authorities preserved is empty");
if (!fieldValue(authority, "Master Plan / Project source sync status")) fail("Master Plan / Project source sync status is empty");

const interaction = section("## Interaction declaration", "## Runtime / console");
const noChecked = /- \[[xX]\] No(?:\s|$)/m.test(interaction);
const yesChecked = /- \[[xX]\] Yes(?:\s|$)/m.test(interaction);
if (noChecked === yesChecked) fail("Interaction declaration must check exactly one of Yes or No");

const rationaleMatch = interaction.match(/Interaction impact rationale \(required for either answer\):\s*\n+([^\n#].*)/i);
if (!rationaleMatch?.[1]?.trim()) fail("Interaction impact rationale is required");

if (yesChecked) {
  for (const label of [
    "Interaction Standard section(s)",
    "Benchmark evidence record path",
    "Named benchmark precedent(s)",
    "Authoritative source(s)",
    "Desired user-observable behavior",
    "Forbidden behavior / regressions"
  ]) {
    const value = fieldValue(interaction, label);
    if (!value || /^(?:n\/?a|none|tbd|pending)$/i.test(value)) fail(`Interaction field must be concrete: ${label}`);
  }

  for (const phrase of [
    "Benchmark evidence satisfies `docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md`.",
    "`docs/checklists/INTERACTION_CHANGE_GATE.md` is completed/evidenced.",
    "`docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md` correction budget is respected."
  ]) {
    const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (!new RegExp(`- \\[[xX]\\] ${escaped}`).test(interaction)) fail(`required interaction checkbox is not checked: ${phrase}`);
  }
}

const validation = section("## Validation", "## Stop-rule check");
for (const label of ["Automation Green", "Contract Verified", "Product Accepted"]) {
  if (!new RegExp(`^- ${label}:\\s*(?:PASS|FAIL|PENDING|N\\/A)(?:\\s|$)`, "mi").test(validation)) {
    fail(`Validation state is missing/invalid: ${label}`);
  }
}

const stopRule = section("## Stop-rule check", null);
const stopCheckboxes = [...stopRule.matchAll(/^- \[([ xX])\] /gm)];
if (stopCheckboxes.length < 5) fail("Stop-rule section does not contain the expected checks");
if (stopCheckboxes.some((match) => match[1] === " ")) fail("All stop-rule checks must be explicitly checked before CI can pass");

if (!process.exitCode) {
  console.log(`pr-governance: PASS — declaration complete; interaction=${yesChecked ? "yes" : "no"}`);
}
