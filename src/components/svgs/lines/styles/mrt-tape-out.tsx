import { IconButton } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOutlineSwapVert } from 'react-icons/md';
import { AttrsProps, CityCode, Theme } from '../../../../constants/constants';
import {
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { useRootDispatch, useRootSelector } from '../../../../redux';
import { saveGraph } from '../../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../../redux/runtime/runtime-slice';
import { ColorField } from '../../../panels/details/color-field';

const MRTTapeOut = (props: LineStyleComponentProps<MRTTapeOutAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const { colorA = defaultMRTTapeOutAttributes.colorA, colorB = defaultMRTTapeOutAttributes.colorB } =
        styleAttrs ?? defaultMRTTapeOutAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const [startPoint, endPoint] = path
        .substring(2) // Remove 'M' at the start
        .split('L') // Split by 'L' to get the start and end points
        .map(point => point.trim().split(' ').map(Number));
    const midPoint = [(startPoint[0] + endPoint[0]) / 2, (startPoint[1] + endPoint[1]) / 2];

    const pathA = `M ${startPoint[0]} ${startPoint[1]} L ${midPoint[0]} ${midPoint[1]}`;
    const pathB = `M ${midPoint[0]} ${midPoint[1]} L ${endPoint[0]} ${endPoint[1]}`;

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <defs>
                <marker
                    id={`slantSeparator45${colorB[2]}A`}
                    markerWidth="5"
                    markerHeight="5"
                    refX="2.5"
                    refY="2.5"
                    orient="auto-start-reverse"
                    markerUnits="userSpaceOnUse"
                >
                    <polygon points="0,5 2.5,5 2.5,2.5" fill={colorB[2]} />
                </marker>
                <marker
                    id={`slantSeparator45${colorA[2]}B`}
                    markerWidth="5"
                    markerHeight="5"
                    refX="2.5"
                    refY="2.5"
                    orient="auto-start-reverse"
                    markerUnits="userSpaceOnUse"
                >
                    <polygon points="0,5 2.5,5 2.5,2.5" fill={colorA[2]} />
                </marker>
            </defs>
            <path
                d={pathA}
                fill="none"
                stroke={colorA[2]}
                strokeWidth="5"
                marker-end={`url(#slantSeparator45${colorB[2]}A)`}
            />
            <path
                d={pathB}
                fill="none"
                stroke={colorB[2]}
                strokeWidth="5"
                marker-start={`url(#slantSeparator45${colorA[2]}B)`}
            />
        </g>
    );
};

/**
 * MRTTapeOut specific props.
 */
export interface MRTTapeOutAttributes extends LinePathAttributes {
    colorA: Theme;
    colorB: Theme;
}

const defaultMRTTapeOutAttributes: MRTTapeOutAttributes = {
    colorA: [CityCode.Shanghai, 'maglevA', '#008B9A', MonoColour.white],
    colorB: [CityCode.Shanghai, 'maglevB', '#F5A74E', MonoColour.white],
};

const MRTTapeOutSwitch = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const { selected } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    return (
        <IconButton
            aria-label={t('panel.details.lines.mrtTapeOut.swap')}
            icon={<MdOutlineSwapVert />}
            size="sm"
            onClick={() => {
                const attrs =
                    graph.current.getEdgeAttribute(selectedFirst, LineStyleType.MRTTapeOut) ??
                    defaultMRTTapeOutAttributes;
                const tmp = attrs.colorA;
                attrs.colorA = attrs.colorB;
                attrs.colorB = tmp;
                graph.current.mergeEdgeAttributes(selectedFirst, { [LineStyleType.MRTTapeOut]: attrs });
                dispatch(saveGraph(graph.current.export()));
                dispatch(refreshEdgesThunk());
            }}
        />
    );
};

const mrtTapeOutAttrsComponent = (props: AttrsProps<MRTTapeOutAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('panel.details.lines.dualColor.swap'),
            component: <MRTTapeOutSwitch />,
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.lines.dualColor.colorA'),
            component: (
                <ColorField
                    type={LineStyleType.MRTTapeOut}
                    colorKey="colorA"
                    defaultTheme={defaultMRTTapeOutAttributes.colorA}
                />
            ),
        },
        {
            type: 'custom',
            label: t('panel.details.lines.dualColor.colorB'),
            component: (
                <ColorField
                    type={LineStyleType.MRTTapeOut}
                    colorKey="colorB"
                    defaultTheme={defaultMRTTapeOutAttributes.colorB}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const mrtTapeOut: LineStyle<MRTTapeOutAttributes> = {
    component: () => <></>,
    postComponent: MRTTapeOut,
    defaultAttrs: defaultMRTTapeOutAttributes,
    attrsComponent: mrtTapeOutAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.mrtTapeOut.displayName',
        supportLinePathType: [LinePathType.Simple],
    },
};

export default mrtTapeOut;
