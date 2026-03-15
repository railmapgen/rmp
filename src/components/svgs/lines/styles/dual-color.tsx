import { IconButton } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOutlineSwapVert } from 'react-icons/md';
import { AttrsProps, CityCode, Theme } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
    Path,
} from '../../../../constants/lines';
import { useRootDispatch, useRootSelector } from '../../../../redux';
import { saveGraph } from '../../../../redux/param/param-slice';
import { refreshEdgesThunk } from '../../../../redux/runtime/runtime-slice';
import { makeShortPathParallel } from '../../../../util/bezier-parallel';
import { ColorField } from '../../../panels/details/color-field';

const dualColorPathGenerator = (path: Path, type: LinePathType, attrs: DualColorAttributes) => {
    const _ = makeShortPathParallel(path, type, -1.25, 1.25);
    if (!_) return { pathA: path, pathB: path };
    return { pathA: _[0], pathB: _[1] };
};

const DualColor = (props: LineStyleComponentProps<DualColorAttributes>) => {
    const { id, type, path, styleAttrs, newLine, handlePointerDown } = props;
    const { colorA = defaultDualColorAttributes.colorA, colorB = defaultDualColorAttributes.colorB } =
        styleAttrs ?? defaultDualColorAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () => dualColorPathGenerator(path, type, styleAttrs ?? defaultDualColorAttributes),
        [path, type, styleAttrs]
    );

    return (
        <g
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <path
                id={`${LineStyleType.DualColor}_pathA_${id}`}
                d={paths.pathA}
                fill="none"
                stroke={colorA[2]}
                strokeWidth={LINE_WIDTH / 2}
                strokeLinecap="round"
            />
            <path
                id={`${LineStyleType.DualColor}_pathB_${id}`}
                d={paths.pathB}
                fill="none"
                stroke={colorB[2]}
                strokeWidth={LINE_WIDTH / 2}
                strokeLinecap="round"
            />
        </g>
    );
};

/**
 * DualColor specific props.
 */
export interface DualColorAttributes extends LinePathAttributes {
    colorA: Theme;
    colorB: Theme;
}

const defaultDualColorAttributes: DualColorAttributes = {
    colorA: [CityCode.Shanghai, 'maglevA', '#008B9A', MonoColour.white],
    colorB: [CityCode.Shanghai, 'maglevB', '#F5A74E', MonoColour.white],
};

const DualColorSwitch = () => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();

    const { selected } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    return (
        <IconButton
            aria-label={t('panel.details.lines.dualColor.swap')}
            icon={<MdOutlineSwapVert />}
            size="sm"
            onClick={() => {
                const attrs =
                    graph.current.getEdgeAttribute(selectedFirst, LineStyleType.DualColor) ??
                    defaultDualColorAttributes;
                const tmp = attrs.colorA;
                attrs.colorA = attrs.colorB;
                attrs.colorB = tmp;
                graph.current.mergeEdgeAttributes(selectedFirst, { [LineStyleType.DualColor]: attrs });
                dispatch(saveGraph(graph.current.export()));
                dispatch(refreshEdgesThunk());
            }}
        />
    );
};

const dualColorAttrsComponent = (props: AttrsProps<DualColorAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('panel.details.lines.dualColor.swap'),
            component: <DualColorSwitch />,
            minW: 'full',
        },
        {
            type: 'custom',
            label: t('panel.details.lines.dualColor.colorA'),
            component: (
                <ColorField
                    type={LineStyleType.DualColor}
                    colorKey="colorA"
                    defaultTheme={defaultDualColorAttributes.colorA}
                />
            ),
        },
        {
            type: 'custom',
            label: t('panel.details.lines.dualColor.colorB'),
            component: (
                <ColorField
                    type={LineStyleType.DualColor}
                    colorKey="colorB"
                    defaultTheme={defaultDualColorAttributes.colorB}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const dualColor: LineStyle<DualColorAttributes> = {
    component: DualColor,
    defaultAttrs: defaultDualColorAttributes,
    attrsComponent: dualColorAttrsComponent,
    pathGenerator: dualColorPathGenerator,
    metadata: {
        displayName: 'panel.details.lines.dualColor.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
        ],
    },
};

export default dualColor;
