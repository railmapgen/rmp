import React from 'react';
import { LineIconType2 } from './line-icon-type2';
import { InterchangeBox } from './interchange-box';
import { ColourHex, MonoColour } from '@railmapgen/rmg-palette-resources';

export const MAX_WIDTH = 42;

interface LineIconProps {
    lineName: string[];
    foregroundColour: MonoColour;
    backgroundColour: ColourHex;
}

export const LineIcon = (props: LineIconProps) => {
    const { lineName, foregroundColour, backgroundColour } = props;

    const [type, commonPart] = getType(lineName);

    const nameZhEl = React.useRef<SVGTextElement | null>(null);
    const nameEnEl = React.useRef<SVGTextElement | null>(null);

    const [nameZhBBox, setNameZhBBox] = React.useState({ width: 0 } as DOMRect);
    const [nameEnBBox, setNameEnBBox] = React.useState({ width: 0 } as DOMRect);

    React.useEffect(() => {
        nameZhEl.current && setNameZhBBox(nameZhEl.current.getBBox());
        nameEnEl.current && setNameEnBBox(nameEnEl.current.getBBox());
    }, [lineName.toString()]);

    const nameZhScale = MAX_WIDTH / Math.max(MAX_WIDTH, nameZhBBox.width);
    const nameEnScale = MAX_WIDTH / Math.max(MAX_WIDTH, nameEnBBox.width);

    return (
        <g textAnchor="middle" fill={foregroundColour}>
            <InterchangeBox fill={backgroundColour} />
            {type === 2 ? (
                <LineIconType2 lineName={lineName} commonPart={commonPart} />
            ) : (
                <>
                    <text
                        ref={nameZhEl}
                        y={getYByType(type, 'zh', nameZhScale)}
                        className="rmp-name__zh"
                        dominantBaseline="middle"
                        fontSize={12}
                        transform={`scale(${nameZhScale})`}
                    >
                        {type === 1 ? (
                            <>
                                <tspan fontSize={16} dy={0.7} dominantBaseline="middle" className="rmp-name__zh">
                                    {commonPart}
                                </tspan>
                                <tspan dy={-0.7} dominantBaseline="middle" className="rmp-name__zh">
                                    {lineName[0].slice(commonPart.length)}
                                </tspan>
                            </>
                        ) : (
                            lineName[0]
                        )}
                    </text>
                    <text
                        ref={nameEnEl}
                        y={getYByType(type, 'en', nameEnScale)}
                        className="rmg-name__en"
                        dominantBaseline="middle"
                        fontSize={8}
                        transform={`scale(${nameEnScale})`}
                    >
                        {lineName[1]}
                    </text>
                </>
            )}
        </g>
    );
};

/**
 * type 1: 2号线
 * type 2: APM线
 * type 3: 佛山2号线
 */
const getType = (name: string[]): [1 | 2 | 3, string] => {
    const matchResultForType1 = name[0].match(/^(\d+)\D+$/);
    if (matchResultForType1) return [1, matchResultForType1[1]];

    const matchResultForType2 = name.map(text => text.match(/^([\w\d]+).+$/));
    if (matchResultForType2[0] && matchResultForType2[1] && matchResultForType2[0][1] === matchResultForType2[1][1]) {
        return [2, matchResultForType2[0][1]];
    }

    return [3, ''];
};

const getYByType = (type: ReturnType<typeof getType>[0], field: 'zh' | 'en', scale: number) => {
    switch (type) {
        case 1:
            return (field === 'zh' ? 7.3 : 19.5) * (1 + 1 - scale);
        case 2:
            return 0;
        case 3:
            if (field === 'zh') {
                return 8 * (2 - scale);
            } else {
                return 19.5 + 19.5 * (19.5 / 8) * (1 - scale) - (scale === 1 ? 0 : 5.5);
            }
    }
};
