/// <reference types="vitest" />

import legacy from '@vitejs/plugin-legacy';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config
export default defineConfig({
    base: '/rmp/',
    plugins: [
        react(),
        svgr(),
        checker({ typescript: true, eslint: { lintCommand: 'eslint ./src' } }),
        legacy({
            targets: ['defaults', '>0.2%', 'not dead'],
            modernPolyfills: true,
        }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: ['react', 'react-dom', 'react-router-dom', '@reduxjs/toolkit'],
                    chakra: ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion', 'react-icons'],
                    'ag-grid': ['ag-grid-community', 'ag-grid-react'],
                },
            },
        },
    },
    server: {
        proxy: {
            '^(/styles/|/fonts/|/rmg/|/rmg-palette/|/rmp-gallery/)': {
                target: 'https://railmapgen.github.io',
                changeOrigin: true,
                secure: false,
            },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        server: {
            deps: {
                fallbackCJS: true,
            },
        },
        watch: false,
    },
});
