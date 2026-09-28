# ADR-005: Design System Theme Runtime

Status: **Accepted**

## Context

AtrVisu's maintained UI used presentation literals across component CSS while
Babylon and overlay code constructed technical colors in multiple modules.
Phase 1 workbench chrome needs a stable semantic language without introducing
UI preference persistence before P1-D or mixing UI theme colors with engineering
rendering meanings.

## Decision

`DesignSystemRoot` is the application theme and density boundary. It receives
the accepted `ThemeId` and `DensityId` contracts, exposes `data-av-theme` and
`data-av-density`, and owns no persistence, domain, command, panel, or Babylon
behavior. The application starts with `dark` and `comfortable` explicitly in
`main.tsx`.

All maintained UI presentation uses semantic CSS variables with the `--av-`
prefix. The token authority covers surface, elevation, text, border,
interaction, focus, selection, spacing, typography, control size, density,
icon size, semantic status, viewport overlay, technical palette references,
and z-index families.

Dark and light themes define complete values for the same semantic tokens.
In P1-C, System theme uses CSS `prefers-color-scheme` light and dark media
paths. P1-C deliberately added no JavaScript media listener, visible selector,
or persisted preference.

PF-3B narrows that phase boundary without changing theme ownership. One
read-only presentation resolver may observe `prefers-color-scheme` and expose
an `EffectiveThemeId` of `light` or `dark`: explicit `light` resolves to
`light`, explicit `dark` resolves to `dark`, and `system` resolves to the
current media-query result. UI CSS presentation and typed Babylon viewport
palette selection consume this same resolved value; they are not independent
theme authorities. The observer may publish effective presentation changes
while `system` is active, but it owns no project/domain state and cannot mutate
camera, selection, entities, history, dirty state, or scene/canvas lifecycle.
Only the user's existing `ThemeId` preference persists. `EffectiveThemeId` is
derived at runtime and is never persisted. Babylon receives the resolved theme
or palette through a typed presentation boundary and does not read arbitrary
CSS literals.

Engineering rendering colors are separate. Immutable values live in
`technicalPalette.ts`; the only Babylon constructors live in
`technicalPaletteBabylon.ts`, which returns independent instances.

## Governance

The dependency-free `check-design-tokens.mjs` scanner rejects unauthorized raw
hex, rgb/rgba, hsl/hsla, `Color3`, `Color4`, and `FromHexString` construction in
maintained production source. Exact authority paths require a specific reason
and expected match types. Broad source exceptions are invalid. CI runs the
scanner after dependency audit and before build.

## Consequences

- Dark preserves the current AtrVisu baseline while light and system are ready
  for a future preference owner.
- Theme and density changes do not mutate project, layout, selection, history,
  viewport, or storage state.
- An operating-system color-scheme change while `ThemeId` is `system` updates
  UI and viewport presentation through one effective-theme resolver without
  remounting the editor, Babylon scene, or canvas.
- Technical meanings remain stable and do not inherit generic UI semantics.
- P1-D remains responsible for visible preference controls and persistence.
- Manual visual acceptance is required before P1-C can merge.

## Rejected Alternatives

- Literal appearance names such as `green-500` or `dark-gray`.
- JavaScript-only system theme detection that competes with CSS or creates a
  second theme authority. PF-3B's single read-only effective-theme observer is
  the permitted shared presentation bridge.
- Theme persistence in project or IndexedDB schemas.
- Mutable shared Babylon color instances.
- A broad scanner exception for `src/**`.
