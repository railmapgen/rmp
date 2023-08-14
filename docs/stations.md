# Station Guide: Creating a station for Rail Map Painter

This guide will walk you through the process of creating a station for the Rail Map Painter. The core of a station is to write a React component and returns SVG elements based on its attributes. To write a station, you need to follow some conventions as described below.

## Station Structure

A station consists of:

* A React component that generates the SVG
* A TypeScript interface for the attributes of the component
* Default attributes
* Input fields that use `RmgFieldsField` derived from Chakra UI
* A 50x50 icon
* An object containing all the things mentioned before and metadata

## Steps to create a station

### 1. Create a new tsx file

First, create a new TypeScript file (`.tsx`) under the `src/components/svgs/stations` directory. This file will contain the implementation of your station.

### 2. Create the React component

Create a React component that generates the SVG using the provided attributes. The component should accept a `StationComponentProps` prop which includes the id, x, y, mouse event handlers, and your station specific attributes.

```tsx
import React from 'react';
import { StationComponentProps, StationType } from '../../../constants/stations';

const MyStationComponent = (props: StationComponentProps) => {
    // destructure the props
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    // destructure the specific attributes of your station
    // `StationType.MyStation` will be added in the final step
    const { names = defaultStationAttributes.names } = attrs[StationType.MyStation] ?? defaultMyStationAttributes;

    // some boilerplate to cache a function between re-renders
    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    // return an SVG JSX element
    return React.memo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})`}>
                {/* your SVG elements go here */}
                <circle
                    id={`stn_core_${id}`} // a must have id to tell the code which station is being pointed at
                    r={5} // the radius of the circle
                    stroke="black" // stroke color of the circle
                    fill="white" // fill color of the circle
                    onPointerDown={onPointerDown} // on pointer down event handler
                    onPointerMove={onPointerMove} // on pointer move event handler
                    onPointerUp={onPointerUp} // on pointer up event handler
                    style={{ cursor: 'move' }} // change the mouse icon when users move their mouse on the station
                />
            </g>
        ),
        [id, x, y, ...names, onPointerDown, onPointerMove, onPointerUp]
    );
};
```

### 3. Define the attributes interface for the station

Define a TypeScript interface that describes the attributes of the station. This interface should extend the StationAttributes interface, which is exported in `src/constants/stations.ts`.

```tsx
import { StationAttributes } from '../../../constants/stations';

interface MyStationAttributes extends StationAttributes {
    someAttribute: string;
    anotherAttribute: number;
}
```

### 4. Define default attributes

Specify default attributes for the station using the previously defined interface. These default values will be used when no attributes are provided.

```tsx
import { defaultStationAttributes } from '../../../constants/stations';

const defaultMyStationAttributes: MyStationAttributes = {
    ...defaultStationAttributes,
    someAttribute: 'defaultValue',
    anotherAttribute: 0,
};
```

### 5. Create input fields for the station

Define input fields that allow users to edit the attributes of your station. These fields will be used in the details panel. You can create fields for different types, such as textarea and select.

```tsx
{
    type: 'textarea',
    label: 'panel.details.stations.myStation.someAttribute',
    value: (attrs?: MyStationAttributes) => (attrs ?? defaultMyStationAttributes).someAttribute,
    onChange: (val: string | number, attrs_?: MyStationAttributes | undefined) => {
        const attrs = attrs_ ?? defaultMyStationAttributes;
        attrs.someAttribute = val.toString();
        return attrs;
    },
}
```

```tsx
{
    type: 'select',
    label: 'panel.details.stations.myStation.anotherAttribute',
    value: (attrs?: MyStationAttributes) => (attrs ?? defaultMyStationAttributes).anotherAttribute,
    options: { 0: 'Option 1', 1: 'Option 2', 2: 'Option 3' },
    onChange: (val: string | number, attrs_?: MyStationAttributes | undefined) => {
        const attrs = attrs_ ?? defaultMyStationAttributes;
        attrs.anotherAttribute = Number(val);
        return attrs;
    },
}
```

Once you have created the input fields, add them to an array named `myStationFields`.

```tsx
const myStationFields = [
    // Add your input fields here
];
```

For more information of the `RmgFieldsField`, checkout [this vivid story](https://railmapgen.github.io/rmg-components/?path=/story/rmgfields--basic).

### 6. Create a icon

Create an SVG icon that will represent your station in the tools panel. This should be a simple, recognizable design that conveys the unique appearance of your station. The icon must be a React component that returns an SVG element.

```tsx
const myStationIcon = (
    <svg viewBox="0 0 24 24" height="40" width="40" focusable={false}>
        <circle cx="12" cy="12" r="5" stroke="currentColor" fill="none" />
    </svg>
);
```

### 7. Create the station object and export

Now you have completed the steps for creating a station. Don't forget to export your station component, icon, default attributes, fields, and metadata in the final object.

* The React component
* The icon
* The default attributes
* The input fields
* Metadata, including:
  * Display name
  * Supported cities
  * Canvas types
  * Categories
  * Tags

```tsx
import { Station } from '../../../constants/stations';

const myStation: Station<MyStationAttributes> = {
    component: MyStationComponent,
    icon: myStationIcon,
    defaultAttrs: defaultMyStationAttributes,
    // @ts-ignore-error The previous fields won't comply with type in Station. Will be fixed later.
    fields: myStationFields,
    metadata: {
        displayName: 'panel.details.stations.myStation.displayName',
        cities: [CityCode.YourCity],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

// export the plugin object as the default export of your module
export default myStation;
```

### 8. Add station type in constants and stations

Finally, you need to tell Rain Map Painter to load your station so that users can select in the tools panel.

```tsx
// src/constants/stations.ts

import { ShmetroBasicStationAttributes } from '../components/svgs/stations/shmetro-basic';
import { ShmetroIntStationAttributes } from '../components/svgs/stations/shmetro-int';
// ...
import { MyStationAttributes } from '../components/svgs/stations/my-station';

export enum StationType {
    ShmetroBasic = 'shmetro-basic',
    ShmetroInt = 'shmetro-int',
    // ...
    MyStation = 'my-station', // register your station here
}

export interface ExternalStationAttributes {
    [StationType.ShmetroBasic]?: ShmetroBasicStationAttributes;
    [StationType.ShmetroInt]?: ShmetroIntStationAttributes;
    // ...
    [StationType.MyStation]?: MyStationAttributes; // register your station attribute here
}
```

```tsx
// src/components/svgs/stations/stations.ts

import shmetroBasicStation from './shmetro-basic';
import shmetroIntStation from './shmetro-int';
// ...
import myStation from './my-station';

const stations = {
    [StationType.ShmetroBasic]: shmetroBasicStation,
    [StationType.ShmetroBasic2020]: shmetroBasic2020Station,
    // ...
    [StationType.MyStation]: myStation, // register your station here
};
```

## Final Notes

By following this guide, you should be able to create a new station for Rail Map Painter. Make sure to adhere to the conventions outlined in [this guide](../CONTRIBUTING.md) and refer to [shmetro-basic](../src/components/svgs/stations/shmetro-basic.tsx) for clarity.

Feel free to submit your station as a pull request to the project repository, and the maintainers will review it. If your station meets the project's standards, it will be merged and become part of the project.

Happy coding!
