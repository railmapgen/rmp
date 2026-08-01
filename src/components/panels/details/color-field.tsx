import React from 'react';
import { NodeType, Theme } from '../../../constants/constants';
import { ExternalLineStyleAttributes, LineStyleType } from '../../../constants/lines';
import { MiscNodeAttributes, MiscNodeType } from '../../../constants/nodes';
import { ExternalStationAttributes, StationType } from '../../../constants/stations';
import { usePaletteTheme } from '../../../util/hooks';
import ThemeButton from '../theme-button';

/**
 * An Attribute that have a color field.
 * Extend this interface in your component's attributes if you want to use ColorField.
 *
 * NOTE: Attribute with `color` key will be populated with user defined theme from
 * the _runtime_ redux store. See `handleBackgroundDown` in `SvgWrapper` for more info.
 */
export interface ColorAttribute {
    color: Theme;
}

const dynamicColorInjectionStationKeys = [
    StationType.ShmetroBasic2020,
    StationType.GzmtrBasic,
    StationType.SuzhouRTBasic,
    StationType.KunmingRTBasic,
    StationType.MRTBasic,
    StationType.FoshanMetroBasic,
    StationType.QingdaoMetroStation,
    StationType.TokyoMetroBasic,
    StationType.ChongqingRTBasic,
    StationType.ChongqingRTBasic2021,
    StationType.ChongqingRTInt2021,
    StationType.ChengduRTBasic,
    StationType.WuhanRTBasic,
    StationType.CsmetroBasic,
    StationType.HzmetroBasic,
] as const;
const dynamicColorInjectionMiscNodeKeys = [
    MiscNodeType.Text,
    MiscNodeType.I18nText,
    MiscNodeType.Fill,
    MiscNodeType.ShmetroNumLineBadge,
    MiscNodeType.ShmetroTextLineBadge,
    MiscNodeType.GzmtrLineBadge,
    MiscNodeType.BjsubwayNumLineBadge,
    MiscNodeType.BjsubwayTextLineBadge,
    MiscNodeType.SuzhouRTNumLineBadge,
    MiscNodeType.BerlinSBahnLineBadge,
    MiscNodeType.BerlinUBahnLineBadge,
    MiscNodeType.ChongqingRTNumLineBadge,
    MiscNodeType.ChongqingRTTextLineBadge,
    MiscNodeType.ChongqingRTNumLineBadge2021,
    MiscNodeType.ChongqingRTTextLineBadge2021,
    MiscNodeType.ShenzhenMetroNumLineBadge,
    MiscNodeType.MRTDestinationNumbers,
    MiscNodeType.MRTLineBadge,
    MiscNodeType.JREastLineBadge,
    MiscNodeType.QingdaoMetroNumLineBadge,
    MiscNodeType.LondonArrow,
    MiscNodeType.ChengduRTLineBadge,
    MiscNodeType.TaiPeiMetroLineBadege,
    MiscNodeType.WuhanRTLineBadge,
] as const;
const dynamicColorInjectionLineStyleKeys = [
    LineStyleType.SingleColor,
    LineStyleType.BjsubwaySingleColor,
    LineStyleType.BjsubwayTram,
    LineStyleType.BjsubwayDotted,
    LineStyleType.ChinaRailway,
    LineStyleType.MTRRaceDays,
    LineStyleType.MTRLightRail,
    LineStyleType.MRTUnderConstruction,
    LineStyleType.JREastSingleColor,
    LineStyleType.JREastSingleColorPattern,
    LineStyleType.LRTSingleColor,
    LineStyleType.LondonSandwich,
    LineStyleType.LondonLutonAirportDART,
    LineStyleType.LondonIFSCloudCableCar,
    LineStyleType.GZMTRLoop,
    LineStyleType.ChongqingRTLoop,
    LineStyleType.ChongqingRTLineBadge,
    LineStyleType.Shinkansen,
] as const;
type DynamicColorInjectionStationKeys = (typeof dynamicColorInjectionStationKeys)[number];
type DynamicColorInjectionMiscNodeKeys = (typeof dynamicColorInjectionMiscNodeKeys)[number];
type DynamicColorInjectionLineStyleKeys = (typeof dynamicColorInjectionLineStyleKeys)[number];

/**
 * Types in this set will have their color field automatically injected with the runtime theme.
 */
export const dynamicColorInjection: Set<StationType | NodeType | LineStyleType> = new Set([
    ...dynamicColorInjectionStationKeys,
    ...dynamicColorInjectionMiscNodeKeys,
    ...dynamicColorInjectionLineStyleKeys,
]);

/**
 * Contains all the attributes that have a color field.
 *
 * If you want to add a new attribute to this list, add the type of your component
 * to `dynamicColorInjection(Station|MiscNode|LineStyle)Keys`.
 */
export type AttributesWithColor = Exclude<
    | ExternalStationAttributes[DynamicColorInjectionStationKeys]
    | MiscNodeAttributes[DynamicColorInjectionMiscNodeKeys]
    | ExternalLineStyleAttributes[DynamicColorInjectionLineStyleKeys],
    undefined
>;

interface ColorFieldContextValue {
    type: NodeType | LineStyleType;
    attrs: Record<string, any>;
    handleAttrsUpdate: (attrs: Record<string, any>) => void;
}

export const ColorFieldContext = React.createContext<ColorFieldContextValue | undefined>(undefined);

/**
 * This component provides an easy way to have a color input in the details panel.
 *
 * Make sure your component has a colorKey field in the attributes.
 * You may extend ColorAttribute interface so you do not need to pass the colorKey parameter.
 */
export const ColorField = (props: { type: NodeType | LineStyleType; colorKey?: string; defaultTheme: Theme }) => {
    const { type, colorKey = 'color', defaultTheme } = props;
    const context = React.useContext(ColorFieldContext);

    const handleChangeColor = (color: Theme) => {
        if (context?.type === type) {
            context.handleAttrsUpdate({ ...context.attrs, [colorKey]: color });
        }
    };

    const safeTheme =
        context?.type === type ? ((context.attrs[colorKey] as Theme | undefined) ?? defaultTheme) : defaultTheme;

    const { theme, requestThemeChange } = usePaletteTheme({
        theme: safeTheme,
        onThemeApplied: handleChangeColor,
    });

    return (
        <>
            <ThemeButton theme={theme} onClick={requestThemeChange} />
        </>
    );
};
