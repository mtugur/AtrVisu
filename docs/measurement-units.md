# Measurement Units

AtrVisu uses millimeters as the canonical engineering data unit.

## Unit Rules

- Canonical stored unit: millimeter (`mm`).
- Babylon.js render unit: meter (`m`).
- Conversion rule: `1000 mm = 1 Babylon unit`.
- Stored engineering data must not be rounded.
- UI values may be rounded only for display.
- Future display units may include millimeters, meters, and inches.

## Storage And Display

All engineering dimensions, positions, elevations, collision envelopes, clearance envelopes, and level elevations should be stored in millimeters. Rendering code may convert those values to meters when passing coordinates or dimensions to Babylon.js.

Display formatting is a presentation concern. A value stored as `1234.567 mm` should remain exact in data, while the UI may show `1.23 m`, `1235 mm`, or `48.61 in` depending on display settings.

