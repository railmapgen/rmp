import React from 'react';
import { NameOffsetY } from '../../../constants/stations';

interface MultilineTextProps extends React.SVGProps<SVGTextElement> {
    text: string[];
    lineHeight: number;
    grow: 'up' | 'down';
    baseOffset?: number;
}

export const MultilineText = React.forwardRef((props: MultilineTextProps, ref: React.Ref<SVGGElement>) => {
    const {
        text,
        lineHeight,
        grow,
        // if dominantBaseline is defined, use it, or we calculate the dominantBaseline for you
        dominantBaseline = grow === 'up' ? 'auto' : 'hanging',
        baseOffset = 2, // default dy offset
        ...otherSvgTextProps
    } = props;

    return React.useMemo(
        () => (
            <g ref={ref}>
                {(grow === 'up' ? [...text].reverse() : text).map((t, i) => (
                    <text
                        key={t}
                        dy={(i * lineHeight + baseOffset) * (grow === 'up' ? -1 : 1)}
                        dominantBaseline={dominantBaseline}
                        {...otherSvgTextProps}
                    >
                        {t}
                    </text>
                ))}
            </g>
        ),
        [text.join('+'), lineHeight, grow, dominantBaseline, JSON.stringify(otherSvgTextProps)]
    );
});

// Display component name in debugging.
// Required by eslint react/display-name.
MultilineText.displayName = 'MultilineText';

/**
 * This is the default const of name height in different languages.
 */
export const LINE_HEIGHT = {
    zh: 16,
    en: 10,
};

/**
 * This is the default const of name dy calculation.
 * It is suitable for names that has 2 elements with 16px/10px font size.
 */
export const NAME_DY: {
    [key in NameOffsetY]: {
        namesPos: number; // index of the names we need to calculate dy
        lineHeight: number;
        polarity: -1 | 0 | 1; // in which direction
    };
} = {
    top: {
        namesPos: 1,
        lineHeight: LINE_HEIGHT.en,
        polarity: -1,
    },
    middle: {
        namesPos: 0,
        lineHeight: 0,
        polarity: 0,
    },
    bottom: {
        namesPos: 0,
        lineHeight: LINE_HEIGHT.zh,
        polarity: 1,
    },
};
