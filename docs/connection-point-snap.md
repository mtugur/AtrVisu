# Connection Point Snap v0.1

Connection Point Snap aligns one selected machine's engineering connection point to another selected machine's engineering connection point.

## Purpose

This feature helps place machines by their defined interfaces instead of by visual model bounds. Typical use is snapping a `product-out` point on one machine to a `product-in` point on another machine.

## Selection Model

Connection Point Snap appears when exactly two objects are selected:

- the primary selected object is the moving object by default
- the secondary selected object is the fixed reference object
- the moving/fixed roles can be swapped in the panel

The fixed object remains in place. The moving object is repositioned.

## Snap Behavior

All calculations use engineering coordinates in millimeters.

- gap `0 mm`: the selected moving point and fixed point coincide
- gap greater than `0 mm`: the moving object is offset along the fixed point's world-facing direction
- world point positions come from connection point metadata and object transforms

For example, if the fixed point faces `y-` and the gap is `500 mm`, the moving point is placed 500 mm away along fixed world `y-`.

## Compatibility Messages

The panel shows lightweight diagnostics:

- `product-out` to `product-in` is a good product-flow match
- same product connection types warn the user to check direction
- directions that are not facing each other produce a warning

Warnings do not block snapping in v0.1.

## v0.1 Limits

Connection Point Snap v0.1 only moves the selected machine. It does not automatically rotate machines.

It also does not:

- generate conveyor routes
- generate cable, pipe, or utility routes
- draw permanent connection lines
- run product transfer logic

## Relation To Footprint Anchor Snap

Footprint anchor snap aligns broad metadata footprint anchors such as center, edges, and corners. Connection Point Snap aligns specific machine interface points such as product, utility, network, pneumatic, aspiration, or dust collection points.

## Future Roadmap

Future versions may add:

- direction-based auto-rotation
- temporary connection preview lines
- persistent connection/routing objects
- conveyor generation
- utility routing

