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
import { OpenPath } from '../../../../constants/path';
import {
    defaultJREastSingleColorDecorationAttributes,
    getJREastDecorationMarkerProps,
    getJREastMarkerId,
    JREastMarker,
    JREastSingleColorSharedAttributes,
    makeJREastDecorationFields,
} from './jr-east-single-color-utils';

const jrEastSingleColorPathGenerator = (path: OpenPath) => ({
    border: path,
    main: path,
    decorationMarker: path,
});

const JREastSingleColorPre = (props: LineStyleComponentProps<JREastSingleColorAttributes>) => {
    const { id, path, newLine, handlePointerDown } = props;

    return (
        <g
            onPointerDown={newLine ? undefined : e => handlePointerDown(id, e)}
            pointerEvents={newLine ? 'none' : 'cursor'}
        >
            <path
                id={`${LineStyleType.JREastSingleColor}_border_${id}`}
                d={path.d}
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

    const paths = React.useMemo(() => jrEastSingleColorPathGenerator(path), [path]);
    const markerId = getJREastMarkerId(id, decoration, decorationAt);
    const decorationMarkerProps = decoration === 'none' ? {} : getJREastDecorationMarkerProps(markerId, decorationAt);

    return (
        <g
            onPointerDown={newLine ? undefined : e => handlePointerDown(id, e)}
            pointerEvents={newLine ? 'none' : 'cursor'}
        >
            <path
                id={`${LineStyleType.JREastSingleColor}_main_${id}`}
                d={paths.main.d}
                fill="none"
                stroke={color[2]}
                strokeWidth={LINE_WIDTH * (1 - 0.05)}
            />
            <defs>
                {decoration !== 'none' && (
                    <JREastMarker id={markerId} fill={color[2]} thinTail={decoration === 'thin-tail'} blackBlock />
                )}
            </defs>
            {decoration !== 'none' && (
                <path
                    key={`${id}_${decoration}_${decorationAt}`}
                    id={`${LineStyleType.JREastSingleColor}_decorationMarker_${id}`}
                    d={paths.decorationMarker.d}
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
