# PF-1 Premium Interaction Gate

| Gate | Status | Evidence |
| --- | --- | --- |
| Canonical baseline | PASS | Branch created from `8e6cbca9d23a0478fb1a2813df56441504d339cb` |
| Premium product contract | PASS | `docs/product/ATRVISU_PREMIUM_PRODUCT_DEFINITION_V1.md` |
| Canonical menu order | PASS | File/Edit/View/Insert/Arrange/Tools/Help in one registry-backed surface |
| Icon metadata separation | PASS | Serializable `iconId`; React resolution only in workbench icon authority |
| One icon package | PASS | Exact `lucide-react@1.31.0`, ISC, no install script/native executable |
| Compact command bar | PASS | Nine icon-only commands with accessible name, tooltip, state, and focus |
| Truthful measurement semantics | PASS | Measurement Helpers opens existing precision-placement helpers |
| Arrange command productization | PASS | Existing alignment and Assembly authorities; no duplicate algorithm |
| Arrange thresholds and lock policy | PASS | Two/three selection rules and atomic movement evaluation |
| Arrange history/dirty | PASS | Existing mutation callbacks record one snapshot per action |
| Rename runtime authority | PASS | F2/Edit/Explorer route through `edit.renameSelected` |
| Rename interaction | PASS | Enter commit; Escape and blur cancel; locked targets disabled |
| Instance/library identity split | PASS | Optional instance display name; canonical definition untouched |
| Rename persistence/history | PASS | Layout round-trip and Undo/Redo regressions |
| Cross-surface naming | PASS | PlatformEntity, scene label, Inspector, and commercial instance fallback |
| BOM identity stability | PASS | Definition/library grouping and canonical BOM name unchanged |
| Empty-project welcome | PASS | Distinct ephemeral create/open intent through the same `project.manager` command and Runtime Panel authority; generic entry remains neutral; no project mutation or second state authority |
| Help product surface | PASS | Registered commands/panel, real content, modal focus lifecycle |
| Feature Access and inventory | PASS | Rename, Arrange, Help, command bar, Explorer, and welcome mapped |
| Release-surface hygiene | PASS | Existing technical surfaces inventoried for PF-2; no new leak |
| Responsive contract | PASS | Focused Chromium at 1440x900, 1024x768, 640x800 |
| Lifecycle/domain invariance | PASS | One EditorHost/canvas and stable scene generation through UI-only actions |
| Focused validation | PASS | 5 files / 27 entry-intent unit, component, platform, and authority tests; 1 focused Chromium scenario |
| Dependency audit | PASS | `npm audit --audit-level=low`: 0 vulnerabilities |
| Dependency tree | PASS | `npm ls --all` completed successfully; only expected optional dependencies are absent |
| Design-token governance | PASS | 249 maintained files |
| Build | PASS | 4,121 modules transformed; existing 2.66 MB PDF / 5.52 MB main chunk warning recorded |
| Full unit suite | PASS | 143 files / 1,229 tests |
| Full Chromium suite | PASS | 67 tests |
| Diff check | PASS | `git diff --check` |
| Exact-head GitHub Quality Gate | PR GATE | Required before manual acceptance |
| Bounded manual visual acceptance | BLOCKED | Menu/icon clarity, responsive density, welcome, Help, Arrange discoverability, and rename presentation |

Decision: **READY FOR BOUNDED MANUAL ACCEPTANCE AFTER GREEN EXACT-HEAD CI.**

Phase 1 is not closed by PF-1.
