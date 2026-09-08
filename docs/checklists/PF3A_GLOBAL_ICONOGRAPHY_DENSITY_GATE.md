# PF-3A Global Iconography and UI Density Gate

| Gate | Required evidence |
| --- | --- |
| Exact base | `main` at `cc8afef2818871e71dba085b95e0b07bba7faa55` |
| Canonical icon authority | Product-source governance permits `lucide-react` only in `iconRegistry.tsx` |
| Registry completeness | Every unique `WorkbenchIconId` resolves; unknown IDs follow the existing undefined/null-render contract |
| Compact primitive | 32 by 32 icon-only geometry, shared icon-plus-text height, one decorative SVG, truthful name/title/state |
| Primary Dock | Five icon-only tabs in Library, Explorer, Layers, Groups, Viewpoints order; separate badges; persistence and collapse unchanged |
| Quick Toolbar | Existing command IDs, More overflow, keyboard behavior and 32 pixel grammar unchanged |
| Library | Source identity is rendered once; redundant semantic root is omitted; metadata remains visible in 90-100 pixel hierarchy rows; Favorite/Add/Custom Variant use one compact rail; disclosures remain registered and accessible |
| Layers | Compact Add/Show All header and target-specific visibility, lock, isolate, rename and danger-delete rail |
| Groups | Registered collapse chevron; package add/remove, distinct assembly Edit/check Done, text Rename and danger Ungroup semantics preserve existing handlers |
| Viewpoints | Registered capture/navigation/strip/action icons; scalable strip, selection reveal and domain semantics preserved |
| Text safety | Menus, Inspector engineering labels, Native Import decisions, Project decisions and Help remain visible text |
| Accessibility | Icon actions have accessible names, matching titles, keyboard focus, truthful disabled/toggle state and one hidden SVG; disclosure controls preserve `aria-expanded`; Inspector Pin exposes `aria-pressed` and Pin/Unpin names |
| Responsive | 1440 by 900, 1024 by 768 and 640 by 800 remain operable without document horizontal overflow |
| Inspector visibility | Auto follows selection and closes on floor clear; Pinned makes open/collapse manual without changing selection or Inspector property authority |
| Runtime safety | Same-value UI-preference writes emit no snapshot; the real selection/Inspector/Groups/Arrange/floor sequence produces no React maximum-update-depth warning or red console/page error |
| Complete local gate | Audit low, dependency tree, token governance, build, full unit, two-phase Chromium E2E and diff check |
| Exact-head CI | GitHub Quality Gate succeeds on the delivered head |
| Visual evidence | `pf3a-global-iconography-density` contains sixteen exact-head captures, including Groups action rail, Inspector Auto/Pinned and populated Library hierarchy at 292 pixel and 640 pixel widths |
| Manual acceptance | Required after automated and evidence gates pass |
| PF-3B boundary | Viewport engineering visual language remains open and unchanged |
