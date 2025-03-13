# Station Guide: Creating a station for Rail Map Painter

This guide will walk you through the process of creating a station for the Rail Map Painter. The core of a station is to write a React component and returns SVG elements based on its attributes. To write a station, you need to follow some conventions as described below.

## Station Structure

A station consists of:

* A React component that generates the SVG
* A TypeScript interface for the attributes of the component
* Default attributes
* A React component that modify station attributes
* A 50x50 icon
* An object containing all the things mentioned before and metadata

## Steps to create a station

### 1. Create a new tsx file

First, create a new TypeScript file (`.tsx`) under the `src/components/svgs/stations` directory. This file will contain the implementation of your station.

### 2. Create the React component to generate the SVG of your station

Create a React component that generates the SVG using the provided attributes. The component should accept a `StationComponentProps` prop which includes the id, x, y, mouse event handlers, and your station specific attributes.

```tsx
import React from 'react';
import { StationComponentProps, StationType } from '../../../constants/stations';

const MyStationComponent = (props: StationComponentProps) => {
    // destructure the props
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    // destructure the specific attributes of your station
    // `StationType.MyStation` will be added in the 8th step and it's ok to do that now,
    // if you do not want to see any errors :)
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

### 5. Create the React component to modify station attributes

In this section, we will guide you on creating a React component that enables users to modify the attributes of a station. This component will be integrated into the details panel and can be customized using various input elements like `<input />`, `<textarea />`, or `<select />` to offer a user-friendly interface for attribute modification.

```tsx
import { Input, Select } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../constants/constants';

const myStationAttrs = (props: AttrsProps<MyStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const [someAttribute, setSomeAttribute] = React.useState(attrs.someAttribute ?? defaultMyStationAttributes.someAttribute);
    React.useEffect(() => setSomeAttribute(attrs.someAttribute), [attrs.someAttribute]);
    const handleSomeAttributeChange = (val: string) => {
        attrs.someAttribute = val;
        handleAttrsUpdate(id, attrs);
    };

    const [anotherAttribute, setAnotherAttribute] = React.useState(attrs.anotherAttribute ?? defaultMyStationAttributes.anotherAttribute);
    React.useEffect(() => setAnotherAttribute(attrs.anotherAttribute), [attrs.anotherAttribute]);
    const handleAnotherAttributeChange = (val: string) => {
        attrs.anotherAttribute = Number(val);
        handleAttrsUpdate(id, attrs);
    };

    return (
        <>
            <Input
                value={someAttribute}
                onChange={e => setSomeAttribute(e.target.value)}
                onBlur={e => handleSomeAttributeChange(e.target.value)}
                variant="flushed"
                size="sm"
                h={6}
            />
            <Select
                value={anotherAttribute}
                onChange={e => handleAnotherAttributeChange(e.target.value)}
                variant="flushed"
                size="sm"
                h={6}
            >
                <option value={1}>Option 1</option>
                <option value={2}>Option 2</option>
                <option value={3}>Option 3</option>
            </Select>
        </>
    );
};
```

Additionally, we provide a simplified approach for defining common input fields using the `RmgFields` component. These fields can be automatically translated into real input elements, saving you time and effort. You can create fields for different input types, such as textarea and select.

```tsx
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../constants/constants';

const myStationAttrs = (props: AttrsProps<MyStationAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.myStation.someAttribute'),
            value: attrs.someAttribute ?? defaultMyStationAttributes.someAttribute,
            onChange: val => {
                attrs.someAttribute = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.myStation.anotherAttribute'),
            value: attrs.anotherAttribute ?? defaultMyStationAttributes.anotherAttribute,
            options: { 0: 'Option 1', 1: 'Option 2', 2: 'Option 3' },
            onChange: val => {
                attrs.anotherAttribute = Number(val);
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};
```

> For more details on how to use the `RmgFields` component, please refer to [this informative guide](https://railmapgen.github.io/rmg-components/?path=/story/rmgfields--basic).

We also provide common input components including color and interchange. Feel free to checkout them in `shmetro-basic-2020.tsx` and `mtr.tsx` for more reference.

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

Now you have completed the steps for creating a station. Don't forget to export your station component, icon, default attributes, attributes component, and metadata in the final object.

* The React component
* The icon
* The default attributes
* The React component to modify station attributes
* Metadata, including:
  * Display name
  * Supported cities
  * Canvas types
  * Categories
  * Tags

```tsx
import { CityCode } from '../../../constants/constants';
import { Station } from '../../../constants/stations';

const myStation: Station<MyStationAttributes> = {
    component: MyStationComponent,
    icon: myStationIcon,
    defaultAttrs: defaultMyStationAttributes,
    attrsComponent: myStationAttrs,
    metadata: {
        displayName: 'panel.details.stations.myStation.displayName',
        cities: [CityCode.YourCity],
        canvas: [CanvasType.RailMap],
        categories: [CategoriesType.Metro],
        tags: [],
    },
};

// export your station object as the default export of your module
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

### 9. Implementing internationalization translation

In this section, we'll guide you on how to provide translations for your application, ensuring that it can be presented in different languages. Internationalization is a critical aspect of creating a global-ready application. You may have encountered lengthy strings like `panel.details.stations.myStation.displayName`. These strings are internationalization keys that inform `react-i18next` which translation to fetch and display. To make your application multilingual, it's important to ensure that all defined keys have at least an English translation. This ensures that, when a translation is missing, the English version of the text will be displayed as a fallback.

For a comprehensive guide on creating or updating translations, please refer to our [Translation Guide](./i18n-translation.md).

### 10. Upgrade save version

There is one more crucial step to undertake before opening your pull request. This step should be carried out once you have completed the design, coding, and testing phases of your station.

It involves upgrading the version of the saved project to signal the presence of new updates. By doing so, the previous version of Rail Map Painter will be able to recognize these changes and provide appropriate warnings to users.

For more information, check out [Upgrade Save Version](./upgrade-save-version.md).

## Final Notes

By following this guide, you should be able to create a new station for Rail Map Painter. Make sure to adhere to the conventions outlined in [this guide](../CONTRIBUTING.md) and refer to [shmetro-basic](../src/components/svgs/stations/shmetro-basic.tsx) for clarity.

Feel free to submit your station as a pull request to the project repository, and the maintainers will review it. If your station meets the project's standards, it will be merged and become part of the project.

Happy coding!
