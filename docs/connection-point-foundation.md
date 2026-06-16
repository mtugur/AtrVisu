# Connection Point Foundation v0.1

Connection points are engineering-defined machine interface points. They describe where a product, utility, network, pneumatic line, aspiration point, dust collection point, or other interface exists on a machine.

This foundation makes connection points visible, editable, inspectable, and preserved in layout/project data. It does not implement routing or snapping between connection points yet.

## Data Model

Connection points live in `MachineDefinition.ataraMachineData.connectionPoints`.

Each connection point supports:

- `id`
- `name`
- `type`
- `positionMm`
- `direction`
- optional `sizeMm`
- optional `metadata`

Supported types are `product-in`, `product-out`, `electrical`, `pneumatic`, `network`, `aspiration`, `dust-collection`, `compressed-air`, and `other`.

## Local Coordinates

Connection point positions are machine-local and use millimeters:

- `xMm`: local Plan X offset from the machine origin/center
- `yMm`: local Plan Y offset from the machine origin/center
- `zMm`: elevation from the machine bottom/floor reference

Machine rotation transforms local Plan X/Y into world Plan X/Y. Elevation is added to the placed object elevation.

This is intentionally separate from the global layout reference point. Machine layout `positionMm` uses the front-left-bottom footprint reference, but v0.1 connection point local `xMm` / `yMm` values remain center-relative to preserve existing library data. Runtime world-position helpers first derive the machine render center from the front-left-bottom reference, then apply the center-relative connection point offset.

Legacy library-level `connectionPoints` are converted for display as a compatibility fallback. New engineering data should use `ataraMachineData.connectionPoints`.

Negative `xMm` and `yMm` values are valid because points can be left/right or front/back from the machine center. `zMm` is elevation and should normally be between `0` and the machine height.

Babylon placeholder boxes are parent meshes with their local Y origin at the machine center, while connection point `zMm` is bottom/floor based engineering data. Visualization must convert elevation before placing child marker meshes:

`localY = (zMm - heightMm / 2) / 1000`

Small marker or label offsets may be added after this conversion for readability, but the engineering marker position should remain close to the converted connection point.

## Direction

Direction values are local machine directions: `x+`, `x-`, `y+`, `y-`, `z+`, and `z-`.

Plan directions rotate with the machine. Vertical directions remain vertical.

Position defines where the point is located. Direction defines where the port, flow, cable, pipe, or connection faces.

## Overlay

The Display / Overlay Controls panel includes `Show Connection Points`.

Display modes:

- `Selected object only`
- `All objects`

When enabled, selected object markers show labels. All-object mode shows markers for every object with connection points; labels remain restrained to avoid clutter.

Marker labels prefer the user-defined connection point name, for example `Product In (IN)`. If no name exists, labels fall back to short type codes such as `IN`, `OUT`, `EL`, `AIR`, `NET`, `ASP`, `DUST`, `CA`, and `CP`.

Markers follow object movement, rotation, undo/redo, revision load, and imported layouts because they are derived from the object definition snapshot and placed transform.

## Library Manager

Project Custom Library items can edit connection points in the Library Manager:

- add connection point
- delete connection point
- edit id, name, type, local position, direction, size, and description
- set common footprint anchor positions such as center, edge centers, and corners

The editor shows coordinate help and direction help. Direction is the facing/flow/connection direction, not the point position.

Saving the item persists connection point data inside `ataraMachineData.connectionPoints`.

## Selected Object Diagnostics

Selected Object Properties includes a separate `Connection Points` section with total count, count by type, local position, direction, metadata summary, and diagnostics.

Boundary diagnostics warn, but do not block saving, when:

- `xMm` is outside `+/- widthMm / 2`
- `yMm` is outside `+/- depthMm / 2`
- `zMm` is outside `0..heightMm`

This remains non-blocking because some ports can intentionally extend outside the footprint.

## Persistence

Connection points belong to the machine definition snapshot. They are preserved by layout export/import, project export/import, revision save/load, autosave restore, and undo/redo position changes.

Selection and marker hover state are not persisted.

## Related Features

Footprint anchor snap aligns metadata footprint anchors such as center, edges, and corners. Connection point data is more specific engineering metadata and is not used for snapping in v0.1.

Future work may add Connection Point Snap v0.1, conveyor transfer logic, utility routing, cable/pipe routing, and product flow simulation between connection points.
