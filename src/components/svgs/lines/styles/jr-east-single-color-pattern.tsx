import { RmgFields } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    Path,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import { makeShortPathOutline } from '../../../../util/bezier-parallel';
import {
    defaultJREastSingleColorDecorationAttributes,
    getJREastDecorationMarkerProps,
    getJREastMarkerId,
    JREastMarker,
    JREastSingleColorSharedAttributes,
    makeJREastDecorationFields,
} from './jr-east-single-color-utils';

const PATTERN_LEN = LINE_WIDTH * Math.SQRT1_2;
const PATTERN_WIDTH = 0.25;
const PATTERN_CLIP_PATH_D = ((PATTERN_LEN * Math.SQRT2 - PATTERN_WIDTH) / 2) * Math.SQRT2;
const OUTLINE_D = LINE_WIDTH * (1 - 0.05);

const jrEastSingleColorPatternPathGenerator = (path: Path, type: LinePathType) => {
    const paths = makeShortPathOutline(path, type, -OUTLINE_D / 2, OUTLINE_D / 2);
    return {
        outline: paths?.outline || path,
        border: path,
        decorationMarker: path,
    };
};

/**
 * JREastSingleColorPattern specific props.
 */
export interface JREastSingleColorPatternAttributes extends JREastSingleColorSharedAttributes {}

export const defaultJREastSingleColorPatternAttributes: JREastSingleColorPatternAttributes = {
    color: [CityCode.Tokyo, 'jy', '#9ACD32', MonoColour.black],
    ...defaultJREastSingleColorDecorationAttributes,
};

const JREastSingleColorPatternPre = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, newLine, handlePointerDown } = props;

    const paths = React.useMemo(() => jrEastSingleColorPatternPathGenerator(path, type), [path, type]);

    return (
        <g
            onPointerDown={newLine ? undefined : e => handlePointerDown(id, e)}
            pointerEvents={newLine ? 'none' : 'cursor'}
        >
            <path
                id={`${LineStyleType.JREastSingleColorPattern}_border_${id}`}
                d={paths.border}
                fill="none"
                stroke="black"
                strokeWidth={LINE_WIDTH}
            />
        </g>
    );
};

const JREastSingleColorPattern = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const {
        color = defaultJREastSingleColorPatternAttributes.color,
        decoration = defaultJREastSingleColorPatternAttributes.decoration,
        decorationAt = defaultJREastSingleColorPatternAttributes.decorationAt,
    } = styleAttrs ?? defaultJREastSingleColorPatternAttributes;

    const paths = React.useMemo(() => jrEastSingleColorPatternPathGenerator(path, type), [path, type]);
    const markerId = getJREastMarkerId(id, decoration, decorationAt);
    const decorationMarkerProps = decoration === 'none' ? {} : getJREastDecorationMarkerProps(markerId, decorationAt);

    return (
        <g onPointerDown={e => handlePointerDown(id, e)} cursor="pointer">
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
                {decoration !== 'none' && (
                    <JREastMarker id={markerId} fill={color[2]} thinTail={decoration === 'thin-tail'} blackBlock />
                )}
            </defs>
            <path
                id={`${LineStyleType.JREastSingleColorPattern}_outline_${id}`}
                d={paths.outline}
                stroke="none"
                fill={`url(#jr_east_${id}_fill_pattern_${color[2]})`}
            />
            {decoration !== 'none' && (
                <path
                    key={`${id}_${decoration}_${decorationAt}`}
                    id={`${LineStyleType.JREastSingleColorPattern}_decorationMarker_${id}`}
                    d={paths.decorationMarker}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="0.01"
                    {...decorationMarkerProps}
                />
            )}
        </g>
    );
};

const jrEastSingleColorPatternAttrsComponent = (props: AttrsProps<JREastSingleColorPatternAttributes>) => {
    const fields = makeJREastDecorationFields(
        props,
        LineStyleType.JREastSingleColorPattern,
        defaultJREastSingleColorPatternAttributes.color
    );

    return <RmgFields fields={fields} />;
};

const jrEastSingleColorPattern: LineStyle<JREastSingleColorPatternAttributes> = {
    preComponent: JREastSingleColorPatternPre,
    component: JREastSingleColorPattern,
    defaultAttrs: defaultJREastSingleColorPatternAttributes,
    attrsComponent: jrEastSingleColorPatternAttrsComponent,
    pathGenerator: jrEastSingleColorPatternPathGenerator,
    metadata: {
        displayName: 'panel.details.lines.jrEastSingleColorPattern.displayName',
        supportLinePathType: [
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
        ],
    },
};

export default jrEastSingleColorPattern;
