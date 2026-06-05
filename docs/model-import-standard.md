# Model Import Standard

AtrVisu should use simplified visual models plus engineering metadata.

## Preferred Formats

- Preferred visual format: GLB/glTF.
- Acceptable engineering source formats: STEP/STP, SLDASM, and SLDPRT through a simplification/conversion workflow.

Detailed production CAD should not be used directly inside AtrVisu. Detailed models increase load time, expose unnecessary geometry, and are often unsuitable for interactive layout planning.

## Simplified Visual Model Rule

Visual models are representations only. Engineering dimensions, connection points, collision envelopes, and clearance requirements must come from metadata, not from the visual mesh alone.

## Origin And Axis Standard

Model origin should be placed at the footprint center on the floor.

- `X`: machine width direction.
- `Z`: machine depth or product flow direction.
- `Y`: height.

## Scale Rule

Imported model dimensions must be validated against metadata. If a GLB visual mesh disagrees with the machine definition metadata, the metadata is authoritative for engineering and collision behavior.

