import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
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

    it('Can save a backup before upgrade', async () => {
        localStorage.clear();
        const save =
            '{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]}';
        await upgrade(save);
        expect(localStorage.getItem(LocalStorageKey.PARAM_BACKUP)).toEqual(save);
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

    it('3 -> 4', () => {
        // All lines and misc edges could be upgrade to the new line path and style format.
        // Attributes of lines should have an extra style(single color) and styleAttrs(color from original's root level) fields.
        // Misc edges should be dropped and added again with type(simple path) and corresponding style(type from original's root level) fields.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_VmBMW73Olw","attributes":{"visible":true,"zIndex":0,"x":280,"y":330,"type":"bjsubway-basic","bjsubway-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","open":true}}},{"key":"stn_G5zw0xRakn","attributes":{"visible":true,"zIndex":0,"x":390,"y":210,"type":"gzmtr-int","gzmtr-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["shanghai","sh1","#E4002B","#fff","1号线","Line 1"]],[]]}}},{"key":"stn_riGMBxoD5N","attributes":{"visible":true,"zIndex":0,"x":220,"y":230,"type":"bjsubway-basic","bjsubway-basic":{"names":["车站","Stn"],"nameOffsetX":"left","nameOffsetY":"top","open":true}}},{"key":"misc_node_iSIafEw5XO","attributes":{"visible":true,"zIndex":0,"x":360,"y":300,"type":"shmetro-num-line-badge","shmetro-num-line-badge":{"num":3,"color":["shanghai","sh3","#FFD100","#000"]}}}],"edges":[{"key":"misc_edge_hlXMY6soOF","source":"stn_riGMBxoD5N","target":"stn_VmBMW73Olw","attributes":{"visible":true,"zIndex":0,"color":["shanghai","sh1","#E4002B","#fff"],"type":"shmetro-virtual-int","shmetro-virtual-int":{},"reconcileId":""}},{"key":"misc_edge_qEUiDLN4tl","source":"stn_VmBMW73Olw","target":"stn_G5zw0xRakn","attributes":{"visible":true,"zIndex":0,"color":["shanghai","sh1","#E4002B","#fff"],"type":"gzmtr-virtual-int","gzmtr-virtual-int":{},"reconcileId":""}},{"key":"line_9ord2OR5TT","source":"stn_riGMBxoD5N","target":"stn_G5zw0xRakn","attributes":{"visible":true,"zIndex":0,"color":["shanghai","sh1","#E4002B","#fff"],"type":"diagonal","diagonal":{"startFrom":"to","offsetFrom":0,"offsetTo":0},"reconcileId":""}},{"key":"line_cN5MrZ8KoS","source":"stn_riGMBxoD5N","target":"stn_G5zw0xRakn","attributes":{"visible":true,"zIndex":0,"color":["shanghai","sh2","#97D700","#000"],"type":"simple","simple":{},"reconcileId":""}}]},"svgViewBoxZoom":40,"svgViewBoxMin":{"x":120.9,"y":113.1},"version":3}';
        const newParam = UPGRADE_COLLECTION[3](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_VmBMW73Olw","attributes":{"visible":true,"zIndex":0,"x":280,"y":330,"type":"bjsubway-basic","bjsubway-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","open":true}}},{"key":"stn_G5zw0xRakn","attributes":{"visible":true,"zIndex":0,"x":390,"y":210,"type":"gzmtr-int","gzmtr-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["shanghai","sh1","#E4002B","#fff","1号线","Line 1"]],[]]}}},{"key":"stn_riGMBxoD5N","attributes":{"visible":true,"zIndex":0,"x":220,"y":230,"type":"bjsubway-basic","bjsubway-basic":{"names":["车站","Stn"],"nameOffsetX":"left","nameOffsetY":"top","open":true}}},{"key":"misc_node_iSIafEw5XO","attributes":{"visible":true,"zIndex":0,"x":360,"y":300,"type":"shmetro-num-line-badge","shmetro-num-line-badge":{"num":3,"color":["shanghai","sh3","#FFD100","#000"]}}}],"edges":[{"key":"line_9ord2OR5TT","source":"stn_riGMBxoD5N","target":"stn_G5zw0xRakn","attributes":{"visible":true,"zIndex":0,"type":"diagonal","diagonal":{"startFrom":"to","offsetFrom":0,"offsetTo":0},"reconcileId":"","style":"single-color","single-color":{"color":["shanghai","sh1","#E4002B","#fff"]}}},{"key":"line_cN5MrZ8KoS","source":"stn_riGMBxoD5N","target":"stn_G5zw0xRakn","attributes":{"visible":true,"zIndex":0,"type":"simple","simple":{},"reconcileId":"","style":"single-color","single-color":{"color":["shanghai","sh2","#97D700","#000"]}}},{"key":"line_X8Nx7z_DPx","source":"stn_riGMBxoD5N","target":"stn_VmBMW73Olw","attributes":{"visible":true,"zIndex":0,"type":"simple","shmetro-virtual-int":{},"style":"shmetro-virtual-int","reconcileId":""}},{"key":"line_LbHugNu_PF","source":"stn_VmBMW73Olw","target":"stn_G5zw0xRakn","attributes":{"visible":true,"zIndex":0,"type":"simple","gzmtr-virtual-int":{},"style":"gzmtr-virtual-int","reconcileId":""}}]},"svgViewBoxZoom":40,"svgViewBoxMin":{"x":120.9,"y":113.1},"version":4}';
        // New lines added from misc edges will have random id, so we only compare length.
        expect(newParam.length).toEqual(expectParam.length);
        // And make sure there is no misc edges any more.
        expect(newParam).not.toContain('misc_edge');
    });

    it('4 -> 5', () => {
        // 1st station should not change.
        // 2nd station should have open and secondaryNames added.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_pS3a6J0rUt","attributes":{"visible":true,"zIndex":0,"x":270,"y":240,"type":"shmetro-basic-2020","shmetro-basic-2020":{"names":["车站","Stn"],"rotate":0,"color":["shanghai","sh1","#E4002B","#fff"]}}},{"key":"stn_QvrX-1kJtK","attributes":{"visible":true,"zIndex":0,"x":270,"y":315,"type":"gzmtr-basic","gzmtr-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","color":["shanghai","sh1","#E4002B","#fff"],"lineCode":"1","stationCode":"01"}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":4}';
        const newParam = UPGRADE_COLLECTION[4](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_pS3a6J0rUt","attributes":{"visible":true,"zIndex":0,"x":270,"y":240,"type":"shmetro-basic-2020","shmetro-basic-2020":{"names":["车站","Stn"],"rotate":0,"color":["shanghai","sh1","#E4002B","#fff"]}}},{"key":"stn_QvrX-1kJtK","attributes":{"visible":true,"zIndex":0,"x":270,"y":315,"type":"gzmtr-basic","gzmtr-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","color":["shanghai","sh1","#E4002B","#fff"],"lineCode":"1","stationCode":"01","open":true,"secondaryNames":["",""]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":5}';
        expect(newParam).toEqual(expectParam);
    });

    it('5 -> 6', () => {
        // Simple path should have a offset field.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_Tf4drXXk4j","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"virtual","virtual":{}}},{"key":"misc_node_tl5B2E-qFH","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"virtual","virtual":{}}}],"edges":[{"key":"line_amQZxTi0rW","source":"misc_node_Tf4drXXk4j","target":"misc_node_tl5B2E-qFH","attributes":{"visible":true,"zIndex":0,"type":"simple","simple":{},"style":"single-color","single-color":{"color":["shanghai","sh1","#E4002B","#fff"]},"reconcileId":""}}]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":5}';
        const newParam = UPGRADE_COLLECTION[5](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_Tf4drXXk4j","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"virtual","virtual":{}}},{"key":"misc_node_tl5B2E-qFH","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"virtual","virtual":{}}}],"edges":[{"key":"line_amQZxTi0rW","source":"misc_node_Tf4drXXk4j","target":"misc_node_tl5B2E-qFH","attributes":{"visible":true,"zIndex":0,"type":"simple","simple":{"offset":0},"style":"single-color","single-color":{"color":["shanghai","sh1","#E4002B","#fff"]},"reconcileId":""}}]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":6}';
        expect(newParam).toEqual(expectParam);
    });

    it('6 -> 7', () => {
        // gzmtr-basic will have a tram field while shmetro-basic-2020 won't.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_UhPXorSlbo","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"gzmtr-basic","gzmtr-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","color":["shanghai","sh1","#E4002B","#fff"],"lineCode":"1","stationCode":"01","open":true,"secondaryNames":["",""]}}},{"key":"stn_QxSE1Wncyi","attributes":{"visible":true,"zIndex":0,"x":10,"y":10,"type":"shmetro-basic-2020","shmetro-basic-2020":{"names":["车站","Stn"],"rotate":0,"color":["shanghai","sh1","#E4002B","#fff"]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":6}';
        const newParam = UPGRADE_COLLECTION[6](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_UhPXorSlbo","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"gzmtr-basic","gzmtr-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","color":["shanghai","sh1","#E4002B","#fff"],"lineCode":"1","stationCode":"01","open":true,"secondaryNames":["",""],"tram":false}}},{"key":"stn_QxSE1Wncyi","attributes":{"visible":true,"zIndex":0,"x":10,"y":10,"type":"shmetro-basic-2020","shmetro-basic-2020":{"names":["车站","Stn"],"rotate":0,"color":["shanghai","sh1","#E4002B","#fff"]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":7}';
        expect(newParam).toEqual(expectParam);
    });

    it('7 -> 8', () => {
        // Bump save version to support river style.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":7}';
        const newParam = UPGRADE_COLLECTION[7](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":8}';
        expect(newParam).toEqual(expectParam);
    });

    it('8 -> 9', () => {
        // Bump save version to support MTR station style.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":8}';
        const newParam = UPGRADE_COLLECTION[8](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":9}';
        expect(newParam).toEqual(expectParam);
    });

    it('9 -> 10', () => {
        // Bump save version to support MTR line style (race days/light rail/unpaid area).
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":9}';
        const newParam = UPGRADE_COLLECTION[9](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":10}';
        expect(newParam).toEqual(expectParam);
    });

    it('10 -> 11', () => {
        // Bump save version to add color in text misc node.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_YQ39Zou12t","attributes":{"visible":true,"zIndex":0,"x":400,"y":150,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en"}}}],"edges":[]},"version":10}';
        const newParam = UPGRADE_COLLECTION[10](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_YQ39Zou12t","attributes":{"visible":true,"zIndex":0,"x":400,"y":150,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"]}}}],"edges":[]},"version":11}';
        expect(newParam).toEqual(expectParam);
    });

    it('11 -> 12', () => {
        // Bump save version to support Shanghai Metro out-of-system interchange station.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":11}';
        const newParam = UPGRADE_COLLECTION[11](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":12}';
        expect(newParam).toEqual(expectParam);
    });

    it('12 -> 13', () => {
        // Bump save version to add rotate and italic in text misc node.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_sbdkOMP9-R","attributes":{"visible":true,"zIndex":0,"x":600,"y":260,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"]}}}],"edges":[]},"version":12}';
        const newParam = UPGRADE_COLLECTION[12](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_sbdkOMP9-R","attributes":{"visible":true,"zIndex":0,"x":600,"y":260,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":false}}}],"edges":[]},"version":13}';
        expect(newParam).toEqual(expectParam);
    });

    it('13 -> 14', () => {
        // Bump save version to support Berlin U and S Bahn line badges.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":13}';
        const newParam = UPGRADE_COLLECTION[13](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":14}';
        expect(newParam).toEqual(expectParam);
    });

    it('14 -> 15', () => {
        // Bump save version to support Suzhou stations and the num line badge.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":14}';
        const newParam = UPGRADE_COLLECTION[14](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":15}';
        expect(newParam).toEqual(expectParam);
    });

    it('15 -> 16', () => {
        // Bump save version to add rotate and italic in text misc node.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_sbdkOMP9-R","attributes":{"visible":true,"zIndex":0,"x":600,"y":260,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":false}}}],"edges":[]},"version":15}';
        const newParam = UPGRADE_COLLECTION[15](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_sbdkOMP9-R","attributes":{"visible":true,"zIndex":0,"x":600,"y":260,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":"normal","bold":"normal"}}}],"edges":[]},"version":16}';
        expect(newParam).toEqual(expectParam);
    });

    it('16 -> 17', () => {
        // Bump save version to update y of facilities node after directly using svg in #262.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_783VjcPU_Z","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"facilities","facilities":{"type":"airport"}}}],"edges":[]},"version":16}';
        const newParam = UPGRADE_COLLECTION[16](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_783VjcPU_Z","attributes":{"visible":true,"zIndex":0,"x":0,"y":12.5,"type":"facilities","facilities":{"type":"airport"}}}],"edges":[]},"version":17}';
        expect(newParam).toEqual(expectParam);
    });

    it('17 -> 18', () => {
        // Bump save version to support Beijing Subway dotted line.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":17}';
        const newParam = UPGRADE_COLLECTION[17](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":18}';
        expect(newParam).toEqual(expectParam);
    });

    it('18 -> 19', () => {
        // Bump save version to support Beijing Subway dotted line.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":18}';
        const newParam = UPGRADE_COLLECTION[18](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":19}';
        expect(newParam).toEqual(expectParam);
    });

    it('19 -> 20', () => {
        // Bump save version to support Kunming Rail Transit stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":19}';
        const newParam = UPGRADE_COLLECTION[19](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":20}';
        expect(newParam).toEqual(expectParam);
    });

    it('20 -> 21', () => {
        // Bump save version to support Shenzhen Metro num line badge.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":20}';
        const newParam = UPGRADE_COLLECTION[20](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":21}';
        expect(newParam).toEqual(expectParam);
    });
});
