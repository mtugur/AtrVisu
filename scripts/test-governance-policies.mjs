import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const prChecker = path.join(root, "scripts/check-pr-governance.mjs");
const staticChecker = path.join(root, "scripts/check-interaction-governance.mjs");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "atrvisu-governance-"));
let failures = 0;

const reportFailure = (name, detail) => {
  failures += 1;
  console.error(`governance-policy-test: FAIL — ${name}: ${detail}`);
};

const reportPass = (name) => console.log(`governance-policy-test: PASS — ${name}`);

const runPrChecker = (body) => {
  const eventPath = path.join(tempRoot, `event-${Math.random().toString(36).slice(2)}.json`);
  fs.writeFileSync(eventPath, JSON.stringify({ pull_request: { body } }), "utf8");
  return spawnSync(process.execPath, [prChecker], {
    cwd: root,
    encoding: "utf8",
    env: {
      ...process.env,
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: eventPath
    }
  });
};

const expectPrPass = (name, body) => {
  const result = runPrChecker(body);
  if (result.status !== 0) {
    reportFailure(name, `${result.stdout}\n${result.stderr}`.trim());
  } else {
    reportPass(name);
  }
};

const expectPrFail = (name, body, expectedText) => {
  const result = runPrChecker(body);
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
- Desired user-observable behavior: Explicit Plan axis/plane manipulation with stable semantics across camera views
- Forbidden behavior / regressions: Hidden body-drag fallback, camera-relative remapping, repeated tuning loops
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

const staticFiles = [
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

fs.rmSync(tempRoot, { recursive: true, force: true });

if (failures > 0) {
  console.error(`governance-policy-test: ${failures} scenario(s) failed`);
  process.exit(1);
}

console.log("governance-policy-test: PASS — adversarial policy scenarios are fail-closed");
