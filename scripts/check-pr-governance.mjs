import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
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

const stripTicks = (value) => value.replace(/^`|`$/g, "").trim();
const isConcrete = (value) => Boolean(value) && !/^(?:n\/?a|none|tbd|pending)$/i.test(value.trim());
const checkboxChecked = (text, phrase) => {
  const escaped = phrase.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`^- \\[[xX]\\] ${escaped}\\s*$`, "m").test(text);
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
  if (!isConcrete(value)) fail(`Scope field must be concrete: ${label}`);
}

const authority = section("## Authority", "## Interaction declaration");
if (!/- \[[xX]\] Read `AGENTS\.md`/.test(authority)) fail("AGENTS read checkbox is not checked");
if (!/- \[[xX]\] Read `docs\/product\/ATRVISU_PRODUCT_CONSTITUTION\.md`/.test(authority)) fail("Product Constitution read checkbox is not checked");
for (const label of [
  "Relevant standards / exact sections",
  "Existing canonical authorities preserved",
  "Master Plan / Project source sync status"
]) {
  if (!isConcrete(fieldValue(authority, label))) fail(`${label} is empty or non-concrete`);
}

const interaction = section("## Interaction declaration", "## Runtime / console");
const noChecked = /^- \[[xX]\] No\s*$/m.test(interaction);
const yesChecked = /^- \[[xX]\] Yes\s*$/m.test(interaction);
if (noChecked === yesChecked) fail("Interaction declaration must check exactly one of Yes or No");

const rationaleMatch = interaction.match(/Interaction impact rationale \(required for either answer\):\s*\n+([^\n#].*)/i);
if (!rationaleMatch?.[1]?.trim()) fail("Interaction impact rationale is required");

const baseSha = event.pull_request?.base?.sha;
const headSha = event.pull_request?.head?.sha;
let changedFiles = [];
if (baseSha && headSha) {
  const diff = spawnSync("git", ["diff", "--name-only", baseSha, headSha], {
    cwd: root,
    encoding: "utf8"
  });
  if (diff.status === 0) {
    changedFiles = diff.stdout.split(/\r?\n/).map((item) => item.trim()).filter(Boolean);
  } else {
    fail(`unable to inspect PR changed files: ${diff.stderr || diff.stdout}`);
  }
}

const contractSensitiveChange = changedFiles.some((file) =>
  file === "docs/standards/ATRVISU_INTERACTION_STANDARD.md" ||
  file === "docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md" ||
  file.startsWith("docs/benchmarks/")
);
if (contractSensitiveChange && !yesChecked) {
  fail("interaction/benchmark contract files changed but Interaction declaration is not Yes");
}

if (yesChecked) {
  const requiredFields = [
    "Interaction Standard section(s)",
    "Benchmark evidence record path",
    "Named benchmark precedent(s)",
    "Authoritative source(s)",
    "Desired user-observable behavior",
    "Forbidden behavior / regressions"
  ];
  for (const label of requiredFields) {
    const value = fieldValue(interaction, label);
    if (!isConcrete(value)) fail(`Interaction field must be concrete: ${label}`);
  }

  const benchmarkPath = stripTicks(fieldValue(interaction, "Benchmark evidence record path"));
  if (!benchmarkPath.startsWith("docs/benchmarks/")) {
    fail("Benchmark evidence record path must be under docs/benchmarks/");
  } else {
    const absoluteBenchmarkPath = path.join(root, benchmarkPath);
    if (!fs.existsSync(absoluteBenchmarkPath)) {
      fail(`Benchmark evidence record does not exist: ${benchmarkPath}`);
    } else {
      const evidence = fs.readFileSync(absoluteBenchmarkPath, "utf8");
      for (const token of ["Review date:", "Official source", "Task similarity", "AtrVisu adoption"]) {
        if (!evidence.includes(token)) fail(`Benchmark evidence record missing required content: ${token}`);
      }
      if (!/https:\/\//.test(evidence)) fail("Benchmark evidence record must contain at least one traceable HTTPS source");
    }
  }

  const authoritativeSources = fieldValue(interaction, "Authoritative source(s)");
  if (!/(?:https:\/\/|docs\/benchmarks\/)/.test(authoritativeSources)) {
    fail("Authoritative source(s) must include an HTTPS source or docs/benchmarks reference");
  }

  for (const phrase of [
    "Benchmark evidence satisfies `docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md`.",
    "Benchmark evidence existed before implementation or this PR is explicitly a governance/contract package.",
    "The standard already defines this behavior, OR the contract delta was frozen before implementation.",
    "Any intentional benchmark deviation has an ADR.",
    "`docs/checklists/INTERACTION_CHANGE_GATE.md` is completed/evidenced.",
    "`docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md` correction budget is respected."
  ]) {
    if (!checkboxChecked(interaction, phrase)) fail(`required interaction checkbox is not checked: ${phrase}`);
  }
}

const runtime = section("## Runtime / console", "## Validation");
for (const phrase of [
  "No blocker console errors in realistic runtime path.",
  "Known blocker text is not suppressed/filtered."
]) {
  if (!checkboxChecked(runtime, phrase)) fail(`required runtime checkbox is not checked: ${phrase}`);
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
  console.log(`pr-governance: PASS — declaration complete; interaction=${yesChecked ? "yes" : "no"}; files=${changedFiles.length}`);
}
