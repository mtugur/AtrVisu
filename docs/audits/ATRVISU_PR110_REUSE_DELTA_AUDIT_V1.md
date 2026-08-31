# AtrVisu PR #110 Reuse / Delta Audit v1.0

**Date:** 2026-08-27
**PR:** #110 `feat/phase-1-premium-interaction-ia-v01`
**Base:** `8e6cbca9d23a0478fb1a2813df56441504d339cb`
**Current frozen head:** `ae50e1398dcac13477bed8e909cb9f1e2773576c`
**Design target:** AtrVisu Phase 1 Product & UI Design Specification v1.0 / Design Validation Prototype v3.

## Decision

PR #110 is **not discarded** and is **not merged as-is**.

The branch contains valuable platform/semantic work, but several visible surfaces contradict the accepted v3 interaction grammar. Implementation must preserve the accepted authorities and replace/adapt only the conflicting presentation/product surfaces.

---

## A. Preserve — architecture / domain behavior

These are considered valuable and should survive unless an exact defect is found:

### Command / icon authority

- serializable command metadata with stable `iconId`;
- single presentation icon resolver;
- `lucide-react` dependency if dependency/security status remains clean;
- canonical menu routing through Command Registry.

### Placed-instance identity

- optional project-instance `displayName`;
- `getPlacedMachineDisplayName()` as project-facing machine name resolver;
- canonical `MachineDefinition.name` for Library/BOM identity;
- F2/history-backed rename;
- serialization/persistence of instance name;
- commercial instance name projection.

### Scene-label lifecycle

- one label resource per machine instance;
- texture clear/redraw fix;
- rename/Undo/Redo/cancel/delete/recovery correctness;
- label diagnostics/tests.

### Project / startup state authority

- Project Manager create/open entry intent;
- recovery storage separate from “startup overlay is visible” session state;
- successful create/open/resume removes startup overlay;
- no second project/recovery store.

### Inspector responsibility

- multi-selection Inspector is property/context oriented;
- alignment/distribution/snap operation stacks remain out of Inspector.

### Viewpoints authority

- true open/close toggle;
- Primary Dock contribution authority;
- legacy Bottom Dock ownership normalization without dormant-size mutation;
- pressed state derived from real Primary Dock and active-tab state.

### Lifecycle invariants

- one App;
- one EditorHost;
- one BabylonScene;
- one canvas;
- UI-only actions do not mutate domain/camera/history.

### Help infrastructure

- one accessible Help modal authority;
- focus trap / Escape / opener restoration;
- application-version authority.

### Existing Arrange algorithms and runtime commands

Preserve alignment/distribution/equal-gap/group/ungroup algorithms and canonical mutation/history authority. Only their **presentation surface** changes.

---

## B. Adapt — keep authority, change presentation

### 1. `WorkbenchCommandBar`

**Current PR #110:** grouped icon+label `History / Selection / Display / Precision / Arrange` strip, with responsive More.

**v3 target:** compact flat icon-only Quick Toolbar.

Adapt:

- retain command data, icon authority, tooltips, disabled reasons, accessibility and responsive logic where reusable;
- remove permanent group captions/group-card chrome;
- restore Save to Quick Toolbar as the single prominent direct Save projection; Application Bar becomes context-only;
- add/retain Fit View if canonical camera authority supports it;
- remove `Selection Tools` from permanent toolbar;
- do not expose `Measure` until real viewport measurement is implemented.

### 2. `EmptyProjectWelcome`

Preserve recovery/create/open state behavior.

Adapt visual composition to v3 Start/Recovery hierarchy and shared design tokens.

### 3. `HelpModal`

Preserve modal/focus/version infrastructure.

Update content and navigation to match the v3 product:

- remove Selection Tools Bottom Dock description;
- Measurements describe real Measure vs Precision Placement;
- add Command Palette when implemented;
- add Presentation Mode when implemented;
- GLB import documentation only after PF-2 functionality exists.

### 4. `PrecisionPlacementPanel`

Preserve exact placement, nudge and snap settings authority.

Reframe as **Precision Placement**, not `Measure`.

Any Object A/Object B distance helper that remains must be explicitly secondary; it must not define the top-level Measure product.

### 5. Start/Recovery CSS and shell styling

Preserve semantics, rebuild visual hierarchy against the v3 token/sizing contract.

---

## C. Remove / retire from final Phase-1 presentation

### 1. `SelectionToolsPanel` as Bottom Dock contribution

The component/presentation is not part of the accepted final Phase-1 UI.

Do not throw away its algorithms. Migrate behavior:

- Align / Distribute / Equal Gap / Group → viewport contextual Arrange bar + Arrange menu;
- Connection Point Snap → exact-two-compatible-machine contextual action/popover;
- advanced pair/anchor alignment → `Arrange > Advanced Alignment…` or another bounded advanced surface;
- Keyboard Nudge → Precision Placement.

After migration, remove normal-user registration of Selection Tools as a Bottom Dock contribution.

### 2. `view.showMeasurements` semantics that only reveal Inspector helpers

The current behavior is incompatible with the accepted meaning of **Measure**.

Either:

- keep it internal/renamed as Precision Placement helper visibility; or
- retire it when the new viewport Measure command becomes canonical.

No toolbar control may call itself Measure while only revealing Inspector helper fields.

### 3. Permanent grouped command-strip captions

`HISTORY / SELECTION / DISPLAY / PRECISION / ARRANGE` permanent toolbar grouping is not the final visual target.

### 4. Help language describing Selection Tools Bottom Dock

Retire when the new contextual flow lands.

---

## D. New Phase-1 implementation required

### Shell / UX

- v3 compact icon-only Quick Toolbar;
- global Command Palette (`Ctrl+K`) as a Command Registry search projection;
- unified collapse-control component across structural docks;
- contextual multi-selection Arrange bar;
- exact-two-compatible-machine Connect & Snap popover;
- Presentation Mode;
- visual design-token reconciliation to v3 shell.

### PF-2 — Asset & Editing Experience

- Asset Browser search/filter/favorites/recent;
- production/test-library separation;
- GLB/GLTF file picker;
- preview;
- unit/orientation/bounds validation;
- asset metadata flow;
- controlled instance Name/Tag/Notes/overrides;
- Library Asset vs Placed Instance experience;
- Help updates.

### PF-3 — Visual Engineering Language

- neutral technical viewport preset;
- professional grid hierarchy;
- civil floor/wall/column materials;
- walkway/safety/restricted-zone language;
- lighting/depth/material hierarchy;
- hover/selection state system;
- label scale/collision treatment;
- real scene Measure/dimension graphics;
- presentation-scene polish;
- canonical mixed-scene screenshot acceptance.

### PF-Exit

- release/test fixture hygiene;
- stale branch audit/cleanup evidence;
- full semantic control audit;
- canonical screenshots;
- blind-user sales flow;
- commercial output review;
- exact-head CI/security/audit;
- Phase-1 final decision.

---

## E. Do not rewrite

Unless a verified defect requires it, do not rebuild:

- Command Registry;
- Panel Registry;
- Runtime Selection;
- project storage;
- history/Undo/Redo;
- placed-machine domain model beyond bounded additions;
- commercial-output projection authority;
- workspace persistence;
- BabylonScene ownership/lifecycle.

The objective is **product-surface correction over a strong platform**, not a rewrite.

---

## F. Recommended implementation sequence

### Package 1 — PF-1 Reconciliation / Shell Closure

Use the existing #110 branch only after preflight confirms exact head and clean ancestry.

Implement:

- add canonical design specification documents;
- compact Quick Toolbar;
- remove Bottom-Dock Selection Tools presentation;
- viewport contextual Arrange bar;
- contextual Connect & Snap;
- Command Palette;
- collapse-control standard;
- Start/Recovery visual reconciliation;
- Help update;
- preserve all accepted rename/label/startup/Viewpoints authority work.

Do **not** add fake Measure. If real viewport Measure is not included in this package, omit the toolbar command until PF-3.

Manual acceptance after executed screenshots.

### Package 2 — PF-2 Asset & Editing Experience

Build the professional Library/import/editing workflow and perform the first real ATARA GLB import only at the end of the package.

### Package 3 — PF-3 Visual Engineering Language + Measure

Make the actual Babylon scene visually professional and implement true scene measurement.

### Package 4 — PF-Exit

Judge the whole product, not the package fragments.

---

## G. Current PR #110 overall classification

**Reuse:** high.
**Merge readiness:** no.
**Reason:** valuable semantic/authority work is present, but the current visible toolbar, Selection Tools Bottom Dock and measurement semantics do not match the accepted v3 design contract.

The correct action is **reconcile, not restart**.

---

## H. Final bounded visual correction

**Correction baseline:** `519a71f4ea4c5183f616b599edf25b6afa770aeb`
**Executed-evidence review:** `5462166673`

The executed screenshot review identified four bounded presentation defects;
none required a new domain or persistence authority:

- Connect & Snap now uses a bounded internal body scroller and a fixed action
  zone, keeping Close and the primary action inside the popover at 1440x900 and
  1024x768.
- At that review head, the product UI preference still defined Bottom Dock and
  Viewpoints as closed by default; the evidence therefore opened Viewpoints only
  in its then-canonical explicit state. Section I records the later approved
  Primary Dock ownership correction from review `5061150709`.
- At 720 px and below, Primary Dock collapse is transient presentation state,
  parallel to responsive Inspector behavior. Explicit narrow reopen remains
  available; the persisted desktop preference is unchanged and restored wide.
- Inspector section headers use fixed disclosure, non-wrapping title, and
  bounded badge columns so machine, civil, and multi-selection headings remain
  composed at 1440 px.

The replacement evidence is created through normal project authorities with
project `PF-1 Review`, layout `Packaging Line`, revision `R01`, and the accepted
mixed representative scene. Evidence files remain outside the repository.

**Post-correction status:** ready for final manual visual acceptance only after
the corrected exact-head Quality Gate is green.

## I. PF-1 correction review 5061150709

Review `5061150709` closed two remaining authority/presentation gaps without
introducing new product state:

- Viewpoints is now a first-class Primary Dock contribution. The existing
  Runtime Panel binding, Viewpoints store, and UI Preference record remain the
  only authorities. Command and rail activation share the same toggle behavior;
  legacy Bottom Dock ownership converges to Primary Dock. Bottom Dock remains a
  future architectural seam and renders no empty Phase-1 chrome or viewport
  inset.
- The contextual Arrange bar completes the existing command set: engineering
  edge labels, two-plus Align/Group, three-plus Distribute/Equal Gap, exact-pair
  Connect & Snap, registered Advanced Alignment, and assembly Ungroup. Locked
  movement continues to use atomic runtime evaluation and no duplicate mutation
  or history handler was added.

The evidence package for this correction is executed at 1440x900 and 1024x768
with the normal workbench, populated Viewpoints, exact-pair Arrange,
three-object Arrange, and assembly states. The PR #110 exact-head Quality Gate
publishes the ten captures as the single reviewer-accessible
`pf1-review-5061150709` workflow artifact.
PF-3 visual-language standardization remains a separate Phase-1 exit blocker
and is not implemented here.

## J. PF-1 correction review 5063962183

Review `5063962183` found that the canonical Sales Layout preset hid the
existing Connection Point Snap panel contribution even for a valid exact
product-flow pair. The bounded correction adds that existing panel ID to Sales
Layout without changing snap compatibility or mutation authority.

Initialization reconciles and persists only a previous named
`workspace.sales-layout` record whose Connection Point Snap visibility is
false. Custom Workspace has no active named preset and preserves its explicit
override. Chromium coverage applies Sales Layout through the normal UI, places
fresh canonical Flow Pack and Belt Conveyor assets, verifies the exact pair,
round-trips a current-format project revision, and confirms a third Robot
Palletizer selection removes Connect & Snap.

The exact-head Quality Gate publishes ten reviewer-accessible 1440x900 and
1024x768 captures as `pf1-review-5063962183`; the pair and three-object frames
visibly identify Sales Layout in the Application Bar.

## K. PF-1 transition and source-provenance review 5064733007

Review `5064733007` reported a manual runtime that still hid Connect & Snap in
Sales Layout after Layout Engineering showed it for the same canonical pair.
The bounded investigation reproduced the exact persisted-state path. Canonical
UI Preferences and IndexedDB correctly reconcile the previous named Sales
visibility record, while Runtime Panel reachability remains selection-driven.
With the pair selected, both named workspace applications converge to
`available: true` and `visible: true`; Custom Workspace still preserves its own
explicit hidden override.

The discrepancy was therefore guarded at the served-worktree boundary rather
than patched with another product authority. Vite reports branch/head source
provenance, and the E2E runner fails fast when the server omits or disagrees
with the expected exact head. Chromium coverage now includes the seeded legacy
record, hard reload, selected-pair Engineering -> Sales transition, fresh
state, current-format project save/reload, and three-object suppression.

The exact-head Quality Gate publishes twelve reviewer-accessible captures as
`pf1-review-5064733007`: both named-workspace pair states and the Sales
three-object state are explicit at 1440x900 and 1024x768.
