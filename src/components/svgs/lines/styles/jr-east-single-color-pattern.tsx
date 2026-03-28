import { RmgFields } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { AttrsProps, CityCode } from '../../../../constants/constants';
import {
    LINE_WIDTH,
    LinePathType,
    LineStyle,
    LineStyleComponentProps,
    LineStyleType,
} from '../../../../constants/lines';
import {
    defaultJREastSingleColorDecorationAttributes,
    getThinTailMarkerId,
    getThinTailMarkerProps,
    JREastSingleColorSharedAttributes,
    JREastThinTailMarker,
    jrEastSingleColorPatternPathGenerator,
    makeJREastDecorationFields,
} from './jr-east-single-color-utils';

// codex resume 019d0fe4-370b-77d1-ae8f-f201fbd3676d

const PATTERN_LEN = LINE_WIDTH * Math.SQRT1_2;
const PATTERN_WIDTH = 0.25;
const PATTERN_CLIP_PATH_D = ((PATTERN_LEN * Math.SQRT2 - PATTERN_WIDTH) / 2) * Math.SQRT2;
const SIDE_STROKE_WIDTH = 0.1;
const DECORATED_BORDER_STROKE_WIDTH = 0.1;

/**
 * JREastSingleColorPattern specific props.
 */
export interface JREastSingleColorPatternAttributes extends JREastSingleColorSharedAttributes {}

export const defaultJREastSingleColorPatternAttributes: JREastSingleColorPatternAttributes = {
    color: [CityCode.Tokyo, 'jy', '#9ACD32', MonoColour.black],
    ...defaultJREastSingleColorDecorationAttributes,
};

const JREastSingleColorPatternPre = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const decoration = styleAttrs?.decoration ?? defaultJREastSingleColorPatternAttributes.decoration;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () =>
            jrEastSingleColorPatternPathGenerator(path, type, styleAttrs ?? defaultJREastSingleColorPatternAttributes),
        [path, type, styleAttrs]
    );

    return (
        <g onPointerDown={onPointerDown} cursor="pointer">
            {decoration !== 'black-block' ? (
                <>
                    <path
                        id={`${LineStyleType.JREastSingleColorPattern}_pA_${id}`}
                        d={paths.pA}
                        fill="none"
                        stroke="black"
                        strokeWidth={SIDE_STROKE_WIDTH}
                    />
                    <path
                        id={`${LineStyleType.JREastSingleColorPattern}_pB_${id}`}
                        d={paths.pB}
                        fill="none"
                        stroke="black"
                        strokeWidth={SIDE_STROKE_WIDTH}
                    />
                </>
            ) : null}
        </g>
    );
};

const JREastSingleColorPatternPost = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const decoration = styleAttrs?.decoration ?? defaultJREastSingleColorPatternAttributes.decoration;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () =>
            jrEastSingleColorPatternPathGenerator(path, type, styleAttrs ?? defaultJREastSingleColorPatternAttributes),
        [path, type, styleAttrs]
    );

    if (decoration !== 'black-block') return null;

    return (
        <path
            id={`${LineStyleType.JREastSingleColorPattern}_border_${id}`}
            d={paths.border}
            fill="none"
            stroke="black"
            strokeWidth={DECORATED_BORDER_STROKE_WIDTH}
            onPointerDown={onPointerDown}
            cursor="pointer"
        />
    );
};

const JREastSingleColorPattern = (props: LineStyleComponentProps<JREastSingleColorPatternAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const {
        color = defaultJREastSingleColorPatternAttributes.color,
        decoration = defaultJREastSingleColorPatternAttributes.decoration,
        decorationAt = defaultJREastSingleColorPatternAttributes.decorationAt,
    } = styleAttrs ?? defaultJREastSingleColorPatternAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () =>
            jrEastSingleColorPatternPathGenerator(path, type, styleAttrs ?? defaultJREastSingleColorPatternAttributes),
        [path, type, styleAttrs]
    );
    const thinTailMarkerId = React.useMemo(() => getThinTailMarkerId(id, decorationAt), [id, decorationAt]);
    const thinTailMarkerProps = React.useMemo(
        () => getThinTailMarkerProps(thinTailMarkerId, decorationAt),
        [thinTailMarkerId, decorationAt]
    );

    return (
        <g onPointerDown={onPointerDown} cursor="pointer">
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
                {decoration === 'thin-tail' && <JREastThinTailMarker id={thinTailMarkerId} fill={color[2]} />}
            </defs>
            <path
                id={`${LineStyleType.JREastSingleColorPattern}_outline_${id}`}
                d={paths.outline}
                fill={`url(#jr_east_${id}_fill_pattern_${color[2]})`}
            />
            {decoration === 'thin-tail' && (
                <path
                    id={`${LineStyleType.JREastSingleColorPattern}_center_${id}`}
                    d={paths.center}
                    fill="none"
                    stroke="transparent"
                    strokeWidth="0.01"
                    {...thinTailMarkerProps}
                />
            )}
            {decoration === 'black-block' && (
                <path
                    id={`${LineStyleType.JREastSingleColorPattern}_blackBlockFill_${id}`}
                    d={paths.blackBlockFill}
                    fill="black"
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
    postComponent: JREastSingleColorPatternPost,
    defaultAttrs: defaultJREastSingleColorPatternAttributes,
    attrsComponent: jrEastSingleColorPatternAttrsComponent,
    pathGenerator: jrEastSingleColorPatternPathGenerator,
    metadata: {
        displayName: 'panel.details.lines.jrEastSingleColorPattern.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
        ],
    },
};

export default jrEastSingleColorPattern;
