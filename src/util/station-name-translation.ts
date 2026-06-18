import pinyin from 'tiny-pinyin';
import { station_name_translation_endpoint } from '../constants/server';

export type PinyinStationNameTranslationMode = 'pinyin-spaced' | 'pinyin-compact' | 'pinyin-uppercase';

const titleCaseWord = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
const literalWordPattern = /^[A-Za-z0-9]$/;

const translateStationNameLineBySpacedPinyin = (line: string): string => {
    let result = '';
    let previousLiteralWord = false;

    for (const token of pinyin.parse(line)) {
        if (token.source.trim().length === 0) {
            if (result.length > 0 && !result.endsWith(' ')) {
                result += ' ';
            }
            previousLiteralWord = false;
            continue;
        }

        const isPinyinWord = token.type === 2;
        const isLiteralWord = !isPinyinWord && literalWordPattern.test(token.source);
        const value = isPinyinWord ? titleCaseWord(token.target) : token.source;

        if (isPinyinWord || isLiteralWord) {
            if (result.length === 0 || result.endsWith(' ')) {
                result += value;
            } else if (isLiteralWord && previousLiteralWord) {
                result += value;
            } else {
                result += ` ${value}`;
            }
        } else {
            result = `${result.trimEnd()}${value}`;
        }
        previousLiteralWord = isLiteralWord;
    }

    return result.trim();
};

const translateStationNameLineByCompactPinyin = (line: string): string => {
    let result = '';
    let shouldCapitalizeNextPinyin = true;

    for (const token of pinyin.parse(line)) {
        if (token.source.trim().length === 0) {
            shouldCapitalizeNextPinyin = true;
            continue;
        }

        const isPinyinWord = token.type === 2;
        if (isPinyinWord) {
            const value = token.target.toLowerCase();
            result += shouldCapitalizeNextPinyin ? titleCaseWord(value) : value;
            shouldCapitalizeNextPinyin = false;
        } else {
            result += token.source;
            shouldCapitalizeNextPinyin = true;
        }
    }

    return result.trim();
};

const translateStationNameLineByPinyin = (line: string, mode: PinyinStationNameTranslationMode): string => {
    switch (mode) {
        case 'pinyin-spaced':
            return translateStationNameLineBySpacedPinyin(line);
        case 'pinyin-compact':
            return translateStationNameLineByCompactPinyin(line);
        case 'pinyin-uppercase':
            return translateStationNameLineByCompactPinyin(line).toUpperCase();
    }
};

export const translateStationNameByPinyin = (
    zhName: string,
    mode: PinyinStationNameTranslationMode = 'pinyin-spaced'
): string => {
    return zhName
        .split('\n')
        .map(line => translateStationNameLineByPinyin(line, mode))
        .join('\n');
};

export const translateStationNameBySemantic = async (zhName: string, token: string): Promise<string> => {
    const rep = await fetch(station_name_translation_endpoint, {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ zhName }),
    });

    if (!rep.ok) {
        throw new Error(rep.statusText);
    }

    const data = (await rep.json()) as { en?: unknown };
    if (typeof data.en !== 'string' || data.en.trim().length === 0) {
        throw new Error('Invalid station name translation response');
    }

    return data.en.trim();
};
