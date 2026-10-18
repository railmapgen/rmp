import type { TFunction } from 'i18next';

export type TaipeiOpacityMode = 'preset' | 'opaque';
/** Accept earlier numeric saves, but expose only the two supported appearance modes. */
export type TaipeiOpacitySetting = TaipeiOpacityMode | number;

export const getTaipeiOpacityMode = (value?: TaipeiOpacitySetting): TaipeiOpacityMode =>
    value === 'opaque' || value === 1 ? 'opaque' : 'preset';

export const resolveTaipeiOpacity = (value: TaipeiOpacitySetting | undefined, preset: number): number =>
    getTaipeiOpacityMode(value) === 'opaque' ? 1 : preset;

export const getTaipeiOpacityOptions = (t: TFunction): Record<TaipeiOpacityMode, string> => ({
    preset: t('panel.details.taipeiOpacity.preset'),
    opaque: t('panel.details.taipeiOpacity.opaque'),
});
