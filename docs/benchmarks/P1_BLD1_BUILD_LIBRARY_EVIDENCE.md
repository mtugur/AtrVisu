# P1-BLD1 Build Library Benchmark Evidence

Review date: 2026-09-21
Scope: factory-layout asset discovery, insertion, and placed-instance properties.

## Autodesk Factory Design Utilities 2024: Asset Browser

- Official source: https://help.autodesk.com/cloudhelp/2024/ENU/FDU/files/AutoCAD-Factory-Help/FDU_AutoCAD_Factory_Help_Finding_Your_Way_Around_ACF_html.html
- Observed behavior: the Factory Asset Browser provides access to factory components including architectural features, material-handling equipment, and processing equipment.
- Task similarity: AtrVisu users add both equipment and building references to one industrial layout.
- AtrVisu adoption: one Library discovery surface contains machine and Build entries. The browser is a presentation/index layer, not a reason to merge their placed domain models.

## Autodesk Inventor Factory 2020: Asset Browser

- Official source: https://help.autodesk.com/cloudhelp/2020/ENU/FDU/files/Inventor-Factory-Help/About-Placing-Factory-Assets/To-Insert-Factory-Assets/FDU_Inventor_Factory_Help_About_Placing_Factory_Assets_To_Insert_Factory_Assets_Inventor_Factory_Asset_Browser_html.html
- Observed behavior: the browser groups system/user/cloud assets, search results and favorites, supports tree and thumbnail navigation, and offers asset insertion.
- Task similarity: AtrVisu already has Search, All/Recent/Favorites, source/category/family filters, and a hierarchical Library.
- AtrVisu adoption: Build primitive templates participate in the existing discovery controls; existing machine library behavior remains unchanged. A separate normal Build-add panel is rejected.

## Autodesk Inventor Factory 2024: Factory Properties Browser

- Official source: https://help.autodesk.com/cloudhelp/2024/ENU/FDU/files/Inventor-Factory-Help/About-Placing-Factory-Assets/FDU_Inventor_Factory_Help_About_Placing_Factory_Assets_Factory_Properties_Browser_Reference_html.html
- Observed behavior: editing a selected placed asset's properties affects that instance, not the Factory Assets library. Properties include layer and dimension values; unavailable fields are not editable.
- Task similarity: AtrVisu Build items have instance-specific size, position, style and lock state.
- AtrVisu adoption: immutable Build templates are creation definitions only. Color, opacity and geometry edits apply to the placed `CivilReferenceItem` through the existing Inspector, history, layer and lock authorities.

## Decision Boundary

The sources support a shared factory-asset discovery surface and distinct placed-instance editing. They do not prescribe AtrVisu's TypeScript model, Beam dimensions, opacity range, or command IDs; those are frozen in `docs/adr/ADR-002-build-library-asset-projection.md` and the existing civil domain rules. No framework default is treated as product evidence.
