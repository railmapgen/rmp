import { RmgFields } from '@railmapgen/rmg-components';
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
    DecorationAt,
    defaultJREastSingleColorPatternAttributes,
    getThinTailMarkerId,
    getThinTailMarkerProps,
    JREastSingleColorPatternAttributes,
    jrEastSingleColorPatternPathGenerator,
    makeJREastDecorationFields,
    THIN_TAIL_LENGTH,
    THIN_TAIL_MARKER_BOX,
    THIN_TAIL_WIDTH,
} from './jr-east-single-color-pattern';

const TAIL_BORDER_EXTRA = 0.2;

const jrEastSingleColorPathGenerator = (path: `M${string}`, type: LinePathType, attrs: JREastSingleColorAttributes) => {
    const shared = jrEastSingleColorPatternPathGenerator(path, type, attrs);
    return {
        borderBody: path,
        colorBody: path,
        tailBorder: shared.center,
        tailColor: shared.center,
        blackBlockFill: shared.blackBlockFill,
    };
};

const JREastSingleColorPre = (props: LineStyleComponentProps<JREastSingleColorAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const decoration = styleAttrs?.decoration ?? defaultJREastSingleColorAttributes.decoration;
    const decorationAt = styleAttrs?.decorationAt ?? defaultJREastSingleColorAttributes.decorationAt;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () => jrEastSingleColorPathGenerator(path, type, styleAttrs ?? defaultJREastSingleColorAttributes),
        [path, type, styleAttrs]
    );
    const thinTailMarkerId = React.useMemo(() => `${getThinTailMarkerId(id, decorationAt)}_border`, [id, decorationAt]);
    const thinTailMarkerProps = React.useMemo(
        () => getThinTailMarkerProps(thinTailMarkerId, decorationAt as DecorationAt),
        [thinTailMarkerId, decorationAt]
    );

    return (
        <g onPointerDown={onPointerDown} cursor="pointer">
            <path
                id={`${LineStyleType.JREastSingleColor}_borderBody_${id}`}
                d={paths.borderBody}
                fill="none"
                stroke="black"
                strokeWidth={LINE_WIDTH + 0.1}
            />
            {decoration === 'thin-tail' && (
                <>
                    <defs>
                        <marker
                            id={thinTailMarkerId}
                            viewBox={`${-THIN_TAIL_MARKER_BOX} ${-THIN_TAIL_MARKER_BOX} ${
                                THIN_TAIL_MARKER_BOX * 2
                            } ${THIN_TAIL_MARKER_BOX * 2}`}
                            markerWidth={THIN_TAIL_MARKER_BOX * 2}
                            markerHeight={THIN_TAIL_MARKER_BOX * 2}
                            refX={0}
                            refY={0}
                            orient="auto-start-reverse"
                            markerUnits="userSpaceOnUse"
                        >
                            <rect
                                x={0}
                                y={-(THIN_TAIL_WIDTH + TAIL_BORDER_EXTRA * 2) / 2}
                                width={THIN_TAIL_LENGTH}
                                height={THIN_TAIL_WIDTH + TAIL_BORDER_EXTRA * 2}
                                fill="black"
                            />
                        </marker>
                    </defs>
                    <path
                        id={`${LineStyleType.JREastSingleColor}_tailBorder_${id}`}
                        d={paths.tailBorder}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="0.01"
                        {...thinTailMarkerProps}
                    />
                </>
            )}
        </g>
    );
};

const JREastSingleColor = (props: LineStyleComponentProps<JREastSingleColorAttributes>) => {
    const { id, type, path, styleAttrs, handlePointerDown } = props;
    const {
        color = defaultJREastSingleColorAttributes.color,
        decoration = defaultJREastSingleColorAttributes.decoration,
        decorationAt = defaultJREastSingleColorAttributes.decorationAt,
    } = styleAttrs ?? defaultJREastSingleColorAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(
        () => jrEastSingleColorPathGenerator(path, type, styleAttrs ?? defaultJREastSingleColorAttributes),
        [path, type, styleAttrs]
    );
    const thinTailMarkerId = React.useMemo(() => getThinTailMarkerId(id, decorationAt), [id, decorationAt]);
    const thinTailMarkerProps = React.useMemo(
        () => getThinTailMarkerProps(thinTailMarkerId, decorationAt as DecorationAt),
        [thinTailMarkerId, decorationAt]
    );

    return (
        <g onPointerDown={onPointerDown} cursor="pointer">
            {decoration === 'thin-tail' ? (
                <>
                    <defs>
                        <marker
                            id={thinTailMarkerId}
                            viewBox={`${-THIN_TAIL_MARKER_BOX} ${-THIN_TAIL_MARKER_BOX} ${
                                THIN_TAIL_MARKER_BOX * 2
                            } ${THIN_TAIL_MARKER_BOX * 2}`}
                            markerWidth={THIN_TAIL_MARKER_BOX * 2}
                            markerHeight={THIN_TAIL_MARKER_BOX * 2}
                            refX={0}
                            refY={0}
                            orient="auto-start-reverse"
                            markerUnits="userSpaceOnUse"
                        >
                            <rect
                                x={0}
                                y={-THIN_TAIL_WIDTH / 2}
                                width={THIN_TAIL_LENGTH}
                                height={THIN_TAIL_WIDTH}
                                fill={color[2]}
                            />
                        </marker>
                    </defs>
                    <path
                        id={`${LineStyleType.JREastSingleColor}_colorBody_${id}`}
                        d={paths.colorBody}
                        fill="none"
                        stroke={color[2]}
                        strokeWidth={LINE_WIDTH - 0.1}
                    />
                    <path
                        id={`${LineStyleType.JREastSingleColor}_tailColor_${id}`}
                        d={paths.tailColor}
                        fill="none"
                        stroke="transparent"
                        strokeWidth="0.01"
                        {...thinTailMarkerProps}
                    />
                </>
            ) : (
                <path
                    id={`${LineStyleType.JREastSingleColor}_colorBody_${id}`}
                    d={paths.colorBody}
                    fill="none"
                    stroke={color[2]}
                    strokeWidth={LINE_WIDTH - 0.1}
                />
            )}
            {decoration === 'black-block' && (
                <path
                    id={`${LineStyleType.JREastSingleColor}_blackBlockFill_${id}`}
                    d={paths.blackBlockFill}
                    fill="black"
                />
            )}
        </g>
    );
};

/**
 * JREastSingleColor specific props.
 */
export interface JREastSingleColorAttributes extends JREastSingleColorPatternAttributes {}

const defaultJREastSingleColorAttributes: JREastSingleColorAttributes = {
    ...defaultJREastSingleColorPatternAttributes,
    color: [CityCode.Tokyo, 'jy', '#9ACD32', defaultJREastSingleColorPatternAttributes.color[3]],
};

const jrEastSingleColorAttrsComponent = (props: AttrsProps<JREastSingleColorAttributes>) => {
    const fields = makeJREastDecorationFields(
        props,
        LineStyleType.JREastSingleColor,
        defaultJREastSingleColorAttributes.color
    );
    return <RmgFields fields={fields} />;
};

const jrEastSingleColor: LineStyle<JREastSingleColorAttributes> = {
    preComponent: JREastSingleColorPre,
    component: JREastSingleColor,
    defaultAttrs: defaultJREastSingleColorAttributes,
    attrsComponent: jrEastSingleColorAttrsComponent,
    pathGenerator: jrEastSingleColorPathGenerator,
    metadata: {
        displayName: 'panel.details.lines.jrEastSingleColor.displayName',
        supportLinePathType: [
            LinePathType.Simple,
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
        ],
    },
};

export default jrEastSingleColor;
