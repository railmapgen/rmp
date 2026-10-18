import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../../constants/nodes';
import { Rotate } from '../../../constants/stations';
import {
    getTaipeiOpacityMode,
    getTaipeiOpacityOptions,
    resolveTaipeiOpacity,
    TaipeiOpacitySetting,
} from '../../../util/taipei-opacity';
import { ColorAttribute, ColorField } from '../../panels/details/color-field';
import { SameStyleLineEndpointOverlay } from '../common/same-style-line-endpoint-overlay';

const HEAD_WIDTH = 5.85;
const HALF_HEIGHT = 3.4;
const HEAD_GAP = 0.75;
const PAIR_WIDTH = HEAD_WIDTH * 2 + HEAD_GAP;
const BORDER_WIDTH = 0.75;
const SIDE_SLOPE = HALF_HEIGHT / HEAD_WIDTH;
const SIDE_FACTOR = Math.hypot(1, SIDE_SLOPE);
const INNER_TIP_X = HEAD_WIDTH - (BORDER_WIDTH * SIDE_FACTOR) / SIDE_SLOPE;
const INNER_HALF_HEIGHT = HALF_HEIGHT - BORDER_WIDTH * (SIDE_FACTOR + SIDE_SLOPE);

const OUTER_D = `M0 ${-HALF_HEIGHT}L${HEAD_WIDTH} 0L0 ${HALF_HEIGHT}Z`;
// Inset each side by the border width, keeping the measured outer bounds unchanged.
const INNER_D = `M${BORDER_WIDTH} ${-INNER_HALF_HEIGHT}L${INNER_TIP_X} 0L${BORDER_WIDTH} ${INNER_HALF_HEIGHT}Z`;

const TaiwanRailwayArrow = (props: NodeComponentProps<TaiwanRailwayArrowAttributes>) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const {
        color = defaultAttrs.color,
        outlined = defaultAttrs.outlined,
        rotate = defaultAttrs.rotate,
        opacity,
    } = attrs ?? defaultAttrs;
    return (
        <g
            transform={`rotate(${rotate})`}
            onPointerDown={event => handlePointerDown(id, event)}
            onPointerMove={event => handlePointerMove(id, event)}
            onPointerUp={event => handlePointerUp(id, event)}
            style={{ cursor: 'move' }}
        >
            <g
                opacity={resolveTaipeiOpacity(opacity, outlined ? 0.25 : 0.45)}
                data-taiwan-railway-arrow={outlined ? 'outlined' : 'solid'}
            >
                {[0, 1].map(index => (
                    <g key={index} transform={`translate(${-PAIR_WIDTH / 2 + index * (HEAD_WIDTH + HEAD_GAP)}, 0)`}>
                        <path d={OUTER_D} fill={outlined ? 'black' : color[2]} />
                        {outlined && <path d={INNER_D} fill={color[2]} />}
                    </g>
                ))}
            </g>
            <rect
                id={`misc_node_connectable_${id}`}
                className="removeMe"
                x={-PAIR_WIDTH / 2}
                y={-HALF_HEIGHT}
                width={PAIR_WIDTH}
                height={HALF_HEIGHT * 2}
                fill="transparent"
                pointerEvents="all"
            />
        </g>
    );
};

export interface TaiwanRailwayArrowAttributes extends ColorAttribute {
    outlined: boolean;
    rotate: Rotate;
    opacity?: TaipeiOpacitySetting;
}

const defaultAttrs: TaiwanRailwayArrowAttributes = {
    color: [CityCode.Taipei, 'railway', '#757575', MonoColour.white],
    outlined: false,
    rotate: 0,
    opacity: 'preset',
};

const AttrsComponent = ({ id, attrs, handleAttrsUpdate }: AttrsProps<TaiwanRailwayArrowAttributes>) => {
    const { t } = useTranslation();
    const fields: RmgFieldsField[] = [
        {
            type: 'switch',
            label: t('panel.details.nodes.taiwanRailwayArrow.outlined'),
            isChecked: attrs.outlined ?? defaultAttrs.outlined,
            onChange: outlined => handleAttrsUpdate(id, { ...attrs, outlined }),
            oneLine: true,
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.stations.common.rotate'),
            value: attrs.rotate ?? defaultAttrs.rotate,
            options: { 0: '0', 45: '45', 90: '90', 135: '135', 180: '180', 225: '225', 270: '270', 315: '315' },
            onChange: value => handleAttrsUpdate(id, { ...attrs, rotate: Number(value) as Rotate }),
            minW: 'full',
        },
        {
            type: 'select',
            label: t('panel.details.lines.generic.opacity'),
            value: getTaipeiOpacityMode(attrs.opacity),
            options: getTaipeiOpacityOptions(t),
            onChange: opacity => {
                if (opacity === 'preset' || opacity === 'opaque') {
                    handleAttrsUpdate(id, { ...attrs, opacity });
                }
            },
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('color'),
            component: <ColorField type={MiscNodeType.TaiwanRailwayArrow} defaultTheme={defaultAttrs.color} />,
        },
    ];
    return <RmgFields fields={fields} />;
};

const taiwanRailwayArrow: Node<TaiwanRailwayArrowAttributes> = {
    component: TaiwanRailwayArrow,
    attrsComponent: AttrsComponent,
    defaultAttrs,
    overlayComponent: SameStyleLineEndpointOverlay,
    icon: (
        <svg viewBox="-9 -9 18 18" width={40} height={40} focusable={false}>
            <path d={OUTER_D} fill="currentColor" transform={`translate(${-PAIR_WIDTH / 2}, 0)`} />
            <path d={OUTER_D} fill="currentColor" transform={`translate(${HEAD_GAP / 2}, 0)`} />
        </svg>
    ),
    metadata: { displayName: 'panel.details.nodes.taiwanRailwayArrow.displayName', tags: [] },
};

export default taiwanRailwayArrow;
