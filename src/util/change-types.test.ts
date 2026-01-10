import { MonoColour } from '@railmapgen/rmg-palette-resources';
import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { StationType } from '../constants/stations';
import { autoPopulateTransfer, autoUpdateStationType, checkAndChangeStationIntType } from './change-types';

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
        checkAndChangeStationIntType(graph, 'stn_1');

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
        checkAndChangeStationIntType(graph, 'stn_1');

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
        checkAndChangeStationIntType(graph, 'stn_1');

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
        checkAndChangeStationIntType(graph, 'stn_1');

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
});
