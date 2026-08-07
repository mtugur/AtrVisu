# P1-D2 Workspace Preferences Gate

| Gate | Status | Evidence |
| --- | --- | --- |
| Exact P1-D1 baseline `fb077121f2499c337e2e9d97cdd0459e6eb90272` | PASS | Preflight ancestry and clean branch creation |
| PR #104 and Quality Gate `31163841334` | PASS | Merged exact baseline; all five jobs passed |
| Two canonical workspace presets | PASS | Workspace preset registry and exact metadata tests |
| Registry schema, identity, editor, panel, and command validation | PASS | Positive and deterministic negative registry tests |
| Shipping presets contain only live compatibility panels | PASS | Runtime descriptor-derived validation |
| Current arrangement compatibility | PASS | Runtime, persistence, and Chromium startup tests |
| No implicit Sales application | PASS | P1-D1 seeded Chromium scenario |
| Sales Layout application | PASS | Exact density, visibility, metadata, and E2E checks |
| Layout Engineering application | PASS | Exact density, visibility, metadata, and E2E checks |
| One preference transaction per workspace application | PASS | Runtime store revision/write test |
| Active workspace persistence and reload | PASS | Runtime storage and Chromium reload tests |
| Unknown workspace recovery | PASS | Normalizer warning and runtime rejection tests |
| Theme control and workspace identity retention | PASS | Component and Chromium tests |
| Density control and override semantics | PASS | Runtime and Chromium tests |
| Live panel visibility control | PASS | Descriptor eligibility plus Runtime Panel Registry `bound`/`available`/`reason` projection |
| Contextually unavailable panel controls | PASS | Connection Point Snap and Inspector disable dynamically with accessible reasons and no preference/workspace mutation |
| Future-readonly preference surface | PASS | Existing P1-D1 status/warning disables every mutating control while the popover remains inspectable |
| Future-version record preservation | PASS | Real Chromium IndexedDB record remains byte-for-byte unchanged after pointer/keyboard attempts |
| Hidden panel restoration | PASS | Same popover restores and reload preserves the panel |
| Modal, shell, and unbound panels excluded | PASS | Registry/component assertions |
| Panel geometry and collapse values preserved | PASS | Workspace application tests |
| Command emphasis is presentation-only | PASS | Attribute tests and unchanged command routing suite |
| Inspector-mode metadata | PASS | Runtime projection and shell metadata tests |
| P1-E Inspector boundary preserved | PASS | Metadata only; no Inspector behavior change |
| P1-F dock-composition boundary preserved | PASS | No dock/order controls or host redesign |
| Domain/runtime invariance | PASS | Runtime viewport and project-context Chromium capture |
| History and dirty state preserved | PASS | Runtime invariant snapshot equality |
| Camera and scene lifecycle preserved | PASS | Camera equality and lifecycle generation checks |
| One App, EditorHost, DesignSystemRoot, and canvas | PASS | Chromium identity assertions |
| Keyboard accessibility | PASS | Native controls, Escape focus restoration, shortcut isolation |
| Responsive 1440x900, 1024x768, 640x800 | PASS | Popover bounds and overflow Chromium checks |
| No red console or page errors | PASS | All new and full Chromium collectors |
| Dependency audit | PASS | 0 vulnerabilities at default and low threshold |
| Design-token governance | PASS | 203 maintained files |
| Build | PASS | TypeScript and Vite; known chunk warning only |
| Unit suite | PASS | 122 files / 1115 tests |
| Chromium suite | PASS | 56/56 tests |
| Package lock and dependencies | PASS | `package-lock.json` unchanged; no dependency added |
| Project and preference schemas | PASS | Project schema and UI preference DB version unchanged |
| Manual visual acceptance | PENDING | Required after independent review and exact-head CI |

Independent review comment `5215805384` at reviewed head
`5b1b1085f2ebe5ffba5524f553bff7dd85669089` identified live panel availability
and future-readonly control blockers. Both are covered by the corrected runtime,
component, and Chromium evidence above.

Decision: **READY FOR INDEPENDENT RE-REVIEW**. Automatic gates pass. Manual
visual acceptance remains **REQUIRED AND PENDING**. The Draft PR must remain
Draft and unmerged until corrected exact-head CI, independent re-review, and
explicit user visual acceptance pass. This is not READY FOR MERGE and does not
mark P1-D complete.
