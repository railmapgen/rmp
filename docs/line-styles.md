# Line Style Guide: Creating a line style for Rail Map Painter

This guide will walk you through the process of creating a line style for the Rail Map Painter. The core of a line style is to write a React component and returns SVG elements based on its attributes. To write a line style, you need to follow some conventions as described below.

## Line Style Structure

A line style consists of:

* A React component that generates the SVG
* A TypeScript interface for the attributes of the component
* Default attributes
* Input fields that use `RmgFieldsField` derived from Chakra UI
* An object containing all the things mentioned before and metadata

## Steps to create a line style

### 1. Create a new tsx file

First, create a new TypeScript file (`.tsx`) under the `src/components/svgs/lines/styles` directory. This file will contain the implementation of your line style.

### 2. Create the React component

Create a React component that generates the SVG using the provided attributes. The component should accept a `LineStyleComponentProps` prop which includes the id, type, path, mouse event handler, and your line style specific attributes.

```tsx
import React from 'react';
import { LineStyleComponentProps, LineStyleType } from '../../../constants/lines';

const MyLineStyleComponent = (props: LineStyleComponentProps) => {
    // destructure the props
    const { id, path, styleAttrs, handleClick } = props;
    // destructure the specific attributes of your line style
    const {
        someAttribute = defaultMyLineStyleAttributes.someAttribute,
        anotherAttribute = defaultMyLineStyleAttributes.anotherAttribute,
    } = styleAttrs ?? defaultRiverAttributes;

    // some boilerplate to cache a function between re-renders
    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    // return an SVG JSX element
    return (
        <path
            id={id}
            d={path}
            fill="none"
            stroke={someAttribute}
            strokeWidth="5"
            strokeLinecap="round"
            cursor="pointer"
            onClick={onClick}
        />
    );
};
```

### 3. Define the attributes interface for the line stye

Define a TypeScript interface that describes the attributes of the line style.

```tsx
interface MyLineStyleAttributes {
    someAttribute: string;
    anotherAttribute: number;
}
```

### 4. Define default attributes

Specify default attributes for the line style using the previously defined interface. These default values will be used when no attributes are provided.

```tsx
const defaultMyLineStyleAttributes: MyLineStyleAttributes = {
    someAttribute: 'defaultValue',
    anotherAttribute: 0,
};
```

### 5. Create input fields for the line style

Define input fields that allow users to edit the attributes of your line style. These fields will be used in the details panel. You can create fields for different types, such as textarea and select.

```tsx
{
    type: 'textarea',
    label: 'panel.details.lines.myLineStyle.someAttribute',
    value: (attrs?: MyLineStyleAttributes) => (attrs ?? defaultMyLineStyleAttributes).someAttribute,
    onChange: (val: string | number, attrs_?: MyLineStyleAttributes | undefined) => {
        const attrs = attrs_ ?? defaultMyLineStyleAttributes;
        attrs.someAttribute = val.toString();
        return attrs;
    },
}
```

```tsx
{
    type: 'select',
    label: 'panel.details.lines.myLineStyle.anotherAttribute',
    value: (attrs?: MyLineStyleAttributes) => (attrs ?? defaultMyLineStyleAttributes).anotherAttribute,
    options: { 0: 'Option 1', 1: 'Option 2', 2: 'Option 3' },
    onChange: (val: string | number, attrs_?: MyLineStyleAttributes | undefined) => {
        const attrs = attrs_ ?? defaultMyLineStyleAttributes;
        attrs.anotherAttribute = Number(val);
        return attrs;
    },
}
```

Once you have created the input fields, add them to an array named `myLineStyleFields`.

```tsx
const myLineStyleFields = [
    // Add your input fields here
];
```

For more information of the `RmgFieldsField`, checkout [this vivid story](https://railmapgen.github.io/rmg-components/?path=/story/rmgfields--basic).

### 6. Create the line style object and export

Now you have completed the steps for creating a line style. Don't forget to export your line style component, default attributes, fields, and metadata in the final object.

* The React component
* The default attributes
* The input fields
* Metadata, including:
  * Display name
  * Tags

```tsx
import { LineStyle } from '../../../constants/lines';

const myLineStyle: LineStyle<MyLineStyleAttributes> = {
    component: MyLineStyleComponent,
    defaultAttrs: defaultMyLineStyleAttributes,
    // @ts-ignore-error The previous fields won't comply with type in Station. Will be fixed later.
    fields: myLineStyleFields,
    metadata: {
        displayName: 'panel.details.lines.myLineStyle.displayName',
        tags: [],
    },
};

// export the plugin object as the default export of your module
export default myLineStyle;
```

### 8. Add line style type in constants and lines

Finally, you need to tell Rain Map Painter to load your line style so that users can select in the details panel of any line.

```tsx
// src/constants/lines.ts

import { SingleColorAttributes } from '../components/svgs/lines/styles/single-color';
import { ShmetroVirtualIntAttributes } from '../components/svgs/lines/styles/shmetro-virtual-int';
// ...
import { MyLineStyleAttributes } from '../components/svgs/lines/styles/my-line-style';

export enum LineStyleType {
    SingleColor = 'single-color',
    ShmetroVirtualInt = 'shmetro-virtual-int',
    // ...
    MyLineStyle = 'my-line-style', // register your line style here
}

export interface ExternalLineStyleAttributes {
    [LineStyleType.SingleColor]?: SingleColorAttributes;
    [LineStyleType.ShmetroVirtualInt]?: ShmetroVirtualIntAttributes;
    // ...
    [LineStyleType.MyLineStyle]?: MyLineStyleAttributes; // register your line style attribute here
}
```

```tsx
// src/components/svgs/lines/lines.ts

import singleColor from './styles/single-color';
import shmetroVirtualInt from './styles/shmetro-virtual-int';
// ...
import myLineStyle from './styles/my-line-style';

export const lineStyles = {
    [LineStyleType.SingleColor]: singleColor,
    [LineStyleType.ShmetroVirtualInt]: shmetroVirtualInt,
    // ...
    [LineStyleType.MyLineStyle]: myLineStyle, // register your line style here
};
```

## Final Notes

By following this guide, you should be able to create a new line style for Rail Map Painter. Make sure to adhere to the conventions outlined in [this guide](../CONTRIBUTING.md) and refer to [single-color](../src/components/svgs/lines/styles/single-color.tsx) and [river](../src/components/svgs/lines/styles/river.tsx) for clarity.

Feel free to submit your line style as a pull request to the project repository, and the maintainers will review it. If your line style meets the project's standards, it will be merged and become part of the project.

Happy coding!
