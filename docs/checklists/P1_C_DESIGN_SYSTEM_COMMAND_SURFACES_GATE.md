# P1-C Design System And Command Surfaces Gate

| Gate | Required evidence | Status | Blocking if failed | Evidence location |
| --- | --- | --- | --- | --- |
| P1-B baseline proven | Workbench runtime foundation remains authoritative | PASS | Yes | P1-B gate; audit section 1 |
| PR #102 prerequisite proven | Project commands remain App-owned and modal-independent | PASS | Yes | ADR-004; project authority focused tests |
| Semantic token families complete | Every accepted P1-A family has an `--av-` authority | PASS | Yes | `designTokens.css`; `DesignSystemRoot.test.ts` |
| Dark theme complete | Required semantic values and readable states exist | PASS | Yes | `themes.css`; theme tests |
| Light theme complete | Same semantic contract has intentional light values | PASS | Yes | `themes.css`; theme tests |
| System theme complete | CSS light and dark media paths exist | PASS | Yes | `themes.css`; theme tests |
| Dark initial default | Application root explicitly receives dark/comfortable | PASS | Yes | `src/main.tsx` |
| No theme persistence | No browser or project persistence in root/runtime | PASS | Yes | Architecture tests; ADR-005 |
| Technical palette centralized | Deep-frozen values and independent Babylon factories cover retained meanings | PASS | Yes | `technicalPalette*`; mutation tests |
| Raw UI colors governed | Maintained UI uses semantic variables | PASS | Yes | Scanner; `src/styles.css` |
| Scanner operational | Unauthorized CSS/Babylon forms, including namespace-qualified constructors, and broad allowlists fail | PASS | Yes | `designTokenGovernance.test.ts` |
| Scanner enforced in CI | Gate runs after audit and before build | PASS | Yes | `.github/workflows/quality-gate.yml` |
| Application Bar operational | Identity, dirty state, context, and canonical Save render | PASS | Yes | Component and E2E tests |
| Menu Bar operational | Exact File/Edit/View/Tools definitions render and execute | PASS | Yes | Config, component, E2E tests |
| Command Bar operational | Exact accepted order, pressed state, and actions render | PASS | Yes | Config, component, E2E tests |
| Registry-backed execution proven | Metadata and execution use existing authorities only | PASS | Yes | Adapter and architecture tests |
| Project-import provider reused | File acquisition reaches canonical runtime command | PASS | Yes | App integration; import E2E |
| No second import input | Exactly one persistent input exists | PASS | Yes | Architecture and E2E tests |
| No seed no-op execution | Adapter never invokes definition seed execute | PASS | Yes | Adapter negative tests |
| No dead visible command | Unknown, unbound, unreachable, unsupported items are rejected | PASS | Yes | Adapter tests; surface evidence |
| Menubar ARIA contract | Menubar/menuitem/menu/menuitemcheckbox relationships and stable IDs are exact | PASS | Yes | Component tests |
| Disabled menu discovery | All-disabled Edit opens, focuses, traverses, explains, and blocks activation | PASS | Yes | Component tests |
| Localization metadata | Menu IDs, label keys, and English fallbacks are exact | PASS | Yes | Adapter tests |
| Menu keyboard behavior | Roving/open/switch/Tab/Escape/outside behavior is deterministic | PASS | Yes | Component and E2E tests |
| Toolbar keyboard behavior | Directional and Home/End navigation skip disabled items and stop propagation | PASS | Yes | Component and E2E tests |
| Toolbar focus reconciliation | Disabled, removed, all-disabled, and returning command states reconcile deterministically | PASS | Yes | Component tests |
| Editor shortcut isolation | Command Bar arrows preserve selection, transforms, history, dirty state, and execution probes | PASS | Yes | Chromium regression |
| Focus restoration | Escape restores the menu opener and shortcut does not leak | PASS | Yes | Component and E2E tests |
| Exact token contract | Required semantic names include normal/medium/semibold/bold | PASS | Yes | `DesignSystemRoot.test.ts` |
| Semantic modal scrim | Dark/light portal backdrops resolve from `--av-surface-scrim` | PASS | Yes | CSS and Chromium tests |
| Surface inventory updated | Three stable workbench surfaces have command evidence | PASS | Yes | `currentSurfaceInventory.ts`; audit section 17 |
| Viewport lifecycle preserved | One EditorHost/canvas and stable lifecycle generation | PASS | Yes | 42-test Chromium suite |
| Right-panel geometry preserved | Runtime panel starts below the canonical inset | PASS | Yes | Responsive E2E geometry test |
| Responsive geometry proven | 1280x720, 1024x768, and 640x800 preserve chrome and mobile bottom-panel rules | PASS | Yes | Workbench chrome E2E tests |
| Audit/build/unit/E2E passed | 0 vulnerabilities; scanner/build; 1056 unit; 42 E2E | PASS | Yes | Audit section 19 |
| Corrected exact-head Quality Gate | GitHub gate must pass after the five correction commits are pushed | PENDING | Yes | PR #103 checks |
| Manual visual acceptance required | Human review of dark/light/system and chrome remains pending | PENDING | Yes | Audit section 20 |

Decision: **PENDING CORRECTED EXACT-HEAD QUALITY GATE**. Local automatic gates
pass. P1-C is not complete and is not ready for manual acceptance or merge
until the corrected GitHub gate succeeds and another independent review occurs.
