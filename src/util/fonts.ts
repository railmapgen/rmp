import { NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import rmgRuntime from '@railmapgen/rmg-runtime';

export const isSafari = () => {
    return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
};

type FontFaceConfig = {
    source: string;
    descriptors?: FontFaceDescriptors;
};

const IdentityFont: FontFaceConfig = {
    source: 'url("./fonts/LTAIdentity-Medium.woff")',
    descriptors: { display: 'swap' },
};
const MPLUS2: FontFaceConfig = { source: 'url("./fonts/Mplus2-Medium.otf")', descriptors: { display: 'swap' } };
const Roboto: FontFaceConfig = { source: 'url("./fonts/Roboto-Bold.ttf")', descriptors: { display: 'swap' } };

/**
 * Node type to fonts' css related data.
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
        cssFont: { Vegur: undefined, 'GenYoMin TW': undefined },
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
        className: ['.rmp-name__jreast_ja'],
        cssFont: { 'M PLUS 2': MPLUS2 },
        cssName: 'fonts_jreast',
    },
    [StationType.JREastImportant]: {
        className: ['.rmp-name__jreast_ja'],
        cssFont: { 'M PLUS 2': MPLUS2 },
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
        className: ['.rmp-name__jreast_ja'],
        cssFont: { 'M PLUS 2': MPLUS2 },
        cssName: 'fonts_jreast',
    },
};

const loadedCssNames = Object.values(FONTS_CSS)
    .map(({ cssName }) => cssName)
    .filter(cssName => document.getElementById(cssName));

export const loadFontCss = async (type: NodeType) => {
    console.log(loadedCssNames)
    const cssObj = FONTS_CSS[type];
    if (!cssObj) return;

    const { cssFont, cssName } = cssObj;
    if (loadedCssNames.includes(cssName)) return;

    loadedCssNames.push(cssName);
    await Promise.all(Object.entries(cssFont).map(([font, config]) => rmgRuntime.loadFont(font, config)));
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.id = cssName;
    link.href = import.meta.env.BASE_URL + `styles/${cssName}.css`;
    document.head.append(link);
};
