import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const prChecker = path.join(root, "scripts/check-pr-governance.mjs");
const staticChecker = path.join(root, "scripts/check-interaction-governance.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "atrvisu-governance-"));
let failures = 0;
let passes = 0;

const reportFailure = (name, detail) => {
  failures += 1;
  console.error(`governance-policy-test: FAIL — ${name}: ${detail}`);
};

const reportPass = (name) => {
  passes += 1;
  console.log(`governance-policy-test: PASS — ${name}`);
};

const runPrChecker = (body, { cwd = root, baseSha, headSha } = {}) => {
  const eventPath = path.join(tempRoot, `event-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { body, base: { sha: baseSha }, head: { sha: headSha } } }), "utf8");
  return spawnSync(process.execPath, [prChecker], {
    cwd,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: eventPath
    }
  });
};

const expectPrPass = (name, body, options) => {
  const result = runPrChecker(body, options);
  if (result.status !== 0) {
    reportFailure(name, `${result.stdout}\n${result.stderr}`.trim());
  } else {
    reportPass(name);
  }
};

const expectPrFail = (name, body, expectedText, options) => {
  const result = runPrChecker(body, options);
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0) {
    reportFailure(name, "checker unexpectedly passed");
  } else if (expectedText && !output.includes(expectedText)) {
    reportFailure(name, `expected failure text not found: ${expectedText}\n${output}`);
  } else {
    reportPass(name);
  }
};

const commonScope = `## Scope

- Primary product objective: Prove governance policy behavior
- Phase / product layer: Platform governance
- Bounded module: Interaction governance
- Explicit out of scope: Runtime product implementation

## Authority

- [x] Read \`AGENTS.md\`
- [x] Read \`docs/product/ATRVISU_PRODUCT_CONSTITUTION.md\`
- Relevant standards / exact sections: Product Constitution 2-11; Interaction Standard 1-14
- Existing canonical authorities preserved: Repository normative authority chain
- Master Plan / Project source sync status: Master Plan v3.0 fingerprint and projection reviewed
`;

const runtimeAndValidation = `## Runtime / console

- User-reported reproduction path, if any: Governance-only package; existing PF-3A report remains unresolved outside this PR
- [x] No blocker console errors in realistic runtime path.
- [x] Known blocker text is not suppressed/filtered.
- [x] If a user supplied a stack trace, tests cover the same component/workflow path.

## Validation

- Automation Green: PENDING
- Contract Verified: PENDING
- Product Accepted: N/A

Tests/evidence: governance policy stress tests

## Stop-rule check

- [x] This is not a third tuning round for the same basic interaction.
- [x] No hidden fallback, camera-specific sign correction, catch-up, gain clamp, hysteresis or smoothing is being added merely to make a wrong interaction model feel usable.
- [x] The PR has not silently expanded into a different product/architecture objective.
- [x] Normative contract/benchmark files are not being changed post-hoc merely to bless implementation already written.
- [x] User is not being used as exploratory QA before reviewer-side runtime/contract verification.

If any checkbox above is false, implementation/review must stop and return to benchmark + contract review.
`;

const noInteraction = `${commonScope}
## Interaction declaration

Does this PR change user-facing interaction semantics (selection, move, rotate, resize, drag/drop, snap, camera navigation, Group/multi-selection, Inspector editing, keyboard, Undo/Redo, gizmo/manipulator, viewport tools)?

- [x] No
- [ ] Yes

Interaction impact rationale (required for either answer):
This fixture changes no interaction contract or runtime behavior.

${runtimeAndValidation}`;

const yesInteraction = `${commonScope}
## Interaction declaration

Does this PR change user-facing interaction semantics (selection, move, rotate, resize, drag/drop, snap, camera navigation, Group/multi-selection, Inspector editing, keyboard, Undo/Redo, gizmo/manipulator, viewport tools)?

- [ ] No
- [x] Yes

Interaction impact rationale (required for either answer):
This fixture exercises the frozen Plan Move governance contract.

If **Yes**, complete all:

- Interaction Standard section(s): Section 3 Plan Move; Section 13 Runtime console contract
- Benchmark evidence record path: docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md
- Named benchmark precedent(s): Visual Components Layout Move; Autodesk Factory Reposition; Siemens Placement Manipulator
- Authoritative source(s): docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md; https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/UI%20Overview/Tabs/Layout_View.htm
- Desired user-observable behavior: Direct Machine/Civil body drag uses one fixed horizontal plane captured at the picked-point elevation
- Forbidden behavior / regressions: Adaptive drag planes, camera-relative remapping, Jacobian fallback, PositionGizmo replacement, repeated tuning loops
- [x] Benchmark evidence satisfies \`docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md\`.
- [x] Benchmark evidence existed before implementation or this PR is explicitly a governance/contract package.
- [x] The standard already defines this behavior, OR the contract delta was frozen before implementation.
- [x] Any intentional benchmark deviation has an ADR.
- [x] \`docs/checklists/INTERACTION_CHANGE_GATE.md\` is completed/evidenced.
- [x] \`docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md\` correction budget is respected.

${runtimeAndValidation}`;

expectPrPass("valid non-interaction declaration", noInteraction);
expectPrPass("valid interaction declaration", yesInteraction);
expectPrFail(
  "missing Master Plan sync declaration",
  yesInteraction.replace("Master Plan / Project source sync status: Master Plan v3.0 fingerprint and projection reviewed", "Master Plan / Project source sync status:"),
  "Master Plan / Project source sync status is empty or non-concrete"
);
expectPrFail(
  "both interaction answers checked",
  yesInteraction.replace("- [ ] No", "- [x] No"),
  "Interaction declaration must check exactly one of Yes or No"
);
expectPrFail(
  "missing benchmark evidence path",
  yesInteraction.replace("- Benchmark evidence record path: docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md", "- Benchmark evidence record path: PENDING"),
  "Interaction field must be concrete: Benchmark evidence record path"
);
expectPrFail(
  "nonexistent benchmark record",
  yesInteraction.replace("docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md", "docs/benchmarks/DOES_NOT_EXIST.md"),
  "Benchmark evidence record does not exist"
);
expectPrFail(
  "post-hoc benchmark checkbox not accepted",
  yesInteraction.replace("- [x] Benchmark evidence existed before implementation or this PR is explicitly a governance/contract package.", "- [ ] Benchmark evidence existed before implementation or this PR is explicitly a governance/contract package."),
  "required interaction checkbox is not checked"
);
expectPrFail(
  "runtime blocker gate cannot be left unchecked",
  yesInteraction.replace("- [x] Known blocker text is not suppressed/filtered.", "- [ ] Known blocker text is not suppressed/filtered."),
  "required runtime checkbox is not checked"
);
expectPrFail(
  "stop rule cannot be left unchecked",
  yesInteraction.replace("- [x] The PR has not silently expanded into a different product/architecture objective.", "- [ ] The PR has not silently expanded into a different product/architecture objective."),
  "All stop-rule checks must be explicitly checked"
);
expectPrFail(
  "interaction rationale is mandatory",
  yesInteraction.replace("This fixture exercises the frozen Plan Move governance contract.", ""),
  "Interaction impact rationale is required"
);

// Real Git commits exercise classification, including names/modes that a body cannot prove.
const diffRoot = path.join(tempRoot, "diff-root");
fs.mkdirSync(diffRoot);
const gitEnv = {
  ...process.env,
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
  GIT_INDEX_FILE: path.join(diffRoot, "fixture-index"),
  GIT_AUTHOR_NAME: "Governance test",
  GIT_AUTHOR_EMAIL: "governance@example.invalid",
  GIT_COMMITTER_NAME: "Governance test",
  GIT_COMMITTER_EMAIL: "governance@example.invalid",
  GIT_AUTHOR_DATE: "2026-10-15T00:00:00Z",
  GIT_COMMITTER_DATE: "2026-10-15T00:00:00Z"
};
const git = (args, input) => {
  const result = spawnSync("git", args, { cwd: diffRoot, env: gitEnv, input, encoding: "utf8" });
  if (result.status !== 0) throw new Error(`Git fixture failed: ${args.join(" ")}\n${result.stderr}`);
  return result.stdout.trim();
};
git(["init", "--quiet"]);
// Plumbing-only objects are never checked out; permit adversarial names on Windows too.
git(["config", "core.protectNTFS", "false"]);
const baselineBlob = git(["hash-object", "-w", "--stdin"], "baseline\n");
const changedBlob = git(["hash-object", "-w", "--stdin"], "changed\n");
const removedRuntime = "src/removed-runtime.ts";
git(["update-index", "--add", "--cacheinfo", "100644", baselineBlob, removedRuntime]);
const removedDocument = "docs/product/removed.md";
git(["update-index", "--add", "--cacheinfo", "100644", baselineBlob, removedDocument]);
const baseSha = git(["commit-tree", git(["write-tree"]), "-m", "baseline"]);
const diffFixture = (changes) => {
  git(["read-tree", baseSha]);
  for (const { file, mode = "100644", blob = changedBlob, remove = false } of changes) {
    git(remove ? ["update-index", "--force-remove", file] : ["update-index", "--add", "--cacheinfo", mode, blob, file]);
  }
  const headSha = git(["commit-tree", git(["write-tree"]), "-p", baseSha, "-m", "fixture"]);
  return { cwd: diffRoot, baseSha, headSha };
};
const fixtureBenchmark = path.join(diffRoot, "docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md");
fs.mkdirSync(path.dirname(fixtureBenchmark), { recursive: true });
fs.copyFileSync(path.join(root, "docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md"), fixtureBenchmark);
const naDeclaration = "- Runtime evidence: N/A — governance-only / not executed";
const noConsoleClaim = "- [ ] No blocker console errors in realistic runtime path.";
const governanceBody = yesInteraction.replace(
  "- [x] No blocker console errors in realistic runtime path.", `${noConsoleClaim}\n${naDeclaration}`
);
const docsDiff = diffFixture([{ file: "docs/product/contract.md" }]);
for (const directory of ["product", "standards", "adr", "checklists", "benchmarks", "governance", "protocols"]) {
  expectPrPass(`verified governance-only ${directory} permits honest N/A`, governanceBody,
    diffFixture([{ file: `docs/${directory}/contract.md` }]));
}
expectPrPass("verified governance-only non-interaction permits honest N/A",
  noInteraction.replace("- [x] No blocker console errors in realistic runtime path.", `${noConsoleClaim}\n${naDeclaration}`), docsDiff);
expectPrFail("governance-only cannot claim unexecuted runtime PASS", yesInteraction,
  "governance-only requires explicit Runtime evidence N/A", docsDiff);
expectPrFail("governance-only N/A cannot also check runtime PASS",
  governanceBody.replace(noConsoleClaim, "- [x] No blocker console errors in realistic runtime path."),
  "governance-only cannot claim runtime console PASS", docsDiff);
expectPrFail("governance-only retains no-filter requirement",
  governanceBody.replace("- [x] Known blocker text is not suppressed/filtered.", "- [ ] Known blocker text is not suppressed/filtered."),
  "required runtime checkbox is not checked", docsDiff);
expectPrFail("governance-only retains interaction declaration",
  governanceBody.replace("- [ ] No\n- [x] Yes", "- [x] No\n- [ ] Yes"),
  "interaction/benchmark contract files changed but Interaction declaration is not Yes",
  diffFixture([{ file: "docs/standards/ATRVISU_INTERACTION_STANDARD.md" }]));
expectPrFail("governance-only retains benchmark requirements",
  governanceBody.replace("- Benchmark evidence record path: docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md", "- Benchmark evidence record path: PENDING"),
  "Interaction field must be concrete", docsDiff);
expectPrFail("governance-only retains stop-rule requirements",
  governanceBody.replace("- [x] The PR has not silently expanded into a different product/architecture objective.", "- [ ] The PR has not silently expanded into a different product/architecture objective."),
  "All stop-rule checks must be explicitly checked", docsDiff);
expectPrFail("body-only governance claim cannot establish N/A", governanceBody,
  "Runtime evidence N/A requires a verified governance-only diff");
expectPrFail("empty diff cannot establish governance-only N/A", governanceBody,
  "Runtime evidence N/A requires a verified governance-only diff", diffFixture([]));
expectPrFail("missing head provenance cannot establish N/A", governanceBody,
  "Runtime evidence N/A requires a verified governance-only diff", { cwd: diffRoot, baseSha });
expectPrFail("unknown revision fails closed", governanceBody, "unable to inspect PR changed files",
  { ...docsDiff, headSha: "0".repeat(40) });
expectPrFail("invalid revision fails closed", governanceBody, "invalid PR diff provenance",
  { ...docsDiff, headSha: "--all" });
for (const file of ["src/App.tsx", "src/styles.css", "e2e/app-smoke.spec.ts", "src/example.test.ts",
  ".github/workflows/quality-gate.yml", "package.json", "package-lock.json", "public/library/asset.json",
  "scripts/check-pr-governance.mjs", "docs/audits/report.md", "docs/README.md", "README.md",
  "docs/product/runtime.ts", "docs/product/contract.md.ts", "docs/product/nested/contract.md",
  "docs/product/odd\nname.md"]) {
  const mixedDiff = diffFixture([{ file: "docs/product/contract.md" }, { file }]);
  expectPrFail(`mixed/out-of-scope N/A rejected: ${JSON.stringify(file)}`, governanceBody,
    "Runtime evidence N/A requires a verified governance-only diff", mixedDiff);
}
expectPrFail("renaming runtime into docs cannot hide the deleted source", governanceBody,
  "Runtime evidence N/A requires a verified governance-only diff",
  diffFixture([{ file: removedRuntime, remove: true }, { file: "docs/product/renamed.md", blob: baselineBlob }]));
for (const mode of ["120000", "100755"]) {
  expectPrFail(`non-regular governance document mode ${mode} rejected`, governanceBody,
    "Runtime evidence N/A requires a verified governance-only diff",
    diffFixture([{ file: "docs/product/contract.md", mode }]));
}
for (const value of ["N/A", "PASS", "N/A — governance-only", "N/A — governance-only / executed"]) {
  expectPrFail(`incorrect governance Runtime evidence rejected: ${value}`,
    governanceBody.replace(naDeclaration, `- Runtime evidence: ${value}`),
    "governance-only requires explicit Runtime evidence N/A", docsDiff);
}
expectPrFail("duplicate Runtime evidence rejected", `${governanceBody}\n${naDeclaration}`,
  "ambiguous Runtime evidence declaration", docsDiff);
expectPrFail("Runtime evidence in wrong section rejected",
  governanceBody.replace(naDeclaration, "").replace("## Scope", `## Scope\n${naDeclaration}`),
  "ambiguous Runtime evidence declaration", docsDiff);
const runtimeDiff = diffFixture([{ file: "src/runtime.ts" }]);
const mixedRuntimeDiff = diffFixture([{ file: "src/runtime.ts" }, { file: "docs/product/contract.md" }]);
expectPrFail("governance document deletion cannot use N/A", governanceBody,
  "Runtime evidence N/A requires a verified governance-only diff",
  diffFixture([{ file: removedDocument, remove: true }]));
expectPrPass("governance document modification permits honest N/A", governanceBody,
  diffFixture([{ file: removedDocument }]));
expectPrFail("governance addition plus deletion cannot use N/A", governanceBody,
  "Runtime evidence N/A requires a verified governance-only diff",
  diffFixture([{ file: removedDocument, remove: true }, { file: "docs/product/added.md" }]));
expectPrPass("governance deletion retains normal checked-console route", yesInteraction,
  diffFixture([{ file: removedDocument, remove: true }]));
const noFilterClaim = "- [x] Known blocker text is not suppressed/filtered.";
for (const fence of ["```", "~~~", "````", "   ~~~~"]) {
  const fenced = (text) => `${fence}markdown\n${text}\n${fence}`;
  expectPrFail(`fenced-only N/A rejected: ${JSON.stringify(fence)}`,
    governanceBody.replace(naDeclaration, fenced(naDeclaration)),
    "governance-only requires explicit Runtime evidence N/A", docsDiff);
  expectPrPass(`active N/A plus fenced example accepted: ${JSON.stringify(fence)}`,
    governanceBody.replace(naDeclaration, `${naDeclaration}\n${fenced(naDeclaration)}`), docsDiff);
  expectPrPass(`fenced declarations outside runtime ignored: ${JSON.stringify(fence)}`,
    `${fenced(`${naDeclaration}\n- Runtime evidence: PASS`)}\n${governanceBody}`, docsDiff);
  expectPrFail(`fenced-only no-filter rejected: ${JSON.stringify(fence)}`,
    governanceBody.replace(noFilterClaim, fenced(noFilterClaim)),
    "required runtime checkbox is not checked", docsDiff);
  expectPrFail(`runtime fenced-only console rejected: ${JSON.stringify(fence)}`,
    yesInteraction.replace("- [x] No blocker console errors in realistic runtime path.",
      fenced("- [x] No blocker console errors in realistic runtime path.")),
    "required runtime checkbox is not checked", runtimeDiff);
  expectPrFail(`runtime fenced-only no-filter rejected: ${JSON.stringify(fence)}`,
    yesInteraction.replace(noFilterClaim, fenced(noFilterClaim)),
    "required runtime checkbox is not checked", runtimeDiff);
}
expectPrFail("second active declaration inside runtime rejected",
  governanceBody.replace(naDeclaration, `${naDeclaration}\n${naDeclaration}`),
  "ambiguous Runtime evidence declaration", docsDiff);
expectPrPass("fenced runtime section headers do not relocate active declaration",
  governanceBody.replace(naDeclaration, `\`\`\`markdown\n## Validation\n\`\`\`\n${naDeclaration}`), docsDiff);
expectPrPass("fenced runtime PASS checkbox is not an active acceptance claim",
  governanceBody.replace(noConsoleClaim, "```markdown\n- [x] No blocker console errors in realistic runtime path.\n```"), docsDiff);
expectPrFail("shorter or different delimiter does not close a fence",
  governanceBody.replace(naDeclaration, `\`\`\`\`markdown\n~~~\n\`\`\`\n${naDeclaration}\n\`\`\`\``),
  "governance-only requires explicit Runtime evidence N/A", docsDiff);
expectPrFail("unclosed fence cannot grant runtime evidence",
  governanceBody.replace(naDeclaration, `~~~markdown\n${naDeclaration}`),
  "governance-only requires explicit Runtime evidence N/A", docsDiff);
expectPrFail("closing fence with trailing text does not expose declaration",
  governanceBody.replace(naDeclaration, `~~~markdown\n~~~ not a closer\n${naDeclaration}\n~~~`),
  "governance-only requires explicit Runtime evidence N/A", docsDiff);
expectPrPass("governance-only explicit unchecked console claim is optional",
  governanceBody.replace(noConsoleClaim, ""), docsDiff);
expectPrPass("mixed-content preserves legacy checked-console path", yesInteraction, mixedRuntimeDiff);
expectPrFail("mixed-content still requires console checkbox",
  yesInteraction.replace("- [x] No blocker console errors in realistic runtime path.", noConsoleClaim),
  "required runtime checkbox is not checked", mixedRuntimeDiff);
expectPrFail("mixed-content still requires no-filter checkbox",
  yesInteraction.replace("- [x] Known blocker text is not suppressed/filtered.", "- [ ] Known blocker text is not suppressed/filtered."),
  "required runtime checkbox is not checked", mixedRuntimeDiff);
const policyDiff = diffFixture([{ file: "scripts/check-pr-governance.mjs" }, { file: "scripts/test-governance-policies.mjs" }, { file: "docs/governance/policy.md" }]);
expectPrPass("policy changes use normal checked-console path without self-exemption", noInteraction, policyDiff);
expectPrFail("policy changes cannot grant themselves governance-only N/A", governanceBody,
  "Runtime evidence N/A requires a verified governance-only diff", policyDiff);
expectPrFail("Markdown-named gitlink cannot establish governance-only N/A", governanceBody,
  "Runtime evidence N/A requires a verified governance-only diff",
  diffFixture([{ file: "docs/product/linked.md", mode: "160000", blob: baseSha }]));
expectPrPass("runtime diff preserves legacy checked-console path", yesInteraction, runtimeDiff);
expectPrFail("runtime diff cannot use N/A even alongside checked PASS",
  yesInteraction.replace("## Runtime / console", `## Runtime / console\n${naDeclaration}`),
  "Runtime evidence N/A requires a verified governance-only diff", runtimeDiff);
expectPrFail("runtime diff still requires console checkbox",
  yesInteraction.replace("- [x] No blocker console errors in realistic runtime path.", noConsoleClaim),
  "required runtime checkbox is not checked", runtimeDiff);
expectPrFail("runtime diff still requires no-filter checkbox",
  yesInteraction.replace("- [x] Known blocker text is not suppressed/filtered.", "- [ ] Known blocker text is not suppressed/filtered."),
  "required runtime checkbox is not checked", runtimeDiff);
expectPrFail("runtime diff cannot use malformed N/A instead of console proof",
  yesInteraction.replace("## Runtime / console", "## Runtime / console\n- Runtime evidence: N/A"),
  "invalid Runtime evidence declaration", runtimeDiff);

const staticFiles = [
  "docs/product/ATRVISU_PRODUCT_CONSTITUTION.md",
  "docs/protocols/MASTER_PLAN_SYNC_PROTOCOL.md",
  "docs/governance/MASTER_PLAN_PROJECTION.md",
  "docs/governance/MASTER_PLAN_SOURCE_FINGERPRINT.md",
  "docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md",
  "docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md",
  "docs/standards/ATRVISU_INTERACTION_STANDARD.md",
  "docs/adr/ADR-001-phase-1-direct-plan-body-drag.md",
  "docs/standards/ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md",
  "docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md",
  "docs/benchmarks/P1_VIEWPORT_PAN_GRID_EVIDENCE.md",
  "docs/adr/ADR-007-view-parallel-camera-pan-grid-readability.md",
  "docs/product/P1_VIEWPORT_PAN_GRID_CONTRACT.md",
  "docs/checklists/P1_VIEWPORT_PAN_GRID_GATE.md",
  "docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md",
  "docs/checklists/INTERACTION_CHANGE_GATE.md",
  "docs/protocols/CODEX_SYNC_PROTOCOL.md",
  ".github/pull_request_template.md",
  ".github/workflows/quality-gate.yml",
  "scripts/check-pr-governance.mjs",
  "scripts/test-governance-policies.mjs",
  "package.json",
  "AGENTS.md"
];

const staticRoot = path.join(tempRoot, "static-root");
const restoreStaticFixture = () => {
  fs.rmSync(staticRoot, { recursive: true, force: true });
  for (const relative of staticFiles) {
    const source = path.join(root, relative);
    const target = path.join(staticRoot, relative);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(source, target);
  }
};

const runStaticChecker = () => spawnSync(process.execPath, [staticChecker], {
  cwd: staticRoot,
  encoding: "utf8",
  env: process.env
});

const expectStaticPass = (name) => {
  const result = runStaticChecker();
  if (result.status !== 0) reportFailure(name, `${result.stdout}\n${result.stderr}`.trim());
  else reportPass(name);
};

const expectStaticFail = (name, mutate, expectedText) => {
  restoreStaticFixture();
  mutate();
  const result = runStaticChecker();
  const output = `${result.stdout}\n${result.stderr}`;
  if (result.status === 0) reportFailure(name, "static checker unexpectedly passed");
  else if (expectedText && !output.includes(expectedText)) reportFailure(name, `expected failure text not found: ${expectedText}\n${output}`);
  else reportPass(name);
};

restoreStaticFixture();
expectStaticPass("current authority chain passes static governance");

expectStaticFail(
  "removing stop-rule invariant is detected",
  () => {
    const file = path.join(staticRoot, "docs/product/ATRVISU_PRODUCT_CONSTITUTION.md");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("The next action is not another tuning pass", "Another tuning pass may be attempted"));
  },
  "constitution missing invariant"
);

expectStaticFail(
  "removing benchmark evidence baseline is detected",
  () => fs.rmSync(path.join(staticRoot, "docs/benchmarks/INTERACTION_BENCHMARK_BASELINE_V1.md")),
  "missing required authority file"
);

expectStaticFail(
  "removing Plan Move ADR is detected",
  () => fs.rmSync(path.join(staticRoot, "docs/adr/ADR-001-phase-1-direct-plan-body-drag.md")),
  "missing required authority file"
);

expectStaticFail(
  "weakening authority order is detected",
  () => {
    const file = path.join(staticRoot, "AGENTS.md");
    fs.writeFileSync(file, fs.readFileSync(file, "utf8").replace("docs/standards/ATRVISU_BENCHMARK_EVIDENCE_STANDARD.md", "docs/standards/REMOVED_BENCHMARK_STANDARD.md"));
  },
  "AGENTS authority order is not"
);

expectStaticFail(
  "removing interaction delivery protocol is detected",
  () => fs.rmSync(path.join(staticRoot, "docs/protocols/INTERACTION_DELIVERY_PROTOCOL.md")),
  "missing required authority file"
);

for (const [name, relative, clause, expectedText] of [
  ["removing view-parallel Pan mental model is detected", "docs/standards/ATRVISU_INTERACTION_STANDARD.md", "view-parallel camera translation, not floor dragging and not entity dragging", "camera Pan interaction missing invariant"],
  ["requiring a floor hit for Pan is detected", "docs/standards/ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md", "Pan MUST NOT require a floor hit, scene hit, selected entity, depth-buffer hit", "camera Pan navigation missing invariant"],
  ["removing target-depth Pan reference is detected", "docs/standards/ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md", "Perspective scale is defined at camera-target depth", "camera Pan navigation missing invariant"],
  ["removing side-view Pan availability is detected", "docs/standards/ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md", "exact Front, Back, Left and Right orthographic views", "camera Pan navigation missing invariant"],
  ["weakening Pan pixel oracle is detected", "docs/standards/ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md", "final screen residual <= 1 CSS px", "camera Pan navigation missing invariant"],
  ["removing event-cadence equivalence is detected", "docs/standards/ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md", "1x120, 8x15 and 24x5", "camera Pan navigation missing invariant"],
  ["removing reverse-return oracle is detected", "docs/standards/ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md", "Reverse the path and return within <= 1 CSS px", "camera Pan navigation missing invariant"],
  ["permitting hidden Pan rescue models is detected", "docs/standards/ATRVISU_VIEWPORT_NAVIGATION_STANDARD.md", "Gain clamps, catch-up, alternating compensation, angle-specific sign repair, hidden fallback planes, smoothing, hysteresis and retry loops are forbidden", "camera Pan navigation missing invariant"],
  ["changing engineering grid cadence is detected", "docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md", "minor 1000 mm, major 5000 mm", "grid readability missing invariant"],
  ["weakening fixed grid phase is detected", "docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md", "canonical world-origin multiples", "grid readability missing invariant"],
  ["conflating visual LOD with grid sizing is detected", "docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md", "Camera/fit/viewport-driven grid sizing remains forbidden", "grid readability missing invariant"],
  ["removing LOD domain invariants is detected", "docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md", "MUST NOT change snap spacing, world coordinates, major/minor world phase, entity placement, workplane bounds or mesh transform", "grid readability missing invariant"],
  ["removing temporal readability rejection is detected", "docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md", "broad false bands, alternating phase or temporal popping", "grid readability missing invariant"],
  ["claiming Stage B implementation is complete is detected", "docs/product/P1_VIEWPORT_PAN_GRID_CONTRACT.md", "Stage B implementation remains PENDING", "Pan contract package missing invariant"],
  ["claiming independent contract review passed is detected", "docs/checklists/P1_VIEWPORT_PAN_GRID_GATE.md", "Contract Verified: PENDING independent Stage A governance review", "Pan gate missing invariant"]
]) {
  expectStaticFail(name, () => {
    const file = path.join(staticRoot, relative);
    const original = fs.readFileSync(file, "utf8");
    if (!original.includes(clause)) throw new Error(`Mutation clause missing: ${clause}`);
    fs.writeFileSync(file, original.replaceAll(clause, "REMOVED OR WEAKENED CONTRACT CLAUSE"));
  }, expectedText);
}

for (const relative of [
  "docs/benchmarks/P1_VIEWPORT_PAN_GRID_EVIDENCE.md",
  "docs/adr/ADR-007-view-parallel-camera-pan-grid-readability.md"
]) {
  expectStaticFail(`removing Pan authority ${relative} is detected`,
    () => fs.rmSync(path.join(staticRoot, relative)), "missing required authority file");
}

fs.rmSync(tempRoot, { recursive: true, force: true });

if (failures > 0) {
  console.error(`governance-policy-test: ${failures} scenario(s) failed`);
  process.exit(1);
}

console.log(`governance-policy-test: PASS — ${passes} adversarial policy scenarios are fail-closed`);
