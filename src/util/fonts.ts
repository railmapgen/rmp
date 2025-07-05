import rmgRuntime from '@railmapgen/rmg-runtime';
import { NodeType } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';

export const isSafari = () => {
    return navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome');
};

export enum TextLanguage {
    zh = 'zh',
    en = 'en',
    mtr_zh = 'mtr_zh',
    mtr_en = 'mtr_en',
    berlin = 'berlin',
    mrt = 'mrt',
    jreast_ja = 'jreast_ja',
    jreast_en = 'jreast_en',
    tokyo_ja = 'tokyo_ja',
    tokyo_en = 'tokyo_en',
    tube = 'tube',
    taipei = 'taipei',
}

export const Node2Font: {
    [k in NodeType]?: TextLanguage[];
} = {
    [StationType.MTR]: [TextLanguage.mtr_zh, TextLanguage.mtr_en],
    [StationType.MRTBasic]: [TextLanguage.mrt],
    [StationType.MRTInt]: [TextLanguage.mrt],
    [StationType.JREastBasic]: [TextLanguage.jreast_ja, TextLanguage.jreast_en],
    [StationType.JREastImportant]: [TextLanguage.jreast_ja, TextLanguage.jreast_en],
    [StationType.TokyoMetroBasic]: [TextLanguage.tokyo_ja, TextLanguage.tokyo_en],
    [StationType.TokyoMetroInt]: [TextLanguage.tokyo_ja, TextLanguage.tokyo_en],
    [StationType.LondonTubeBasic]: [TextLanguage.tube],
    [StationType.LondonTubeInt]: [TextLanguage.tube],
    [MiscNodeType.BerlinSBahnLineBadge]: [TextLanguage.berlin],
    [MiscNodeType.BerlinUBahnLineBadge]: [TextLanguage.berlin],
    [MiscNodeType.JREastLineBadge]: [TextLanguage.jreast_ja],
    [MiscNodeType.MRTDestinationNumbers]: [TextLanguage.mrt],
    [MiscNodeType.MRTLineBadge]: [TextLanguage.mrt],
    [MiscNodeType.TaiPeiMetroLineBadege]: [TextLanguage.taipei],
};

/**
 * Selected font styles that are a subset of CSS properties.
 */
type FontStyle = Pick<
    React.CSSProperties,
    | 'fontFamily'
    | 'fontSize'
    | 'fontStyle'
    | 'fontWeight'
    | 'fontVariant'
    | 'letterSpacing'
    | 'wordSpacing'
    | 'fontStretch'
    | 'fontSynthesis'
>;
/**
 * Font props that are used to set the font style of text elements in SVG.
 *
 * Note: `fontSynthesis` is not a valid SVG presentation attribute, so it is wrapped in a `style` object.
 */
type FontProps = Exclude<FontStyle, 'fontSynthesis'> & { style?: Pick<React.CSSProperties, 'fontSynthesis'> };

/**
 * Matches the TextLanguage to a specific font style.
 * Text elements may use this to set the font style based on the language.
 */
export const getLangStyle = (lang: TextLanguage) => {
    const props = structuredClone(LANG_STYLE[lang]) as FontProps;
    for (const key in props) {
        if (key === 'fontSynthesis') {
            // fontSynthesis is not a valid SVG presentation attribute, so we need to wrap it in a style tag.
            props.style = { fontSynthesis: props[key] };
            delete props[key];
        }
    }
    return props;
};
const LANG_STYLE: Record<TextLanguage, FontStyle> = {
    zh: {
        fontFamily: "SimHei, 'STHeiti T0C', 'PingFang SC', sans-serif",
        fontSynthesis: 'none',
    },
    en: {
        fontFamily: 'Arial, sans-serif',
    },
    berlin: {
        fontFamily: 'Roboto, Arial, Helvetica, sans-serif',
    },
    /*
     * Special thanks to these blogs for recommending M+ as an alternative to 新ゴ.
     * https://google-sensei.com/it/font-shinmgo/
     * https://mocotan-e.hatenablog.com/entry/2023/01/10/003337
     * Although there are some discussion on the difference, it is still the closest and free.
     * http://fumomit.blogstation.jp/archives/4112965.html
     *
     * https://github.com/coz-m/MPLUS_FONTS
     * This is a free font with SIL OPEN FONT LICENSE.
     */
    jreast_ja: {
        fontFamily: "a-otf-ud-shin-go-pr6n, 'M PLUS 2', sans-serif",
        fontSynthesis: 'none',
    },
    jreast_en: {
        fontFamily: 'helvetica, Arial, sans-serif',
    },
    /*
     * IdentityFont comes from https://github.com/jglim/IdentityFont
     * Special thanks to @jglim :)
     * For licensing, see discussion at https://github.com/jglim/IdentityFont/pull/2
     * We believe an open Internet but if the project changes its license or there
     * is a direct request from LTA, we need to pull this down from out site.
     */
    mrt: {
        fontFamily: 'LTAIdentity, sans-serif',
    },
    mtr_zh: {
        fontFamily: 'GenYoMinTW-SB, HiraMinProN-W6, Vegur-Bold, Helvetica, serif',
        fontSynthesis: 'none',
    },
    mtr_en: {
        fontFamily: 'MyriadPro-Semibold, Vegur-Bold, Helvetica, sans-serif',
    },
    /*
     * Taipei Sans TC Beta
     * from 翰字鑄造 JT Foundry
     * https://sites.google.com/view/jtfoundry/zh-tw/downloads
     */
    taipei: {
        fontFamily: "'Taipei Sans TC Beta', Arial, sans-serif",
        fontSynthesis: 'none',
    },
    tokyo_ja: {
        // same as jreast_ja
        fontFamily: "a-otf-ud-shin-go-pr6n, 'M PLUS 2', sans-serif",
        fontSynthesis: 'none',
    },
    tokyo_en: {
        fontFamily: 'MontaguSlab, Arial, sans-serif',
    },
    /*
     * Railway comes from https://www.fontspace.com/railway-font-f20426
     * Special thanks to @Greg Fleming for bringing this amazing font to the public :)
     * This font is licensed under SIL Open Font License (OFL). https://openfontlicense.org/
     */
    tube: {
        fontFamily: 'Johnston, Railway, sans-serif',
    },
};

/**
 * Below are the additional font data needs to be loaded separately.
 */

type FontFaceConfig = {
    source: string;
    descriptors?: FontFaceDescriptors;
};

const LTAIdentity: FontFaceConfig = {
    source: 'url("./fonts/LTAIdentity-Medium.ttf")',
    descriptors: { display: 'swap' },
};
const MPLUS2: FontFaceConfig = { source: 'url("./fonts/Mplus2-Medium.otf")', descriptors: { display: 'swap' } };
const Roboto: FontFaceConfig = { source: 'url("./fonts/Roboto-Bold.ttf")', descriptors: { display: 'swap' } };
const MontaguSlab: FontFaceConfig = { source: 'url("./fonts/MontaguSlab.ttf")', descriptors: { display: 'swap' } };
const Railway: FontFaceConfig = { source: 'url("./fonts/Railway-PlyE.otf")', descriptors: { display: 'swap' } };
const TaipeiSansTC: FontFaceConfig = {
    source: 'url("./fonts/TaipeiSansTCBeta-Regular.ttf")',
    descriptors: { display: 'swap' },
};

const FONTS: Partial<Record<TextLanguage, { config: FontFaceConfig | undefined; name: string }>> = {
    mtr_zh: { config: undefined, name: 'GenYoMinTW-SB' },
    mtr_en: { config: undefined, name: 'Vegur-Bold' },
    mrt: { config: LTAIdentity, name: 'LTAIdentity' },
    jreast_ja: { config: MPLUS2, name: 'M PLUS 2' },
    tokyo_ja: { config: MPLUS2, name: 'M PLUS 2' },
    tokyo_en: { config: MontaguSlab, name: 'MontaguSlab' },
    berlin: { config: Roboto, name: 'Roboto' },
    tube: { config: Railway, name: 'Railway' },
    taipei: { config: TaipeiSansTC, name: 'Taipei Sans TC Beta' },
};

const loadedLangs: TextLanguage[] = [];
export const loadFont = async (lang: TextLanguage) => {
    const fontObj = FONTS[lang];
    if (!fontObj || loadedLangs.includes(lang)) return;

    const { config, name } = fontObj;

    loadedLangs.push(lang);
    await rmgRuntime.loadFont(name, config && { configs: [config] });
};

export const makeBase64EncodedFontsStyle = async (languages: TextLanguage[]) => {
    const s = document.createElement('style');

    const cssPromises = await Promise.allSettled(
        languages.filter(lang => lang in FONTS).map(lang => rmgRuntime.getFontCSS(FONTS[lang]!.name))
    );
    const cssTexts = cssPromises
        .filter((promise): promise is PromiseFulfilledResult<string> => promise.status === 'fulfilled')
        .map(promise => promise.value);
    s.textContent += cssTexts.join('\n');

    return s;
};
