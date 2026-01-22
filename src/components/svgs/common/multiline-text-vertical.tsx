import React from 'react';

interface MultilineTextVerticalProps extends React.SVGProps<SVGTextElement> {
    text: string[];
    lineWidth: number;
    grow: 'left' | 'right' | 'bidirectional';
    baseOffset?: number;
    baseDY?: number;
    textOrientation?: 'mixed' | 'upright';
}

export const MultilineTextVertical = React.forwardRef(
    (props: MultilineTextVerticalProps, ref: React.Ref<SVGGElement>) => {
        const {
            text,
            lineWidth,
            grow,
            // if dominantBaseline is defined, use it, or we calculate the dominantBaseline for you
            dominantBaseline = grow === 'left' ? 'hanging' : grow === 'right' ? 'auto' : 'central',
            baseOffset = 2, // default dx offset
            baseDY = 0, // default dy
            textOrientation = 'mixed',
            ...otherSvgTextProps
        } = props;

        // additional offset for bidirectional, shift a global upward for half the whole height
        const offset = grow === 'bidirectional' ? -((text.length - 1) * lineWidth) / 2 : 0;

        return (
            <g ref={ref}>
                {[...text].reverse().map((t, i, arr) => (
                    <text
                        key={`${t}${i}`}
                        x={(i * lineWidth + baseOffset) * (grow === 'left' ? -1 : 1) + offset}
                        dy={(i - (arr.length - 1) / 2) * baseDY}
                        writingMode="vertical-rl"
                        dominantBaseline={dominantBaseline}
                        {...otherSvgTextProps}
                        style={{ ...otherSvgTextProps.style, textOrientation }}
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
