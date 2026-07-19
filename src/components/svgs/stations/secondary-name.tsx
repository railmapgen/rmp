import React from 'react';
import { getLangStyle, TextLanguage } from '../../../util/fonts';

interface SecondaryNameTextProps {
    names: [string, string];
}

export const SecondaryNameText = React.forwardRef((props: SecondaryNameTextProps, ref: React.Ref<SVGGElement>) => {
    const { names } = props;
    const [zhName, enName] = names;

    if (zhName !== '' && enName !== '') {
        return (
            <g ref={ref}>
                <text fontSize="10" dy="-2" dominantBaseline="auto" {...getLangStyle(TextLanguage.zh)}>
                    {zhName}
                </text>
                <text fontSize="5.42" dy="2" dominantBaseline="hanging" {...getLangStyle(TextLanguage.en)}>
                    {enName}
                </text>
            </g>
        );
    }

    if (zhName !== '') {
        return (
            <g ref={ref}>
                <text fontSize="13.13" dominantBaseline="middle" {...getLangStyle(TextLanguage.zh)}>
                    {zhName}
                </text>
            </g>
        );
    }

    return (
        <g ref={ref}>
            <text fontSize="11" dy="-0.5" dominantBaseline="middle" {...getLangStyle(TextLanguage.en)}>
                {enName}
            </text>
        </g>
    );
});
