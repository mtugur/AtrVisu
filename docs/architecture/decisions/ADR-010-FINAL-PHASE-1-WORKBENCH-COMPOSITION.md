# ADR-010: Final Phase 1 Workbench Composition

Status: **Accepted**

## Context

Phase 1 established editor, command, panel, selection, viewport, preference,
workspace, and smart-property authorities, but the compatibility shell still
stacked navigation, engineering, and global tools in one right-side surface.
P1-F must compose those existing authorities into a coherent product workbench
without remounting the editor or creating replacement stores.

## Decision

The canonical workbench keeps the nine logical regions from ADR-001:
Application Bar, Menu Bar, Command Bar, Primary Dock, Editor Host, Secondary
Dock, Bottom Dock, Status Bar, and modal layer.

The Primary Dock owns resource and navigation surfaces: Library, Explorer,
Layers, and Groups. It uses one active contribution at a time and routes panel
activation through the Runtime Panel Registry. The Layout Explorer projects
the existing `PlatformEntity` snapshot and Runtime Selection state. Scene and
Explorer selection share the same canonical IDs and primary-selection order.
Rename remains unavailable until a history-backed rename command exists.

The expanded Primary Dock is user-resizable from its right edge on desktop and
medium layouts. Its bounded width and collapse state remain fields of the
existing UI Preferences `PanelPreference`; collapse preserves the activity
rail and expansion restores the persisted width. Layout Explorer consumes the
available width without horizontal scrolling and retains full identity/type/
context text through its row tooltip. Narrow layout disables the desktop drag
handle and keeps the existing one-context composition.

The Secondary Dock is the contextual Inspector. It renders an empty state,
single-entity properties, P1-E Smart Asset Properties, assembly context, or
bounded multi-selection tools. Annotation properties are also Inspector
context. Global managers, diagnostics, civil creation, simulation, viewpoints,
and performance tools do not belong in the Inspector.

Inspector contributions that are canonical workspace panels (`annotations`,
`precisionPlacement`, `alignmentTools`, and `connectionPointSnap`) are rendered
only when both their selection context and existing UI Preferences / Runtime
Panel state allow them. Their disclosure state uses that same panel authority.
Manual visibility changes continue to clear the active workspace identity; the
Sales and Layout Engineering presets remain the declared composition sources.

The Bottom Dock is contribution-driven. Viewpoints is its first contribution
and continues to use the existing viewpoint state and command authority. The
Status Bar projects live selection, primary entity, millimetre working unit,
snap state, and project dirty state without owning copies of those values.
The Viewpoints contribution uses a content-driven compact engineering strip;
the desktop default expanded height is 136 px, with a bounded responsive fit.
The generic Bottom Dock is vertically resizable from its top edge and persists
its expanded height through the same UI Preferences panel-size authority.

Global tools remain reachable through registered menu or command surfaces and
their existing modal/tool surfaces. File owns project and layout file actions;
View owns display and viewpoint actions; Insert owns annotation and civil
creation; Tools owns Library Manager, Taxonomy Manager, Collision Check,
Simulation Controls, and Performance Benchmark.

Display and overlay controls are a View-owned registered modal/tool surface,
not Inspector content. They update the existing persisted `overlaySettings`
authority for selection and metadata boxes, collision and clearance envelopes,
annotations and leader lines, and connection-point display mode. Existing
labels and connection-point commands remain their registered command routes.

Layout Explorer uses native navigation and nested-list semantics around its
existing entity action buttons. It intentionally does not declare an ARIA tree
until the complete tree keyboard, focus, expansion, and selection contract can
be implemented without replacing Runtime Selection authority.

Workspace presets and manual panel visibility continue through the existing UI
Preferences and workspace runtime. Panel switching and dock geometry may resize
the viewport but must not mutate camera, selection, transforms, history, dirty
state, or scene lifecycle identity.

## Real ATARA Slice

The repository does not contain a canonical VBF asset. The representative line
therefore uses three genuine Atara Standard Library entries: `Flow Pack
Machine`, `Belt Conveyor`, and `Robot Palletizer`. The Chromium workflow adds
them through the normal Library tree, arranges them through transform controls,
selects through scene and Explorer, inspects the smart schema, exercises Layers
and Groups, captures a Viewpoint, reads Status Bar state, and opens Library
Manager through the normal Tools route.

## Consequences

- Existing runtime registries remain the lifecycle and availability authority.
- The viewport remains dominant and one contextual dock surface at a time is
  acceptable on narrow layouts.
- Existing compatibility JSX is retained behind a disabled rollback boundary,
  but it is not part of the rendered product composition.
- Contextual panel visibility and collapse have one UI Preferences / Runtime
  Panel authority; no local visibility store is introduced.
- Primary width and Bottom height use that same authority; resize helpers hold
  only transient pointer-start data and introduce no second sizing store.
- The global display tool preserves one overlay state authority and does not
  remount Editor Host, Babylon, or canvas.
- No demo-only scene, second entity tree, second viewpoint store, or property
  interpretation model is introduced.
- P1-G retains ownership of BOM, Excel, PDF, quotation, and commercial output.

## Verification Obligations

- Unit tests cover dock activation, contribution rendering, Explorer selection,
  Status Bar values, region mapping, panel metadata, and workspace presets.
- Chromium covers bidirectional scene/Explorer selection and the genuine ATARA
  line through normal product routes.
- Desktop, medium, and narrow geometry retain one Editor Host and one canvas,
  with no document overflow or red runtime errors.
- Dock resize/collapse tests preserve active contribution, camera, Runtime
  Selection, history/dirty state, viewport dominance, and scene lifecycle
  generation across resize, restore, and preference-backed reload.
- Panel visibility and hydration tests prove hidden Primary panels remain
  restorable and preference updates are not lost.
- Unit and Chromium tests prove View-owned overlay reachability, contextual
  panel DOM/registry agreement, preset/manual-override policy, and native
  Explorer accessibility semantics without scene lifecycle changes.
