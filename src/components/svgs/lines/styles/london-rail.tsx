import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode, Theme } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { ColorField } from '../../../panels/details/color-field';

const LondonRail = (props: LineStyleComponentProps<LondonRailAttributes>) => {
    const { id, path, styleAttrs, newLine, handlePointerDown } = props;
    const {
        colorBackground = defaultLondonRailAttributes.colorBackground,
        colorForeground = defaultLondonRailAttributes.colorForeground,
        limitedService = defaultLondonRailAttributes.limitedService,
    } = styleAttrs ?? defaultLondonRailAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return !limitedService ? (
        <g
            id={id}
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path} fill="none" stroke={colorBackground[2]} strokeWidth={LINE_WIDTH} strokeLinecap="round" />
            <path
                d={path}
                fill="none"
                stroke={colorForeground[2]}
                strokeWidth={(LINE_WIDTH / 5) * 2}
                strokeDasharray="7 3"
            />
        </g>
    ) : (
        <g
            id={id}
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path d={path} fill="none" stroke={colorBackground[2]} strokeWidth={LINE_WIDTH} strokeLinecap="round" />
            <path
                d={path}
                fill="none"
                stroke={colorForeground[2]}
                strokeWidth={(LINE_WIDTH / 5) * 4.25}
                strokeLinecap="round"
            />
            <path
                d={path}
                fill="none"
                stroke={colorBackground[2]}
                strokeWidth={(LINE_WIDTH / 5) * 2}
                strokeDasharray="7 3"
            />
        </g>
    );
};

/**
 * LondonRail specific props.
 */
export interface LondonRailAttributes extends LinePathAttributes {
    colorBackground: Theme;
    colorForeground: Theme;
    limitedService: boolean;
}

const defaultLondonRailAttributes: LondonRailAttributes = {
    colorBackground: [CityCode.London, 'thameslink', '#d28db0', MonoColour.white],
    colorForeground: [CityCode.London, 'white', '#ffffff', MonoColour.black],
    limitedService: false,
};

const londonRailAttrsComponent = (props: AttrsProps<LondonRailAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('panel.details.lines.londonRail.limitedService'),
            oneLine: true,
            isChecked: attrs.limitedService,
            onChange: val => {
                attrs.limitedService = val;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.lines.londonRail.colorBackground'),
            component: (
                <ColorField
                    type={LineStyleType.LondonRail}
                    colorKey="colorBackground"
                    defaultTheme={defaultLondonRailAttributes.colorBackground}
                />
            ),
        },
        {
            type: 'custom',
            label: t('panel.details.lines.londonRail.colorForeground'),
            component: (
                <ColorField
                    type={LineStyleType.LondonRail}
                    colorKey="colorForeground"
                    defaultTheme={defaultLondonRailAttributes.colorForeground}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonRail: LineStyle<LondonRailAttributes> = {
    component: LondonRail,
    defaultAttrs: defaultLondonRailAttributes,
    attrsComponent: londonRailAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.londonRail.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
        ],
    },
};

export default londonRail;
