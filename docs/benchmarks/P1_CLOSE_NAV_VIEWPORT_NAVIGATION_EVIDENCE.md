# P1-CLOSE-NAV Benchmark Evidence

Access date: 2026-10-01

Scope: Phase-1 closeout navigation package only: Fit View, ViewCube / standard
views, orientation indicator, and side-dock screen-space viewport stability.

This document separates **BENCHMARK FACT** from **ATRVISU PRODUCT DECISION**.

## 1. Autodesk ViewCube

Official source:
- Autodesk Alias 2025, "ViewCube tools"
  https://help.autodesk.com/cloudhelp/2025/ENU/Alias-Interface-and-General-Tasks/files/Alias_Interface_and_General_Tasks_Viewcube_tools_html.html

BENCHMARK FACT:
- ViewCube is persistent, clickable and draggable.
- It provides visual feedback for the current viewpoint while inactive.
- Faces select Top/Bottom/Front/Back/Left/Right.
- Edges and corners select preset adjacent angled views.
- Face views can be true orthographic views.
- Default placement is the upper-right of the perspective window.

ATRVISU PRODUCT DECISION:
- AtrVisu implements the 26 deterministic preset zones: 6 faces, 12 edges,
  8 corners.
- Phase 1 does not implement free tumble by dragging the cube. Existing viewport
  orbit remains the free-orbit authority.
- All preset cube views are engineering parallel/orthographic views.

Official source:
- AutoCAD 2026, "ViewCube Settings Dialog Box"
  https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-MAC-Core/files/GUID-78043EE2-114B-4F08-BFD7-7E5E429708A9.htm

BENCHMARK FACT:
- ViewCube location and size are viewport settings.
- View changes may optionally animate.
- "Zoom to Extents" is a distinct option when clicking the cube.
- ViewCube may be oriented to a world/user coordinate system.

ATRVISU PRODUCT DECISION:
- AtrVisu ViewCube orientation changes do **not** invoke Fit View.
- ViewCube is always aligned to AtrVisu canonical world axes, not Babylon's
  engine axes.
- Phase-1 preset changes are immediate/deterministic; no animation dependency.

## 2. Visual Components View Selector and Floating Origin

Official source:
- Visual Components 4.10, "Navigation"
  https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/Navigation.htm

BENCHMARK FACT:
- Visual Components shows a floating XYZ world origin and a View Selector in
  the viewport.
- Standard views are represented by an interactive six-view control.
- Inner/outer edges provide adjacent two-side views and corners provide
  adjacent three-side views.
- Current orientation is reflected visually by the selector.

ATRVISU PRODUCT DECISION:
- AtrVisu uses one interactive ViewCube in the upper-right and one compact
  passive axis triad in the lower-left.
- The axis triad is orientation feedback, not a second camera authority.

## 3. SOLIDWORKS Reference Triad

Official source:
- SOLIDWORKS 2025, "Reference Triad"
  https://help.solidworks.com/2025/english/SolidWorks/sldworks/r_reference_triad.htm

BENCHMARK FACT:
- The reference triad exists to help users orient themselves while viewing
  models.
- SOLIDWORKS also allows view orientation changes through the reference triad.

Official source:
- SOLIDWORKS 2025, "Display Options"
  https://help.solidworks.com/2025/english/SolidWorks/sldworks/HIDD_OPTIONS_EDGES.htm

BENCHMARK FACT:
- SOLIDWORKS explicitly describes a reference triad as an orientation display
  and states that it is not an inference point.

ATRVISU PRODUCT DECISION:
- AtrVisu Phase-1 axis triad is display-only and non-pickable.
- Interactive orientation belongs to ViewCube only, avoiding two competing
  navigation controls.

## 4. Fit / Extents

Official source:
- SOLIDWORKS 2025, "Zoom to Fit"
  https://help.solidworks.com/2025/english/SolidWorks/sldworks/t_zoom_to_fit.htm

BENCHMARK FACT:
- Zoom to Fit changes the view so the entire current model/assembly/drawing is
  visible.
- SOLIDWORKS exposes it through toolbar, menu and the F shortcut.

Official source:
- AutoCAD 2026, "ZOOM (Command)"
  https://help.autodesk.com/cloudhelp/2026/ENU/AutoCAD-MAC-Core/files/GUID-66E7DB72-B2A7-4166-9970-9E19CC06F739.htm

BENCHMARK FACT:
- Zoom Extents calculates the maximum object extents and changes magnification
  so the drawing/model fits the current viewport.
- Zoom affects view magnification; it does not change object size.

Official source:
- SOLIDWORKS 2025, "Zoom to Sheet"
  https://help.solidworks.com/2025/English/SolidWorks/sldworks/t_zoom_sheet.htm

BENCHMARK FACT:
- Fit calculations account for occupied graphics-area UI so the target content
  is not hidden under interface elements.

ATRVISU PRODUCT DECISION:
- Fit View is a distinct command and never occurs implicitly on panel open,
  panel close, resize, theme change or ViewCube preset selection.
- Fit View uses visible Machine + Civil physical/layout geometry, not the global
  workplane/grid, labels, selection frames, annotations or temporary overlays.
- Fit View preserves current projection mode and orientation and only changes
  target/framing.

## 5. Side panels and viewport stability

No reviewed vendor document states a universal rule that opening a dock must
preserve exact object pixel coordinates. Therefore this is not claimed as a
benchmark fact.

ATRVISU PRODUCT DECISION:
- AtrVisu adopts the stronger Phase-1 product invariant requested by the product
  owner: opening/collapsing/resizing left or right dock must not move rendered
  world geometry in screen space.
- Side docks therefore overlay a stable viewport/canvas rather than re-layout
  the viewport.
- HUD controls may move into a safe area so they remain visible; scene
  projection does not move.

## 6. Rejected interpretations

- Do not equate ViewCube with Fit View.
- Do not implement panel stability by silently panning the camera.
- Do not expose Babylon engine axis labels to the user.
- Do not create a second camera store for ViewCube.
- Do not reopen PF-3A Plan Move or object-drag mathematics.
