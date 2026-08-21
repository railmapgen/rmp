import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { defaultBezierPathAttributes } from '../components/svgs/lines/paths/bezier-model';
import { normalizeEdgeAttributes } from '../components/svgs/lines/lines';
import {
    autoPopulateTransfer,
    autoUpdateStationType,
    changeLinePathType,
    changeLinesColorInBatch,
    changeLineStyleType,
    changeStationType,
    checkAndChangeStationIntType,
} from './change-types';

describe('changeLinePathType', () => {
    it('clears a reconcile group when the new path does not support reconcile', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('misc_node_a', {
            x: 0,
            y: 0,
            type: MiscNodeType.Virtual,
            zIndex: 0,
            visible: true,
            [MiscNodeType.Virtual]: {},
        });
        graph.addNode('misc_node_b', {
            x: 100,
            y: 0,
            type: MiscNodeType.Virtual,
            zIndex: 0,
            visible: true,
            [MiscNodeType.Virtual]: {},
        });
        graph.addDirectedEdgeWithKey('line_selected', 'misc_node_a', 'misc_node_b', {
            type: LinePathType.Simple,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: 'reconcile_group',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Simple]: { offset: 0 },
            [LineStyleType.SingleColor]: {
                color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
            },
        });

        changeLinePathType(graph, 'line_selected', LinePathType.Freeform, false);

        expect(graph.getEdgeAttribute('line_selected', 'type')).toBe(LinePathType.Freeform);
        expect(graph.getEdgeAttribute('line_selected', 'reconcileId')).toBe('');
    });
});

describe('changeStationType', () => {
    it('should deep clone nested default attrs when changing to JR East basic stations', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const makeGzmtrBasicNode = (name: string, x: number): NodeAttributes => ({
            x,
            y: 0,
            type: StationType.GzmtrBasic,
            zIndex: 0,
            visible: true,
            [StationType.GzmtrBasic]: {
                names: [name, name],
                nameOffsetX: 'right',
                nameOffsetY: 'top',
                lineCode: '1',
                stationCode: '101',
                open: true,
                secondaryNames: ['', ''],
                tram: false,
                color: [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black],
            },
        });

        graph.addNode('stn_1', makeGzmtrBasicNode('Station 1', 0));
        graph.addNode('stn_2', makeGzmtrBasicNode('Station 2', 100));

        changeStationType(graph, 'stn_1', StationType.JREastBasic);
        changeStationType(graph, 'stn_2', StationType.JREastBasic);

        const stn1Attrs = graph.getNodeAttribute('stn_1', StationType.JREastBasic)!;
        const stn2Attrs = graph.getNodeAttribute('stn_2', StationType.JREastBasic)!;

        expect(stn1Attrs.lines).not.toBe(stn2Attrs.lines);

        stn1Attrs.lines[0] = 0.5;
        graph.mergeNodeAttributes('stn_1', { [StationType.JREastBasic]: stn1Attrs });

        expect(graph.getNodeAttribute('stn_1', StationType.JREastBasic)!.lines).toEqual([0.5, 0, 1]);
        expect(graph.getNodeAttribute('stn_2', StationType.JREastBasic)!.lines).toEqual([-1, 0, 1]);
    });
});

describe('checkAndChangeStationIntType', () => {
    it('should change station to interchange type and populate transfer when multiple lines with different colors are connected', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add station nodes
        graph.addNode('stn_1', {
            x: 0,
            y: 0,
            type: StationType.GzmtrBasic,
            zIndex: 0,
            visible: true,
            [StationType.GzmtrBasic]: {
                names: ['Station 1', 'Stn 1'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                lineCode: '1',
                stationCode: '101',
                open: true,
                secondaryNames: ['', ''],
                tram: false,
                color: [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black] as Theme,
            },
        });

        graph.addNode('stn_2', { x: 100, y: 0, type: StationType.GzmtrBasic, zIndex: 0, visible: true });
        graph.addNode('stn_3', { x: 0, y: 100, type: StationType.GzmtrBasic, zIndex: 0, visible: true });

        // Add two lines with different colors
        const line1Color: Theme = [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black];
        const line2Color: Theme = [CityCode.Guangzhou, 'gz2', '#97D700', MonoColour.white];

        graph.addDirectedEdge('stn_1', 'stn_2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line1Color,
            },
        });

        graph.addDirectedEdge('stn_1', 'stn_3', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line2Color,
            },
        });

        // Call the function
        expect(checkAndChangeStationIntType(graph, 'stn_1')).toBe(true);

        // Verify the station type changed to interchange
        expect(graph.getNodeAttribute('stn_1', 'type')).toBe(StationType.GzmtrInt);

        // Verify the transfer property is populated
        const attrs = graph.getNodeAttribute('stn_1', StationType.GzmtrInt);
        expect(attrs).toBeDefined();
        expect(attrs!.transfer).toBeDefined();
        expect(attrs!.transfer[0]).toBeDefined();
        expect(attrs!.transfer[0].length).toBe(2);

        // Check that the transfer info contains the correct colors
        const colors = attrs!.transfer[0].map(t => t[2]);
        expect(colors).toContain('#F3D03E');
        expect(colors).toContain('#97D700');
    });

    it('should change station to basic type and clear transfer when only one line color is connected', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add station nodes
        graph.addNode('stn_1', {
            x: 0,
            y: 0,
            type: StationType.GzmtrInt,
            zIndex: 0,
            visible: true,
            [StationType.GzmtrInt]: {
                names: ['Station 1', 'Stn 1'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                transfer: [
                    [
                        [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black, '', ''],
                        [CityCode.Guangzhou, 'gz2', '#97D700', MonoColour.white, '', ''],
                    ],
                ],
                open: true,
                secondaryNames: ['', ''],
                tram: false,
            },
        });

        graph.addNode('stn_2', { x: 100, y: 0, type: StationType.GzmtrBasic, zIndex: 0, visible: true });

        // Add only one line with a single color
        const lineColor: Theme = [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black];

        graph.addDirectedEdge('stn_1', 'stn_2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: lineColor,
            },
        });

        // Call the function
        expect(checkAndChangeStationIntType(graph, 'stn_1')).toBe(true);

        // Verify the station type changed to basic
        expect(graph.getNodeAttribute('stn_1', 'type')).toBe(StationType.GzmtrBasic);

        // Verify the transfer property is cleared (should use default)
        const attrs = graph.getNodeAttribute('stn_1', StationType.GzmtrBasic);
        expect(attrs).toBeDefined();
    });

    it('should not change station type when no lines are connected', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add station node without any edges
        graph.addNode('stn_1', {
            x: 0,
            y: 0,
            type: StationType.GzmtrBasic,
            zIndex: 0,
            visible: true,
            [StationType.GzmtrBasic]: {
                names: ['Station 1', 'Stn 1'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                lineCode: '1',
                stationCode: '101',
                open: true,
                secondaryNames: ['', ''],
                tram: false,
                color: [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black] as Theme,
            },
        });

        // Call the function
        expect(checkAndChangeStationIntType(graph, 'stn_1')).toBe(false);

        // Verify the station type remains the same
        expect(graph.getNodeAttribute('stn_1', 'type')).toBe(StationType.GzmtrBasic);
    });

    it('should handle stations that do not have basic/int type pairs', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add a station type that doesn't have a -basic/-int pair (MTR)
        graph.addNode('stn_1', {
            x: 0,
            y: 0,
            type: StationType.MTR,
            zIndex: 0,
            visible: true,
            [StationType.MTR]: {
                names: ['Central'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                rotate: 0,
                transfer: [[]],
            },
        });

        graph.addNode('stn_2', { x: 100, y: 0, type: StationType.MTR, zIndex: 0, visible: true });
        graph.addNode('stn_3', { x: 0, y: 100, type: StationType.MTR, zIndex: 0, visible: true });

        // Add two lines with different colors
        const line1Color: Theme = [CityCode.Hongkong, 'twl', '#FF0000', MonoColour.white];
        const line2Color: Theme = [CityCode.Hongkong, 'isl', '#0000FF', MonoColour.white];

        graph.addDirectedEdge('stn_1', 'stn_2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line1Color,
            },
        });

        graph.addDirectedEdge('stn_1', 'stn_3', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line2Color,
            },
        });

        // Call the function
        expect(checkAndChangeStationIntType(graph, 'stn_1')).toBe(true);

        // Verify the station type remains MTR (no basic/int pair)
        expect(graph.getNodeAttribute('stn_1', 'type')).toBe(StationType.MTR);

        // But the transfer property should be populated
        const attrs = graph.getNodeAttribute('stn_1', StationType.MTR);
        expect(attrs).toBeDefined();
        expect(attrs!.transfer).toBeDefined();
        expect(attrs!.transfer[0]).toBeDefined();
        expect(attrs!.transfer[0].length).toBe(2);
    });
});

describe('changeLinesColorInBatch', () => {
    it('preserves non-color style attributes when recoloring a line', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('misc_node_a', {
            x: 0,
            y: 0,
            type: MiscNodeType.Virtual,
            zIndex: 0,
            visible: true,
            [MiscNodeType.Virtual]: {},
        });
        graph.addNode('misc_node_b', {
            x: 100,
            y: 0,
            type: MiscNodeType.Virtual,
            zIndex: 0,
            visible: true,
            [MiscNodeType.Virtual]: {},
        });
        const originalColor: Theme = [CityCode.Tokyo, 'jy', '#9ACD32', MonoColour.black];
        const replacementColor: Theme = [CityCode.Tokyo, 'jk', '#00B2E5', MonoColour.black];
        graph.addDirectedEdgeWithKey('line_jr', 'misc_node_a', 'misc_node_b', {
            type: LinePathType.Simple,
            style: LineStyleType.JREastSingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Simple]: { offset: 0 },
            [LineStyleType.JREastSingleColor]: {
                color: originalColor,
                decoration: 'thin-tail',
                decorationAt: 'from',
            },
        });

        changeLinesColorInBatch(graph, originalColor, replacementColor, ['line_jr']);

        expect(graph.getEdgeAttribute('line_jr', LineStyleType.JREastSingleColor)).toEqual({
            color: replacementColor,
            decoration: 'thin-tail',
            decorationAt: 'from',
        });
    });
});

describe('autoUpdateStationType and autoPopulateTransfer', () => {
    it('should allow calling autoUpdateStationType independently', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add station nodes
        graph.addNode('stn_1', {
            x: 0,
            y: 0,
            type: StationType.GzmtrBasic,
            zIndex: 0,
            visible: true,
            [StationType.GzmtrBasic]: {
                names: ['Station 1', 'Stn 1'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                lineCode: '1',
                stationCode: '101',
                open: true,
                secondaryNames: ['', ''],
                tram: false,
                color: [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black] as Theme,
            },
        });

        graph.addNode('stn_2', { x: 100, y: 0, type: StationType.GzmtrBasic, zIndex: 0, visible: true });
        graph.addNode('stn_3', { x: 0, y: 100, type: StationType.GzmtrBasic, zIndex: 0, visible: true });

        // Add two lines with different colors
        const line1Color: Theme = [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black];
        const line2Color: Theme = [CityCode.Guangzhou, 'gz2', '#97D700', MonoColour.white];

        graph.addDirectedEdge('stn_1', 'stn_2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line1Color,
            },
        });

        graph.addDirectedEdge('stn_1', 'stn_3', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line2Color,
            },
        });

        // Call only autoUpdateStationType
        const changed = autoUpdateStationType(graph, 'stn_1');

        // Verify the station type changed
        expect(changed).toBe(true);
        expect(graph.getNodeAttribute('stn_1', 'type')).toBe(StationType.GzmtrInt);

        // Verify transfer property is NOT populated (since we didn't call autoPopulateTransfer)
        const attrs = graph.getNodeAttribute('stn_1', StationType.GzmtrInt);
        expect(attrs!.transfer[0].length).toBe(0); // Empty transfer array
    });

    it('should allow calling autoPopulateTransfer independently', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add station nodes - already as interchange type with empty transfer
        graph.addNode('stn_1', {
            x: 0,
            y: 0,
            type: StationType.GzmtrInt,
            zIndex: 0,
            visible: true,
            [StationType.GzmtrInt]: {
                names: ['Station 1', 'Stn 1'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                transfer: [[]],
                open: true,
                secondaryNames: ['', ''],
                tram: false,
            },
        });

        graph.addNode('stn_2', { x: 100, y: 0, type: StationType.GzmtrBasic, zIndex: 0, visible: true });
        graph.addNode('stn_3', { x: 0, y: 100, type: StationType.GzmtrBasic, zIndex: 0, visible: true });

        // Add two lines with different colors
        const line1Color: Theme = [CityCode.Guangzhou, 'gz1', '#F3D03E', MonoColour.black];
        const line2Color: Theme = [CityCode.Guangzhou, 'gz2', '#97D700', MonoColour.white];

        graph.addDirectedEdge('stn_1', 'stn_2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line1Color,
            },
        });

        graph.addDirectedEdge('stn_1', 'stn_3', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line2Color,
            },
        });

        // Call only autoPopulateTransfer
        const updated = autoPopulateTransfer(graph, 'stn_1');

        // Verify transfer was updated
        expect(updated).toBe(true);

        // Verify transfer property is populated
        const attrs = graph.getNodeAttribute('stn_1', StationType.GzmtrInt);
        expect(attrs!.transfer[0].length).toBe(2);
        const colors = attrs!.transfer[0].map(t => t[2]);
        expect(colors).toContain('#F3D03E');
        expect(colors).toContain('#97D700');

        // Verify station type remains unchanged (we didn't call autoUpdateStationType)
        expect(graph.getNodeAttribute('stn_1', 'type')).toBe(StationType.GzmtrInt);
    });

    it('should clear MTR transfer info when only one line color is connected', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        const lineColor: Theme = [CityCode.Hongkong, 'twl', '#FF0000', MonoColour.white];

        graph.addNode('stn_1', {
            x: 0,
            y: 0,
            type: StationType.MTR,
            zIndex: 0,
            visible: true,
            [StationType.MTR]: {
                names: ['Central'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                rotate: 0,
                transfer: [
                    [
                        [CityCode.Hongkong, 'twl', '#FF0000', MonoColour.white, '', ''],
                        [CityCode.Hongkong, 'isl', '#0000FF', MonoColour.white, '', ''],
                    ],
                ],
            },
        });
        graph.addNode('stn_2', { x: 100, y: 0, type: StationType.MTR, zIndex: 0, visible: true });
        graph.addDirectedEdge('stn_1', 'stn_2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            zIndex: 0,
            reconcileId: '',
            visible: true,
            parallelIndex: -1,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
                roundCornerFactor: 0,
            },
            [LineStyleType.SingleColor]: {
                color: lineColor,
            },
        });

        const updated = autoPopulateTransfer(graph, 'stn_1');

        expect(updated).toBe(true);
        expect(graph.getNodeAttribute('stn_1', StationType.MTR)!.transfer).toEqual([[]]);
    });
});

describe('Bezier endpoint alignment after line type changes', () => {
    type Graph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

    const RED: Theme = [CityCode.Other, 'red', '#ff0000', MonoColour.white];
    const BLUE: Theme = [CityCode.Other, 'blue', '#0000ff', MonoColour.white];

    const addNode = (graph: Graph, id: `stn_${string}` | `misc_node_${string}`, x: number) => {
        graph.addNode(id, {
            visible: true,
            zIndex: 0,
            x,
            y: 0,
            type: StationType.ShmetroBasic,
        });
    };

    const makeBezierEdgeAttrs = (
        color: Theme,
        sourceOffset = { x: 0, y: 0 },
        targetOffset = { x: 0, y: 0 },
        visible = true,
        style = LineStyleType.SingleColor
    ): EdgeAttributes => ({
        visible,
        zIndex: 0,
        type: LinePathType.Bezier,
        [LinePathType.Bezier]: {
            ...structuredClone(defaultBezierPathAttributes),
            sourceOffset,
            targetOffset,
        },
        style,
        [style]: style === LineStyleType.SingleColor ? { color } : {},
        reconcileId: '',
        parallelIndex: -1,
    });

    const makeDiagonalEdgeAttrs = (color: Theme): EdgeAttributes => ({
        visible: true,
        zIndex: 0,
        type: LinePathType.Diagonal,
        [LinePathType.Diagonal]: {
            startFrom: 'from',
            offsetFrom: 0,
            offsetTo: 0,
            roundCornerFactor: 0,
        },
        style: LineStyleType.SingleColor,
        [LineStyleType.SingleColor]: { color },
        reconcileId: '',
        parallelIndex: -1,
    });

    it('aligns default Bezier attrs to hidden same-style peers when changing the path type', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_source', 0);
        addNode(graph, 'stn_target', 100);
        addNode(graph, 'misc_node_source_peer', -100);
        addNode(graph, 'misc_node_target_peer', 200);

        graph.addDirectedEdgeWithKey(
            'line_source_peer',
            'misc_node_source_peer',
            'stn_source',
            makeBezierEdgeAttrs(RED, { x: 0, y: 0 }, { x: 11, y: 12 }, false)
        );
        graph.addDirectedEdgeWithKey(
            'line_target_peer',
            'stn_target',
            'misc_node_target_peer',
            makeBezierEdgeAttrs(RED, { x: 21, y: 22 })
        );
        graph.addDirectedEdgeWithKey('line_selected', 'stn_source', 'stn_target', makeDiagonalEdgeAttrs(RED));

        expect(changeLinePathType(graph, 'line_selected', LinePathType.Bezier, false)).toBe(true);
        normalizeEdgeAttributes(graph, ['line_selected']);

        expect(graph.getEdgeAttribute('line_selected', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 11, y: 12 },
            targetOffset: { x: 21, y: 22 },
        });
    });

    it('aligns a Bezier edge when changing its style type into an existing group', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_center', 0);
        addNode(graph, 'misc_node_peer', -100);
        addNode(graph, 'misc_node_target', 100);

        graph.addDirectedEdgeWithKey(
            'line_peer',
            'misc_node_peer',
            'stn_center',
            makeBezierEdgeAttrs(RED, { x: 0, y: 0 }, { x: 31, y: 32 })
        );
        graph.addDirectedEdgeWithKey(
            'line_selected',
            'stn_center',
            'misc_node_target',
            makeBezierEdgeAttrs(RED, { x: 1, y: 2 }, { x: 3, y: 4 }, true, LineStyleType.Unknown)
        );

        expect(changeLineStyleType(graph, 'line_selected', LineStyleType.SingleColor, RED)).toBe(true);
        normalizeEdgeAttributes(graph, ['line_selected']);

        expect(graph.getEdgeAttribute('line_selected', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 31, y: 32 },
            targetOffset: { x: 3, y: 4 },
        });
    });

    it('aligns a Bezier edge when a batch color change moves it into an existing group', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        addNode(graph, 'stn_center', 0);
        addNode(graph, 'misc_node_peer', -100);
        addNode(graph, 'misc_node_target', 100);

        graph.addDirectedEdgeWithKey(
            'line_peer',
            'misc_node_peer',
            'stn_center',
            makeBezierEdgeAttrs(RED, { x: 0, y: 0 }, { x: 41, y: 42 }, false)
        );
        graph.addDirectedEdgeWithKey(
            'line_selected',
            'stn_center',
            'misc_node_target',
            makeBezierEdgeAttrs(BLUE, { x: 5, y: 6 }, { x: 7, y: 8 })
        );

        expect(changeLinesColorInBatch(graph, BLUE, RED, ['line_peer', 'line_selected'])).toEqual(['line_selected']);
        normalizeEdgeAttributes(graph, ['line_selected']);

        expect(graph.getEdgeAttribute('line_selected', LinePathType.Bezier)).toMatchObject({
            sourceOffset: { x: 41, y: 42 },
            targetOffset: { x: 7, y: 8 },
        });
    });
});
