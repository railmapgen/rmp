import React from 'react';

export interface TaipeiGondolaSymbolProps {
    color?: string;
    width?: number;
    height?: number;
    /** Stations mask a connecting line; standalone badges leave their windows transparent. */
    windowColor?: string;
}

const REAR_WINDOW_D = 'M21 11C31 8 47 8 55 13C60 18 62 28 63 34C48 33 34 35 20 39L12 42C10 28 12 16 21 11Z';
const FRONT_WINDOW_D =
    'M41 44C51 40 71 40 80 44C88 48 91 65 88 76C79 85 48 84 35 77C29 73 30 57 33 50C35 47 37 45 41 44Z';

/** The two overlapping cabins used by both Maokong stations and its line badge. */
export const TaipeiGondolaSymbol = ({
    color = '#00A7D3',
    width = 10,
    height = 11.1,
    windowColor,
}: TaipeiGondolaSymbolProps) => (
    <g transform={`translate(${-width / 2}, ${-height / 2}) scale(${width / 100}, ${height / 111})`}>
        <path
            fill={color}
            fillRule="evenodd"
            d={`M0 35C0 15 2 7 15 3C26 0 45-1 56 3C67 7 70 20 73 32C89 33 96 43 99 61C103 81 99 97 85 105C72 113 43 113 27 106C17 102 14 90 14 79L13 66C3 63 0 52 0 35Z${REAR_WINDOW_D}${FRONT_WINDOW_D}`}
        />
        {windowColor !== undefined && (
            <>
                <path data-taipei-gondola-window="rear" d={REAR_WINDOW_D} fill={windowColor} />
                <path data-taipei-gondola-window="front" d={FRONT_WINDOW_D} fill={windowColor} />
            </>
        )}
    </g>
);
