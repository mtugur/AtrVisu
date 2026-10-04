# P1 Viewport Pan and Grid Readability Benchmark Evidence

Status: Stage A pre-implementation evidence; no runtime conformity claim.
Review date: 2026-10-04.
Contract-owner decision: [PR #122 review 5407842477](https://github.com/mtugur/AtrVisu/pull/122#pullrequestreview-5407842477).

## Method and task similarity

Official source documentation/training is reviewed before a new implementation. Task similarity prioritizes factory-layout navigation (Visual Components / Autodesk Factory), followed by CAD camera navigation (AutoCAD / SOLIDWORKS). 3ds Max is secondary evidence for the view-parallel concept, not an industrial workflow authority. Facts below are limited to what each source documents. No vendor is claimed to prescribe AtrVisu target depth, numerical tolerance, snap cadence or renderer algorithm.

## 1. Visual Components Premium 4.10 - Navigation

- Vendor/product generation: Visual Components Oy, Premium 4.10 help.
- Official source: [Navigation](https://help.visualcomponents.com/4.10/Premium/en/English/Getting%20Started/Navigation.htm), Camera / Panning.
- Access/review date: 2026-10-04.
- BENCHMARK FACT: LMB+RMB translates the camera along viewport-horizontal and viewport-vertical axes. RMB rotation and wheel zoom are distinct routes.
- Task similarity: direct industrial 3D layout navigation while equipment and civil context remain scene objects.
- AtrVisu adoption: adopt viewport-axis/view-parallel camera translation. Do not copy the two-button binding; direct MMB remains the existing AtrVisu binding by explicit owner decision. Do not change orbit or wheel semantics.

## 2. Autodesk AutoCAD 2020 - PAN

- Vendor/product generation: Autodesk, AutoCAD Core 2020 help.
- Official source: [PAN (Command)](https://help.autodesk.com/cloudhelp/2020/ENU/AutoCAD-Core/files/GUID-2F05DC89-7065-4655-BA49-AC149B0F5E1A.htm).
- Access/review date: 2026-10-04.
- BENCHMARK FACT: Pan shifts the view while retaining viewing direction and magnification. Mouse-wheel/MMB drag is an available route in addition to the command's pointer drag.
- Task similarity: engineering view navigation without changing model dimensions or orientation.
- AtrVisu adoption: preserve camera orientation/framing during pan and retain direct MMB. The source does not prescribe a perspective depth plane or 1 CSS px threshold.

## 3. Autodesk 3ds Max 2023 - Pan View

- Vendor/product generation: Autodesk, 3ds Max Basics 2023 help.
- Official source: [Pan View](https://help.autodesk.com/cloudhelp/2023/ENU/3DSMax-Basics/files/GUID-802A4CCA-1695-4D91-BC30-9A4C0DAEEE5F.htm).
- Access/review date: 2026-10-04.
- BENCHMARK FACT: Pan translates the view parallel to the current viewport plane in perspective/orthographic views. Direct MMB is documented for 3ds Max interaction mode; Maya mode uses Alt+MMB.
- Task similarity: secondary professional 3D camera precedent, weaker than factory-layout evidence.
- AtrVisu adoption: view-parallel semantics across both projections; reject copying mode-specific acceleration/modifiers or changing object manipulation.

## 4. SOLIDWORKS - Pan

- Vendor/product generation: Dassault Systemes, SOLIDWORKS Design Help 2025; official model-view training article (publication generation not stated on retrieved page).
- Official source: [Pan, 2025](https://help.solidworks.com/2025/english/SolidWorks/sldworks/t_pan_fundamentals.htm).
- Official training corroboration: [How do I manipulate my model view; let me count the ways](https://blogs.solidworks.com/products/solidworks/how-do-i-manipulate-my-model-view-let-me-count-the-ways/), Mouse Manipulation / Pan.
- Access/review date: 2026-10-04. The help result provides the device table; direct help opening returned a JS shell, so the separately retrieved official training text corroborates the binding.
- BENCHMARK FACT: Pan is a standard document-view translation gesture. Ctrl+MMB is the model-view binding; drawings do not require Ctrl.
- Task similarity: mature part/assembly CAD view navigation; binding differences matter for users switching products.
- AtrVisu adoption: separate camera translation from entity movement; retain direct MMB rather than copying Ctrl. Do not attribute AtrVisu's reference-depth rule to SOLIDWORKS.

## 5. Autodesk Inventor Factory 2021 - Floor/Grid Settings

- Vendor/product generation: Autodesk, Inventor Factory Design Utilities 2021 help.
- Official source: [Floor and Grid Settings Reference](https://help.autodesk.com/cloudhelp/2021/ENU/FDU/files/Inventor-Factory-Help/Preparation-and-Setup/To-Manage-Floor-and-Grid/FDU_Inventor_Factory_Help_Preparation_and_Setup_To_Manage_Floor_and_Grid_Floor_Grid_Settings_Reference_html.html).
- Access/review date: 2026-10-04.
- BENCHMARK FACT: floor auto-size follows added/moved components with a configured minimum extent. Minor spacing and the major-every-minor cadence are explicit settings, separate from line visibility/colors.
- Task similarity: the same factory layout content-bounded visual grid context.
- AtrVisu adoption: retain content-driven rotation-applied bounds, fixed 1000/5000 mm spacing, world phase and minimum/margin rules. AtrVisu values are product decisions, not vendor facts. No Floor/Level inference or physical-slab change is adopted.

## 6. Autodesk Inventor 2022 - Ground Plane display detail

- Vendor/product generation: Autodesk, Inventor 2022 help.
- Official source: [Reference for the Ground Plane Command](https://help.autodesk.com/cloudhelp/2022/ENU/Inventor-Help/files/GUID-350199B9-E2E4-4ADE-BE7D-43D346151B28.htm), Grid Display / Dynamically reduce line count.
- Access/review date: 2026-10-04.
- BENCHMARK FACT: an optional display setting reduces visible grid-line count while zooming out and restores it while zooming in; minor spacing and major cadence remain separate controls.
- Task similarity: professional engineering grid legibility when projected detail becomes dense; supports a display-detail concept, not a particular GPU implementation.
- AtrVisu adoption: permit reduction/fade/suppression of sub-pixel minor detail as presentation only. Reject importing configurable floor relocation, reflection, story grids or a new persistence setting. Do not infer a vendor filtering algorithm or shimmer tolerance.

## Convergence, differences and owner decisions

The sources converge on camera/view translation and engineering grid hierarchy, not a universal mouse binding. Direct MMB is an AtrVisu compatibility decision supported by AutoCAD/3ds Max and deliberately different from VC/SOLIDWORKS bindings.

ATRVISU PRODUCT DECISION (review 5407842477, not vendor attribution):

- Pan is view-parallel with no floor/scene/depth-buffer/entity hit dependency.
- Perspective scale uses gesture-start camera-target depth; orthographic scale uses current world span. Camera position/target translate together; domain Elevation never changes.
- Real-input trajectory, subdivision equivalence and reverse-return oracle use <= 1 CSS px. This is owner-frozen, not reverse-engineered from the old ~half-response loop.
- Every canonical face/edge/corner supports Pan, including exact horizontal sides.
- Grid world spacing/phase/bounds remain fixed; only sub-pixel visual detail may change. No broad false bands, alternating phase or deformation-like temporal popping.
- No gain/angle repair, hidden fallback, smoothing, hysteresis or retry model is adopted.

## Provenance and sequencing

Diagnostic findings were independently accepted before this package: [comment 5983406452](https://github.com/mtugur/AtrVisu/pull/122#issuecomment-5983406452), exact head `124b62a9e4bee879428315794486717f97720d10`, four historical checkpoints. Pan feedback predates P1-CLOSE-NAV; repeated-grid texture begins in PF-3B. This evidence explains the stop, not approval of either implementation.

Stage A begins from exact main `b727f4ee59875f9bbfbab7cc9b813486b20b353f`, not PR #122. New Stage B runtime code is PENDING and cannot begin before separate governance review/merge. PR #122 head stays unchanged and Draft/unmerged. No Product Owner exploratory testing is required for Stage A.
