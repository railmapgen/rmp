/**
 * This file contains the localized order of station types, misc node types, and line styles.
 * The order is based on the language and shows the most relevant types first.
 * By relevance, we mean the types that users are most familiar in their respective language.
 */

import { LanguageCode } from '@railmapgen/rmg-translate';
import { StationType } from '../../../constants/stations';
import { MiscNodeType } from '../../../constants/nodes';
import { LineStyleType } from '../../../constants/lines';

/* ------- Station types ------ */

const defaultStationType = Object.values(StationType);
const enStationType = [
    StationType.LondonTubeBasic,
    StationType.LondonTubeInt,
    StationType.LondonRiverServicesInt,
    StationType.MRTBasic,
    StationType.MRTInt,
    StationType.MTR,
];
const jaStationType = [
    StationType.JREastBasic,
    StationType.JREastImportant,
    StationType.TokyoMetroBasic,
    StationType.TokyoMetroInt,
    StationType.OsakaMetro,
];

export const localizedStations: { [k in LanguageCode]?: StationType[] } = {
    'zh-Hans': defaultStationType,
    'zh-Hant': defaultStationType,
    en: [...enStationType, ...defaultStationType.filter(station => !enStationType.includes(station))],
    ja: [...jaStationType, ...defaultStationType.filter(station => !jaStationType.includes(station))],
    ko: defaultStationType,
};

/* ------- Misc nodes ------ */

const defaultMiscNodeType = Object.values(MiscNodeType).filter(
    type => type !== MiscNodeType.Virtual && type !== MiscNodeType.I18nText
);
const alwaysFrontMiscNodeType = [
    MiscNodeType.Master,
    MiscNodeType.Image,
    MiscNodeType.Fill,
    MiscNodeType.Facilities,
    MiscNodeType.Text,
];
const enMiscNodeType = [
    MiscNodeType.LondonArrow,
    MiscNodeType.BerlinSBahnLineBadge,
    MiscNodeType.BerlinUBahnLineBadge,
    MiscNodeType.MRTDestinationNumbers,
    MiscNodeType.MRTLineBadge,
];
const jaMiscNodeType = [MiscNodeType.JREastLineBadge];

export const localizedMiscNodes: { [k in LanguageCode]?: MiscNodeType[] } = {
    'zh-Hans': [
        ...alwaysFrontMiscNodeType,
        ...defaultMiscNodeType.filter(misc => !alwaysFrontMiscNodeType.includes(misc)),
    ],
    'zh-Hant': [
        ...alwaysFrontMiscNodeType,
        ...defaultMiscNodeType.filter(misc => !alwaysFrontMiscNodeType.includes(misc)),
    ],
    en: [
        ...alwaysFrontMiscNodeType,
        ...enMiscNodeType,
        ...defaultMiscNodeType.filter(misc => ![...enMiscNodeType, ...alwaysFrontMiscNodeType].includes(misc)),
    ],
    ja: [
        ...alwaysFrontMiscNodeType,
        ...jaMiscNodeType,
        ...defaultMiscNodeType.filter(misc => ![...jaMiscNodeType, ...alwaysFrontMiscNodeType].includes(misc)),
    ],
    ko: [...alwaysFrontMiscNodeType, ...defaultMiscNodeType.filter(misc => !alwaysFrontMiscNodeType.includes(misc))],
};

/* ------- Line styles ------ */

const defaultLineStyle = Object.values(LineStyleType);
const alwaysFrontLineStyle = [LineStyleType.SingleColor, LineStyleType.Generic];
const enLineStyle = [
    LineStyleType.LondonTubeTerminal,
    LineStyleType.LondonTubeInternalInt,
    LineStyleType.LondonTube10MinWalk,
    LineStyleType.LondonRail,
    LineStyleType.LondonSandwich,
    LineStyleType.LondonLutonAirportDART,
    LineStyleType.LondonIFSCloudCableCar,
    LineStyleType.MRTUnderConstruction,
    LineStyleType.MRTSentosaExpress,
    LineStyleType.MTRRaceDays,
    LineStyleType.MTRLightRail,
    LineStyleType.MTRUnpaidArea,
    LineStyleType.MTRPaidArea,
];
const jaLineStyle = [LineStyleType.JREastSingleColor, LineStyleType.JREastSingleColorPattern];

export const localizedLineStyles: { [k in LanguageCode]?: LineStyleType[] } = {
    'zh-Hans': [
        ...alwaysFrontLineStyle,
        ...defaultLineStyle.filter(lineStyle => !alwaysFrontLineStyle.includes(lineStyle)),
    ],
    'zh-Hant': [
        ...alwaysFrontLineStyle,
        ...defaultLineStyle.filter(lineStyle => !alwaysFrontLineStyle.includes(lineStyle)),
    ],
    en: [
        ...alwaysFrontLineStyle,
        ...enLineStyle,
        ...defaultLineStyle.filter(lineStyle => ![...enLineStyle, ...alwaysFrontLineStyle].includes(lineStyle)),
    ],
    ja: [
        ...alwaysFrontLineStyle,
        ...jaLineStyle,
        ...defaultLineStyle.filter(lineStyle => ![...jaLineStyle, ...alwaysFrontLineStyle].includes(lineStyle)),
    ],
    ko: [...alwaysFrontLineStyle, ...defaultLineStyle.filter(lineStyle => !alwaysFrontLineStyle.includes(lineStyle))],
};
