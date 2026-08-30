# AtrVisu Phase 1 Product & UI Design Specification v1.0

**Status:** Direction frozen for implementation; visual quality is not considered final until real-runtime acceptance passes.
**Date:** 2026-08-27
**Primary reference:** `AtrVisu_Phase1_Design_Validation_Prototype_v3.html` and its executed evidence screens.
**Repository target:** `mtugur/AtrVisu`
**Current implementation PR:** #110 — frozen Draft until reconciled with this specification.

---

## 1. Product Constitution

AtrVisu Phase 1 is a **professional industrial layout and engineering workbench for packaging and end-of-line systems**.

It is not a generic web dashboard, not a lightweight 3D viewer, and not a full CAD/CAE/DES replacement. Its Phase-1 value is to let a sales engineer or layout engineer create a packaging-line layout quickly, preserve equipment intelligence, verify fundamental spatial relationships, and generate customer/engineering deliverables from the same project model.

### North-star principle

**One Industrial Model. One Viewport. One Workbench. Multiple Engineering Perspectives.**

The same placed machine must remain the same entity when viewed by sales, engineering, presentation, outputs, and later simulation/commissioning layers. No workspace may create a duplicate domain truth.

### Phase-1 visible workspaces

- **Sales Layout** — fast layout, asset discovery, placement, arrange, measure, viewpoints, presentation, outputs.
- **Layout Engineering** — the same model and scene, with deeper engineering properties, connections, clearances, precision placement and controlled instance overrides.

Future Simulate / Commission / Review concepts are architectural seams only and must not appear as dead UI in Phase 1.

---

## 2. Global Shell Contract

The UI must read as a desktop engineering application even though the runtime is web-based.

### 2.1 Canonical geometry at 1440×900

| Region | Target |
|---|---:|
| Application Bar | 38 px |
| Menu Bar | 28 px |
| Quick Toolbar | 42 px |
| Status Bar | 25 px |
| Left Dock default | 292 px |
| Right Inspector default | 326 px |
| Bottom Dock default | no Phase-1 contribution; no reserved chrome or inset |
| Viewport | all remaining space; visually dominant |

These are reference dimensions, not magic constants. Implementation may vary by a few pixels to accommodate the existing token system, but proportions and density are normative.

### 2.2 Application Bar

**Responsibility:** product identity, workspace, project context, global search, units/theme/help.

Wide layout:

`AtrVisu · Industrial Layout Workbench | Workspace | Project / Layout / Revision | Search Commands… Ctrl+K | mm | Theme | Help`

Rules:

- no engineering tool dump;
- no duplicated domain actions;
- current project/layout/revision always readable where space permits;
- workspace switch is project-state preserving;
- command search is global and registry-backed;
- unit/theme/help are low-priority application controls.

### 2.3 Menu Bar

Exact top-level order:

**File | Edit | View | Insert | Arrange | Tools | Help**

This order is frozen for Phase 1.

### 2.4 Quick Toolbar

The toolbar is **compact, icon-led, flat and restrained**. It is not a ribbon and not a grouped web-button wall.

Canonical frequent actions:

`Save | Undo | Redo | Duplicate | Delete | Fit View | Labels | Connection Points | Viewpoints | Measure`

Rules:

- icon-only on normal desktop;
- stable tooltip + shortcut + accessible name;
- separators only between logical clusters;
- persistent individual button boxes are minimized;
- brand green is not painted over every active command;
- selected/pressed state uses semantic token treatment;
- a command is present only if its visible behavior is implemented and truthful.

**Critical:** Until the real scene-measure tool exists, `Measure` must not appear in the real product toolbar. Precision Placement remains available through Tools/Inspector. The prototype shows the Phase-1 final target, not permission for dead or misleading UI.

### 2.5 Status Bar

Left:

- selection count;
- primary entity.

Right:

- unit;
- grid snap;
- rotation snap;
- saved/unsaved state.

Status values are concise and live. The status bar is not a message log.

---

## 3. Dock and Surface Grammar

### 3.1 Left Dock

Canonical tabs:

**Library | Explorer | Layers | Groups | Viewpoints**

One left-dock container. One collapse control standard.

### 3.2 Right Dock

**Inspector only.**

The Inspector answers:

> “What is the selected object / selection, and what properties may I inspect or edit?”

It does **not** become a miscellaneous operations toolbox.

### 3.3 Bottom Dock

Bottom Dock is an architectural seam reserved for future **persistent temporal/result utilities**.
Phase 1 has no Bottom Dock contribution, so the shell renders no empty dock
chrome, resize handle, or viewport inset.

Future examples:

- simulation timeline;
- results;
- event log;
- signal trace.

Explicitly forbidden in Bottom Dock:

- Align;
- Distribute;
- Connection Snap configuration;
- Keyboard Nudge;
- ordinary object properties.

### 3.4 Transient viewport surfaces

Short-lived actions appear close to the work, not as permanent panels.

Examples:

- multi-selection Arrange context bar;
- Connection & Snap popover;
- measure graphics;
- command palette;
- context menu.

Transient floating surfaces may use restrained backdrop/glass treatment. Structural docks must not.

---

## 4. Collapse / Expand Standard

Every structural dock uses the same component and interaction contract.

- Left Dock: chevron toward collapse direction.
- Right Inspector: mirrored chevron.
- Bottom Dock: vertical chevron.

All share:

- same hit target;
- same hover/focus state;
- same tooltip grammar;
- same border/radius treatment;
- same persisted explicit size behavior where resizing exists.

Mixed `Collapse` text buttons and unrelated arrows are not permitted.

---

## 5. Interaction Grammar

The placement of a feature is determined by its interaction class.

| Interaction class | Canonical surface | Examples |
|---|---|---|
| Global application/project | Application/Menu | Save, project manager, outputs |
| Frequent direct command | Quick Toolbar | Undo, Fit, Viewpoints |
| Property inspection/edit | Inspector | Name, X/Y/Z, dimensions, utilities |
| Multi-selection operation | Viewport context bar / Arrange menu | Align, Distribute, Group |
| Two-object relation action | Context popover | Connect & Snap |
| Viewport tool | Viewport mode/overlay | Measure |
| Persistent saved-view utility | Primary Dock | Viewpoints |
| Rare/global discoverable command | Command Palette/Menu | managers, presentation, utilities |
| Destructive confirmation | Modal/popover | discard recovery, delete project |

No feature may choose a surface merely because “there is space there.”

---

## 6. Start / Recovery Contract

There is one coherent startup decision surface.

### No recovery

- AtrVisu identity;
- `Start a layout`;
- primary `New Layout`;
- secondary `Open Project`.

### Recovery exists

- `Continue where you left off`;
- concise recovery summary based only on real metadata;
- primary `Resume`;
- secondary `Open Project`, `New Layout`;
- visually separated tertiary destructive `Discard Recovery`.

Rules:

- no second restore banner;
- successful create/open/resume removes the startup overlay immediately;
- recovery persistence and startup-overlay visibility are separate states;
- no fabricated project metadata.

---

## 7. Library Contract

The Library answers:

> “What can I add?”

Phase-1 final Library must support:

- search;
- category/family navigation;
- filters;
- favorites;
- recent assets;
- ATARA Standard / Custom / Project distinction;
- thumbnail or controlled preview;
- asset name, category/family and key dimensions;
- drag/drop or explicit add action.

The normal release surface must contain no test fixtures, duplicate development libraries, or debug-only taxonomy nodes.

### GLB/GLTF import target

Canonical native 3D asset: **GLB**. GLTF is secondary compatibility.

Import workflow:

1. File & Preview
2. Units & Orientation
3. Asset Metadata
4. Validate & Save

Validation covers:

- unit scale;
- bounding dimensions;
- up axis;
- forward direction;
- ground plane;
- category/family;
- stable identity;
- optional connection metadata seam.

The user does not type a raw model path as the primary import workflow.

---

## 8. Explorer Contract

The Explorer answers:

> “What is in this project?”

Responsibilities:

- scene/project entity tree;
- select / multi-select;
- F2 rename;
- visibility state;
- lock state;
- layer/group context;
- bidirectional sync with viewport selection.

A placed-machine display name is project-instance data. Library definition identity remains canonical and unchanged.

---

## 9. Inspector Contract

### 9.1 Single machine — Sales Layout

Recommended sections:

1. Identity
2. Placement
3. Dimensions
4. concise Notes

### 9.2 Single machine — Layout Engineering

The same Inspector expands progressively:

1. Identity
2. Placement / Precision Placement
3. Dimensions
4. Engineering Data
5. Connections
6. Clearance
7. Notes

No second engineering Inspector component should create a conflicting property model.

### 9.3 Multi-selection

Show:

- count;
- primary;
- selected items;
- combined bounds/extents;
- common editable properties where valid;
- assembly/layer context where relevant.

Do not show alignment/distribution/snap button stacks.

---

## 10. Precision Placement vs Measure

These are two different products and must never be conflated.

### Precision Placement

Location: Inspector / Tools.

Owns:

- exact X/Y/elevation/rotation;
- grid snap step;
- rotation snap step;
- keyboard nudge settings;
- precise placement helpers.

### Measure

Location: Quick Toolbar / viewport mode.

Owns actual spatial graphics in the viewport:

- selected entity Width / Depth / Height;
- point-to-point distance;
- entity-to-entity distance;
- edge/footprint relationship where supported;
- pair distance readout.

Rules:

- entering Measure changes viewport tool state, not Inspector visibility;
- dimension graphics are legible at useful camera scales;
- labels and dimension text avoid collisions where practical;
- measurement must not mutate project geometry;
- Esc exits the tool cleanly.

---

## 11. Multi-selection Arrange and Connect

When 2+ alignable entities are selected, a small contextual toolbar appears near the top-center of the viewport.

Canonical actions:

- Align ▾
- Distribute ▾
- Equal Gap ▾
- Group (where meaningful)
- Ungroup (for a selected assembly)
- Advanced Alignment… (existing registered modal tool)

When exactly two compatible machines are selected, additionally show:

- **Connect & Snap**

Connection details open as a small contextual popover that shows:

- moving machine;
- moving connection point;
- fixed machine;
- fixed connection point;
- action `Connect & Snap`.

No large Selection Tools Bottom Dock is permitted in the final Phase-1 design.

Advanced pair/anchor alignment is available from the same contextual bar and
`Arrange > Advanced Alignment…`; both routes open the existing registered modal
tool surface.

---

## 12. Viewpoints

Viewpoints is a first-class Primary Dock tab alongside Library, Explorer,
Layers, and Groups. It continues to use the existing Viewpoints store, Runtime
Panel binding, and UI Preference record.

Behavior:

- first command or rail activation opens Primary Dock with Viewpoints active;
- repeated activation while Viewpoints is active collapses Primary Dock;
- selecting another Primary tab preserves that tab's existing authority;
- legacy persisted `bottom-dock` ownership is normalized to `primary-dock`;
- Bottom Dock sizing preferences remain dormant and are not rewritten.

Final presentation target:

- compact thumbnail cards;
- name;
- Apply;
- Update;
- Rename;
- Delete;
- New Viewpoint.

Viewpoints uses the available Primary Dock content area and its existing internal overflow behavior; no independent default height target is defined.

---

## 13. Command Palette

Global shortcut: **Ctrl+K / Cmd+K**.

The palette is a **search projection of the existing Command Registry**, not a new command system.

Behavior:

- search label + command group;
- up/down selection;
- Enter execute;
- Escape close;
- click outside close;
- disabled commands retain truthful unavailable state/reason;
- no command exists only in the palette.

The palette allows AtrVisu to grow without turning the permanent shell into a button catalog.

---

## 14. Presentation Mode

Purpose: customer-facing clean scene.

When active:

- Application Bar hidden;
- Menu hidden;
- Quick Toolbar hidden;
- Left Dock hidden;
- Inspector hidden;
- Status Bar hidden;
- Bottom Dock hidden unless explicitly designed as presentation navigation;
- viewport maximized;
- engineering gizmos/selection artifacts removed;
- optional simplified viewpoint navigation;
- `Esc` exits.

Presentation Mode never mutates domain geometry or selection persistence merely by entering/exiting.

---

## 15. Civil / Safety / Machine Visual Hierarchy

The final Phase-1 runtime must be judged with real mixed scene content, not an equipment-only scene.

Canonical validation scene includes at minimum:

- floor;
- two walls;
- two columns;
- walkway;
- safety/restricted zone;
- packaging machine;
- conveyors;
- inspection equipment;
- palletizer;
- wrapper;
- forklift.

Visual priority:

1. selected/active equipment;
2. process equipment;
3. civil structure;
4. walkway/safety/reference overlays;
5. grid.

Grid must never dominate the machine scene.

### Semantic colors

- UI brand/accent: restrained AtrVisu green;
- selection: amber;
- connection availability: controlled cyan/green semantics;
- safety: amber/yellow/orange;
- error: red;
- civil: neutral;
- grid: low-contrast neutral.

Brand green is not the universal state color.

---

## 16. Typography and Numeric Data

Primary UI: a professional sans-serif system family; IBM Plex Sans is an acceptable target if locally packaged/licensed in the final product.

Engineering numeric readouts/IDs: mono family such as IBM Plex Mono / Cascadia Mono class.

Rules:

- labels and buttons: concise sentence/title case;
- engineering units always explicit;
- numeric alignment is consistent;
- no developer/architecture terminology in customer UI.

---

## 17. Motion

Reference timings:

- hover/focus: 100–150 ms;
- popover/palette: 150–180 ms;
- panel reveal: 180–250 ms;
- modal: ~180 ms;
- theme crossfade: ~250–300 ms.

Immediate, not animated:

- selection;
- numeric edit;
- drag response;
- Undo/Redo result;
- actual domain mutation.

Preferred easing for reveal transitions: `cubic-bezier(.2,.8,.2,1)` or an equivalent restrained engineering-tool curve.

---

## 18. Help as a Living Product Surface

Help sections at minimum:

- Quick Start;
- Workbench;
- Arrange & Snap;
- Measurements;
- Viewpoints;
- Outputs;
- Keyboard Shortcuts;
- About.

Rules:

- task-oriented language;
- only real current behavior;
- shortcut keycaps;
- no PR/Phase/registry/canonical/governance terminology;
- any user-visible command/workflow/shortcut change updates Help in the same implementation package.

---

## 19. Commercial Outputs

`File > Commercial Outputs` uses one canonical commercial snapshot.

Preflight shows:

- project;
- layout;
- revision;
- equipment count;
- unknown/missing engineering data warnings.

Phase-1 deliverables:

### Equipment Workbook (.xlsx)

- Summary
- BOM
- Instances
- readable widths, filters, frozen headers/panes, numeric formats.

### Measured Layout Plan (.pdf)

- A3 landscape measured plan;
- title block;
- project/layout/revision/unit/generated;
- equipment schedule pages;
- Unicode-safe text.

### 3D Presentation Image (.png)

- 1920×1080;
- current viewpoint;
- no application chrome;
- no selection/gizmo artifacts unless explicitly part of presentation state.

---

## 20. Responsive Contract

AtrVisu is desktop-first.

### 1440×900

Full experience.

### 1024×768

- docks may narrow;
- project breadcrumb may compact;
- toolbar remains usable;
- viewport remains dominant.

### 640×800

This is resilience, not primary authoring:

- no document-level horizontal overflow;
- left dock may collapse/hide;
- Inspector may become an overlay/drawer;
- command search may hide behind shortcut/menu;
- essential commands remain reachable.

No mobile-first redesign is required for Phase 1.

---

## 21. Canonical Phase-1 User Workflow

### Sales flow

`Start/Open → Library Search → Add Equipment → Place → Multi-select → Arrange → Connect & Snap → Measure → Add Civil/Safety → Viewpoint → Presentation → Commercial Outputs`

Target: **≤15 minutes for a CAD-inexperienced sales user** on a prepared asset library.

### Engineering flow

`Open same layout → Layout Engineering → exact Placement → Engineering Data → Connections → Clearance → Layers/Groups → Measure/Collision checks → Save/Export`

The engineering flow reuses the same entities and scene; it does not reconstruct the layout.

---

## 22. Phase-1 Scope Boundaries

Phase 1 does not promise:

- DES throughput/bottleneck simulation;
- FEA/CFD;
- robot OLP;
- PLC/OPC live integration;
- full native STEP CAD kernel;
- live digital twin;
- collaborative multiplayer;
- automatic quotation pricing.

Architectural seams may exist, but no dead UI may advertise unfinished capabilities.

---

## 23. Canonical Screen Evidence

The design must be validated in one consistent runtime with these states:

1. Start / Recovery
2. Normal Workbench + Library + Civil
3. Single Selection — Layout Engineering Inspector
4. Multi-selection contextual Arrange
5. Measure dimensions in viewport
6. Viewpoints / presentation state
7. Commercial Outputs
8. GLB import workflow
9. Help
10. 1024×768 responsive
11. 640×800 resilient layout

All screenshots must come from a **run prototype or real application**, not separate image-generation prompts.

---

## 24. Acceptance Gates

### Technical Integrity Gate

- audit 0 vulnerabilities;
- dependency tree valid;
- build pass;
- full unit pass;
- full E2E pass;
- diff check pass;
- one App / EditorHost / BabylonScene / canvas;
- no duplicate domain authority.

### Semantic Integrity Gate

- every visible control does what its label naturally promises;
- every toggle is bidirectional and truthful;
- no dead UI;
- one placed-instance name authority;
- Library identity and BOM identity remain canonical.

### Professional UX Gate

- surface placement obeys Interaction Grammar;
- no Inspector tool dumping;
- no large transient-operation Bottom Dock;
- no duplicate commands competing for attention;
- startup is one coherent decision;
- Library/Explorer mental models remain distinct;
- Help matches product behavior.

### Visual Presentation Gate

- mixed civil/equipment/safety scene is customer-presentable;
- grid subordinate;
- labels readable and collision-managed;
- selection/hover/material hierarchy consistent;
- screenshots at 1440/1024/640 accepted;
- Presentation Mode is clean.

### Workflow Gate

- blind-user sales flow ≤15 minutes;
- no unexplained panel hunt;
- outputs created from the same project model.

**Phase 1 is CLOSED only when all gates pass simultaneously.**

---

## 25. Implementation Governance

The accepted prototype is a **directional floor, not a quality ceiling**.

Implementation must be better where real Babylon/GLB rendering, interaction, accessibility and engineering semantics permit it.

Before any visible package reaches the user for acceptance:

1. implementation/diff review;
2. authority/state review;
3. full CI;
4. executed runtime screenshots at relevant canonical states;
5. assistant product-quality review;
6. only then bounded user visual/manual acceptance if genuinely necessary.

The user is not the pixel-level design QA operator. Product coherence is an engineering responsibility.
