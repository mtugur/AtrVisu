# Annotation / Label Foundation v0.1

Annotations are lightweight layout communication objects. They let users add notes such as customer walls, forklift access, maintenance-space reminders, operator-side labels, electrical-panel-side labels, and alternative-position notes.

## Annotation Types

Supported v0.1 types are:

- `note`
- `callout`
- `warning`
- `info`
- `dimension-note`
- `area-note`

Each annotation stores text, plan position in millimeters, optional elevation, style settings, and optional target references.

## Built-In Visual Styles

Annotation visuals use fixed semantic styling:

- `note`: neutral label with a NOTE indicator
- `info`: blue information-style label with an INFO indicator
- `warning`: amber warning-style label with a WARN indicator
- `callout`: green callout-style label with a CALL indicator
- `dimension-note`: technical measurement-style label with a DIM indicator
- `area-note`: zone-style label with an AREA indicator

Changing annotation type immediately changes the scene label background, border, accent, and indicator. These styles are built in; v0.1 does not expose custom colors.

## Emphasis and Background

Emphasis controls visual weight:

- `normal`: regular border and text weight
- `important`: stronger border and bolder text
- `critical`: strongest border and CRIT indicator

The background toggle controls whether the filled label background is drawn. When background is disabled, the annotation keeps a minimal border/accent treatment so the text can still be selected and read without using a filled panel.

Annotation size is controlled by `style.sizeScale`, a numeric value from `1x` to `10x`. Older saved annotations using `style.size` still load safely:

- `small` -> `2x`
- `medium` -> `4x`
- `large` -> `7x`

The size scale affects text size, padding, wrapping, and the compact label plane size.

## Readability Behavior

Annotation labels are anchored to layout coordinates but rendered as camera-facing billboards. The label plane uses adaptive readability scaling based on camera distance so text remains useful in normal editing and presentation views.

The annotation anchor is shown as a small pickable handle. The handle is the source of truth for dragging. The billboard label is offset from the anchor, so label size, background size, and readability scaling do not affect movement math.

Size scale is intended for different review contexts:

- `1x-2x`: compact notes for closer editing views
- `3x-5x`: default labels for common layout work
- `6x-10x`: larger presentation labels for review and overview views

The world anchor/position does not change when readability scaling is applied. Only the visual label scale changes as the camera moves. Dragging the annotation handle updates the anchor on a drag plane at the annotation's own elevation; the drag math is independent from visual label scale.

## Free-Standing Notes

Free-standing notes have no `targetObjectId`. They stay fixed in the layout at their own `positionMm`.

## Object Callouts

Callouts can store `targetObjectId` and optional `targetConnectionPointId`. When Add Callout is used while an object is selected, the callout is attached to that object and placed near it. The annotation properties show the target object name/id as `Attached to`.

In v0.1, callouts keep their own world position and can show a simple leader line to the target object. Leader-line visibility is controlled by Show Annotation Leader Lines. If the target object is deleted, the annotation is safely detached instead of being deleted.

## Editing

The right-side Annotations section can:

- add note, warning, and callout annotations
- select annotations from a list
- edit annotation type and text
- edit Plan X, Plan Y, and elevation values
- edit size scale, emphasis, and background
- delete annotations

Annotations can be moved by editing Plan X and Plan Y in millimeters. Plan X and Plan Y support negative layout coordinates such as `-200`. Temporary typing states such as `-` are allowed while editing and normalized when the field is committed by blur or Enter.

Scene picking supports selecting either the annotation billboard label or the annotation anchor handle. The handle can be dragged for quick placement; the engineering position remains the stored `positionMm`. The drag plane uses the annotation elevation (`positionMm.zMm`) so movement does not drift as elevation increases. The larger billboard label is not used for drag calculations.

Manual annotation rotation is not exposed in v0.1 because annotations render as camera-facing readable billboards.

## Overlay Visibility

Display / Overlay Controls include:

- Show Annotations
- Show Annotation Leader Lines

Both settings are persisted as local display preferences.

## Persistence

Annotations are part of layout snapshots. They are preserved by:

- layout export/import
- project export/import
- revision save/load
- autosave recovery

Selection state is not persisted.

## Limitations

Annotation / Label Foundation v0.1 does not implement:

- PDF or report export
- issue tracking
- multi-user comments
- custom fonts
- custom background colors
- custom semantic palettes
- rich text formatting
- manual annotation rotation
- advanced CAD dimensioning
- automatic equipment list, BOM, quotation, or offer output

## Future Roadmap

Future versions may add:

- HTML or Babylon GUI overlay labels for stricter screen-space sizing
- saved viewpoints and presentation states
- report/PDF export
- customer review notes
- revision comparison
- richer callout anchors and dimension objects
