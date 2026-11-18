import React from 'react';
import { StationAttributes, StationType } from '../../../constants/stations';

/** Lets reused station fields submit attributes to an owner other than the drawing graph. */
export interface StationAttrsContextValue {
    type: StationType;
    attrs: StationAttributes;
    onChange: (attrs: StationAttributes) => void;
    onUndo: () => void;
}

export const StationAttrsContext = React.createContext<StationAttrsContextValue | undefined>(undefined);

/** Apply only the fields edited by a component, preserving changes submitted while it was debouncing. */
export const mergeStationAttributeChanges = (
    current: StationAttributes,
    original: StationAttributes,
    next: StationAttributes
): StationAttributes => {
    const merge = (present: unknown, before: unknown, after: unknown): unknown => {
        if (JSON.stringify(before) === JSON.stringify(after)) return present;
        if (Array.isArray(before) && Array.isArray(after)) {
            if (!Array.isArray(present) || before.length !== after.length || present.length !== before.length) {
                return after;
            }
            return after.map((value, index) => merge(present[index], before[index], value));
        }
        if (
            before &&
            after &&
            present &&
            typeof before === 'object' &&
            typeof after === 'object' &&
            typeof present === 'object' &&
            !Array.isArray(before) &&
            !Array.isArray(after) &&
            !Array.isArray(present)
        ) {
            const source = before as Record<string, unknown>;
            const target = after as Record<string, unknown>;
            const result = { ...(present as Record<string, unknown>) };
            for (const key of new Set([...Object.keys(source), ...Object.keys(target)])) {
                if (
                    Object.hasOwn(source, key) &&
                    Object.hasOwn(target, key) &&
                    JSON.stringify(source[key]) === JSON.stringify(target[key])
                ) {
                    continue;
                }
                if (!Object.hasOwn(target, key)) delete result[key];
                else if (!Object.hasOwn(source, key)) result[key] = target[key];
                else result[key] = merge(result[key], source[key], target[key]);
            }
            return result;
        }
        return after;
    };
    return structuredClone(merge(current, original, next)) as StationAttributes;
};
