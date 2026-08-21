import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { ParamGraph, ProjectSnapshot } from '../redux/param/param-slice';
import { CURRENT_VERSION, parseVersionFromSave, stringifyParam } from './save';

describe('stringifyParam', () => {
    it('serializes the current project snapshot and export-only images without history', () => {
        const present: ProjectSnapshot = {
            graph: new MultiDirectedGraph().export() as ParamGraph,
            svgViewBoxZoom: 75,
            svgViewBoxMin: { x: 10, y: 20 },
        };
        const images = [{ id: 'img-local', base64: 'data:image/png;base64,example' }];

        expect(
            JSON.parse(
                stringifyParam({
                    present,
                    past: [{ scope: 'graph', ...present }],
                    future: [],
                    images,
                })
            )
        ).toEqual({ ...present, version: CURRENT_VERSION, images });
    });
});

describe('parseVersionFromSave', () => {
    it('should parse valid version from save string', () => {
        const saveStr = JSON.stringify({ version: 66, graph: {}, svgViewBoxZoom: 100, svgViewBoxMin: { x: 0, y: 0 } });
        expect(parseVersionFromSave(saveStr)).toBe(66);
    });

    it('should parse newer version from save string', () => {
        const saveStr = JSON.stringify({ version: 100, graph: {}, svgViewBoxZoom: 100, svgViewBoxMin: { x: 0, y: 0 } });
        expect(parseVersionFromSave(saveStr)).toBe(100);
    });

    it('should throw error for invalid JSON', () => {
        const saveStr = 'invalid json';
        expect(() => parseVersionFromSave(saveStr)).toThrow();
    });

    it('should throw error for missing version field', () => {
        const saveStr = JSON.stringify({ graph: {}, svgViewBoxZoom: 100, svgViewBoxMin: { x: 0, y: 0 } });
        expect(() => parseVersionFromSave(saveStr)).toThrow('Cannot parse version from the uploaded file');
    });

    it('should throw error for non-integer version', () => {
        const saveStr = JSON.stringify({
            version: '66',
            graph: {},
            svgViewBoxZoom: 100,
            svgViewBoxMin: { x: 0, y: 0 },
        });
        expect(() => parseVersionFromSave(saveStr)).toThrow('Cannot parse version from the uploaded file');
    });

    it('should throw error for float version', () => {
        const saveStr = JSON.stringify({
            version: 66.5,
            graph: {},
            svgViewBoxZoom: 100,
            svgViewBoxMin: { x: 0, y: 0 },
        });
        expect(() => parseVersionFromSave(saveStr)).toThrow('Cannot parse version from the uploaded file');
    });

    it('should correctly identify version newer than CURRENT_VERSION', () => {
        const saveStr = JSON.stringify({
            version: CURRENT_VERSION + 10,
            graph: {},
            svgViewBoxZoom: 100,
            svgViewBoxMin: { x: 0, y: 0 },
        });
        const version = parseVersionFromSave(saveStr);
        expect(version).toBe(CURRENT_VERSION + 10);
        expect(version).toBeGreaterThan(CURRENT_VERSION);
    });

    it('should correctly identify version older than CURRENT_VERSION', () => {
        const saveStr = JSON.stringify({ version: 1, graph: {}, svgViewBoxZoom: 100, svgViewBoxMin: { x: 0, y: 0 } });
        const version = parseVersionFromSave(saveStr);
        expect(version).toBe(1);
        expect(version).toBeLessThan(CURRENT_VERSION);
    });
});
