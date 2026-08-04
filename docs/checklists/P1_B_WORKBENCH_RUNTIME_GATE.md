# P1-B Workbench Runtime Gate

This gate protects the minimal editor runtime and workbench shell foundation.
PR #99 and its merged Phase 1 architecture contracts remain authoritative.

| Gate | Required evidence | Status | Blocking if failed | Evidence location |
| --- | --- | --- | --- | --- |
| PR #99 architecture baseline proven | Branch descends from merged PR #99 baseline `2eae4ae01019a0bf7c555834e6917238ce8791b7` | PASS | Yes | Git merge-base verification; this package audit section 1 |
| Editor Definition Registry implemented | Validated, ordered, immutable definitions with deterministic lookup and stable errors | PASS | Yes | `src/platform/editorDefinitionRegistry.ts`; registry tests |
| Runtime editor binding remains separate | React render binding is outside serializable Editor Definition metadata | PASS | Yes | `src/workbench/editorRuntimeRegistry.tsx`; architecture tests |
| Runtime registry source identity preserved | Runtime registry retains its source definition registry and EditorHost rejects mismatched authorities before lookup or rendering | PASS | Yes | `src/workbench/editorRuntimeRegistry.tsx`; EditorHost mismatch test |
| Runtime binding configuration validated | Binding object identity and callable render are validated during registry creation with stable errors and zero callback execution | PASS | Yes | Runtime registry negative tests |
| layout.3d definition registered | Canonical available visual editor passes the P1-A validator | PASS | Yes | `src/workbench/layout3dEditorDefinition.ts`; registry tests |
| EditorHost operational | Resolves one active binding, excludes inactive bindings, and provides accessible controlled fallbacks | PASS | Yes | `src/components/EditorHost.tsx`; EditorHost tests |
| WorkbenchShell owns application composition boundary | App renders through the nine-slot WorkbenchShell contract | PASS | Yes | `src/components/WorkbenchShell.tsx`; `src/App.tsx`; shell tests |
| Canonical Workbench region contract consumed | One typed exhaustive slot-to-region map is constrained by `WorkbenchRegionId`; tests compare it and rendered anchors with `WORKBENCH_REGION_IDS` | PASS | Yes | `src/components/WorkbenchShell.tsx`; WorkbenchShell tests |
| AppShell retained as compatibility adapter | Existing DOM classes, anchors, inset, right-panel, modal, diagnostics, and children paths remain | PASS | Yes | `src/components/AppShell.tsx`; AppShell and WorkbenchShell tests |
| App.tsx no longer imports AppShell | App imports WorkbenchShell and EditorHost instead | PASS | Yes | `src/workbench/workbenchArchitecture.test.ts` |
| WorkbenchShell does not know BabylonScene | No import or source reference exists | PASS | Yes | `src/workbench/workbenchArchitecture.test.ts` |
| Viewport identity preserved | One `viewport.main` and one live canvas retain identity through shell changes | PASS | Yes | `e2e/app-smoke.spec.ts` lifecycle scenario |
| Right panel collapse/reopen preserves editor lifecycle | Lifecycle generation remains unchanged across collapse, reopen, resize, selection, and accepted drag | PASS | Yes | `e2e/app-smoke.spec.ts`; EditorHost and WorkbenchShell lifecycle tests |
| Modal behavior preserved | Overlay maps to the existing AppShell modal path; manager modal E2E remains green | PASS | Yes | WorkbenchShell tests; full E2E manager scenarios |
| No new visible surface | Unused regions render no placeholders and no CSS was added | PASS | Yes | WorkbenchShell absent-slot test; changed-file scope |
| No duplicate runtime authority | Shell/host create no command, panel, selection, entity, viewport, resize, or Feature Access authority | PASS | Yes | Architecture test; unchanged Phase 0 authority modules |
| No storage migration | No IndexedDB, project schema, package, or persistence file changed | PASS | Yes | Changed-file scope; this package audit section 10 |
| Full validation passed | Audit, build, focused tests, full unit, Chromium E2E, and diff check pass | BLOCKED | Yes | Build/tests/E2E pass; `npm audit` reports one new high-severity transitive `undici@7.28.0` advisory; package changes are outside this correction scope |
| Manual acceptance requirement | Not required unless review detects an unintended visual delta | PASS | Yes | Zero-visible-delta E2E evidence; no CSS or visible content added |

All review-correction gates pass. The package remains blocked only by the
2026-08-04 npm advisory result recorded above; no unauthorized package or
lockfile remediation was performed. This checklist does not authorize editor
switching, new workbench surfaces, workspace state, persistence, or later
Phase 1 UI work.
