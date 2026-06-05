# GLB Model Calibration

GLB models in AtrVisu are visual references. Engineering dimensions remain the metadata values:

```text
widthMm / depthMm / heightMm
```

The visual model should be treated as sales and layout visualization only until a future engineering approval workflow exists.

## Preferred Model Standard

Prepare GLB models with:

- Origin at the machine footprint center.
- Bottom of the model on the floor plane.
- X axis as machine width.
- Z axis as machine depth and normal flow direction.
- Y axis as height.
- Units in meters when possible.

With this standard, most models can use:

```json
{
  "centerOnFootprint": true,
  "bottomOnFloor": true,
  "preserveAspectRatio": true,
  "forwardAxis": "z+",
  "upAxis": "y+"
}
```

## Calibration Fields

- `centerOnFootprint`: aligns the visual footprint center to the scene object origin.
- `bottomOnFloor`: places the visual bottom on the object floor/elevation.
- `preserveAspectRatio`: uses uniform scale in `metadata-box` mode so the model fits inside metadata bounds without distortion.
- `forwardAxis`: records which local model axis represents forward or flow direction.
- `upAxis`: records which local model axis points upward.
- `rotationOffsetDeg`: fixes models that face the wrong direction, such as a 90 degree offset.
- `positionOffsetMm`: small visual nudges after automatic centering/floor alignment.

## Scale Modes

`metadata-box` fits the visual model to metadata dimensions. If `preserveAspectRatio` is true, AtrVisu uses the limiting dimension as a uniform scale so the full model stays inside the metadata box. If false, AtrVisu uses non-uniform X/Y/Z scaling to match the metadata box more exactly.

`model-units` keeps the model's own scale. If the model unit is `mm`, AtrVisu converts it to meters for Babylon rendering. Position, rotation, centering, and floor alignment still apply where practical.

## Testing a Forklift or Conveyor

1. Add the GLB file under `public/library/models/`.
2. Set `visualModel.modelPath` in Library Manager.
3. Choose the correct unit and scale mode.
4. Enable metadata box overlay.
5. Select the object and inspect Visual Model Diagnostics.
6. Check visual bounds, metadata bounds, applied scale, and warnings.
7. Adjust rotation or position offsets if needed.

## Common Problems

- Model too large: check `unit`, `scaleMode`, and `preserveAspectRatio`.
- Model too small: check if a meter model was marked as millimeters.
- Model buried under floor: enable `bottomOnFloor` or adjust Y offset.
- Model floating: enable `bottomOnFloor` or reduce Y offset.
- Model rotated 90 degrees: adjust `rotationOffsetDeg.y`.
- Wrong forward direction: set `forwardAxis` so future flow logic can interpret the model correctly.

Metadata dimensions are the engineering truth. A visually attractive GLB model alone is not sufficient for engineering approval.
