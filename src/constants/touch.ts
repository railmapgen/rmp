import type { ReactNode } from 'react';

/** Radius in SVG units to search for nearby elements. */
export const TOUCH_RADIUS = 30;

export enum MenuCategory {
    STATION = 'station',
    MISC_NODE = 'misc-node',
    LINE = 'line',
    OPERATION = 'operation',
}

export interface MenuLayerData {
    [MenuCategory.STATION]: MenuItemData[];
    [MenuCategory.MISC_NODE]: MenuItemData[];
    [MenuCategory.LINE]: MenuItemData[];
    [MenuCategory.OPERATION]: MenuItemData[];
}

export interface MenuItemData {
    label: string;
    icon?: ReactNode;
    action: () => void;
    /** The graph element ID, or an operation ID for items without a graph element. */
    elementId: string;
}

export const emptyMenuLayerData: MenuLayerData = {
    [MenuCategory.STATION]: [],
    [MenuCategory.MISC_NODE]: [],
    [MenuCategory.LINE]: [],
    [MenuCategory.OPERATION]: [],
};

export interface RadialTouchMenuState {
    visible: boolean;
    position: { x: number; y: number };
    data: MenuLayerData;
}

export const defaultRadialTouchMenuState: RadialTouchMenuState = {
    visible: false,
    position: { x: 0, y: 0 },
    data: emptyMenuLayerData,
};
