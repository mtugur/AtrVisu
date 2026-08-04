# Phase 1 P1-C Prerequisite Project Command Authority Audit

## 1. Exact Baseline

- Repository: `mtugur/AtrVisu`
- Base branch: `main`
- Exact base SHA: `515ba8890ee6525051a6253c918700b63e106098`
- Baseline source: merged PR #100
- Branch: `refactor/project-command-runtime-authority-v01`
- The unused local P1-C branch had no commit or diff beyond main, had never
  been pushed, had no PR, and was deleted normally before this branch was
  created.
- `npm.cmd ci` and `npm.cmd audit` passed with 0 vulnerabilities before branch
  creation.

## 2. Blocker Found

The canonical project command definitions were live only while
`ProjectManager` published a runtime controller. Closing the modal removed the
save, export, and import execution paths. Import also depended on a private
modal file input. Required future File/Application surfaces therefore could not
safely invoke the existing commands outside modal lifetime.

## 3. Architecture Decision

ADR-004 makes the existing App Runtime Feature Command Bridge the persistent,
single execution owner. Project Manager is a mandatory command client. File
acquisition is separate from command execution and storage mutation.

## 4. Runtime Ownership

- `createProjectRuntimeCommandBindings` supplies live App bindings for save,
  export, and import.
- No second registry or bridge was created.
- `project.restorePrompt` remains owned by the same existing App bridge.
- `ProjectManagerRuntimeController`, its App ref, publication callback, and
  lifecycle effect were removed.
- The E2E project command global exists only with `?e2eDiagnostics=1`; the
  normal URL exposes no test bridge.

## 5. Save Semantics

Save resolves only the active scene `currentProjectId` and `currentLayoutId`.
Missing or stale IDs provide stable disabled reasons. The command preserves the
current prompts and generated revision code, writes the current scene snapshot
through existing storage, refreshes projects, updates active revision IDs, and
clears dirty state after success. Storage failures return failed evidence and
do not escape as unhandled React errors.

## 6. Export Semantics

The optional `ProjectExportCommandPayload` contains one non-empty `projectId`.
An explicit target wins over the active project; no payload uses the active
project. Invalid or unknown targets are unavailable. Existing JSON, filename,
download, and object URL cleanup behavior is preserved, and caller payloads are
not mutated.

## 7. Import And Payload Acquisition

`ProjectImportCommandPayload` contains one `File`. The runtime owner validates,
reads, parses, imports through existing storage, refreshes projects, and returns
normalized evidence. Malformed and invalid project JSON produce failed results.

One App-owned hidden input is always mounted. It only acquires a file, invokes
the runtime bridge, resets its value, and reports the result to the requesting
surface. Each request has a monotonic token; its callback is captured and its
pending record is cleared before asynchronous import execution. A later request
therefore cannot receive an earlier result, and completion never clears a newer
request. Native chooser cancellation clears only the matching pending request
and input value without executing a command or callback. Import does not replace
the scene, load a revision, alter active project/layout/revision IDs, mutate
Runtime Selection or history, or mark the current scene dirty.

## 8. ProjectManager Client Boundary

The runtime invocation and import-provider props are required. Save invokes
`project.save` without payload. Export supplies the transient selected project
ID. Import requests the persistent provider. Returned outcomes update only
local status/error presentation. Project creation, metadata editing,
duplication/deletion, layout management, revision load/duplicate/delete, active
revision behavior, and dirty replacement guards remain unchanged.

## 9. Preserved Authorities

- Command Registry and Runtime Feature Command Bridge
- project storage and IndexedDB repository
- project/layout/revision domain model and serialization
- Runtime Selection and history
- Runtime Panel Registry and viewport bridge
- Editor Definition/Runtime Registry and EditorHost
- Feature Access classification and evidence authority

## 10. Changed Files

- `src/App.tsx`
- `src/components/ProjectManager.tsx`
- `src/components/ProjectManager.test.ts`
- `src/platform/runtimeCommands/projectRuntimeCommandAuthority.ts`
- `src/platform/runtimeCommands/projectRuntimeCommandAuthority.test.ts`
- `src/platform/runtimeCommands/projectCommandAuthorityArchitecture.test.ts`
- `e2e/app-smoke.spec.ts`
- `docs/architecture/decisions/ADR-004-PROJECT-COMMAND-RUNTIME-AUTHORITY.md`
- `docs/checklists/P1_C_PREREQUISITE_PROJECT_COMMAND_AUTHORITY_GATE.md`
- `docs/audits/phase-1-p1-c-prerequisite-project-command-authority.md`

No package, lockfile, workflow, CSS, project type, storage schema, IndexedDB,
panel, editor, selection, viewport, or Feature Access file changed.

## 11. Validation Evidence

- Focused authority/ProjectManager/static tests: 3 files / 24 tests passed.
- Focused project Chromium tests: 2 tests passed.
- `npm.cmd ci`: passed; 101 packages installed and 102 audited.
- `npm.cmd audit`: passed; 0 vulnerabilities.
- `npm.cmd audit --audit-level=low`: passed; 0 vulnerabilities.
- `npm.cmd run check:design-tokens`: not present on the exact main baseline and
  was not introduced.
- `npm.cmd run build`: passed; TypeScript and Vite production build succeeded.
- `npm.cmd run test -- --run`: 105 files / 1013 tests passed.
- `npm.cmd run test:e2e`: 37 Chromium tests passed.
- E2E no-red-console/page-error assertions passed.
- E2E runner-owned AtrVisu server stopped after validation.
- Final diff check and GitHub Quality Gate are recorded at PR handoff.

## 12. Explicit Non-Goals

P1-C visible implementation has not started. This package does not add design
tokens, themes, Application Bar, Menu Bar, Command Bar, command palette,
workspace state, preference persistence, schema migrations, UI redesign,
autosave redesign, new project formats, package changes, or future chrome
surface inventory.

## 13. Residual Risks

- Operating-system file chooser appearance remains browser/OS-owned. The
  provider handles the native cancel lifecycle as a command-free, callback-free
  cleanup operation.
- The future File menu must reuse the established provider and canonical
  runtime command rather than add another file input or storage path.
- Manual acceptance is not required because the intended visible delta is zero;
  any review-detected visual delta would reopen that requirement.

## 14. Decision

**READY FOR REVIEW**

ProjectManager is no longer a command execution owner. Save, export, and import
no longer depend on modal mounting. Save targets the active scene project and
layout; Project Manager export supplies an explicit project ID; the import
provider only acquires a File; import storage execution remains runtime-bridge
owned; no scene is automatically loaded after import. Project and IndexedDB
schemas and package files are unchanged.
