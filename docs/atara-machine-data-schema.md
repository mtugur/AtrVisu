# ATARA Machine Data Schema

ATARA Machine Data v0.1 adds an optional engineering-data layer on top of AtrVisu's generic `MachineDefinition`.

The generic machine definition still provides the required render and library fields: id, name, category, dimensions, visual model, collision metadata, capabilities, and library placement data. `ataraMachineData` enriches that definition with ATARA-specific engineering information such as utility needs, maintenance clearances, connection points, operating capacity, and engineering envelopes.

## Units

Canonical engineering units:

- length: millimeters (`mm`)
- weight: kilograms (`kg`)
- electrical power: kilowatts (`kW`)
- pneumatic pressure: bar
- air consumption: `Nl/min`
- airflow: `m3/h`

Babylon.js rendering still uses meters. GLB visual scale is not the engineering truth; the machine metadata and ATARA machine data are the source for layout decisions.

## Data Areas

`identity` stores ATARA-oriented identity fields such as ATR ID, machine code, product family code, PDN code, display name, revision, manufacturer, and whether the item is an ATARA product.

`physical` stores width, depth, height, weights, footprint notes, and maintenance-open dimensions. Main library dimensions remain required; ATARA physical dimensions can mirror or enrich them.

`maintenanceClearance` stores front, back, left, right, and top service space in millimeters.

`connectionPoints` describes machine-side points for product flow, electrical, pneumatic, network, aspiration, dust collection, compressed air, and other connections. v0.1 stores and validates these points, but it does not snap or route connections.

`utilityRequirements` stores electrical, pneumatic, network, and aspiration requirements.

`operationalData` stores capacity ranges, capacity unit, product types, noise, vibration class, and notes.

`collisionEnvelope`, `clearanceEnvelope`, and `operationalEnvelope` reuse existing AtrVisu envelope types where practical.

## Not Included Yet

- PDN converter
- connection point snapping
- utility routing
- automatic connection validation
- final engineering approval workflow
- STEP/SolidWorks import

## Mechanical Data Preparation

Mechanical and engineering teams should prepare machine data from approved drawings and technical documentation. Template files in `public/library/machine-data/templates/` are examples for schema shape only and must not be used as real ATARA specifications.

Recommended future preparation:

- confirm closed machine dimensions
- confirm maintenance-open dimensions
- define required maintenance clearances
- list connection points with local machine coordinates
- record utilities and operating capacity
- document whether a GLB model is visual-only or calibrated against approved metadata
