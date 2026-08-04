# P1-C Prerequisite Project Command Authority Gate

This gate must pass before visible P1-C design-system or command-surface work
starts.

| Gate | Evidence | Status | Blocking if failed | Evidence location |
| --- | --- | --- | --- | --- |
| PR #100 baseline proven | Branch was created from exact merge commit `515ba8890ee6525051a6253c918700b63e106098` | PASS | Yes | Git preflight and audit section 1 |
| Controller lifecycle dependency removed | Controller type, ref, prop, publication effect, and cleanup are absent | PASS | Yes | Static architecture test; `src/App.tsx`; `src/components/ProjectManager.tsx` |
| One execution owner | Existing App Runtime Feature Command Bridge owns all project bindings | PASS | Yes | `src/App.tsx`; project authority tests |
| Save available without modal | Chromium diagnostic route creates a real dirty scene, then proves save clears dirty state and changes the active revision after Project Manager closes | PASS | Yes | E2E `project save clears a real dirty scene and updates its active revision while Project Manager is closed` |
| Export available without modal | No-payload runtime export downloads the active project with the modal absent | PASS | Yes | Same E2E scenario; authority unit tests |
| Import execution available without modal | Live binding accepts `{ file: File }` independently of modal mounting; deferred concurrent requests retain their own callbacks/results | PASS | Yes | Authority unit test `keeps concurrent import results bound to their captured request callbacks`; persistent-provider E2E |
| Active-scene save target proven | Save resolves current project/layout and ignores transient manager selection | PASS | Yes | Authority unit tests; App binding construction |
| Explicit export target proven | Project Manager exports `{ projectId: selectedProject.projectId }` | PASS | Yes | Component test; selected-export E2E |
| Persistent import provider proven | Exactly one hidden App input remains mounted; request tokens isolate async results; native cancel clears only the pending request and input without command/callback execution | PASS | Yes | Static architecture test; request lifecycle unit tests; persistent-provider E2E |
| ProjectManager fallback removed | No local `createRevision`, `exportProject`, `importProject`, or `nextRevisionCode` command path | PASS | Yes | Static architecture test |
| Project schema unchanged | No project type or serialization schema file changed | PASS | Yes | Changed-file scope |
| Storage schema unchanged | No storage migration, IndexedDB version, or storage implementation changed | PASS | Yes | Changed-file scope |
| Active project context invariant preserved | Guarded App diagnostics prove import leaves actual project/layout/revision IDs and dirty state unchanged | PASS | Yes | Persistent-provider E2E `persistent project import input survives Project Manager close without scene mutation` |
| Selection/history/viewport invariants preserved | Import E2E compares actual selection, undo/redo, dirty state, lifecycle generation, and canvas count | PASS | Yes | Persistent-provider E2E |
| Audit/build/unit/E2E passed | 0 vulnerabilities; build passed; 105/1013 unit; 37/37 E2E | PASS | Yes | Audit report section 11 |
| Manual acceptance requirement | Zero visible delta; existing labels and modal geometry preserved | NOT REQUIRED | Yes | No CSS change; hidden existing `file-input` convention; E2E |

Decision: **READY FOR REVIEW**. This checklist does not authorize semantic
tokens, themes, Application Bar, Menu Bar, Command Bar, command palette,
workspace persistence, or other visible P1-C implementation.
