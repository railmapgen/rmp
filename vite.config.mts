/// <reference types="vitest" />

import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import { defineConfig } from 'vite';
import checker from 'vite-plugin-checker';
import svgr from 'vite-plugin-svgr';

// https://vitejs.dev/config
export default defineConfig({
    base: '/rmp/',
    plugins: [
        react(),
        svgr(),
        checker({ typescript: true, eslint: { lintCommand: 'eslint ./src', useFlatConfig: true } }),
        visualizer({ filename: 'dist/bundle-report.html', gzipSize: true }),
    ],
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    react: [
                        'react',
                        'react-dom',
                        '@reduxjs/toolkit',
                        'react-redux',
                        'react-i18next',
                    ],
                    chakra: ['@chakra-ui/react', '@emotion/react', '@emotion/styled', 'framer-motion', 'react-icons'],
                },
            },
        },
    },
    server: {
        proxy: {
            '^(/styles/|/fonts/|/rmg/|/rmg-palette/|/rmp-gallery/)': {
                target: 'https://railmapgen.org',
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
                fallbackCJS: false,
            },
        },
        watch: false,
    },
});
