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
    THIN_TAIL_WIDTH,
} from './jr-east-single-color-utils';

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
        () => getThinTailMarkerProps(thinTailMarkerId, decorationAt),
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
                        <JREastThinTailMarker
                            id={thinTailMarkerId}
                            fill="black"
                            thickness={THIN_TAIL_WIDTH + TAIL_BORDER_EXTRA * 2}
                        />
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
        () => getThinTailMarkerProps(thinTailMarkerId, decorationAt),
        [thinTailMarkerId, decorationAt]
    );

    return (
        <g onPointerDown={onPointerDown} cursor="pointer">
            {decoration === 'thin-tail' ? (
                <>
                    <defs>
                        <JREastThinTailMarker id={thinTailMarkerId} fill={color[2]} />
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
export interface JREastSingleColorAttributes extends JREastSingleColorSharedAttributes {}

const defaultJREastSingleColorAttributes: JREastSingleColorAttributes = {
    color: [CityCode.Tokyo, 'jy', '#9ACD32', MonoColour.black],
    ...defaultJREastSingleColorDecorationAttributes,
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
