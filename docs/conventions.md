# Development Conventions

Some editor behaviors in Rail Map Painter rely on naming conventions instead of explicit interfaces. This document collects the ones that are easy to miss when adding stations, miscellaneous nodes, and line styles.

## Theme-aware color

If a component should follow the current runtime theme, expose the theme in a top-level `color` field with the `Theme` shape.

For full support, do all of the following:

1. Name the field exactly `color`.
2. Use `ColorField` in the details panel.
3. Register the type in the relevant `dynamicColorInjection*Keys` list in `src/components/panels/details/color-field.tsx`.

This registration is what makes the behavior consistent across creation flows and utilities such as:

* placing a node from the toolbar
* predict-next-node
* changing station or line-style types
* batch color updates
* RMG export and other color-aware helpers

Having a `color` key without registering in `dynamicColorInjection` only gives partial support. Some code paths still check `'color' in attrs`, but others rely strictly on `dynamicColorInjection`.

### Notes by component type

* Stations: register in `dynamicColorInjectionStationKeys`
* Misc nodes: register in `dynamicColorInjectionMiscNodeKeys`
* Line styles: register in `dynamicColorInjectionLineStyleKeys`

For line styles in particular, new line creation still injects the runtime theme into styles whose default attrs contain `color` except for a few explicit cases such as `River`, but style switching and batch recolor still depend on `dynamicColorInjection`.

## Connectable hit targets

The line-drawing logic detects connectable targets by checking element IDs from `document.elementsFromPoint()`. The following prefixes are treated as special:

* `stn_core_${id}`: the connectable and movable core of a station
* `virtual_circle_${id}`: the connectable target for virtual nodes
* `misc_node_connectable_${id}`: a connectable miscellaneous node

These elements do not need to be the visible icon itself. They can be transparent overlays that are easier to click or drag.

### Stations

Stations should expose a designated connectable core element with ID `stn_core_${id}`.

This is required for more than naming consistency.

When users finish drawing a line, the editor does not inspect the React component tree or infer the target from the station's visible geometry. Instead, it calls `document.elementsFromPoint()` and checks the topmost DOM elements for known ID prefixes such as `stn_core_`, `virtual_circle_`, and `misc_node_connectable_`. Once it finds `stn_core_${id}`, it strips the prefix and recovers the actual node ID.

In practice, this gives the runtime three things:

* A stable way to identify which station the pointer is over, regardless of how that station is drawn
* A dedicated hit target for line connection and station dragging
* A clean separation between presentation and interaction, so the visible icon can stay small or complex while the interactive area stays easy to use

Without this designated core element:

* drawing a line to the station may fail because the target cannot be resolved back to a graph node ID
* interaction becomes fragile when the visible station is made from multiple shapes, text, masks, or very thin strokes
* custom stations and master-imported stations would each need their own ad-hoc hit-testing logic instead of sharing one runtime convention

If the visible station glyph is small or irregular, it is normal to place an invisible overlay on top of it instead:

```tsx
<rect
    id={`stn_core_${id}`}
    x={iconBBox.x}
    y={iconBBox.y}
    width={iconBBox.width}
    height={iconBBox.height}
    fill="white"
    fillOpacity="0"
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    style={{ cursor: 'move' }}
    className="removeMe"
/>
```

The important part is not that the core must be visible. The important part is that there is one deliberate element the runtime can treat as "this is the station body for hit-testing".

### Misc nodes

If a misc node can be connected by lines, expose a helper element whose ID starts with `misc_node_connectable_${id}`.

For example:

```tsx
<circle
    id={`misc_node_connectable_${id}`}
    r="5"
    fill="rgb(255, 255, 255, 0)"
    stroke="rgb(0, 0, 0, 0)"
    onPointerDown={onPointerDown}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerUp}
    style={{ cursor: 'move' }}
/>
```

Virtual nodes are a special built-in case and use `virtual_circle_${id}` instead.

## Helper overlays and export

Some SVG elements exist only to improve interaction and should not appear in downloaded SVG or PNG files.

Use one of these conventions when appropriate:

* `className="removeMe"` for helper-only elements such as hit areas, guides, and prediction overlays
* `fill="url(#opaque)"` for invisible station masks that must still participate in hit-testing

The export pipeline removes both patterns automatically.

## Master station core

For master nodes with `nodeType: 'Station'`, the imported master definition should set `core` to the child SVG element ID that acts as the station core. The runtime will rewrite that element to `stn_core_${id}` automatically.
