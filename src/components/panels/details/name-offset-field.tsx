import { StationAttributes } from '../../../constants/stations';
type PreciseNameOffsetsDrivenAttrs = Pick<StationAttributes, 'preciseNameOffsets'>;

export const PRECISE_NAME_OFFSETS_CUSTOM_VALUE = '__custom__';

export const getPreciseNameOffsetsSelectState = <
    T extends PreciseNameOffsetsDrivenAttrs,
    V extends string | number,
>(props: {
    attrs: T;
    value: V;
    options: Record<string, string>;
    customLabel: string;
    disabledOptions?: string[];
}) => {
    const { attrs, value, options, customLabel, disabledOptions = [] } = props;
    const isCustom = attrs.preciseNameOffsets !== undefined;

    return {
        value: isCustom ? PRECISE_NAME_OFFSETS_CUSTOM_VALUE : value,
        options: isCustom ? { ...options, [PRECISE_NAME_OFFSETS_CUSTOM_VALUE]: customLabel } : options,
        disabledOptions: isCustom
            ? Array.from(new Set([...disabledOptions, PRECISE_NAME_OFFSETS_CUSTOM_VALUE]))
            : disabledOptions,
    };
};
