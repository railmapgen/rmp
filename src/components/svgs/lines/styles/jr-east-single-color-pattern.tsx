import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathAttributes,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { makeShortPathOutline } from '../../../../util/bezier-parallel';
import { ColorAttribute, ColorField } from '../../../panels/details/color-field';

const PATTERN_LEN = LINE_WIDTH * Math.SQRT1_2;
const PATTERN_WIDTH = 0.25;
const PATTERN_CLIP_PATH_D = ((PATTERN_LEN * Math.SQRT2 - PATTERN_WIDTH) / 2) * Math.SQRT2;

const JREastSingleColorPatternPre = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const [paths, setPaths] = React.useState({ outline: path, pA: path, pB: path });
    React.useEffect(() => {
        // TODO: the calculation of outline paths is done twice (pre and main component).
        const p = makeShortPathOutline(path, type, -2.5, 2.5);
        if (!p) return;
        setPaths(p);
    }, [path]);

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <path d={paths.pA} fill="none" stroke="black" strokeWidth="0.1" />
            <path d={paths.pB} fill="none" stroke="black" strokeWidth="0.1" />
        </g>
    );
};

const JREastSingleColorPattern = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, newLine, handlePointerDown } = props;
    const { color = defaultJREastSingleColorPatternAttributes.color } =
        styleAttrs ?? defaultJREastSingleColorPatternAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const [paths, setPaths] = React.useState({ outline: path, pA: path, pB: path });
    React.useEffect(() => {
        // TODO: the calculation of outline paths is done twice (pre and main component).
        const p = makeShortPathOutline(path, type, -2.5, 2.5);
        if (!p) return;
        setPaths(p);
    }, [path]);

    return (
        <g id={id} onPointerDown={onPointerDown} cursor="pointer">
            <defs>
                <clipPath id={`jr_east_fill_pattern_clip_path_${id}`} patternUnits="userSpaceOnUse">
                    <polygon points={`0,0 0,${PATTERN_CLIP_PATH_D} ${PATTERN_CLIP_PATH_D},0`} />
                    <polygon
                        points={`${PATTERN_LEN},${PATTERN_LEN} ${
                            PATTERN_LEN - PATTERN_CLIP_PATH_D
                        },${PATTERN_LEN} ${PATTERN_LEN},${PATTERN_LEN - PATTERN_CLIP_PATH_D}`}
                    />
                </clipPath>
                <pattern
                    id={`jr_east_${id}_fill_pattern_${color[2]}`}
                    width={PATTERN_LEN}
                    height={PATTERN_LEN}
                    patternUnits="userSpaceOnUse"
                >
                    <rect width={PATTERN_LEN} height={PATTERN_LEN} fill={color[2]} />
                    <line
                        x1="0"
                        y1="0"
                        x2={PATTERN_LEN}
                        y2={PATTERN_LEN}
                        stroke="white"
                        strokeWidth={PATTERN_WIDTH}
                        strokeOpacity="50%"
                        clipPath={`url(#jr_east_fill_pattern_clip_path_${id})`}
                    />
                    <line
                        x1={PATTERN_LEN}
                        y1="0"
                        x2="0"
                        y2={PATTERN_LEN}
                        stroke="white"
                        strokeWidth={PATTERN_WIDTH}
                        strokeOpacity="50%"
                    />
                </pattern>
            </defs>
            <path d={paths.outline} fill={`url(#jr_east_${id}_fill_pattern_${color[2]})`} />
        </g>
    );
};

/**
 * JREastSingleColorPattern specific props.
 */
export interface JREastSingleColorPatternAttributes extends LinePathAttributes, ColorAttribute {}

const defaultJREastSingleColorPatternAttributes: JREastSingleColorPatternAttributes = {
    color: [CityCode.Tokyo, 'jy', '#9ACD32', MonoColour.black],
};

const jrEastSingleColorPatternAttrsComponent = (props: AttrsProps<JREastSingleColorPatternAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();

    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ColorField
                    type={LineStyleType.JREastSingleColorPattern}
                    defaultTheme={defaultJREastSingleColorPatternAttributes.color}
                />
            ),
        },
    ];

    return <RmgFields fields={fields} />;
};

const jrEastSingleColorPattern: LineStyle<JREastSingleColorPatternAttributes> = {
    preComponent: JREastSingleColorPatternPre,
    component: JREastSingleColorPattern,
    defaultAttrs: defaultJREastSingleColorPatternAttributes,
    attrsComponent: jrEastSingleColorPatternAttrsComponent,
    metadata: {
        displayName: 'panel.details.lines.jrEastSingleColorPattern.displayName',
        supportLinePathType: [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular],
    },
};

export default jrEastSingleColorPattern;
