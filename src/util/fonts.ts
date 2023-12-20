import { NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';

const searchSrcRegex = /url\("([\S*]+)"\)/;

const waitForMs = (ms: number) => {
    return new Promise<void>(resolve => {
        setTimeout(resolve, ms);
    });
};

export const isSafari = () => {
    return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
};

export const waitForFontReady = async () => {
    let retryAttempt = 3;

    while (retryAttempt--) {
        // railmapgen/rmg#274 ready font fact set may not contain GenYoMin when first resolved
        const fontFaceSet = await document.fonts.ready;
        const it = fontFaceSet.values();
        while (true) {
            const next = it.next();
            if (next.done) {
                break;
            }

            if (next.value.family === 'GenYoMin TW') {
                return;
            }
        }

        console.log('GenYoMin is NOT ready. Retry attempts remaining: ' + retryAttempt + ' ...');
        await waitForMs(500);
    }

    throw new Error('Failed to load GenYoMin after 3 attempts');
};

const readBlobAsDataURL = (blob: Blob): Promise<string> => {
    return new Promise((resolve: (value: string) => void) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
    });
};

const matchCssRuleByFontFace = (rules: CSSFontFaceRule[], font: FontFace): CSSFontFaceRule | undefined => {
    return rules.find(rule => {
        const cssStyle = rule.style;
        return (
            cssStyle.getPropertyValue('font-family').replace(/^"(.+)"$/, '$1') === font.family &&
            cssStyle.getPropertyValue('unicode-range') === font.unicodeRange
        );
    });
};

export const getBase64FontFace = async (
    svgEl: SVGSVGElement,
    className: string[],
    cssFont: string[],
    cssName: string,
    baseUrl: string
): Promise<string[]> => {
    const uniqueCharacters = Array.from(
        new Set(
            className
                // convert NodeListOf<SVGElement> to SVGElement[]
                .map(c => [...svgEl.querySelectorAll<SVGElement>(c)])
                .flat()
                .map(el => el.innerHTML)
                .join('')
                .replace(/\s/g, '')
        )
    ).join('');

    const fontFaceList = await document.fonts.load(cssFont.join(', '), uniqueCharacters);
    const cssRules = document.querySelector<HTMLLinkElement>(`link#${cssName}`)?.sheet?.cssRules;
    if (!cssRules) return Promise.reject(new Error(`cssRules can not be found in link#${cssName}`));
    const cssFontFaceRules = Array.from(cssRules)
        .flatMap(rule => (rule instanceof CSSImportRule ? Array.from(rule.styleSheet!.cssRules) : rule))
        .filter(rule => rule instanceof CSSFontFaceRule) as CSSFontFaceRule[];
    const distinctCssRules = fontFaceList.reduce<CSSFontFaceRule[]>((acc, cur) => {
        const matchedRule = matchCssRuleByFontFace(cssFontFaceRules, cur);
        if (matchedRule) {
            const existence = acc.find(rule => {
                const ruleStyle = rule.style;
                const matchedStyle = matchedRule.style;
                return (
                    ruleStyle.getPropertyValue('font-family') === matchedStyle.getPropertyValue('font-family') &&
                    ruleStyle.getPropertyValue('unicode-range') === matchedStyle.getPropertyValue('unicode-range')
                );
            });
            return existence ? acc : acc.concat(matchedRule);
        } else {
            return acc;
        }
    }, []);

    return await Promise.all(
        distinctCssRules.map(async cssRule => {
            try {
                const fontResp = await fetch(getAbsoluteUrl(baseUrl, cssRule));
                const fontDataUri = await readBlobAsDataURL(await fontResp.blob());
                return cssRule.cssText.replace(searchSrcRegex, `url('${fontDataUri}')`);
            } catch (err) {
                console.error(err);
                return '';
            }
        })
    );
};

export const getAbsoluteUrl = (baseUrl: string, cssRule: CSSFontFaceRule) => {
    const ruleStyleSrc = cssRule.style.getPropertyValue('src');
    return baseUrl + ruleStyleSrc.match(searchSrcRegex)?.[1];
};

/**
 * Node type to fonts' css related data.
 */
export const FONTS_CSS: {
    [k in NodeType]?: {
        className: string[];
        cssFont: string[];
        cssName: string;
        baseUrl: string;
    };
} = {
    [StationType.MTR]: {
        className: ['.rmp-name__mtr__zh', '.rmp-name__mtr__en'],
        cssFont: ['80px GenYoMin TW', 'Vegur'],
        cssName: 'fonts_mtr',
        baseUrl: '/styles/',
    },
    [StationType.MRTBasic]: {
        className: ['.rmp-name__mrt'],
        cssFont: ['100% IdentityFont'],
        cssName: 'fonts_mrt',
        baseUrl: import.meta.env.BASE_URL + 'styles/',
    },
    [StationType.MRTInt]: {
        className: ['.rmp-name__mrt'],
        cssFont: ['100% IdentityFont'],
        cssName: 'fonts_mrt',
        baseUrl: import.meta.env.BASE_URL + 'styles/',
    },
    [MiscNodeType.BerlinSBahnLineBadge]: {
        className: ['.rmp-name__berlin'],
        cssFont: ['100% Roboto'],
        cssName: 'fonts_berlin',
        baseUrl: import.meta.env.BASE_URL + 'styles/',
    },
    [MiscNodeType.BerlinUBahnLineBadge]: {
        className: ['.rmp-name__berlin'],
        cssFont: ['100% Roboto'],
        cssName: 'fonts_berlin',
        baseUrl: import.meta.env.BASE_URL + 'styles/',
    },
};
