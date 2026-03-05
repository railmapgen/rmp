import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { Rotate } from '../../../constants/stations';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';

const X = 5;
const D = `M0,0 L${-X * 2},${-X * 2} L${Math.SQRT2 * X - 2 * X},${2 * -X} L${Math.SQRT2 * X},0 L${Math.SQRT2 * X - 2 * X},${2 * X} L${2 * -X},${2 * X} Z`;

const LondonArrow = (props: NodeComponentProps<LondonArrowAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        color = defaultLondonArrowAttributes.color,
        rotate = defaultLondonArrowAttributes.rotate,
        type = defaultLondonArrowAttributes.type,
    } = attrs ?? defaultLondonArrowAttributes;

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

    return (
        <g
            id={id}
            transform={`translate(${x}, ${y})rotate(${rotate})`}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{ cursor: 'move' }}
        >
            {type === 'continuation' ? (
                <path id={`virtual_circle_${id}`} fill={color[2]} d={D} />
            ) : type === 'sandwich' ? (
                <path
                    transform="scale(0.5)"
                    id={`virtual_circle_${id}`}
                    stroke="white"
                    strokeWidth="1"
                    fill={color[2]}
                    d={D}
                />
            ) : (
                <path transform="scale(0.25)" id={`virtual_circle_${id}`} fill="white" d={D} />
            )}
        </g>
    );
};

/**
 * LondonArrow specific props.
 */
export interface LondonArrowAttributes extends ColorAttribute {
    rotate: Rotate;
    type: 'continuation' | 'sandwich' | 'tube';
}

const defaultLondonArrowAttributes: LondonArrowAttributes = {
    color: [CityCode.London, 'thameslink', '#d28db0', MonoColour.white],
    rotate: 0,
    type: 'continuation',
};

const londonArrowAttrsComponent = (props: AttrsProps<LondonArrowAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'select',
            label: t('panel.details.stations.common.rotate'),
            value: attrs.rotate,
            options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
            onChange: val => {
                attrs.rotate = Number(val) as Rotate;
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.nodes.londonArrow.type'),
            value: attrs.type,
            options: {
                continuation: t('panel.details.nodes.londonArrow.continuation'),
                sandwich: t('panel.details.nodes.londonArrow.sandwich'),
                tube: t('panel.details.nodes.londonArrow.tube'),
            },
            onChange: val => {
                attrs.type = val as 'continuation' | 'sandwich' | 'tube';
                handleAttrsUpdate(id, attrs);
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={MiscNodeType.LondonArrow} defaultTheme={defaultLondonArrowAttributes.color} />,
            minW: 'full',
        },
    ];

    return <RmgFields fields={fields} />;
};

const londonArrowIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <path transform="translate(14,12)scale(0.75)" fill="currentColor" d={D} />
    </svg>
);

const londonArrow: Node<LondonArrowAttributes> = {
    component: LondonArrow,
    icon: londonArrowIcon,
    defaultAttrs: defaultLondonArrowAttributes,
    attrsComponent: londonArrowAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.londonArrow.displayName',
        tags: [],
    },
};

export default londonArrow;
