import { IconButton } from '@chakra-ui/react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { Bezier } from 'bezier-js';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdOutlineSwapVert } from 'react-icons/md';
import { Theme } from '../../../../constants/constants';
import {
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { useRootDispatch, useRootSelector } from '../../../../redux';
import { saveGraph } from '../../../../redux/param/param-slice';
import { setRefreshEdges } from '../../../../redux/runtime/runtime-slice';
import {
    RmgFieldsFieldDetail,
    RmgFieldsFieldSpecificAttributes,
} from '../../../panels/details/rmg-field-specific-attrs';
import { makeShortPathParallel } from '../../../../util/bezier-parallel';

/**
 * Given the coordinates of point A, B, and C,
 * this helper function find the 4th vertex of the parallelogram.
 *   D---C
 *  /   /
 * A---B
 * @returns The coordinates of point D.
 */
const find4thVertexOfAParallelogram = (xa: number, xb: number, xc: number, ya: number, yb: number, yc: number) => {
    const [xmid, ymid] = [xa + xc, ya + yc];
    const [xd, yd] = [xmid - xb, ymid - yb];
    return [xd, yd];
};

const DualColor = (props: LineStyleComponentProps<DualColorAttributes>) => {
    const { id, type, path, styleAttrs, handleClick } = props;
    const { colorA = defaultDualColorAttributes.colorA, colorB = defaultDualColorAttributes.colorB } =
        styleAttrs ?? defaultDualColorAttributes;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    const [pathA, setPathA] = React.useState(path);
    const [pathB, setPathB] = React.useState(path);
    React.useEffect(() => {
        const _ = makeShortPathParallel(path, type, -1.25, 1.25);
        if (!_) return;

        setPathA(_[0]);
        setPathB(_[1]);
    }, [path]);

    return (
        <g id={id}>
            <path d={pathA} fill="none" stroke={colorA[2]} strokeWidth="2.5" strokeLinecap="round" />
            <path d={pathB} fill="none" stroke={colorB[2]} strokeWidth="2.5" strokeLinecap="round" />
            <path
                d={path}
                fill="none"
                stroke="white"
                strokeOpacity="0"
                strokeWidth="5"
                strokeLinecap="round"
                cursor="pointer"
                onClick={onClick}
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
                dispatch(setRefreshEdges());
                dispatch(saveGraph(graph.current.export()));
            }}
        />
    );
};

const dualColorFields = [
    {
        type: 'custom',
        label: 'panel.details.lines.dualColor.swap',
        component: <DualColorSwitch />,
    },
];

const attrsComponent = () => (
    <RmgFieldsFieldSpecificAttributes
        fields={dualColorFields as RmgFieldsFieldDetail<DualColorAttributes>}
        type="style"
    />
);

const dualColor: LineStyle<DualColorAttributes> = {
    component: DualColor,
    defaultAttrs: defaultDualColorAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.lines.dualColor.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default dualColor;
