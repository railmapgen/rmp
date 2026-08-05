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
} from '../../../../constants/lines';
import { makeOpenPathParallel } from '../../../../util/bezier-parallel';
import { Path, makeEmptyOpenPath } from '../../../../constants/path';
import { isOpenPath } from '../../../../util/path';
import { ColorField } from '../../../panels/details/color-field';

const dualColorPathGenerator = (path: Path, type: LinePathType, attrs: DualColorAttributes) => {
    if (!isOpenPath(path)) {
        return { pathA: makeEmptyOpenPath(), pathB: makeEmptyOpenPath() };
    }
    const [pathA, pathB] = makeOpenPathParallel(path, -1.25, 1.25);
    return { pathA, pathB };
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
                d={paths.pathA.d}
                fill="none"
                stroke={colorA[2]}
                strokeWidth={LINE_WIDTH / 2}
                strokeLinecap="round"
            />
            <path
                id={`${LineStyleType.DualColor}_pathB_${id}`}
                d={paths.pathB.d}
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

const DualColorSwitch = ({ id, attrs, handleAttrsUpdate }: AttrsProps<DualColorAttributes>) => {
    const { t } = useTranslation();

    return (
        <IconButton
            aria-label={t('panel.details.lines.dualColor.swap')}
            icon={<MdOutlineSwapVert />}
            size="sm"
            onClick={() => handleAttrsUpdate(id, { ...attrs, colorA: attrs.colorB, colorB: attrs.colorA })}
        />
    );
};

const dualColorAttrsComponent = (props: AttrsProps<DualColorAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('panel.details.lines.dualColor.swap'),
            component: <DualColorSwitch {...props} />,
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
    isSameStyle: (a, b) => a.colorA[2] === b.colorA[2] && a.colorB[2] === b.colorB[2],
    metadata: {
        displayName: 'panel.details.lines.dualColor.displayName',
        supportLinePathType: [
            LinePathType.Freeform,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.Bezier,
        ],
        supportsReconcile: true,
    },
};

export default dualColor;
