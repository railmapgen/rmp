import rmgRuntime from '@railmapgen/rmg-runtime';
import { defaultTranslation, LanguageCode, Translation } from '@railmapgen/rmg-translate';
import { initReactI18next } from 'react-i18next';
import enTranslation from './translations/en.json';
import jaTranslation from './translations/ja.json';
import koTranslation from './translations/ko.json';
import zhHansTranslation from './translations/zh-Hans.json';
import zhHantTranslation from './translations/zh-Hant.json';

const i18n = new rmgRuntime.I18nBuilder()
    .use(initReactI18next)
    .withAppName('Rail Map Painter')
    .withLng(rmgRuntime.getLanguage())
    .withDefaultResource(defaultTranslation)
    .withResource('en', enTranslation)
    .withResource('zh-Hans', zhHansTranslation)
    .withResource('zh-Hant', zhHantTranslation)
    .withResource('ja', jaTranslation)
    .withResource('ko', koTranslation)
    .build();

export default i18n;

export const translateText = (translation: Translation): string =>
    i18n.languages.map(lang => translation[lang as LanguageCode]).find(name => name !== undefined) ??
    translation.en ??
    '(Translation Error)';
