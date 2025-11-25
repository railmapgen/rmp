import React from 'react';
import { NodeType, Theme } from '../../../constants/constants';
import { ExternalLineStyleAttributes, LineStyleType } from '../../../constants/lines';
import { MiscNodeAttributes, MiscNodeType } from '../../../constants/nodes';
import { ExternalStationAttributes, StationType } from '../../../constants/stations';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';
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

type GetNodeOrEdgeAttribute = (id: string, type: NodeType | LineStyleType) => Record<string, any>;

/**
 * This component provides an easy way to have a color input in the details panel.
 * It will read the first id in `selected` and change the `colorKey` field in the related attrs.
 *
 * Make sure your component has a colorKey field in the attributes.
 * You may extend ColorAttribute interface so you do not need to pass the colorKey parameter.
 */
export const ColorField = (props: { type: NodeType | LineStyleType; colorKey?: string; defaultTheme: Theme }) => {
    const { type, colorKey = 'color', defaultTheme } = props;
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;

    const hardRefresh = React.useCallback(() => {
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph]);
    const graph = React.useRef(window.graph);

    const [hasNodeOrEdge, getNodeOrEdgeAttribute, mergeNodeOrEdgeAttributes] = ([] as NodeType[])
        .concat(Object.values(StationType))
        .concat(Object.values(MiscNodeType))
        .find(nodeType => type === nodeType)
        ? [
              graph.current.hasNode,
              graph.current.getNodeAttribute as GetNodeOrEdgeAttribute,
              graph.current.mergeNodeAttributes,
          ]
        : [
              graph.current.hasEdge,
              graph.current.getEdgeAttribute as GetNodeOrEdgeAttribute,
              graph.current.mergeEdgeAttributes,
          ];

    const handleChangeColor = (color: Theme) => {
        // TODO: fix bind this
        if (selectedFirst && hasNodeOrEdge.bind(graph.current)(selectedFirst)) {
            const attrs = getNodeOrEdgeAttribute.bind(graph.current)(selectedFirst, type);
            attrs[colorKey] = color;
            mergeNodeOrEdgeAttributes.bind(graph.current)(selectedFirst, { [type]: attrs });
            hardRefresh();
        }
    };

    const isCurrentSelectedValid =
        selectedFirst &&
        hasNodeOrEdge.bind(graph.current)(selectedFirst) &&
        (selectedFirst.startsWith('stn') || selectedFirst.startsWith('misc_node')
            ? graph.current.getNodeAttribute(selectedFirst, 'type') === type
            : graph.current.getEdgeAttribute(selectedFirst, 'style') === type);
    const safeTheme = isCurrentSelectedValid
        ? ((getNodeOrEdgeAttribute.bind(graph.current)(selectedFirst, type) ?? {
              [colorKey]: defaultTheme,
          })[colorKey] as Theme)
        : defaultTheme;

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
