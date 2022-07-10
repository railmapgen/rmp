import React from 'react';
import { StnId } from '../../constants/constants';

const Station = (props: {
    id: StnId;
    x: number;
    y: number;
    names: string[];
    handlePointerDown: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerMove: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
    handlePointerUp: (node: StnId, e: React.PointerEvent<SVGElement>) => void;
}) => {
    const { id, x, y, names, handlePointerDown, handlePointerMove, handlePointerUp } = props;

    return (
        <g id={`stn_${id}`} transform={`translate(${x}, ${y})`}>
            <circle
                id={`stn_circle_${id}`}
                r={10}
                stroke="black"
                fill="white"
                onPointerDown={e => handlePointerDown(id, e)}
                onPointerMove={e => handlePointerMove(id, e)}
                onPointerUp={e => handlePointerUp(id, e)}
                style={{ cursor: 'move' }}
            />
            <g transform={`translate(${12}, ${-15})`}>
                <text>{names[0]}</text>
                <text fontSize={10} dy={10}>
                    {names[1]}
                </text>
            </g>
        </g>
    );
};

export default Station;
