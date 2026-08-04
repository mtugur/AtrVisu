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
| Technical palette centralized | Immutable values and Babylon factories cover retained meanings | PASS | Yes | `technicalPalette*`; palette tests |
| Raw UI colors governed | Maintained UI uses semantic variables | PASS | Yes | Scanner; `src/styles.css` |
| Scanner operational | Unauthorized CSS/Babylon forms and broad allowlists fail | PASS | Yes | `designTokenGovernance.test.ts` |
| Scanner enforced in CI | Gate runs after audit and before build | PASS | Yes | `.github/workflows/quality-gate.yml` |
| Application Bar operational | Identity, dirty state, context, and canonical Save render | PASS | Yes | Component and E2E tests |
| Menu Bar operational | Exact File/Edit/View/Tools definitions render and execute | PASS | Yes | Config, component, E2E tests |
| Command Bar operational | Exact accepted order, pressed state, and actions render | PASS | Yes | Config, component, E2E tests |
| Registry-backed execution proven | Metadata and execution use existing authorities only | PASS | Yes | Adapter and architecture tests |
| Project-import provider reused | File acquisition reaches canonical runtime command | PASS | Yes | App integration; import E2E |
| No second import input | Exactly one persistent input exists | PASS | Yes | Architecture and E2E tests |
| No seed no-op execution | Adapter never invokes definition seed execute | PASS | Yes | Adapter negative tests |
| No dead visible command | Unknown, unbound, unreachable, unsupported items are rejected | PASS | Yes | Adapter tests; surface evidence |
| Menu keyboard behavior | Roving/open/switch/Tab/Escape/outside behavior is deterministic | PASS | Yes | Component and E2E tests |
| Toolbar keyboard behavior | Directional and Home/End navigation skip disabled items | PASS | Yes | Component tests |
| Focus restoration | Escape restores the menu opener and shortcut does not leak | PASS | Yes | Component and E2E tests |
| Surface inventory updated | Three stable workbench surfaces have command evidence | PASS | Yes | `currentSurfaceInventory.ts`; audit section 17 |
| Viewport lifecycle preserved | One EditorHost/canvas and stable lifecycle generation | PASS | Yes | 39-test Chromium suite |
| Right-panel geometry preserved | Runtime panel starts below the canonical inset | PASS | Yes | Responsive E2E geometry test |
| Responsive geometry proven | 1280x720 and 1024x768 have positive, non-overlapping regions | PASS | Yes | Workbench chrome E2E test |
| Audit/build/unit/E2E passed | 0 vulnerabilities; scanner/build; 1047 unit; 39 E2E | PASS | Yes | Audit section 19 |
| Manual visual acceptance required | Human review of dark/light/system and chrome remains pending | PENDING | Yes | Audit section 20 |

Decision: **READY FOR MANUAL ACCEPTANCE**. P1-C is not complete and is not
ready to merge until the required visual acceptance succeeds.
