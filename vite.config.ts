/// <reference types="vitest" />

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config
export default defineConfig({
    base: '/rmp/',
    plugins: [react(), svgr(), checker({ typescript: true, eslint: { lintCommand: 'eslint ./src' } })],
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
            '/rmg/': {
                target: 'https://railmapgen.github.io/rmg',
                changeOrigin: true,
                secure: false,
            },
            '/rmp-gallery/': {
                target: 'https://railmapgen.github.io/rmp-gallery',
                changeOrigin: true,
                secure: false,
            },
            // '/info.json': {

            // },
        },
    },
    test: {
        globals: true,
        environment: 'jsdom',
        setupFiles: './src/setupTests.ts',
        deps: {
            fallbackCJS: true,
        },
        watch: false,
    },
});
