// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactlint from 'eslint-plugin-react';
import prettier from 'eslint-plugin-prettier';

export default [
    ...tseslint.config(eslint.configs.recommended, ...tseslint.configs.recommended),
    {
        plugins: { react: reactlint, prettier: prettier },
        rules: {
            'prettier/prettier': [
                'warn',
                {
                    endOfLine: 'auto',
                },
            ],
            'no-constant-condition': ['error', { checkLoops: false }],
            // This is a temporary hack and should be removed after I fixed the type error in rmg-components.
            '@typescript-eslint/ban-ts-comment': [
                'error',
                { 'ts-ignore': false, 'ts-expect-error': false, 'ts-nocheck': false },
            ],
            // This is intended as each station/node/line/edge needs an attribute interface to be registered and currently there is no plan for removal and upgrade.
            '@typescript-eslint/no-empty-interface': 'off',
            // May be removed after type error in rmg-components.
            '@typescript-eslint/no-explicit-any': 'off',
            // This is really heady when I'm 100% sure it won't be undefined.
            '@typescript-eslint/no-non-null-assertion': 'off',
            // We may add `_` to ignore pattern but that will decrease clarity if we later need it.
            '@typescript-eslint/no-unused-vars': 'off',
            // Allow empty object type for base interfaces.
            '@typescript-eslint/no-empty-object-type': ['error', { allowInterfaces: 'always' }],
        },
        settings: {
            react: {
                version: 'detect',
            },
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                browser: true,
                es6: true,
                node: true,
            },
        },
        ignores: ['**/*.json', 'setupProxy.js'],
    },
];
