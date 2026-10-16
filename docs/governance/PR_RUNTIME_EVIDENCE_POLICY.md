# PR runtime evidence policy - governance-only proposal

Status: Separate policy proposal for independent review; no runtime product change.
Authority: Product Constitution sections 7-8; Interaction Delivery Protocol;
independent decision https://github.com/mtugur/AtrVisu/pull/131#issuecomment-6192146759.
Bounded correction: https://github.com/mtugur/AtrVisu/pull/132#issuecomment-6194590795.

## Machine-verified scope

Only a nonempty, successfully inspected Git base/head diff can qualify for
governance-only runtime N/A. The checker reads the event's full SHA revisions
and a NUL-delimited raw diff with rename detection, external diff/textconv and
submodule hiding disabled. A deleted source path remains visible even if its
content is renamed into a documentation path. Modes are checked at both ends.

Every changed path must be one regular, non-executable Markdown file directly
inside one of these exact directories:

- `docs/product/`
- `docs/standards/`
- `docs/adr/`
- `docs/checklists/`
- `docs/benchmarks/`
- `docs/governance/`
- `docs/protocols/`

The basename must match `[A-Za-z0-9_][A-Za-z0-9_.-]*.md` (the final dot is
literal). Nested paths, other extensions/directories, unusual path characters,
symlinks, executable modes and gitlinks do not qualify. Only additions
(`A`, `000000` -> `100644`) and modifications (`M`, `100644` -> `100644`)
qualify. Any deletion, including an allowlisted normative document deletion
combined with additions/modifications, disqualifies the entire diff from N/A
and requires the normal checked-console declaration route. Empty, missing or
unreadable diff provenance cannot establish the exception. Unsupported paths
use the normal declaration path, never a broader inferred docs-only category.

PR prose, labels, branch names, a claimed governance-only scope, or a supplied
file list are not proof. Scripts, tests, source, CSS, workflows, package files,
public/library assets and mixed content cannot qualify. This policy PR changes
scripts/tests and therefore cannot use its own governance-only N/A exception.

## Declaration

In `## Runtime / console`, verified governance-only PRs must declare exactly:

```markdown
- Runtime evidence: N/A — governance-only / not executed
- [x] Known blocker text is not suppressed/filtered.
```

The realistic-runtime console PASS checkbox must remain unchecked or absent.
It cannot be combined with N/A to imply unexecuted runtime acceptance. Duplicate,
misplaced or malformed Runtime evidence fields fail closed. A verified
governance-only diff cannot substitute `PASS` for the exact N/A declaration.

The example above must be supplied as active Markdown, not inside a code fence.
A minimal active-line scanner excludes backtick/tilde fenced blocks from runtime
declarations, Runtime/Validation section boundaries and console/no-filter
checkbox checks. Fenced-only N/A or no-filter claims cannot satisfy the gate.
Active N/A alongside fenced examples inside or outside the Runtime section is
valid; duplicate active declarations or active out-of-section declarations fail.
Closing fences must use the opening delimiter with at least its length and no
trailing content; unclosed fences do not expose their contents as declarations.
Other section checks retain their existing requirements.

Runtime/mixed-content PRs retain both existing required checked console/no-filter
claims; they cannot use governance-only N/A, even alongside checked PASS claims.
The optional `Runtime evidence: PASS` field does not replace either checkbox.
All existing authority, interaction/benchmark, validation-state and stop-rule
checks still apply. Automation Green is CI compatibility, not Contract Verified
or Product Accepted for an unimplemented contract delta.

## Verification and integration boundary

Focused policy tests use real isolated Git commits rather than caller-provided
changed-file arrays. Positive cases cover each allowlisted directory and the
normal runtime/mixed/policy paths, additions and modifications. Negative cases
cover missing/invalid/empty provenance, outside paths, rename/deletion hiding,
non-regular modes, false PASS,
incorrect/duplicate/misplaced N/A, and attempted removal of interaction,
benchmark, no-filter and stop-rule requirements. Fence cases cover active versus
example declarations/checkboxes, both delimiters, indentation, longer fences,
wrong/short/trailing-content closers and unclosed blocks. Document deletion is
rejected for N/A and tested through the normal checked-console route. Existing
stress coverage remains; the former deletion-positive expectation is corrected
to rejection under this narrower policy.

PR #131/#130/#129 are not edited or merged by this proposal. Stage B remains
NO-GO. Only after independent policy review and integration under the existing
merge protocol may PR #131 separately adopt the exact N/A declaration and rerun
its own exact-head gate. The policy does not certify the C03 runtime or reset
its correction budget.
