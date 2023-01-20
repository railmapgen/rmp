import { MultiDirectedGraph } from 'graphology';
import { NodeAttributes, EdgeAttributes, GraphAttributes } from '../constants/constants';
import { CURRENT_VERSION, UPGRADE_COLLECTION, upgrade } from './save';

describe('Unit tests for param upgrade function', () => {
    it('upgrade will return the default Shanghai template if originalParam is null', async () => {
        const save = await upgrade(null);
        expect(save).toContain('人民广场');
        expect(save).toContain('豫园');
        expect(save).toContain('Hongqiao Airport Terminal 2');
        expect(save).toContain('Longyang Road');
    });

    it('upgrade will return the default Shanghai template if version is missing or invalid', async () => {
        let save = await upgrade('{}');
        expect(save).toContain('人民广场');
        expect(save).toContain('Longyang Road');
        save = await upgrade('{"version":"114514"}');
        expect(save).toContain('豫园');
        expect(save).toContain('Hongqiao Airport Terminal 2');
    });

    it('Can upgrade all the way up from version 0 to CURRENT_VERSION', async () => {
        const save = await upgrade(
            '{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]}'
        );
        const param = JSON.parse(save);
        expect(param.version).toEqual(CURRENT_VERSION);
    });

    it('UPGRADE_COLLECTION contains all the upgrade functions to CURRENT_VERSION', () => {
        const allKeys = Object.keys(UPGRADE_COLLECTION).map(k => Number(k));
        // UPGRADE_COLLECTION contains key from 0...CURRENT_VERSION - 1.
        expect(allKeys.reduce((acc, cur) => acc + cur, 0)).toEqual(((CURRENT_VERSION - 1) * CURRENT_VERSION) / 2);
        // Maximum of allKeys equals CURRENT_VERSION - 1.
        expect(Math.max(...allKeys) + 1).toEqual(CURRENT_VERSION);
    });

    it('1 -> 2', () => {
        // `transfer` field in `StationAttributes` is removed.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_R5PWNzVmVu","attributes":{"visible":true,"zIndex":0,"x":185,"y":150,"type":"shmetro-basic","shmetro-basic":{"names":["车站","Stn"],"transfer":[],"nameOffsetX":"right","nameOffsetY":"up"}}},{"key":"stn_IXSZxRVq9C","attributes":{"visible":true,"zIndex":0,"x":280,"y":150,"type":"shmetro-basic","shmetro-basic":{"names":["车站","Stn"],"transfer":[],"nameOffsetX":"right","nameOffsetY":"up"}}}],"edges":[{"key":"line_l49apNbF1Y","source":"stn_R5PWNzVmVu","target":"stn_IXSZxRVq9C","attributes":{"visible":true,"zIndex":0,"color":["shanghai","sh1","#E4002B","#fff"],"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":7.5},"reconcileId":""}}]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":-58,"y":-2},"version":1}';
        const newParam = UPGRADE_COLLECTION[1](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_R5PWNzVmVu","attributes":{"visible":true,"zIndex":0,"x":185,"y":150,"type":"shmetro-basic","shmetro-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"up"}}},{"key":"stn_IXSZxRVq9C","attributes":{"visible":true,"zIndex":0,"x":280,"y":150,"type":"shmetro-basic","shmetro-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"up"}}}],"edges":[{"key":"line_l49apNbF1Y","source":"stn_R5PWNzVmVu","target":"stn_IXSZxRVq9C","attributes":{"visible":true,"zIndex":0,"color":["shanghai","sh1","#E4002B","#fff"],"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":7.5},"reconcileId":""}}]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":-58,"y":-2},"version":2}';
        expect(newParam).toEqual(expectParam);
    });

    it('2 -> 3', () => {
        // 1st station should not change.
        // 2nd station should have nameOffsetX = 'right' and nameOffsetY = 'top' since they are both 'middle' and can not be selected.
        // 3rd station should have nameOffsetY = 'top' as we changed the underlying possible values of nameOffsetY.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_Wf3oDBkG-c","attributes":{"visible":true,"zIndex":0,"x":310,"y":270,"type":"shmetro-int","shmetro-int":{"names":["车站","Stn"],"nameOffsetX":"left","nameOffsetY":"bottom","rotate":0,"height":10,"width":15}}},{"key":"stn_7KXBP_n-Fz","attributes":{"visible":true,"zIndex":0,"x":420,"y":270,"type":"shmetro-int","shmetro-int":{"names":["车站","Stn"],"nameOffsetX":"middle","nameOffsetY":"middle","rotate":0,"height":10,"width":15}}},{"key":"stn_xqX-QhsoZr","attributes":{"visible":true,"zIndex":0,"x":530,"y":270,"type":"shmetro-int","shmetro-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"up","rotate":0,"height":10,"width":15}}}],"edges":[]},"svgViewBoxZoom":50,"svgViewBoxMin":{"x":190,"y":76.5},"version":2}';
        const newParam = UPGRADE_COLLECTION[2](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_Wf3oDBkG-c","attributes":{"visible":true,"zIndex":0,"x":310,"y":270,"type":"shmetro-int","shmetro-int":{"names":["车站","Stn"],"nameOffsetX":"left","nameOffsetY":"bottom","rotate":0,"height":10,"width":15}}},{"key":"stn_7KXBP_n-Fz","attributes":{"visible":true,"zIndex":0,"x":420,"y":270,"type":"shmetro-int","shmetro-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","rotate":0,"height":10,"width":15}}},{"key":"stn_xqX-QhsoZr","attributes":{"visible":true,"zIndex":0,"x":530,"y":270,"type":"shmetro-int","shmetro-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","rotate":0,"height":10,"width":15}}}],"edges":[]},"svgViewBoxZoom":50,"svgViewBoxMin":{"x":190,"y":76.5},"version":3}';
        expect(newParam).toEqual(expectParam);
    });
});