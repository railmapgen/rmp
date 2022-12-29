import React from 'react';

interface MultilineTextProps extends React.SVGProps<SVGTextElement> {
    text: string[];
    lineHeight: number;
    grow: 'up' | 'bottom';
}

export const MultilineText = React.forwardRef((props: MultilineTextProps, ref: React.Ref<SVGGElement>) => {
    const { text, lineHeight, grow, ...otherSvgTextProps } = props;

    // if dominantBaseline is defined, use it, or we calculate the dominantBaseline for you
    const dominantBaseline =
        'dominantBaseline' in otherSvgTextProps
            ? otherSvgTextProps.dominantBaseline
            : grow === 'up'
            ? 'auto'
            : 'hanging';

    return React.useMemo(
        () => (
            <g ref={ref} dominantBaseline={dominantBaseline}>
                {(grow === 'up' ? [...text].reverse() : text).map((t, i) => (
                    <text key={t} dy={(i * lineHeight + 2) * (grow === 'up' ? -1 : 1)} {...otherSvgTextProps}>
                        {t}
                    </text>
                ))}
            </g>
        ),
        [JSON.stringify(text), lineHeight, grow, JSON.stringify(otherSvgTextProps)]
    );
});

// Display component name in debugging.
// Required by eslint react/display-name.
MultilineText.displayName = 'MultilineText';

// This is the default const for name dy calculation.
// It is suitable for names that has 2 elements with 16px/10px font size.
export const NAME_DY: {
    [key in 'up' | 'middle' | 'bottom']: {
        namesPos: number; // index of the names we need to calculate dy
        lineHeight: number;
        polarity: -1 | 0 | 1; // in which direction
    };
} = {
    up: {
        namesPos: 1,
        lineHeight: 10,
        polarity: -1,
    },
    middle: {
        namesPos: 0,
        lineHeight: 0,
        polarity: 0,
    },
    bottom: {
        namesPos: 0,
        lineHeight: 16,
        polarity: 1,
    },
};
