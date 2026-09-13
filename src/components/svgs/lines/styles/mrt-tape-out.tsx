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
import { Path, makeEmptyOpenPath } from '../../../../constants/path';
import { isLinearPath, isOpenPath, splitLinearPath } from '../../../../util/path';
import { ColorField } from '../../../panels/details/color-field';

const mrtTapeOutPathGenerator = (path: Path, type: LinePathType, attrs: MRTTapeOutAttributes) => {
    if (!isOpenPath(path)) {
        return { pathA: makeEmptyOpenPath(), pathB: makeEmptyOpenPath() };
    }
    if (!isLinearPath(path)) return { pathA: path, pathB: path };

    const [pathA, pathB] = splitLinearPath(path);

    return { pathA, pathB };
};

const MRTTapeOut = (props: LineStyleComponentProps<MRTTapeOutAttributes>) => {
    const { id, type, path, styleAttrs, newLine, handlePointerDown } = props;
    const { colorA = defaultMRTTapeOutAttributes.colorA, colorB = defaultMRTTapeOutAttributes.colorB } =
        styleAttrs ?? defaultMRTTapeOutAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () => mrtTapeOutPathGenerator(path, type, styleAttrs ?? defaultMRTTapeOutAttributes),
        [path, type, styleAttrs]
    );

    return (
        <g
            onPointerDown={newLine ? undefined : onPointerDown}
            cursor="pointer"
            pointerEvents={newLine ? 'none' : undefined}
        >
            <defs>
                <marker
                    id={`slantSeparator45${colorB[2]}A_${id}`}
                    markerWidth={LINE_WIDTH}
                    markerHeight={LINE_WIDTH}
                    refX={LINE_WIDTH / 2}
                    refY={LINE_WIDTH / 2}
                    orient="auto-start-reverse"
                    markerUnits="userSpaceOnUse"
                >
                    <polygon
                        points={`0,${LINE_WIDTH} ${LINE_WIDTH / 2},${LINE_WIDTH} ${LINE_WIDTH / 2},${LINE_WIDTH / 2}`}
                        fill={colorB[2]}
                    />
                </marker>
                <marker
                    id={`slantSeparator45${colorA[2]}B_${id}`}
                    markerWidth={LINE_WIDTH}
                    markerHeight={LINE_WIDTH}
                    refX={LINE_WIDTH / 2}
                    refY={LINE_WIDTH / 2}
                    orient="auto-start-reverse"
                    markerUnits="userSpaceOnUse"
                >
                    <polygon
                        points={`0,${LINE_WIDTH} ${LINE_WIDTH / 2},${LINE_WIDTH} ${LINE_WIDTH / 2},${LINE_WIDTH / 2}`}
                        fill={colorA[2]}
                    />
                </marker>
            </defs>
            <path
                id={`${LineStyleType.MRTTapeOut}_pathA_${id}`}
                d={paths.pathA.d}
                fill="none"
                stroke={colorA[2]}
                strokeWidth={LINE_WIDTH}
                markerEnd={`url(#slantSeparator45${colorB[2]}A_${id})`}
            />
            <path
                id={`${LineStyleType.MRTTapeOut}_pathB_${id}`}
                d={paths.pathB.d}
                fill="none"
                stroke={colorB[2]}
                strokeWidth={LINE_WIDTH}
                markerStart={`url(#slantSeparator45${colorA[2]}B_${id})`}
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

const MRTTapeOutSwitch = ({ id, attrs, handleAttrsUpdate }: AttrsProps<MRTTapeOutAttributes>) => {
    const { t } = useTranslation();

    return (
        <IconButton
            aria-label={t('panel.details.lines.mrtTapeOut.swap')}
            icon={<MdOutlineSwapVert />}
            size="sm"
            onClick={() => handleAttrsUpdate(id, { ...attrs, colorA: attrs.colorB, colorB: attrs.colorA })}
        />
    );
};

const mrtTapeOutAttrsComponent = (props: AttrsProps<MRTTapeOutAttributes>) => {
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('panel.details.lines.dualColor.swap'),
            component: <MRTTapeOutSwitch {...props} />,
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
    pathGenerator: mrtTapeOutPathGenerator,
    metadata: {
        displayName: 'panel.details.lines.mrtTapeOut.displayName',
        // Bezier needs arc-length splitting here; otherwise color B completely covers color A.
        supportLinePathType: [LinePathType.Simple],
        supportsReconcile: true,
    },
};

export default mrtTapeOut;
