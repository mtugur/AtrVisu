# PF-3B Viewport Visual Language Benchmark Evidence

Status: Pre-implementation evidence for the PF-3B viewport visual engineering language contract.

Review date: 2026-09-28

## Evidence Method

This record uses official vendor documentation only. Each entry separates a documented benchmark fact from an AtrVisu product decision. Product colors, dimensions, ratios and acceptance captures are not attributed to a benchmark unless the source states them.

## Visual Components Premium 5.0 - Building a Layout

- Vendor: Visual Components Oy.
- Product/version/year: Visual Components Premium 5.0, 2026.
- Source title: `Building a Layout`.
- Official source: https://help.visualcomponents.com/5.0/Premium/en/English/Layout%20Configuration/Building_a_layout.htm
- Version/date corroboration: https://www.visualcomponents.com/release-history-and-support-lifecycle/
- Access date: 2026-09-28.
- Specific precedent: the default 3D world opens as an empty layout with a floor and grid; components are added to that world, selected there and manipulated there.
- Task similarity: this is the same industrial layout-building viewport class as AtrVisu, including catalog assets, an engineering world and direct layout editing.
- **BENCHMARK FACT:** floor/grid context, layout components and selection/manipulation coexist in one engineering world while remaining distinguishable concepts.
- **ATRVISU PRODUCT DECISION:** AtrVisu will use a subdued global workplane/grid beneath physical entities. The workplane is presentation only and does not become a Civil item, Level, persisted entity or movement authority.

## Visual Components Premium 5.0 - Visualization

- Vendor: Visual Components Oy.
- Product/version/year: Visual Components Premium 5.0, 2026.
- Source title: `Visualization`.
- Official source: https://help.visualcomponents.com/5.0/Premium/en/English/Getting%20Started/Visualization.htm
- Version/date corroboration: https://www.visualcomponents.com/blog/visual-components-5-0-the-fastest-way-from-concept-to-reality/
- Access date: 2026-09-28.
- Specific precedent: viewport presentation exposes fill-view, a directional headlight, perspective/orthographic projection, multiple rendering modes, frame visibility and saved views as separate visual controls.
- Task similarity: AtrVisu uses the same perspective/orthographic industrial layout viewport and must keep camera/framing authority separate from visual styling.
- **BENCHMARK FACT:** navigation, framing, illumination, projection, render mode and auxiliary-frame visibility are separable viewport concerns.
- **ATRVISU PRODUCT DECISION:** PF-3B may change presentation lighting, background, grid, material treatment and selection overlays, but a theme change must not mutate camera, fit, project, history, selection or entity transforms.

## Visual Components Premium 4.10 - Selection

- Vendor: Visual Components Oy.
- Product/version/year: Visual Components Premium 4.10, 2024.
- Source title: `Selection`.
- Official source: https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/Selection.htm
- Version/date corroboration: https://www.visualcomponents.com/blog/introducing-visual-components-4-10-design-beyond-limits/
- Access date: 2026-09-28.
- Specific precedent: direct viewport selection and panel-based selection address the same layout objects; Ctrl adds/removes objects from the current selection.
- Task similarity: AtrVisu already shares Runtime Selection between Viewport, Explorer and Inspector and needs a visual treatment for that same state.
- **BENCHMARK FACT:** selection is an explicit cross-surface object state, not a material category or warning state.
- **ATRVISU PRODUCT DECISION:** primary and secondary selection will use dedicated outline/frame/silhouette cues that remain distinct from warning and collision colors and work across placeholder, GLB and Civil geometry.

## Autodesk Inventor Factory 2021 - Floor and Grid Settings

- Vendor: Autodesk, Inc.
- Product/version/year: Inventor Factory Design Utilities, 2021 documentation.
- Source title: `Floor and Grid Settings Reference`.
- Official source: https://help.autodesk.com/cloudhelp/2021/ENU/FDU/files/Inventor-Factory-Help/Preparation-and-Setup/To-Manage-Floor-and-Grid/FDU_Inventor_Factory_Help_Preparation_and_Setup_To_Manage_Floor_and_Grid_Floor_Grid_Settings_Reference_html.html
- Access date: 2026-09-28.
- Specific precedent: floor visibility, auto-size/minimum size, floor appearance, minor spacing, major-line frequency and separate major/minor colors are independently configurable.
- Task similarity: both products place factory equipment and building references against a metric floor/grid context whose extent follows layout content.
- **BENCHMARK FACT:** factory-layout grid spacing and major/minor hierarchy are explicit engineering-display settings; auto-size keeps components within a minimum floor extent.
- **ATRVISU PRODUCT DECISION:** the PF-3B grid uses a fixed metric cadence of 1000 mm minor spacing and one major line every five minor intervals. Its extent is derived from current Machine and Civil plan bounds, not from camera zoom or fit-view state.

## Autodesk Inventor Factory 2020 - Manage Floor and Grid Settings

- Vendor: Autodesk, Inc.
- Product/version/year: Inventor Factory Design Utilities, 2020 documentation.
- Source title: `Manage Floor and Grid Settings`.
- Official source: https://help.autodesk.com/cloudhelp/2020/ENU/FDU/files/Inventor-Factory-Help/Preparation-and-Setup/To-Manage-Floor-and-Grid/FDU_Inventor_Factory_Help_Preparation_and_Setup_To_Manage_Floor_and_Grid_To_Manage_Floor_and_Grid_html.html
- Access date: 2026-09-28.
- Specific precedent: floor size/appearance and grid spacing/appearance are separate groups; automatic resizing follows component placement and has a user-defined minimum.
- Task similarity: AtrVisu needs the same content-bounded engineering context without making camera state or a physical Floor Area own grid extent.
- **BENCHMARK FACT:** a visual factory floor may auto-size from layout content while retaining a minimum extent; major/minor visibility, cadence and colors remain separate presentation concerns.
- **ATRVISU PRODUCT DECISION:** an empty AtrVisu layout gets a centered 40000 x 40000 mm workplane. Non-empty extents add 5000 mm margin on each side, enforce the same per-axis minimum and round outward to 5000 mm boundaries.

## SOLIDWORKS 2025 - Scenes

- Vendor: Dassault Systemes SolidWorks Corporation.
- Product/version/year: SOLIDWORKS 2025.
- Source title: `Scenes`.
- Official source: https://help.solidworks.com/2025/english/SolidWorks/sldworks/c_Scenes.htm
- Access date: 2026-09-28.
- Specific precedent: a scene separates environment, two-dimensional background and a floor that may receive shadows/reflections.
- Task similarity: SOLIDWORKS provides a mature CAD precedent for separating model readability from background, illumination and floor presentation.
- **BENCHMARK FACT:** background, illumination/environment and floor presentation are separate scene responsibilities.
- **ATRVISU PRODUCT DECISION:** PF-3B uses a neutral single-color background and bounded neutral key/fill/ambient lighting. It rejects skyboxes, HDRI, cinematic grading, expensive dynamic shadows and decorative reflections for the Phase-1 engineering viewport.

## SOLIDWORKS 2023 - Edit Scene PropertyManager: Basic

- Vendor: Dassault Systemes SolidWorks Corporation.
- Product/version/year: SOLIDWORKS 2023.
- Source title: `Edit Scene PropertyManager - Basic`.
- Official source: https://help.solidworks.com/2023/English/SolidWorks/sldworks/HIDD_DVE_SCENE_EDITOR_BASIC.htm
- Access date: 2026-09-28.
- Specific precedent: background type, background color/image, environment, floor shadows and floor reflections are independently controlled.
- Task similarity: AtrVisu likewise needs an independently styled background/workplane while retaining physical model and Floor Area authority.
- **BENCHMARK FACT:** a plain background can be selected independently of an environment, and floor effects are optional presentation features.
- **ATRVISU PRODUCT DECISION:** AtrVisu separates the global visual workplane from physical Floor Area geometry. The global workplane cannot cast engineering meaning, occlude physical geometry or substitute for the invisible pickable Plan-drag plane.

## Convergent Findings

The official sources converge on these precedents:

1. Factory layouts benefit from a floor/grid context distinct from placed engineering content.
2. Major/minor grid cadence, visual appearance and extent are explicit presentation concerns.
3. Content-driven auto-size may coexist with a deterministic minimum extent.
4. Viewport projection, lighting/rendering and selection are separate responsibilities.
5. Selection is an object state shared between viewport and panels, not a warning material.
6. Background, environment/lighting and floor are separable scene layers.

The sources do not prescribe AtrVisu's colors, millimetre cadence, auto-size margins, lighting ratios or selection palette. Those values are frozen as explicit AtrVisu decisions in `docs/standards/ATRVISU_VIEWPORT_VISUAL_STANDARD.md` and ADR-004.
