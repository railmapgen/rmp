import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { CURRENT_VERSION, UPGRADE_COLLECTION, upgrade } from './save';

describe('Unit tests for param upgrade function', () => {
    it('upgrade will return the default tutorial if originalParam is null', async () => {
        const save = await upgrade(null);
        expect(save).toContain('人民广场');
        expect(save).toContain('交通大学');
        expect(save).toContain('Xinzhuang');
        expect(save).toContain('Longyang');
    });

    it('upgrade will return the default tutorial if version is missing or invalid', async () => {
        let save = await upgrade('{}');
        expect(save).toContain('人民广场');
        expect(save).toContain('Xinzhuang');
        save = await upgrade('{"version":"114514"}');
        expect(save).toContain('交通大学');
        expect(save).toContain('Longyang');
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

    it('21 -> 22', () => {
        // Bump save version to support Singapore MRT stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":21}';
        const newParam = UPGRADE_COLLECTION[21](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":22}';
        expect(newParam).toEqual(expectParam);
    });

    it('22 -> 23', () => {
        // Bump save version to support Singapore MRT destination numbers.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":22}';
        const newParam = UPGRADE_COLLECTION[22](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":23}';
        expect(newParam).toEqual(expectParam);
    });

    it('23 -> 24', () => {
        // Bump save version to support Singapore MRT under construction and Sentosa Express line.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":23}';
        const newParam = UPGRADE_COLLECTION[23](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":24}';
        expect(newParam).toEqual(expectParam);
    });

    it('24 -> 25', () => {
        // Bump save version to add tram in gzmtr-int stations' and gzmtr-line-badge attributes.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_oWAjSji8Cm","attributes":{"visible":true,"zIndex":0,"x":140,"y":110,"type":"virtual","virtual":{}}},{"key":"stn_4ZZM2FLx7l","attributes":{"visible":true,"zIndex":0,"x":220,"y":110,"type":"gzmtr-int","gzmtr-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[],[]],"open":true,"secondaryNames":["",""]}}},{"key":"misc_node_Of3OsZGk2E","attributes":{"visible":true,"zIndex":0,"x":320,"y":255,"type":"gzmtr-line-badge","gzmtr-line-badge":{"names":["1号线","Line 1"],"color":["guangzhou","gz1","#F3D03E","#000"]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":24}';
        const newParam = UPGRADE_COLLECTION[24](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_oWAjSji8Cm","attributes":{"visible":true,"zIndex":0,"x":140,"y":110,"type":"virtual","virtual":{}}},{"key":"stn_4ZZM2FLx7l","attributes":{"visible":true,"zIndex":0,"x":220,"y":110,"type":"gzmtr-int","gzmtr-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[],[]],"open":true,"secondaryNames":["",""],"tram":false}}},{"key":"misc_node_Of3OsZGk2E","attributes":{"visible":true,"zIndex":0,"x":320,"y":255,"type":"gzmtr-line-badge","gzmtr-line-badge":{"names":["1号线","Line 1"],"color":["guangzhou","gz1","#F3D03E","#000"],"tram":false}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":25}';
        expect(newParam).toEqual(expectParam);
    });

    it('25 -> 26', () => {
        // Bump save version to support JR East basic station, important station,
        // line badge, single color line style, and single color pattern style.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":25}';
        const newParam = UPGRADE_COLLECTION[25](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":26}';
        expect(newParam).toEqual(expectParam);
    });

    it('26 -> 27', () => {
        // Bump save version to add span in gzmtr-line-badge attributes.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_Of3OsZGk2E","attributes":{"visible":true,"zIndex":0,"x":320,"y":255,"type":"gzmtr-line-badge","gzmtr-line-badge":{"names":["1号线","Line 1"],"color":["guangzhou","gz1","#F3D03E","#000"],"tram":false}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":26}';
        const newParam = UPGRADE_COLLECTION[26](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_Of3OsZGk2E","attributes":{"visible":true,"zIndex":0,"x":320,"y":255,"type":"gzmtr-line-badge","gzmtr-line-badge":{"names":["1号线","Line 1"],"color":["guangzhou","gz1","#F3D03E","#000"],"tram":false,"span":true}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":27}';
        expect(newParam).toEqual(expectParam);
    });

    it('27 -> 28', () => {
        // Bump save version to add span in gzmtr-line-badge attributes.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_K2YVw2Ctjc","attributes":{"visible":true,"zIndex":0,"x":275,"y":265,"type":"gzmtr-int","gzmtr-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["guangzhou","","#AAAAAA","#fff","",""]],[["guangzhou","","#AAAAAA","#fff","",""]]],"open":true,"secondaryNames":["",""],"tram":false}}},{"key":"stn_Jv3ku8RGZ9","attributes":{"visible":true,"zIndex":0,"x":405,"y":265,"type":"gzmtr-int","gzmtr-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[],[]],"open":true,"secondaryNames":["",""],"tram":false}}}],"edges":[]},"version":27}';
        const newParam = UPGRADE_COLLECTION[27](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_K2YVw2Ctjc","attributes":{"visible":true,"zIndex":0,"x":275,"y":265,"type":"gzmtr-int","gzmtr-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["guangzhou","","#AAAAAA","#fff","","","gz"]],[["guangzhou","","#AAAAAA","#fff","","","gz"]]],"open":true,"secondaryNames":["",""],"tram":false}}},{"key":"stn_Jv3ku8RGZ9","attributes":{"visible":true,"zIndex":0,"x":405,"y":265,"type":"gzmtr-int","gzmtr-int":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[],[]],"open":true,"secondaryNames":["",""],"tram":false}}}],"edges":[]},"version":28}';
        expect(newParam).toEqual(expectParam);
    });

    it('28 -> 29', () => {
        // Bump save version to support Qingdao Metro Station.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":28}';
        const newParam = UPGRADE_COLLECTION[28](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":29}';
        expect(newParam).toEqual(expectParam);
    });

    it('29 -> 30', () => {
        // Bump save version to support Singapore MRT facilities.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":29}';
        const newParam = UPGRADE_COLLECTION[29](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":30}';
        expect(newParam).toEqual(expectParam);
    });

    it('30 -> 31', () => {
        // Bump save version to support Singapore MRT facilities.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":30}';
        const newParam = UPGRADE_COLLECTION[30](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":31}';
        expect(newParam).toEqual(expectParam);
    });

    it('31 -> 32', () => {
        // Bump save version to support Railway line style
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_nO6Tr5nD9m","attributes":{"visible":true,"zIndex":0,"x":290,"y":400,"type":"virtual","virtual":{}}},{"key":"misc_node_pZfw7VPwDb","attributes":{"visible":true,"zIndex":0,"x":290,"y":495,"type":"virtual","virtual":{}}}],"edges":[{"key":"line_9lFz3Aeyaz","source":"misc_node_nO6Tr5nD9m","target":"misc_node_pZfw7VPwDb","attributes":{"visible":true,"zIndex":0,"type":"diagonal","diagonal":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":10},"style":"china-railway","reconcileId":"","china-railway":{}}}]},"svgViewBoxZoom":40,"svgViewBoxMin":{"x":212.953125,"y":258.939453125},"version":31}';
        const newParam = UPGRADE_COLLECTION[31](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_nO6Tr5nD9m","attributes":{"visible":true,"zIndex":0,"x":290,"y":400,"type":"virtual","virtual":{}}},{"key":"misc_node_pZfw7VPwDb","attributes":{"visible":true,"zIndex":0,"x":290,"y":495,"type":"virtual","virtual":{}}}],"edges":[{"key":"line_9lFz3Aeyaz","source":"misc_node_nO6Tr5nD9m","target":"misc_node_pZfw7VPwDb","attributes":{"visible":true,"zIndex":0,"type":"diagonal","diagonal":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":10},"style":"china-railway","reconcileId":"","china-railway":{"color":["shanghai","jsr","#000000","#fff"]}}}]},"svgViewBoxZoom":40,"svgViewBoxMin":{"x":212.953125,"y":258.939453125},"version":32}';
        expect(newParam).toEqual(expectParam);
    });

    it('32 -> 33', () => {
        // Bump save version to support Singapore MRT line badges and LRT style.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":32}';
        const newParam = UPGRADE_COLLECTION[32](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":33}';
        expect(newParam).toEqual(expectParam);
    });

    it('33 -> 34', () => {
        // Bump save version to support parallel lines.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node__8CmQwl2e2","attributes":{"visible":true,"zIndex":-1,"x":0,"y":0,"type":"virtual","virtual":{}}},{"key":"misc_node_966GIPcDUU","attributes":{"visible":true,"zIndex":0,"x":50,"y":50,"type":"virtual","virtual":{}}}],"edges":[{"key":"line_39qw6f0ehK","source":"misc_node__8CmQwl2e2","target":"misc_node_966GIPcDUU","attributes":{"visible":true,"zIndex":-10,"type":"diagonal","diagonal":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":10},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":""}}]},"version":33}';
        const newParam = UPGRADE_COLLECTION[33](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node__8CmQwl2e2","attributes":{"visible":true,"zIndex":4,"x":0,"y":0,"type":"virtual","virtual":{}}},{"key":"misc_node_966GIPcDUU","attributes":{"visible":true,"zIndex":5,"x":50,"y":50,"type":"virtual","virtual":{}}}],"edges":[{"key":"line_39qw6f0ehK","source":"misc_node__8CmQwl2e2","target":"misc_node_966GIPcDUU","attributes":{"visible":true,"zIndex":-10,"type":"diagonal","diagonal":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":10},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}}]},"version":34}';
        expect(newParam).toEqual(expectParam);
    });

    it('34 -> 35', () => {
        // Bump save version to support Qingdao Metro facilities.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":34}';
        const newParam = UPGRADE_COLLECTION[34](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":35}';
        expect(newParam).toEqual(expectParam);
    });

    it('35 -> 36', () => {
        // Bump save version to support Tokyo Metro stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":35}';
        const newParam = UPGRADE_COLLECTION[35](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":36}';
        expect(newParam).toEqual(expectParam);
    });

    it('36 -> 37', () => {
        // Bump save version to support London Underground stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":36}';
        const newParam = UPGRADE_COLLECTION[36](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":37}';
        expect(newParam).toEqual(expectParam);
    });

    it('37 -> 38', () => {
        // Bump save version to support Shanghai 2024 facilities.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":37}';
        const newParam = UPGRADE_COLLECTION[37](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":38}';
        expect(newParam).toEqual(expectParam);
    });

    it('38 -> 39', () => {
        // Bump save version to support Guangzhou 2024 facilities.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":38}';
        const newParam = UPGRADE_COLLECTION[38](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":39}';
        expect(newParam).toEqual(expectParam);
    });

    it('39 -> 40', () => {
        // Bump save version to support Qingdao facilities name change.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_Of3OsZGk2E","attributes":{"visible":true,"zIndex":0,"x":320,"y":255,"type":"facilities","facilities":{"type":"qingdao_airport"}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":39}';
        const newParam = UPGRADE_COLLECTION[39](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_Of3OsZGk2E","attributes":{"visible":true,"zIndex":0,"x":320,"y":255,"type":"facilities","facilities":{"type":"airport_qingdao"}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":40}';
        expect(newParam).toEqual(expectParam);
    });

    it('40 -> 41', () => {
        // Bump save version to support Guangdong Intercity Railway.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":40}';
        const newParam = UPGRADE_COLLECTION[40](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":41}';
        expect(newParam).toEqual(expectParam);
    });

    it('41 -> 42', () => {
        // Bump save version to replace all \\ to \n.
        const oldParam = String.raw`{"svgViewBoxZoom":40,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_HBR6YZ_MRm","attributes":{"visible":true,"zIndex":0,"x":675,"y":435,"type":"gzmtr-int","gzmtr-int":{"names":["车站","St\\n"],"nameOffsetX":"middle","nameOffsetY":"top","transfer":[[],[]],"open":true,"secondaryNames":["",""],"tram":false}}},{"key":"stn_s-J9ktwS61","attributes":{"visible":true,"zIndex":0,"x":730,"y":435,"type":"shmetro-basic-2020","shmetro-basic-2020":{"names":["车\\站","Stn"],"rotate":0,"color":["shanghai","sh1","#E3002B","#fff"]}}},{"key":"stn_AB3nKwo16E","attributes":{"visible":true,"zIndex":0,"x":790,"y":435,"type":"london-tube-basic","london-tube-basic":{"names":["St\\at\nion"],"transfer":[[["london","central","#DC241F","#fff",0]]],"rotate":0,"terminal":false,"stepFreeAccess":"none"}}}],"edges":[]},"version":41}`;
        const newParam = UPGRADE_COLLECTION[41](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam = String.raw`{"svgViewBoxZoom":40,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_HBR6YZ_MRm","attributes":{"visible":true,"zIndex":0,"x":675,"y":435,"type":"gzmtr-int","gzmtr-int":{"names":["车站","St\nn"],"nameOffsetX":"middle","nameOffsetY":"top","transfer":[[],[]],"open":true,"secondaryNames":["",""],"tram":false}}},{"key":"stn_s-J9ktwS61","attributes":{"visible":true,"zIndex":0,"x":730,"y":435,"type":"shmetro-basic-2020","shmetro-basic-2020":{"names":["车\n站","Stn"],"rotate":0,"color":["shanghai","sh1","#E3002B","#fff"]}}},{"key":"stn_AB3nKwo16E","attributes":{"visible":true,"zIndex":0,"x":790,"y":435,"type":"london-tube-basic","london-tube-basic":{"names":["St\\at\nion"],"transfer":[[["london","central","#DC241F","#fff",0]]],"rotate":0,"terminal":false,"stepFreeAccess":"none"}}}],"edges":[]},"version":42}`;
        expect(newParam).toEqual(expectParam);
    });

    it('42 -> 43', () => {
        // Bump save version to upgrade gzmtr-int-2024 new fields.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_n0TfQ0Xk6X","attributes":{"visible":true,"zIndex":0,"x":630,"y":335,"type":"gzmtr-int-2024","gzmtr-int-2024":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["guangzhou","gz1","#F3D03E","#fff","1","14","gz"],["guangzhou","gz3","#ECA154","#fff","3","11","gz"]]],"open":true,"secondaryNames":["",""],"preferVertical":true,"anchorAt":-1}}},{"key":"stn_HBR6YZ_MRm","attributes":{"visible":true,"zIndex":0,"x":630,"y":335,"type":"gzmtr-int-2024","gzmtr-int-2024":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["guangzhou","gz1","#F3D03E","#fff","1","14","gz"],["guangzhou","gz3","#ECA154","#fff","3","11","gz"]]],"open":true,"secondaryNames":["",""],"preferVertical":false,"anchorAt":-1}}}],"edges":[]},"version":42}';
        const newParam = UPGRADE_COLLECTION[42](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_n0TfQ0Xk6X","attributes":{"visible":true,"zIndex":0,"x":630,"y":335,"type":"gzmtr-int-2024","gzmtr-int-2024":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["guangzhou","gz1","#F3D03E","#fff","1","14","gz"],["guangzhou","gz3","#ECA154","#fff","3","11","gz"]]],"open":true,"secondaryNames":["",""],"anchorAt":-1,"columns":1,"topHeavy":false,"osiPosition":"none"}}},{"key":"stn_HBR6YZ_MRm","attributes":{"visible":true,"zIndex":0,"x":630,"y":335,"type":"gzmtr-int-2024","gzmtr-int-2024":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["guangzhou","gz1","#F3D03E","#fff","1","14","gz"],["guangzhou","gz3","#ECA154","#fff","3","11","gz"]]],"open":true,"secondaryNames":["",""],"anchorAt":-1,"columns":2,"topHeavy":false,"osiPosition":"none"}}}],"edges":[]},"version":43}';
        expect(newParam).toEqual(expectParam);
    });

    it('43 -> 44', () => {
        // Bump save version to support Chongqing Rail Transit stations.
        // Prepare an empty save.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":43}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[43](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":44}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('44 -> 45', () => {
        // Bump save version to support Chongqing Rail Transit stations.
        // Add isLoop attributes to Chongqing Rail Transit Basic stations.
        // Prepare an empty save.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_6oAhcug7aq","attributes":{"visible":true,"zIndex":0,"x":-1161.8544148936169,"y":648.2702426050851,"type":"chongqingrt-basic","chongqingrt-basic":{"names":["铁山坪","Tieshanping"],"color":["chongqing","cq4","#DC8633","#fff"],"nameOffsetX":"middle","nameOffsetY":"top","textVertical":false}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":44}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[44](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_6oAhcug7aq","attributes":{"visible":true,"zIndex":0,"x":-1161.8544148936169,"y":648.2702426050851,"type":"chongqingrt-basic","chongqingrt-basic":{"names":["铁山坪","Tieshanping"],"color":["chongqing","cq4","#DC8633","#fff"],"nameOffsetX":"middle","nameOffsetY":"top","textVertical":false,"isLoop":false}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":45}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('45 -> 46', () => {
        // Bump save version to add terminalNameRotate to london-tube-basic.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_qO95TqrmPQ","attributes":{"visible":true,"zIndex":0,"x":555,"y":405,"type":"london-tube-basic","london-tube-basic":{"names":["Station"],"transfer":[[["london","central","#DC241F","#fff",0]]],"rotate":0,"terminal":false,"stepFreeAccess":"none"}}}],"edges":[]},"version":45}';
        const newParam = UPGRADE_COLLECTION[45](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_qO95TqrmPQ","attributes":{"visible":true,"zIndex":0,"x":555,"y":405,"type":"london-tube-basic","london-tube-basic":{"names":["Station"],"transfer":[[["london","central","#DC241F","#fff",0]]],"rotate":0,"terminal":false,"stepFreeAccess":"none","terminalNameRotate":0}}}],"edges":[]},"version":46}';
        expect(newParam).toEqual(expectParam);
    });

    it('46 -> 47', () => {
        // Bump save version to add textDistance to chongqingrt-int.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_mwvAhFz1r1","attributes":{"visible":true,"zIndex":0,"x":-130,"y":25,"type":"chongqingrt-int","chongqingrt-int":{"names":["大坪","Daping"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["chongqing","cq1","#e4002b","#fff","",""],["chongqing","cq2","#007a33","#fff","",""]]]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":46}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[46](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_mwvAhFz1r1","attributes":{"visible":true,"zIndex":0,"x":-130,"y":25,"type":"chongqingrt-int","chongqingrt-int":{"names":["大坪","Daping"],"nameOffsetX":"right","nameOffsetY":"top","transfer":[[["chongqing","cq1","#e4002b","#fff","",""],["chongqing","cq2","#007a33","#fff","",""]]],"textDistance":["near","near"]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":47}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('47 -> 48', () => {
        // Bump save version to support Chengdu Metro stations.
        // Prepare an empty save.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":47}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[47](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":48}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('48 -> 49', () => {
        // Bump save version to add outline to text.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_tHfBvMnWQW","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":"normal","bold":"normal"}}}],"edges":[]},"version":48}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[48](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_tHfBvMnWQW","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":"normal","bold":"normal","outline":0}}}],"edges":[]},"version":49}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('49 -> 50', () => {
        // Bump save version to rename rapidColor to color for chongqingrt-int-2021
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_mwvAhFz1r1","attributes":{"visible":true,"zIndex":0,"x":-130,"y":25,"type":"chongqingrt-int-2021","chongqingrt-int-2021":{"names":["大坪","Daping"],"nameOffsetX":"right","nameOffsetY":"top","isRapid":true,"rapidColor":["chongqing","cq1","#e4002b","#fff","",""]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":49}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[49](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_mwvAhFz1r1","attributes":{"visible":true,"zIndex":0,"x":-130,"y":25,"type":"chongqingrt-int-2021","chongqingrt-int-2021":{"names":["大坪","Daping"],"nameOffsetX":"right","nameOffsetY":"top","isRapid":true,"color":["chongqing","cq1","#e4002b","#fff","",""]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":50}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('50 -> 51', () => {
        // Bump save version to support Taipei Metro line badge.
        // Prepare an empty save.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":50}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[50](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":51}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('51 -> 52', () => {
        // Bump save version to support Taiwan railway and hsr facilities.
        // Prepare an empty save.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":51}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[51](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":52}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('52 -> 53', () => {
        // Bump save version to rename some type.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":-807.5,"y":-210.5},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_HF4IR3Cy_s","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"shmetro-basic","shmetro-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top"}}},{"key":"stn_7qZmnoU1-G","attributes":{"visible":true,"zIndex":0,"x":0,"y":50,"type":"sh-sub-rwy","sh-sub-rwy":{"names":["车站","Stn"],"rotate":0}}},{"key":"stn_auLwhQdP_M","attributes":{"visible":true,"zIndex":0,"x":0,"y":100,"type":"gd-intercity-rwy","gd-intercity-rwy":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","interchange":false}}}],"edges":[]},"version":52}';
        const newParam = UPGRADE_COLLECTION[52](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":-807.5,"y":-210.5},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_HF4IR3Cy_s","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"shmetro-basic","shmetro-basic":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top"}}},{"key":"stn_7qZmnoU1-G","attributes":{"visible":true,"zIndex":0,"x":0,"y":50,"type":"shanghai-sub-rwy","shanghai-sub-rwy":{"names":["车站","Stn"],"rotate":0}}},{"key":"stn_auLwhQdP_M","attributes":{"visible":true,"zIndex":0,"x":0,"y":100,"type":"guangdong-intercity-rwy","guangdong-intercity-rwy":{"names":["车站","Stn"],"nameOffsetX":"right","nameOffsetY":"top","interchange":false}}}],"edges":[]},"version":53}';
        expect(newParam).toEqual(expectParam);
    });

    it('53 -> 54', () => {
        // Bump save version to match the icon reposition in gzmtr-line-badge.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_Of3OsZGk2E","attributes":{"visible":true,"zIndex":0,"x":320,"y":255,"type":"gzmtr-line-badge","gzmtr-line-badge":{"names":["1号线","Line 1"],"color":["guangzhou","gz1","#F3D03E","#000"],"tram":false,"span":true}}},{"key":"misc_node_Another","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"gzmtr-line-badge","gzmtr-line-badge":{"names":["2号线","Line 2"],"color":["guangzhou","gz2","#00629B","#fff"],"tram":false,"span":true}}}],"edges":[]},"version":53}';
        const newParam = UPGRADE_COLLECTION[53](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_Of3OsZGk2E","attributes":{"visible":true,"zIndex":0,"x":320,"y":267,"type":"gzmtr-line-badge","gzmtr-line-badge":{"names":["1号线","Line 1"],"color":["guangzhou","gz1","#F3D03E","#000"],"tram":false,"span":true}}},{"key":"misc_node_Another","attributes":{"visible":true,"zIndex":0,"x":100,"y":112,"type":"gzmtr-line-badge","gzmtr-line-badge":{"names":["2号线","Line 2"],"color":["guangzhou","gz2","#00629B","#fff"],"tram":false,"span":true}}}],"edges":[]},"version":54}';
        expect(newParam).toEqual(expectParam);
    });

    it('54 -> 55', () => {
        // Bump save version to update TextLanguage in Text (mtr__zh -> mtr_zh, mtr__en -> mtr_en).
        const oldParam =
            '{"svgViewBoxZoom":40,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_klNPHzAh5Q","attributes":{"visible":true,"zIndex":0,"x":595,"y":320,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":"normal","bold":"normal","outline":0}}},{"key":"misc_node_x78cK21yLo","attributes":{"visible":true,"zIndex":0,"x":595,"y":370,"type":"text","text":{"content":"車站","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"mtr__zh","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":"normal","bold":"normal","outline":0}}}],"edges":[]},"version":54}';
        const newParam = UPGRADE_COLLECTION[54](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":40,"svgViewBoxMin":{"x":0,"y":0},"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_klNPHzAh5Q","attributes":{"visible":true,"zIndex":0,"x":595,"y":320,"type":"text","text":{"content":"Enter your text here","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"en","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":"normal","bold":"normal","outline":0}}},{"key":"misc_node_x78cK21yLo","attributes":{"visible":true,"zIndex":0,"x":595,"y":370,"type":"text","text":{"content":"車站","fontSize":16,"lineHeight":16,"textAnchor":"middle","dominantBaseline":"middle","language":"mtr_zh","color":["shanghai","jsr","#000000","#fff"],"rotate":0,"italic":"normal","bold":"normal","outline":0}}}],"edges":[]},"version":55}';
        expect(newParam).toEqual(expectParam);
    });

    it('55 -> 56', () => {
        // Bump save version to support Chongqing Rail Transit stations.
        // Add isLoop attributes to Chongqing Rail Transit Basic stations.
        // Prepare an empty save.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_6oAhcug7aq","attributes":{"visible":true,"zIndex":0,"x":-1161.8544148936169,"y":648.2702426050851,"type":"chengdurt-basic","chengdurt-basic":{"names":["铁山坪","Tieshanping"],"color":["chongqing","cq4","#DC8633","#fff"],"nameOffsetX":"middle","nameOffsetY":"top","textVertical":false,"direction":"horizontal","stationType":"joint"}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":55}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[55](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_6oAhcug7aq","attributes":{"visible":true,"zIndex":0,"x":-1161.8544148936169,"y":648.2702426050851,"type":"chengdurt-basic","chengdurt-basic":{"names":["铁山坪","Tieshanping"],"color":["chongqing","cq4","#DC8633","#fff"],"nameOffsetX":"middle","nameOffsetY":"top","textVertical":false,"direction":"horizontal","stationType":"joint","rotation":0}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":56}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('56 -> 57', () => {
        // Bump save version to support Osaka Metro stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":56}';
        const newParam = UPGRADE_COLLECTION[56](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":57}';
        expect(newParam).toEqual(expectParam);
    });

    it('57 -> 58', () => {
        // Bump save version to support image node.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":57}';
        const newParam = UPGRADE_COLLECTION[57](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":58}';
        expect(newParam).toEqual(expectParam);
    });

    it('58 -> 59', () => {
        // Bump save version to support fill node.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":58}';
        const newParam = UPGRADE_COLLECTION[58](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":59}';
        expect(newParam).toEqual(expectParam);
    });

    it('59 -> 60', () => {
        // Bump save version to add misc_node_ and line_ prefixes to those created by fill.
        const oldParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"images":[],"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_BWQKUyEEpZ","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"fill","fill":{"color":["shanghai","sh1","#E3002B","#fff"],"opacity":0.5,"selectedPatterns":["logo"]}}},{"key":"eMZ4qM9kV_","attributes":{"x":200,"y":0,"type":"virtual","virtual":{},"visible":true,"zIndex":0}},{"key":"j1aYfHvCR4","attributes":{"x":200,"y":200,"type":"virtual","virtual":{},"visible":true,"zIndex":0}},{"key":"EC8JvVjy_w","attributes":{"x":0,"y":200,"type":"virtual","virtual":{},"visible":true,"zIndex":0}}],"edges":[{"key":"F8xAOYi2HD","source":"misc_node_BWQKUyEEpZ","target":"eMZ4qM9kV_","attributes":{"visible":true,"zIndex":0,"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":18.33},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}},{"key":"is9sS_6myT","source":"eMZ4qM9kV_","target":"j1aYfHvCR4","attributes":{"visible":true,"zIndex":0,"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":18.33},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}},{"key":"fvw1dCbd1N","source":"j1aYfHvCR4","target":"EC8JvVjy_w","attributes":{"visible":true,"zIndex":0,"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":18.33},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}},{"key":"yS5ncPa5gr","source":"EC8JvVjy_w","target":"misc_node_BWQKUyEEpZ","attributes":{"visible":true,"zIndex":0,"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":18.33},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}}]},"version":59}';
        const newParam = UPGRADE_COLLECTION[59](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"images":[],"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"misc_node_BWQKUyEEpZ","attributes":{"visible":true,"zIndex":0,"x":0,"y":0,"type":"fill","fill":{"color":["shanghai","sh1","#E3002B","#fff"],"opacity":0.5,"selectedPatterns":["logo"]}}},{"key":"misc_node_eMZ4qM9kV_","attributes":{"x":200,"y":0,"type":"virtual","virtual":{},"visible":true,"zIndex":0}},{"key":"misc_node_j1aYfHvCR4","attributes":{"x":200,"y":200,"type":"virtual","virtual":{},"visible":true,"zIndex":0}},{"key":"misc_node_EC8JvVjy_w","attributes":{"x":0,"y":200,"type":"virtual","virtual":{},"visible":true,"zIndex":0}}],"edges":[{"key":"line_F8xAOYi2HD","source":"misc_node_BWQKUyEEpZ","target":"misc_node_eMZ4qM9kV_","attributes":{"visible":true,"zIndex":0,"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":18.33},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}},{"key":"line_is9sS_6myT","source":"misc_node_eMZ4qM9kV_","target":"misc_node_j1aYfHvCR4","attributes":{"visible":true,"zIndex":0,"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":18.33},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}},{"key":"line_fvw1dCbd1N","source":"misc_node_j1aYfHvCR4","target":"misc_node_EC8JvVjy_w","attributes":{"visible":true,"zIndex":0,"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":18.33},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}},{"key":"line_yS5ncPa5gr","source":"misc_node_EC8JvVjy_w","target":"misc_node_BWQKUyEEpZ","attributes":{"visible":true,"zIndex":0,"type":"perpendicular","perpendicular":{"startFrom":"from","offsetFrom":0,"offsetTo":0,"roundCornerFactor":18.33},"style":"single-color","single-color":{"color":["shanghai","sh1","#E3002B","#fff"]},"reconcileId":"","parallelIndex":-1}}]},"version":60}';
        expect(newParam).toEqual(expectParam);
    });

    it('60 -> 61', () => {
        // Bump save version to convert Tokyo Metro Int transfer information to fit with Interchange-Card.
        const oldParam =
            '{"svgViewBoxZoom":20,"svgViewBoxMin":{"x":258.68593749999997,"y":273.70625},"images":[],"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_diueKg5PAd","attributes":{"visible":true,"zIndex":0,"x":320,"y":345,"type":"tokyo-metro-int","tokyo-metro-int":{"names":["日本橋"],"nameOffsetX":"right","nameOffsetY":"middle","mereOffset":"none","textVertical":false,"interchanges":[{"lineCode":"A","stationCode":"13","color":["tokyo","a","#dd4231","#fff"]}],"align":"horizontal","importance":"default"}}}],"edges":[]},"version":60}';
        // Upgrade it with your newly added function.
        const newParam = UPGRADE_COLLECTION[60](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"svgViewBoxZoom":20,"svgViewBoxMin":{"x":258.68593749999997,"y":273.70625},"images":[],"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_diueKg5PAd","attributes":{"visible":true,"zIndex":0,"x":320,"y":345,"type":"tokyo-metro-int","tokyo-metro-int":{"names":["日本橋"],"nameOffsetX":"right","nameOffsetY":"middle","mereOffset":"none","textVertical":false,"align":"horizontal","importance":"default","transfer":[[["tokyo","a","#dd4231","#fff","A","13"]]]}}}],"edges":[]},"version":61}';
        // And the updated save has only version field changed.
        expect(newParam).toEqual(expectParam);
    });

    it('61 -> 62', () => {
        // Bump save version to support construction attribute for bjsubwayBasic.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":61}';
        const newParam = UPGRADE_COLLECTION[61](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":62}';
        expect(newParam).toEqual(expectParam);
    });

    it('62 -> 63', () => {
        // Bump save version to support wuhan rail transit basic and int stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":62}';
        const newParam = UPGRADE_COLLECTION[62](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":63}';
        expect(newParam).toEqual(expectParam);
    });

    it('63 -> 64', () => {
        // Bump save version to support Changsha Metro stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":63}';
        const newParam = UPGRADE_COLLECTION[63](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":64}';
        expect(newParam).toEqual(expectParam);
    });

    it('64 -> 65', () => {
        // Bump save version to support Hangzhou Metro stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":64}';
        const newParam = UPGRADE_COLLECTION[64](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":65}';
        expect(newParam).toEqual(expectParam);
    });

    it('65 -> 66', () => {
        // Bump save version to update JR East lines information when rotate is greater or equal to 180.
        // 1st station should not change (rotate < 180).
        // 2nd station should have lines negated and rotate modulo 180 (rotate >= 180).
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_test1","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"jr-east-basic","jr-east-basic":{"names":["駅","Stn"],"nameOffsetX":"right","nameOffsetY":"top","rotate":90,"lines":[1,2],"textAnchor":"start","textXAdjust":0,"textYAdjust":0}}},{"key":"stn_test2","attributes":{"visible":true,"zIndex":0,"x":200,"y":200,"type":"jr-east-basic","jr-east-basic":{"names":["駅2","Stn2"],"nameOffsetX":"left","nameOffsetY":"bottom","rotate":270,"lines":[3,-4],"textAnchor":"end","textXAdjust":5,"textYAdjust":-5}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":65}';
        const newParam = UPGRADE_COLLECTION[65](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_test1","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"jr-east-basic","jr-east-basic":{"names":["駅","Stn"],"nameOffsetX":"right","nameOffsetY":"top","rotate":90,"lines":[1,2],"textAnchor":"start","textXAdjust":0,"textYAdjust":0}}},{"key":"stn_test2","attributes":{"visible":true,"zIndex":0,"x":200,"y":200,"type":"jr-east-basic","jr-east-basic":{"names":["駅2","Stn2"],"nameOffsetX":"left","nameOffsetY":"bottom","rotate":90,"lines":[-3,4],"textAnchor":"end","textXAdjust":5,"textYAdjust":-5}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":66}';
        expect(newParam).toEqual(expectParam);
    });

    it('66 -> 67', () => {
        // Bump save version to add scale to bjsubway basic and interchange stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_basic","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"bjsubway-basic","bjsubway-basic":{"names":["车站"],"nameOffsetX":"right","nameOffsetY":"top","open":true,"construction":false}}},{"key":"stn_int","attributes":{"visible":true,"zIndex":0,"x":200,"y":200,"type":"bjsubway-int","bjsubway-int":{"names":["换乘站"],"nameOffsetX":"left","nameOffsetY":"bottom","outOfStation":false}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":66}';
        const newParam = UPGRADE_COLLECTION[66](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_basic","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"bjsubway-basic","bjsubway-basic":{"names":["车站"],"nameOffsetX":"right","nameOffsetY":"top","open":true,"construction":false,"scale":1}}},{"key":"stn_int","attributes":{"visible":true,"zIndex":0,"x":200,"y":200,"type":"bjsubway-int","bjsubway-int":{"names":["换乘站"],"nameOffsetX":"left","nameOffsetY":"bottom","outOfStation":false,"scale":1}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":67}';
        expect(newParam).toEqual(expectParam);
    });

    it('67 -> 68', () => {
        // Bump save version to add scale to hzmetro basic and interchange stations.
        const oldParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_basic","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"hzmetro-basic","hzmetro-basic":{"names":["车站"],"nameOffsetX":"right","nameOffsetY":"top","color":["hangzhou","1","#dd4231","#fff"]}}},{"key":"stn_int","attributes":{"visible":true,"zIndex":0,"x":200,"y":200,"type":"hzmetro-int","hzmetro-int":{"names":["换乘站"],"nameOffsetX":"left","nameOffsetY":"bottom","transfer":[[]]}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":67}';
        const newParam = UPGRADE_COLLECTION[67](oldParam);
        const graph = new MultiDirectedGraph() as MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
        expect(() => graph.import(JSON.parse(newParam))).not.toThrow();
        const expectParam =
            '{"graph":{"options":{"type":"directed","multi":true,"allowSelfLoops":true},"attributes":{},"nodes":[{"key":"stn_basic","attributes":{"visible":true,"zIndex":0,"x":100,"y":100,"type":"hzmetro-basic","hzmetro-basic":{"names":["车站"],"nameOffsetX":"right","nameOffsetY":"top","color":["hangzhou","1","#dd4231","#fff"],"scale":1}}},{"key":"stn_int","attributes":{"visible":true,"zIndex":0,"x":200,"y":200,"type":"hzmetro-int","hzmetro-int":{"names":["换乘站"],"nameOffsetX":"left","nameOffsetY":"bottom","transfer":[[]],"scale":1,"mirror":false}}}],"edges":[]},"svgViewBoxZoom":100,"svgViewBoxMin":{"x":0,"y":0},"version":68}';
        expect(newParam).toEqual(expectParam);
    });
});
