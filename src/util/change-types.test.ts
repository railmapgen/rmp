import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { CityCode, EdgeAttributes, GraphAttributes, NodeAttributes, Theme } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { StationType } from '../constants/stations';
import { checkAndChangeStationIntType } from './change-types';

describe('checkAndChangeStationIntType', () => {
    it('should change station to interchange type and populate transfer when multiple lines with different colors are connected', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add station nodes
        graph.addNode('stn1', {
            x: 0,
            y: 0,
            type: StationType.GzmtrBasic,
            zIndex: 0,
            visible: true,
            [StationType.GzmtrBasic]: {
                names: ['Station 1', 'Stn 1'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                open: true,
                secondaryNames: ['', ''],
                color: [CityCode.Guangzhou, 'gz1', '#F3D03E', '#000000'] as Theme,
            },
        });

        graph.addNode('stn2', { x: 100, y: 0, type: StationType.GzmtrBasic, zIndex: 0, visible: true });
        graph.addNode('stn3', { x: 0, y: 100, type: StationType.GzmtrBasic, zIndex: 0, visible: true });

        // Add two lines with different colors
        const line1Color: Theme = [CityCode.Guangzhou, 'gz1', '#F3D03E', '#000000'];
        const line2Color: Theme = [CityCode.Guangzhou, 'gz2', '#97D700', '#000000'];

        graph.addDirectedEdge('stn1', 'stn2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            color: line1Color,
            zIndex: 0,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line1Color,
            },
        });

        graph.addDirectedEdge('stn1', 'stn3', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            color: line2Color,
            zIndex: 0,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line2Color,
            },
        });

        // Call the function
        checkAndChangeStationIntType(graph, 'stn1');

        // Verify the station type changed to interchange
        expect(graph.getNodeAttribute('stn1', 'type')).toBe(StationType.GzmtrInt);

        // Verify the transfer property is populated
        const attrs = graph.getNodeAttribute('stn1', StationType.GzmtrInt);
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
        graph.addNode('stn1', {
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
                        [CityCode.Guangzhou, 'gz1', '#F3D03E', '#000000', '', ''],
                        [CityCode.Guangzhou, 'gz2', '#97D700', '#000000', '', ''],
                    ],
                ],
                open: true,
                secondaryNames: ['', ''],
                tram: false,
            },
        });

        graph.addNode('stn2', { x: 100, y: 0, type: StationType.GzmtrBasic, zIndex: 0, visible: true });

        // Add only one line with a single color
        const lineColor: Theme = [CityCode.Guangzhou, 'gz1', '#F3D03E', '#000000'];

        graph.addDirectedEdge('stn1', 'stn2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            color: lineColor,
            zIndex: 0,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
            },
            [LineStyleType.SingleColor]: {
                color: lineColor,
            },
        });

        // Call the function
        checkAndChangeStationIntType(graph, 'stn1');

        // Verify the station type changed to basic
        expect(graph.getNodeAttribute('stn1', 'type')).toBe(StationType.GzmtrBasic);

        // Verify the transfer property is cleared (should use default)
        const attrs = graph.getNodeAttribute('stn1', StationType.GzmtrBasic);
        expect(attrs).toBeDefined();
    });

    it('should not change station type when no lines are connected', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add station node without any edges
        graph.addNode('stn1', {
            x: 0,
            y: 0,
            type: StationType.GzmtrBasic,
            zIndex: 0,
            visible: true,
            [StationType.GzmtrBasic]: {
                names: ['Station 1', 'Stn 1'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                open: true,
                secondaryNames: ['', ''],
                color: [CityCode.Guangzhou, 'gz1', '#F3D03E', '#000000'] as Theme,
            },
        });

        // Call the function
        checkAndChangeStationIntType(graph, 'stn1');

        // Verify the station type remains the same
        expect(graph.getNodeAttribute('stn1', 'type')).toBe(StationType.GzmtrBasic);
    });

    it('should handle stations that do not have basic/int type pairs', () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();

        // Add a station type that doesn't have a -basic/-int pair (MTR)
        graph.addNode('stn1', {
            x: 0,
            y: 0,
            type: StationType.MTR,
            zIndex: 0,
            visible: true,
            [StationType.MTR]: {
                names: ['Central'],
                nameOffsetX: 'right' as const,
                nameOffsetY: 'top' as const,
                transfer: [[]],
            },
        });

        graph.addNode('stn2', { x: 100, y: 0, type: StationType.MTR, zIndex: 0, visible: true });
        graph.addNode('stn3', { x: 0, y: 100, type: StationType.MTR, zIndex: 0, visible: true });

        // Add two lines with different colors
        const line1Color: Theme = [CityCode.Hongkong, 'twl', '#FF0000', '#FFFFFF'];
        const line2Color: Theme = [CityCode.Hongkong, 'isl', '#0000FF', '#FFFFFF'];

        graph.addDirectedEdge('stn1', 'stn2', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            color: line1Color,
            zIndex: 0,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line1Color,
            },
        });

        graph.addDirectedEdge('stn1', 'stn3', {
            type: LinePathType.Diagonal,
            style: LineStyleType.SingleColor,
            color: line2Color,
            zIndex: 0,
            [LinePathType.Diagonal]: {
                startFrom: 'from',
                offsetFrom: 0,
                offsetTo: 0,
            },
            [LineStyleType.SingleColor]: {
                color: line2Color,
            },
        });

        // Call the function
        checkAndChangeStationIntType(graph, 'stn1');

        // Verify the station type remains MTR (no basic/int pair)
        expect(graph.getNodeAttribute('stn1', 'type')).toBe(StationType.MTR);

        // But the transfer property should be populated
        const attrs = graph.getNodeAttribute('stn1', StationType.MTR);
        expect(attrs).toBeDefined();
        expect(attrs!.transfer).toBeDefined();
        expect(attrs!.transfer[0]).toBeDefined();
        expect(attrs!.transfer[0].length).toBe(2);
    });
});
