import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { LinePathAttributes, LineStyle, LineStyleComponentProps, LineStyleType } from '../../../../constants/lines';
import { ColorField, AttributesWithColor } from '../../../panels/details/color-field';

const BjsubwayTram = (props: LineStyleComponentProps<BjsubwayTramAttributes>) => {
    const { id, path, styleAttrs, newLine, handleClick } = props;
    const { color = defaultBjsubwayTramAttributes.color } = styleAttrs ?? defaultBjsubwayTramAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <path d={path} fill="none" stroke={color[2]} strokeWidth="5" strokeLinecap="round" />
            <path d={path} fill="none" stroke="white" strokeWidth="1.67" />
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth={5}
                strokeLinecap="round"
                onClick={newLine ? undefined : onClick}
                pointerEvents={newLine ? 'none' : undefined}
            />
        </g>
    );
};

/**
 * BjsubwayTram specific props.
 */
export interface BjsubwayTramAttributes extends LinePathAttributes, AttributesWithColor {}

const defaultBjsubwayTramAttributes: BjsubwayTramAttributes = {
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const bjsubwayTramFields = [
    {
        type: 'custom',
        component: <ColorField type={LineStyleType.BjsubwayTram} defaultAttrs={defaultBjsubwayTramAttributes} />,
    },
];

const bjsubwayTram: LineStyle<BjsubwayTramAttributes> = {
    component: BjsubwayTram,
    defaultAttrs: defaultBjsubwayTramAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: bjsubwayTramFields,
    metadata: { displayName: 'panel.details.line.bjsubwayTram.displayName' },
};

export default bjsubwayTram;
