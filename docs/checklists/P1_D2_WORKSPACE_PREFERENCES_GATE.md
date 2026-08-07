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
| Future-readonly preference surface | PASS | All four root rows remain navigable; every mutating child control is disabled and described by the existing warning |
| Future-version record preservation | PASS | Real Chromium IndexedDB record remains byte-for-byte unchanged after pointer/keyboard attempts |
| Hidden panel restoration | PASS | Same popover restores and reload preserves the panel |
| Compact root disclosure contract | PASS | Exactly four Workspace, Theme, Density, and Visible Panels buttons with current summaries; no root inputs or desktop scrollbar |
| Workspace cascading child | PASS | Native radios, successive selection without closure, immediate summary, and persistence coverage |
| Theme cascading child | PASS | Native radios, in-place DesignSystemRoot update, retained workspace identity, and immediate summary |
| Density cascading child | PASS | Native radios, existing override policy, workspace-summary clearing, and immediate summary |
| Visible Panels root summary | PASS | Dynamic visible/eligible count and accessible disclosure contract |
| Reusable cascading primitive | PASS | Semantic-agnostic geometry, state, and caller-owned surface semantics |
| Root + depth 1 + depth 2 contract | PASS | Deterministic primitive state tests; only depth 1 is rendered in P1-D2 |
| Depth-one branch replacement | PASS | Workspace -> Theme -> Density -> Visible Panels replaces the child and clears stale deeper paths without closing the root |
| Desktop sibling flyout | PASS | Viewport-contained adjacent flyout with right preference and tested left fallback |
| Narrow drill-in | PASS | 640x800 same-popover navigation with Back and focus return |
| Nested Visible Panels scroll removal | PASS | Inline scrolling fieldset removed; responsive E2E verifies one scroll context maximum |
| Cascade keyboard and outside pointer | PASS | ArrowRight, ArrowLeft, staged Escape, focus return, and full outside close coverage |
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
| Keyboard accessibility | PASS | Native controls, child/root Escape hierarchy, focus restoration, shortcut isolation |
| Responsive 1440x900, 1024x768, 640x800 | PASS | Sibling/drill-in geometry, bounds, scroll, and overflow Chromium checks |
| No red console or page errors | PASS | All new and full Chromium collectors |
| Dependency audit | PASS | 0 vulnerabilities at default and low threshold |
| Design-token governance | PASS | 208 maintained files |
| Build | PASS | TypeScript and Vite; known chunk warning only |
| Unit suite | PASS | 126 files / 1131 tests |
| Chromium suite | PASS | 57/57 tests |
| Package lock and dependencies | PASS | `package-lock.json` unchanged; no dependency added |
| Project and preference schemas | PASS | Project schema and UI preference DB version unchanged |
| Overall manual visual direction | PASS | Review comment `5216944024` |
| Visible Panels cascade manual acceptance | PASS | Final manual polish decision comment `5217732957` |
| Final bounded root-cascade re-acceptance | PENDING | Compact four-row root, Workspace/Theme/Density sibling flyouts, and narrow drill-in only |

Independent review comment `5215805384` at reviewed head
`5b1b1085f2ebe5ffba5524f553bff7dd85669089` identified live panel availability
and future-readonly control blockers. Both are covered by the corrected runtime,
component, and Chromium evidence above.

Decision: **READY FOR FINAL BOUNDED MANUAL RE-ACCEPTANCE**. Automatic gates pass
and the accepted overall direction is preserved. The Draft PR must remain Draft
and unmerged until exact-head CI and explicit bounded root-cascade
re-acceptance pass. This is not READY FOR MERGE and does not mark P1-D complete.
