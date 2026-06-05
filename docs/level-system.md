# Level System

AtrVisu should support multiple factory levels or floors in the future.

## Examples

- `-1 Basement`
- `0 Ground Floor`
- `+1 Mezzanine`

## Level Definition

Each level should include:

- `levelId`
- `name`
- `elevationMm`
- `floorHeightMm`
- `visible`
- `locked`

## Current Default

All current objects should be treated as if they belong to:

- `levelId: "ground"`
- `elevationMm: 0`

This preserves current single-floor behavior while preparing the data model for multi-level layouts.

