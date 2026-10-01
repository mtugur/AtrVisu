# ADR-006 — Phase-1 Viewport Navigation Controls

Status: Accepted contract for implementation.

## Context

Phase-1 exit review identified four coupled navigation gaps:
1. Master Plan Fit View is declared but unbound.
2. No professional standard-view selector exists.
3. Users cannot continuously read world-axis orientation.
4. Side-dock layout currently changes viewport geometry, causing the rendered
   scene to visibly shift even when camera state itself does not change.

The project already has an accepted camera runtime authority from PF-3B. The
solution must extend that authority, not introduce a second camera model.

## Decision

1. Implement Fit View through the canonical Runtime Viewport command path.
2. Implement a 26-zone orthographic ViewCube as an editor HUD.
3. Implement a passive world-axis triad as an editor HUD.
4. Make side docks overlay a stable full editor viewport rather than changing
   viewport left/right geometry.
5. Define HUD safe areas independently from scene/canvas geometry.
6. Keep ViewCube orientation changes and Fit View as separate explicit actions.

## Coordinate decision

User-facing axis names are domain axes:
+X Right, -X Left, -Y Front, +Y Back, +Z Top, -Z Bottom.

Engine coordinates remain an adapter concern.

## Rejected alternatives

- camera pan/radius compensation when a panel opens;
- auto-Fit View on ViewCube click;
- auto-Fit View on panel changes;
- separate React camera state owned by ViewCube;
- direct manipulation of Babylon camera outside Runtime Viewport authority;
- changing PF-3A object-movement math;
- labelling Babylon Y-up as the user Z axis.

## Consequences

Positive:
- camera/navigation behavior becomes predictable and CAD-like;
- panel toggles no longer visually displace the layout;
- Fit View fulfills the Master Plan quick-view obligation;
- orientation UI is driven by one camera truth.

Cost:
- shell side-dock layout must be separated from viewport sizing;
- HUD safe-area layout is required;
- Fit View needs robust 3D camera-space bounds fitting.

## Phase boundary

This ADR closes Phase-1 navigation usability only.

Deferred:
- Fit Selection / Zoom Previous;
- multi-viewport;
- animated transitions;
- advanced camera bookmarks beyond existing Viewpoints;
- selection-box navigation.
