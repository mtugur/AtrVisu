# Collision Envelope v0.1

AtrVisu collision checking is metadata-based. The GLB visual mesh is not used as the engineering truth for collision.

## Concepts

- Selection box: visual indicator around the selected object.
- Metadata box: engineering width, depth, and height from machine metadata.
- Collision envelope: simple box used for first-level object-to-object clash detection.
- Clearance envelope: future maintenance or operation space. It is separate from collision and is not used as a collision blocker in v0.1.

## Data

Machine definitions may include:

```json
{
  "collisionEnvelope": {
    "widthMm": 1200,
    "depthMm": 800,
    "heightMm": 1500,
    "offsetMm": {
      "xMm": 0,
      "yMm": 0,
      "zMm": 0
    },
    "enabled": true
  }
}
```

If `collisionEnvelope` is missing, AtrVisu uses the metadata dimensions:

- `widthMm`
- `depthMm`
- `heightMm`

Missing offset defaults to `0`. Missing `enabled` defaults to `true`.

## Checking Method

v0.1 uses oriented rectangle overlap on the floor plan:

- Plan X is `positionMm.xMm`.
- Plan Y is `positionMm.yMm`.
- Rotation uses `rotationDeg` around the vertical axis.
- Width and depth come from the collision envelope.
- Height and elevation are checked as simple vertical intervals when available.

This is an O(n²) check over layout objects, which is acceptable for the current interactive layout scale.

## Edge Rule

Objects that only touch edges are treated as clear in v0.1. This avoids noisy warnings when users align equipment side by side on a grid.

## Visualization

The right-side overlay controls include `Show Collision Envelope`.

When enabled:

- Collision envelopes are wireframes.
- Clear envelopes use a blue warning-neutral style.
- Colliding envelopes use a red warning style.
- The envelope does not replace the machine body or selection box.
- The envelope is not pickable and does not block scene selection.

## Limitations

Collision Envelope v0.1 is preliminary layout validation only.

Known limitations:

- Not CAD-grade.
- Not mesh-accurate.
- Complex shapes are approximated as rectangles/boxes.
- No advanced physics.
- No detailed level/floor awareness yet.
- Clearance envelope conflicts are reserved for a future warning layer.

Final manufacturing approval still requires engineering review.
