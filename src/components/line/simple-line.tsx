import React from 'react';

const SimpleLine = (props: {
    x1: number;
    x2: number;
    y1: number;
    y2: number;
    color: string;
    startFrom: 'from' | 'to';
}) => {
    const { x1, x2, y1, y2, color, startFrom } = props;

    const x = startFrom === 'from' ? x2 : x1;
    const y = startFrom === 'from' ? y1 : y2;
    return (
        <path
            d={`M ${x1},${y1} L ${x},${y} L ${x2},${y2}`}
            fill="none"
            stroke={color}
            strokeWidth={5}
            strokeLinejoin="round"
        />
    );
};

export default SimpleLine;
