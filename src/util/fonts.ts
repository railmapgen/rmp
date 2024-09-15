import { NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import rmgRuntime from '@railmapgen/rmg-runtime';

export const isSafari = () => {
    return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
};

export type FontFaceConfig = {
    source: string;
    descriptors?: FontFaceDescriptors;
};

const IdentityFont: FontFaceConfig = {
    source: 'url("./fonts/LTAIdentity-Medium.woff")',
    descriptors: { display: 'swap' },
};
const MPLUS2: FontFaceConfig = { source: 'url("./fonts/Mplus2-Medium.otf")', descriptors: { display: 'swap' } };
const Roboto: FontFaceConfig = { source: 'url("./fonts/Roboto-Bold.ttf")', descriptors: { display: 'swap' } };
const MontaguSlab: FontFaceConfig = { source: 'url("./fonts/MontaguSlab.ttf")', descriptors: { display: 'swap' } };
const Railway: FontFaceConfig = { source: 'url("./fonts/Railway-PlyE.otf")', descriptors: { display: 'swap' } };

/**
 * Node type to fonts' css related data.
 *
 * NOTE: If the font name contains spaces, double quotes should be added.
 * e.g., cssFont: { 'M PLUS 2': MPLUS2 }, -> cssFont: { '"M PLUS 2"': MPLUS2 },
 * https://bugzilla.mozilla.org/show_bug.cgi?id=1706648
 */
export const FONTS_CSS: {
    [k in NodeType]?: {
        className: string[];
        cssFont: Record<string, FontFaceConfig | undefined>;
        cssName: string;
    };
} = {
    [StationType.MTR]: {
        className: ['.rmp-name__mtr__zh', '.rmp-name__mtr__en'],
        cssFont: { 'MyriadPro-Semibold': undefined, 'Vegur-Bold': undefined, 'GenYoMinTW-SB': undefined },
        cssName: 'fonts_mtr',
    },
    [StationType.MRTBasic]: {
        className: ['.rmp-name__mrt'],
        cssFont: { IdentityFont },
        cssName: 'fonts_mrt',
    },
    [StationType.MRTInt]: {
        className: ['.rmp-name__mrt'],
        cssFont: { IdentityFont },
        cssName: 'fonts_mrt',
    },
    [StationType.JREastBasic]: {
        className: ['.rmp-name__jreast_ja', '.rmp-name__jreast_en'],
        cssFont: { '"M PLUS 2"': MPLUS2 },
        cssName: 'fonts_jreast',
    },
    [StationType.JREastImportant]: {
        className: ['.rmp-name__jreast_ja', '.rmp-name__jreast_en'],
        cssFont: { '"M PLUS 2"': MPLUS2 },
        cssName: 'fonts_jreast',
    },
    [MiscNodeType.BerlinSBahnLineBadge]: {
        className: ['.rmp-name__berlin'],
        cssFont: { Roboto },
        cssName: 'fonts_berlin',
    },
    [MiscNodeType.BerlinUBahnLineBadge]: {
        className: ['.rmp-name__berlin'],
        cssFont: { Roboto },
        cssName: 'fonts_berlin',
    },
    [MiscNodeType.JREastLineBadge]: {
        className: ['.rmp-name__jreast_ja', '.rmp-name__jreast_en'],
        cssFont: { '"M PLUS 2"': MPLUS2 },
        cssName: 'fonts_jreast',
    },
    [MiscNodeType.MRTDestinationNumbers]: {
        className: ['.rmp-name__mrt'],
        cssFont: { IdentityFont },
        cssName: 'fonts_mrt',
    },
    [MiscNodeType.MRTLineBadge]: {
        className: ['.rmp-name__mrt'],
        cssFont: { IdentityFont },
        cssName: 'fonts_mrt',
    },
    [StationType.TokyoMetroBasic]: {
        className: ['.rmp-name__tokyo_en', '.rmp-name__jreast_ja'],
        cssFont: { MontaguSlab, 'M PLUS 2': MPLUS2 },
        cssName: 'fonts_tokyo',
    },
    [StationType.TokyoMetroInt]: {
        className: ['.rmp-name__tokyo_en', '.rmp-name__jreast_ja'],
        cssFont: { MontaguSlab, 'M PLUS 2': MPLUS2 },
        cssName: 'fonts_tokyo',
    },
    [StationType.LondonTubeBasic]: {
        className: ['.rmp-name__tube'],
        cssFont: { Railway },
        cssName: 'fonts_tube',
    },
    [StationType.LondonTubeInt]: {
        className: ['.rmp-name__tube'],
        cssFont: { Railway },
        cssName: 'fonts_tube',
    },
};

const loadedCssNames: string[] = [];
export const loadFontCss = async (type: NodeType) => {
    const cssObj = FONTS_CSS[type];
    if (!cssObj) return;

    const { cssFont, cssName } = cssObj;
    if (loadedCssNames.includes(cssName)) return;

    loadedCssNames.push(cssName);
    await Promise.all(
        Object.entries(cssFont).map(([font, config]) => rmgRuntime.loadFont(font, config && { configs: [config] }))
    );
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = cssName;
    link.href = import.meta.env.BASE_URL + `styles/${cssName}.css`;
    document.head.append(link);
};

export const makeBase64EncodedFontsStyle = async (
    cssFont: Record<string, FontFaceConfig | undefined>,
    cssName: string
) => {
    const s = document.createElement('style');

    for (let i = document.styleSheets.length - 1; i >= 0; i = i - 1) {
        if (document.styleSheets[i].href?.endsWith(`styles/${cssName}.css`)) {
            s.textContent = [...document.styleSheets[i].cssRules]
                .map(_ => _.cssText)
                .filter(_ => !_.startsWith('@font-face')) // this is added with base64 data below
                .join('\n');
            break;
        }
    }
    s.textContent += '\n';

    const cssPromises = await Promise.allSettled(Object.keys(cssFont).map(rmgRuntime.getFontCSS));
    const cssTexts = cssPromises
        .filter((promise): promise is PromiseFulfilledResult<string> => promise.status === 'fulfilled')
        .map(promise => promise.value);
    s.textContent += cssTexts.join('\n');

    return s;
};
