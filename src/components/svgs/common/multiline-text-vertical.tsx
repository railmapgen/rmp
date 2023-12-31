import React from 'react';
import { NameOffsetY } from '../../../constants/stations';

interface MultilineTextVerticalProps extends React.SVGProps<SVGTextElement> {
    text: string[];
    lineWidth: number;
    grow: 'left' | 'right' | 'bidirectional';
    baseOffset?: number;
}

export const MultilineTextVertical = React.forwardRef(
    (props: MultilineTextVerticalProps, ref: React.Ref<SVGGElement>) => {
        const {
            text,
            lineWidth,
            grow,
            // if dominantBaseline is defined, use it, or we calculate the dominantBaseline for you
            dominantBaseline = grow === 'left' ? 'hanging' : grow === 'right' ? 'auto' : 'central',
            baseOffset = 2, // default dy offset
            ...otherSvgTextProps
        } = props;

        // additional offset for bidirectional, shift a global upward for half the whole height
        const offset = grow === 'bidirectional' ? -((text.length - 1) * lineWidth) / 2 : 0;

        return (
            <g ref={ref}>
                {[...text].reverse().map((t, i) => (
                    <text
                        key={`${t}${i}`}
                        dx={(i * lineWidth + baseOffset) * (grow === 'left' ? -1 : 1) + offset}
                        writingMode="vertical-rl"
                        dominantBaseline={dominantBaseline}
                        {...otherSvgTextProps}
                    >
                        {t}
                    </text>
                ))}
            </g>
        );
    }
);

// Display component name in debugging.
// Required by eslint react/display-name.
MultilineTextVertical.displayName = 'MultilineTextVertical';
