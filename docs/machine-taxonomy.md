# Machine Taxonomy

AtrVisu uses a data-driven machine taxonomy so library items are not limited to a small hard-coded category list.

## Core Fields

- `category`: broad functional area such as `Material Handling`, `Conveying`, `Storage / Buffer`, or `Safety`.
- `machineType`: concrete equipment type inside a category, such as `Forklift`, `Belt Conveyor`, `Silo`, or `Tank`.
- `variant`: optional user-facing variant text, such as capacity, handedness, or site-specific configuration.
- `productFamilyCode`: optional Atara product family code such as `PCK`, `PLT`, `PSW`, or `HPS`.
- `tags`: searchable/free-form labels stored as an array.
- `placeholderVisualType`: primitive fallback visual used when no GLB is available or loading fails.

## Built-In Taxonomy

The built-in taxonomy lives at:

```text
public/library/taxonomy/machine-taxonomy.json
```

It defines categories, machine types, placeholder visual types, product family codes, and default capability flags. Adding a category, machine type, product code, or placeholder option to this JSON does not require React component changes.

## Custom Taxonomy

The Taxonomy Manager stores browser-local custom taxonomy in:

```text
atrvisu.customMachineTaxonomy
```

Users can add custom categories, machine types, placeholder visual type labels, and product family codes from the Taxonomy Manager. Custom taxonomy can be exported/imported as JSON or reset back to the built-in file.

## Placeholder Visual Types

`placeholderVisualType` selects the simple Babylon primitive proxy shown when no GLB is loaded. Examples include:

- `box-generic`
- `conveyor-belt`
- `conveyor-roller`
- `elevator-vertical`
- `elevator-inclined`
- `silo-cylinder`
- `tank-cylinder`
- `hopper`
- `forklift-proxy`
- `pallet-proxy`
- `robot-cell`
- `wrapper-proxy`
- `safety-fence`
- `building-column`
- `building-wall`
- `platform`
- `electrical-panel`

Adding a new category, machine type, or product family code should not require code. Adding a completely new placeholder geometry renderer still requires code in the Babylon scene until a future visual renderer registry exists.

## Compatibility

Older library items with legacy `type` values are normalized during validation. For example:

- `Conveyor` becomes `Conveying / Conveyor`.
- `Robot Palletizer` becomes `Palletizing / Robot Palletizer`.
- A Forklift item can now be stored directly as `Material Handling / Forklift`.

Engineering dimensions remain metadata-driven in millimeters. GLB files are visual only and do not define layout dimensions or collision envelopes.
