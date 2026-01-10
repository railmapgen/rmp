// @ts-check

import eslint from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactPlugin from 'eslint-plugin-react';
import prettierPlugin from 'eslint-plugin-prettier';
import eslintConfigPrettier from 'eslint-config-prettier';
import * as importPlugin from 'eslint-plugin-import';
import globals from 'globals';

export default defineConfig([
    {
        ignores: ['**/*.json', 'setupProxy.js'],
    },

    eslint.configs.recommended,

    ...tseslint.configs.recommended.map(config => ({
        ...config,
        files: ['**/*.ts', '**/*.tsx'],
    })),

    importPlugin.flatConfigs.recommended,

    {
        plugins: { prettier: prettierPlugin },
        rules: {
            'prettier/prettier': [
                'error',
                {
                    endOfLine: 'auto',
                },
            ],
        },
    },

    {
        files: ['**/*.ts', '**/*.tsx'],
        plugins: { react: reactPlugin },
        rules: {
            'no-constant-condition': ['error', { checkLoops: false }],

            ...reactPlugin.configs.recommended.rules,
            ...reactPlugin.configs['jsx-runtime'].rules,
            'react/display-name': 'off',

            // This is a temporary hack and should be removed after fixing the type error in rmg-components.
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

            // Imports need to be sorted.
            'import/order': ['warn', { groups: ['builtin', 'external', 'parent', 'index', 'sibling'] }],
            'import/no-unassigned-import': 'warn',
        },
        settings: {
            react: {
                version: 'detect',
            },
            // eslint-plugin-import needs this resolver to know the import base path (./src).
            'import/resolver': {
                typescript: {
                    project: './tsconfig.json',
                },
            },
        },
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
            },
        },
    },

    {
        files: ['**/*.test.ts'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.browser,
                ...globals.jest,
            },
        },
    },

    eslintConfigPrettier,
]);
