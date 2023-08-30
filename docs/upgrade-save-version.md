# Upgrade Save Version

The save from Rail Map Painter contains a `version` field at the top level of the JSON. It indicates the version of Rail Map Painter that exported this save. It should be a positive integer and should increase whenever it is changed.

## Why to change

The save version needs to be upgraded to indicate that there are new changes. This way, previous versions of Rail Map Painter can recognize this and warn users.

## When to change

You should do this when you have finished designing, coding, and testing your station/node/line style. Make this change just before submitting a pull request.

## Where to change

The code responsible for upgrading the save resides under `src/util/save.ts`, with its corresponding test in `src/util/save.test.ts`.

## What to change

### 1. `CURRENT_VERSION`

Locate the `export const CURRENT_VERSION = xx;` line and increment the value by one.

### 2. Add the upgrade function

Add another key-value pair at the end of `export const UPGRADE_COLLECTION: { [version: number]: (param: string) => string }`.

The key should be `CURRENT_VERSION - 1`, and the value should be a function that takes the param and returns the upgraded one.

The simplest function could be a one-liner, especially when adding a new station/node/line style:

```typescript
export const UPGRADE_COLLECTION: { [version: number]: (param: string) => string } = {
    // ...
    11: param =>
        // Bump save version to support Shanghai Metro out-of-system interchange station.
        JSON.stringify({ ...JSON.parse(param), version: 12 }),
    // ...
}
```

All you need to do is to parse the param string, update the save version, and then convert it back to a string.

If you intend to add or change fields in your station/node/line style, you'll need to iterate through and update each of them. For example:

```typescript
export const UPGRADE_COLLECTION: { [version: number]: (param: string) => string } = {
    // ...
    15: param => {
        // Bump save version to update value of italic in the text node.
        const p = JSON.parse(param);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        graph.import(p?.graph);
        graph
            // Find all text nodes.
            .filterNodes((node, attr) => node.startsWith('misc_node') && attr.type === MiscNodeType.Text)
            .forEach(node => {
                // Get attr from type and do some updates.
                const type = graph.getNodeAttribute(node, 'type');
                const attr = graph.getNodeAttribute(node, type) as any;
                attr.italic = attr.italic ? 'italic' : 'normal';
                attr.bold = 'normal';
                // Write back.
                graph.mergeNodeAttributes(node, { [type]: attr });
            });
        return JSON.stringify({ ...p, version: 16, graph: graph.export() });
    },
    // ...
}
```

### 3. Update the tests

Don't forget to update the tests as well! Add them at the end of `src/util/save.test.ts`.

For a simple version upgrade without any changes in attributes, the following example should be sufficient:

```typescript
    it('11 -> 12', () => {
        // Bump save version to support Shanghai Metro out-of-system interchange station.
        // Prepare an empty save.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":11}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[11](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":12}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });
```

If there were changes in the attributes, you should refer to the next example:

```typescript
    it('15 -> 16', () => {
        // Bump save version to add rotate and italic in text misc node.
        // Get a minimal save from the website.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_sbdkOMP9-R","attributes":{"visible":true,"zIndex":0,"x":600,"y":260,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":false}}}],"edges":[]},"version":15}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[15](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        // There should be no exceptions.
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_sbdkOMP9-R","attributes":{"visible":true,"zIndex":0,"x":600,"y":260,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":"normal","bold":"normal"}}}],"edges":[]},"version":16}';
        // And the updated save match your expectation with fields changed.
        expect(newParam).toEqual(expectParam);
    });
```

Finally, run `npm test` in the root directory to ensure that everything works as expected!
