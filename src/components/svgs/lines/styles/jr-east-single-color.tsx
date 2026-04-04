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
import {
    defaultJREastSingleColorDecorationAttributes,
    getBlackBlockMarkerId,
    getJREastDecorationMarkerProps,
    getThinTailMarkerId,
    JREastBlackBlockMarker,
    JREastSingleColorSharedAttributes,
    JREastThinTailMarker,
    makeJREastDecorationFields,
} from './jr-east-single-color-utils';

const jrEastSingleColorPathGenerator = (path: Path) => ({
    border: path,
    main: path,
    decorationMarker: path,
});

const JREastSingleColorPre = (props: LineStyleComponentProps<JREastSingleColorAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    return (
        <g onPointerDown={newLine ? undefined : onPointerDown} pointerEvents={newLine ? 'none' : 'cursor'}>
            <path
                id={`${LineStyleType.JREastSingleColor}_border_${id}`}
                d={path}
                fill="none"
                stroke="black"
                strokeWidth={LINE_WIDTH}
            />
        </g>
    );
};

const JREastSingleColor = (props: LineStyleComponentProps<JREastSingleColorAttributes>) => {
    const { id, path, newLine, styleAttrs, handlePointerDown } = props;
    const {
        color = defaultJREastSingleColorAttributes.color,
        decoration = defaultJREastSingleColorAttributes.decoration,
        decorationAt = defaultJREastSingleColorAttributes.decorationAt,
    } = styleAttrs ?? defaultJREastSingleColorAttributes;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );

    const paths = React.useMemo(() => jrEastSingleColorPathGenerator(path), [path]);
    const thinTailMarkerId = React.useMemo(() => getThinTailMarkerId(id, decorationAt), [id, decorationAt]);
    const blackBlockMarkerId = React.useMemo(() => getBlackBlockMarkerId(id, decorationAt), [id, decorationAt]);
    const thinTailMarkerProps = React.useMemo(
        () => getJREastDecorationMarkerProps(thinTailMarkerId, decorationAt),
        [thinTailMarkerId, decorationAt]
    );
    const blackBlockMarkerProps = React.useMemo(
        () => getJREastDecorationMarkerProps(blackBlockMarkerId, decorationAt),
        [blackBlockMarkerId, decorationAt]
    );
    const decorationMarkerProps = decoration === 'thin-tail' ? thinTailMarkerProps : blackBlockMarkerProps;

    return (
        <g onPointerDown={newLine ? undefined : onPointerDown} pointerEvents={newLine ? 'none' : 'cursor'}>
            <path
                id={`${LineStyleType.JREastSingleColor}_main_${id}`}
                d={paths.main}
                fill="none"
                stroke={color[2]}
                strokeWidth={LINE_WIDTH * (1 - 0.05)}
            />
            <defs>
                {decoration === 'thin-tail' && (
                    <JREastThinTailMarker id={thinTailMarkerId} fill={color[2]} includeBlackBlock />
                )}
                {decoration === 'black-block' && <JREastBlackBlockMarker id={blackBlockMarkerId} />}
            </defs>
            {decoration !== 'none' && (
                <path
                    key={`${id}_${decoration}_${decorationAt}`}
                    id={`${LineStyleType.JREastSingleColor}_decorationMarker_${id}`}
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
