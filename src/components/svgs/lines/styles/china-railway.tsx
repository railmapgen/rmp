import React from 'react';
import { LinePathAttributes, LineStyle, LineStyleComponentProps } from '../../../../constants/lines';

const ChinaRailway = (props: LineStyleComponentProps<ChinaRailwayAttributes>) => {
    const { id, path, newLine, handleClick } = props;

    const onClick = React.useCallback(
        (e: React.MouseEvent<SVGPathElement, MouseEvent>) => handleClick(id, e),
        [id, handleClick]
    );

    return (
        <g id={id}>
            <path d={path} fill="none" stroke="var(--rmg-black)" strokeWidth="5" strokeLinecap="round" />
            <path d={path} fill="none" stroke="var(--rmg-white)" strokeWidth="3" strokeDasharray="10" />
            <path
                d={path}
                fill="none"
                stroke="var(--rmg-black)"
                strokeOpacity="0"
                strokeWidth="5"
                strokeLinecap="round"
                onClick={newLine ? undefined : onClick}
                pointerEvents={newLine ? 'none' : undefined}
            />
        </g>
    );
};

/**
 * ChinaRailway specific props.
 */
export interface ChinaRailwayAttributes extends LinePathAttributes {}

const defaultChinaRailwayAttributes: ChinaRailwayAttributes = {};

const chinaRailway: LineStyle<ChinaRailwayAttributes> = {
    component: ChinaRailway,
    defaultAttrs: defaultChinaRailwayAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: [],
    metadata: { displayName: 'panel.details.line.chinaRailway.displayName' },
};

export default chinaRailway;
