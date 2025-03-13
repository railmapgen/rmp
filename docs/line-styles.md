# Line Style Guide: Creating a line style for Rail Map Painter

This guide will walk you through the process of creating a line style for the Rail Map Painter. The core of a line style is to write a React component and returns SVG elements based on its attributes. To write a line style, you need to follow some conventions as described below.

## Line Style Structure

A line style consists of:

* A React component that generates the SVG
* A TypeScript interface for the attributes of the component
* Default attributes
* A React component that modify station attributes
* An object containing all the things mentioned before and metadata

## Steps to create a line style

### 1. Create a new tsx file

First, create a new TypeScript file (`.tsx`) under the `src/components/svgs/lines/styles` directory. This file will contain the implementation of your line style.

### 2. Create the React component to generate the SVG of your station

Create a React component that generates the SVG using the provided attributes. The component should accept a `LineStyleComponentProps` prop which includes the id, type, path, mouse event handler, and your line style specific attributes.

```tsx
import React from 'react';
import { LineStyleComponentProps, LineStyleType } from '../../../constants/lines';

// MyLineStyleAttributes will be added in the next step
const MyLineStyleComponent = (props: LineStyleComponentProps<MyLineStyleAttributes>) => {
    // destructure the props
    const { id, path, styleAttrs, handlePointerDown } = props;
    // destructure the specific attributes of your line style
    // defaultMyLineStyleAttributes will be added in the 4th step
    const {
        someAttribute = defaultMyLineStyleAttributes.someAttribute,
        anotherAttribute = defaultMyLineStyleAttributes.anotherAttribute,
    } = styleAttrs ?? defaultRiverAttributes;

    // some boilerplate to cache a function between re-renders
    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
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
            onPointerDown={onPointerDown}
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

### 5. Create the React component to modify station attributes

In this section, we will guide you on creating a React component that enables users to modify the attributes of a station. This component will be integrated into the details panel and can be customized using various input elements like `<input />`, `<textarea />`, or `<select />` to offer a user-friendly interface for attribute modification.

```tsx
import { Input, Select } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../../constants/constants';

const myLineStyleAttrs = (props: AttrsProps<MyLineStyleAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const [someAttribute, setSomeAttribute] = React.useState(attrs.someAttribute ?? defaultMyLineStyleAttributes.someAttribute);
    React.useEffect(() => setSomeAttribute(attrs.someAttribute), [attrs.someAttribute]);
    const handleSomeAttributeChange = (val: string) => {
        attrs.someAttribute = val;
        handleAttrsUpdate(id, attrs);
    };

    const [anotherAttribute, setAnotherAttribute] = React.useState(attrs.anotherAttribute ?? defaultMyLineStyleAttributes.anotherAttribute);
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
import { AttrsProps } from '../../../../constants/constants';

const myLineStyleAttrs = (props: AttrsProps<MyLineStyleAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('panel.details.stations.myLineStyle.someAttribute'),
            value: attrs.someAttribute ?? defaultMyLineStyleAttributes.someAttribute,
            onChange: val => {
                attrs.someAttribute = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.myLineStyle.anotherAttribute'),
            value: attrs.anotherAttribute ?? defaultMyLineStyleAttributes.anotherAttribute,
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

We also provide common input components like color. Feel free to checkout them in `single-color.tsx` for more reference.

### 6. Create the line style object and export

Now you have completed the steps for creating a line style. Don't forget to export your line style component, default attributes, attributes component, and metadata in the final object.

* The React component
* The default attributes
* The React component to modify station attributes
* Metadata, including:
  * Display name
  * Tags

```tsx
import { LineStyle } from '../../../constants/lines';

const myLineStyle: LineStyle<MyLineStyleAttributes> = {
    component: MyLineStyleComponent,
    defaultAttrs: defaultMyLineStyleAttributes,
    attrsComponent: myLineStyleAttrs,
    metadata: {
        displayName: 'panel.details.lines.myLineStyle.displayName',
        tags: [],
    },
};

// export your line style object as the default export of your module
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

### 9. Implementing internationalization translation

In this section, we'll guide you on how to provide translations for your application, ensuring that it can be presented in different languages. Internationalization is a critical aspect of creating a global-ready application. You may have encountered lengthy strings like `panel.details.stations.myLineStyle.displayName`. These strings are internationalization keys that inform `react-i18next` which translation to fetch and display. To make your application multilingual, it's important to ensure that all defined keys have at least an English translation. This ensures that, when a translation is missing, the English version of the text will be displayed as a fallback.

For a comprehensive guide on creating or updating translations, please refer to our [Translation Guide](./i18n-translation.md).

### 10. Upgrade save version

There is one more crucial step to undertake before opening your pull request. This step should be carried out once you have completed the design, coding, and testing phases of your line style.

It involves upgrading the version of the saved project to signal the presence of new updates. By doing so, the previous version of Rail Map Painter will be able to recognize these changes and provide appropriate warnings to users.

For more information, check out [Upgrade Save Version](./upgrade-save-version.md).

## Final Notes

By following this guide, you should be able to create a new line style for Rail Map Painter. Make sure to adhere to the conventions outlined in [this guide](../CONTRIBUTING.md) and refer to [single-color](../src/components/svgs/lines/styles/single-color.tsx) and [river](../src/components/svgs/lines/styles/river.tsx) for clarity.

Feel free to submit your line style as a pull request to the project repository, and the maintainers will review it. If your line style meets the project's standards, it will be merged and become part of the project.

Happy coding!
