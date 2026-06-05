# Collision Envelope Standard

AtrVisu collision checks should begin with simple envelopes, not detailed mesh collisions.

## MVP Collision Approach

For the MVP, collision checks should use metadata-defined volumes and areas. Detailed visual mesh collision should not be treated as the source of truth.

Supported envelope concepts:

- Machine envelope.
- Clearance envelope.
- Operator area.
- Forklift path.
- Building obstacles.

## Engineering Meaning

Collision warnings are preliminary engineering support. They help identify layout risks, but they are not final manufacturing approval, safety certification, or installation approval.

## Metadata First

The collision envelope should be derived from machine metadata and project layout data. Visual GLB meshes may help users understand the object, but collision and clearance logic should not rely on visual mesh detail.

