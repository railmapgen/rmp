import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it, vi } from 'vitest';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { LinePathType, LineStyleType } from '../constants/lines';
import { MiscNodeType } from '../constants/nodes';
import { StationType } from '../constants/stations';
import { createEmptyTimelineDocument, TimelineDocument } from '../constants/timeline';
import { DEFAULT_MAP_STYLE } from '../map/map-style';
import { blobToBase64 } from '../util/binary';
import { CURRENT_VERSION } from '../util/save';
import { createTestLineGraph } from '../test-utils';
import { timelineProjectDB } from './timeline-project-db';
import {
    createTimelineProjectFromRmp,
    exportTimelineProjectFile,
    getOpenRmpProjectSource,
    importTimelineProjectFile,
    parseRmpTimelineSource,
    prepareTimelineProjectSync,
} from './timeline-project-io';
import { TimelineAssetRecord, TimelineProjectRecord, TimelineProjectRevision } from './timeline-project';

type Graph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;
const makeStationAttributes = (name: string) =>
    ({
        visible: true,
        zIndex: 0,
        x: 0,
        y: 0,
        type: StationType.ShmetroBasic,
        [StationType.ShmetroBasic]: {
            names: [name, name],
            nameOffsetX: 'right',
            nameOffsetY: 'top',
        },
    }) as NodeAttributes;

const makeRmpSave = (graph: Graph, overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
        version: CURRENT_VERSION,
        graph: graph.export(),
        mapEnabled: false,
        mapStyle: structuredClone(DEFAULT_MAP_STYLE),
        svgViewBoxZoom: 100,
        svgViewBoxMin: { x: 0, y: 0 },
        ...overrides,
    });

describe('Timeline project import and sync', () => {
    it('copies RMP map state and images into a project with an empty Timeline', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('misc_node_image', {
            visible: true,
            zIndex: 0,
            x: 10,
            y: 20,
            type: MiscNodeType.Image,
            [MiscNodeType.Image]: {
                type: 'local',
                href: 'img-l_fixture',
                scale: 1,
                rotate: 0,
                opacity: 1,
            },
        } as NodeAttributes);
        const parsed = await parseRmpTimelineSource(
            makeRmpSave(graph, {
                mapEnabled: true,
                mapStyle: { roads: {}, rails: {}, labels: { enabled: true, categories: {} } },
                svgViewBoxZoom: 175,
                svgViewBoxMin: { x: 12, y: 34 },
                images: [{ id: 'img-l_fixture', base64: 'data:text/plain;base64,aW1hZ2U=' }],
            })
        );

        expect(parsed.revision.mapEnabled).toBe(true);
        expect(parsed.revision.svgViewBoxZoom).toBe(175);
        expect(parsed.revision.svgViewBoxMin).toEqual({ x: 12, y: 34 });
        expect(parsed.revision.mapStyle.labels.categories['place-major']).toEqual(
            DEFAULT_MAP_STYLE.labels.categories['place-major']
        );
        expect(parsed.revision.timeline).toEqual(createEmptyTimelineDocument());
        expect(parsed.assets).toHaveLength(1);
        expect(await blobToBase64(parsed.assets[0].blob)).toBe('data:text/plain;base64,aW1hZ2U=');
    });

    it('builds a self-contained source from the project open in the painter on demand', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('misc_node_open_image', {
            visible: true,
            zIndex: 0,
            x: 10,
            y: 20,
            type: MiscNodeType.Image,
            [MiscNodeType.Image]: {
                type: 'local',
                href: 'img-l_open-project',
                scale: 1,
                rotate: 0,
                opacity: 1,
            },
        } as NodeAttributes);
        const { imageStoreIndexedDB } = await import('../util/image-store-indexed-db');
        await imageStoreIndexedDB.save('img-l_open-project', 'data:text/plain;base64,b3Blbg==');
        localStorage.setItem(LocalStorageKey.PARAM, makeRmpSave(graph));

        const source = JSON.parse(await getOpenRmpProjectSource());

        expect(source.images).toEqual([{ id: 'img-l_open-project', base64: 'data:text/plain;base64,b3Blbg==' }]);
        localStorage.removeItem(LocalStorageKey.PARAM);
        await imageStoreIndexedDB.delete('img-l_open-project');
    });

    it('recalculates stale painter line memberships when Timeline requests current RMP data', async () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
        ]);
        const line = graph.getAttribute('lineDefinitions')![0];
        line.edgeIds = ['line_0', 'line_removed'];
        line.name = ['保留名称', 'Kept name'];
        line.exportStartStationId = 'stn_C';
        localStorage.setItem(LocalStorageKey.PARAM, makeRmpSave(graph));

        try {
            const source = await getOpenRmpProjectSource();
            const parsed = await parseRmpTimelineSource(source);
            const fresh = parsed.revision.graph.attributes.lineDefinitions!;

            expect(fresh).toHaveLength(1);
            expect(fresh[0]).toMatchObject({
                id: line.id,
                name: line.name,
                edgeIds: ['line_0', 'line_1'],
                exportStartStationId: 'stn_C',
            });
            expect(graph.getAttribute('lineDefinitions')![0].edgeIds).toEqual(['line_0', 'line_removed']);
        } finally {
            localStorage.removeItem(LocalStorageKey.PARAM);
        }
    });

    it('keeps derived line identities and Timeline labels across requests from a painter save without definitions', async () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
        ]);
        graph.removeAttribute('lineDefinitions');
        const painterSource = makeRmpSave(graph);
        localStorage.setItem(LocalStorageKey.PARAM, painterSource);

        try {
            const original = await createTimelineProjectFromRmp(await getOpenRmpProjectSource(), 'Derived labels');
            const line = original.revision.graph.attributes.lineDefinitions![0];
            line.name = ['现有线路', 'Existing line'];
            line.lineNumber = 'L1';
            line.openingDate = '2000-01-01';
            line.exportStartStationId = 'stn_C';
            line.videoLabel = {
                name: ['视频名称', 'Video label'],
                lineNumber: 'V1',
                openingDate: '2024-02-29',
                color: '#0088cc',
            };

            let current = original.revision;
            for (let request = 0; request < 2; request++) {
                const result = await prepareTimelineProjectSync(await getOpenRmpProjectSource(), current);
                expect(result.revision.graph.attributes.lineDefinitions).toEqual([line]);
                current = result.revision;
            }
            expect(localStorage.getItem(LocalStorageKey.PARAM)).toBe(painterSource);

            graph.addNode('stn_D', makeStationAttributes('D'));
            graph.addDirectedEdgeWithKey('line_2', 'stn_C', 'stn_D', graph.getEdgeAttributes('line_1'));
            localStorage.setItem(LocalStorageKey.PARAM, makeRmpSave(graph));
            const extended = await prepareTimelineProjectSync(await getOpenRmpProjectSource(), current);
            expect(extended.revision.graph.attributes.lineDefinitions).toEqual([
                {
                    ...line,
                    edgeIds: ['line_0', 'line_1', 'line_2'],
                    exportStartStationId: 'stn_A',
                },
            ]);
            expect(original.revision.graph.attributes.lineDefinitions![0]).toEqual(line);
        } finally {
            localStorage.removeItem(LocalStorageKey.PARAM);
        }
    });

    it('fails before creating a project when a referenced image is missing', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('misc_node_image', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: MiscNodeType.Image,
            [MiscNodeType.Image]: {
                type: 'local',
                href: 'img-l_missing',
                scale: 1,
                rotate: 0,
                opacity: 1,
            },
        } as NodeAttributes);

        await expect(createTimelineProjectFromRmp(makeRmpSave(graph), 'Broken')).rejects.toThrow(
            'Missing image resource: img-l_missing'
        );
        expect((await timelineProjectDB.listProjects()).some(project => project.name === 'Broken')).toBe(false);
    });

    it('optionally persists a Timeline populated from the imported line information', async () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['B', 'C'],
        ]);
        graph.getAttribute('lineDefinitions')![0].exportStartStationId = 'stn_C';
        const source = makeRmpSave(graph);
        const empty = await createTimelineProjectFromRmp(source, 'Manual Timeline');
        const populated = await createTimelineProjectFromRmp(source, 'Automatic Timeline', {
            applyLineInformation: true,
        });

        expect(empty.revision.timeline.track).toEqual([]);
        expect(populated.revision.timeline.track.map(entry => entry.refId)).toEqual([
            'stn_C',
            'line_1',
            'stn_B',
            'line_0',
            'stn_A',
        ]);
        expect(await timelineProjectDB.getProject(populated.id)).toEqual(populated);
    });

    it('exports and imports a self-contained project with image and audio under a new local id', async () => {
        const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        graph.addNode('misc_node_image', {
            visible: true,
            zIndex: 0,
            x: 0,
            y: 0,
            type: MiscNodeType.Image,
            [MiscNodeType.Image]: {
                type: 'local',
                href: 'img-l_roundtrip',
                scale: 1,
                rotate: 0,
                opacity: 1,
            },
        } as NodeAttributes);
        const timeline: TimelineDocument = {
            ...createEmptyTimelineDocument(),
            settings: {
                cameraZoom: 8,
                speedMultiplier: 1.7,
                autoChangeStationType: false,
                showYear: true,
                showLineName: true,
                showLineLength: true,
                lineLengthUnit: 'mi' as const,
            },
            labelTrack: [
                {
                    id: 'label',
                    kind: 'label',
                    text: '中文说明\nEnglish <caption>',
                    startSlot: 0,
                    endSlot: 1,
                    startTime: 0.125,
                    endTime: 8.75,
                },
            ],
            audioTrack: [
                {
                    id: 'audio-entry',
                    kind: 'audio',
                    blobId: 'audio-blob',
                    name: 'sound.txt',
                    startSlot: 0,
                    endSlot: 0,
                    startTime: 0.125,
                    endTime: 8.75,
                },
            ],
        };
        const original: TimelineProjectRecord = {
            id: 'original-local-id',
            name: 'Round trip',
            version: 1,
            createdAt: 1,
            updatedAt: 1,
            revision: {
                rmpVersion: CURRENT_VERSION,
                graph: graph.export(),
                mapEnabled: false,
                mapStyle: structuredClone(DEFAULT_MAP_STYLE),
                svgViewBoxZoom: 100,
                svgViewBoxMin: { x: 0, y: 0 },
                timeline,
            },
        };
        const exportedAssets: TimelineAssetRecord[] = [
            {
                key: 'image-key',
                projectId: original.id,
                kind: 'image',
                id: 'img-l_roundtrip',
                blob: new Blob(['picture'], { type: 'text/plain' }),
            },
            {
                key: 'audio-key',
                projectId: original.id,
                kind: 'audio',
                id: 'audio-blob',
                blob: new Blob(['sound'], { type: 'text/plain' }),
                name: 'sound.txt',
            },
        ];
        const getAssetsSpy = vi.spyOn(timelineProjectDB, 'getAssets').mockResolvedValue(exportedAssets);
        let importedAssets: Omit<TimelineAssetRecord, 'key' | 'projectId'>[] = [];
        const createProjectSpy = vi
            .spyOn(timelineProjectDB, 'createProject')
            .mockImplementation(async (_record, assets) => {
                importedAssets = assets;
            });

        const exported = await exportTimelineProjectFile(original);
        const imported = await importTimelineProjectFile(exported);
        getAssetsSpy.mockRestore();
        createProjectSpy.mockRestore();

        expect(imported.id).not.toBe(original.id);
        expect(imported.name).toBe(original.name);
        expect(imported.revision).toEqual(original.revision);
        expect(importedAssets.map(asset => `${asset.kind}:${asset.id}`).sort()).toEqual([
            'audio:audio-blob',
            'image:img-l_roundtrip',
        ]);
        expect(await blobToBase64(importedAssets.find(asset => asset.kind === 'audio')!.blob)).toBe(
            'data:text/plain;base64,c291bmQ='
        );
    });

    it('prunes invalid entries and remaps audio slots during manual RMP sync', async () => {
        const oldGraph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        oldGraph.addNode('stn_keep', makeStationAttributes('Keep'));
        oldGraph.addNode('stn_remove', makeStationAttributes('Remove'));
        oldGraph.addDirectedEdgeWithKey('line_remove', 'stn_keep', 'stn_remove', {
            visible: true,
            zIndex: 0,
            type: LinePathType.Simple,
            [LinePathType.Simple]: { offset: 0 },
            style: LineStyleType.SingleColor,
            [LineStyleType.SingleColor]: { color: ['shanghai', 'sh1', '#f00', '#fff'] },
            reconcileId: '',
            parallelIndex: -1,
        } as EdgeAttributes);
        const timeline: TimelineDocument = {
            version: 1,
            track: [
                { id: 'keep', kind: 'node', refId: 'stn_keep', phase: 'enter', showAnimation: true },
                { id: 'remove-node', kind: 'node', refId: 'stn_remove', phase: 'enter', showAnimation: true },
                { id: 'remove-edge', kind: 'edge', refId: 'line_remove', phase: 'enter', showAnimation: true },
                { id: 'remove-keyframe', kind: 'keyframe', refId: 'stn_remove', x: 1, y: 2 },
                { id: 'pause', kind: 'pause', position: 'after', duration: 1 },
            ],
            labelTrack: [
                {
                    id: 'label',
                    kind: 'label',
                    text: 'Retained caption',
                    startSlot: 1,
                    endSlot: 5,
                    startTime: 0.125,
                    endTime: 8.75,
                },
            ],
            audioTrack: [
                {
                    id: 'audio',
                    kind: 'audio',
                    blobId: 'audio-blob',
                    name: 'audio',
                    startSlot: 1,
                    endSlot: 5,
                },
            ],
        };
        const current: TimelineProjectRevision = {
            rmpVersion: CURRENT_VERSION,
            graph: oldGraph.export(),
            mapEnabled: false,
            mapStyle: structuredClone(DEFAULT_MAP_STYLE),
            svgViewBoxZoom: 100,
            svgViewBoxMin: { x: 0, y: 0 },
            timeline,
        };
        const replacement = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
        replacement.addNode('stn_keep', makeStationAttributes('Keep updated'));

        const result = await prepareTimelineProjectSync(makeRmpSave(replacement, { mapEnabled: true }), current);

        expect(result.removedEntries).toBe(3);
        expect(result.revision.mapEnabled).toBe(true);
        expect(result.revision.timeline.track.map(entry => entry.id)).toEqual(['keep', 'pause']);
        expect(result.revision.timeline.audioTrack?.[0]).toMatchObject({ startSlot: 1, endSlot: 2 });
        expect(result.revision.timeline.labelTrack?.[0]).toMatchObject({
            startSlot: 1,
            endSlot: 2,
            text: 'Retained caption',
            startTime: 0.125,
            endTime: 8.75,
        });
    });

    it('preserves portable Timeline label overrides only for stable line IDs that survive RMP sync', async () => {
        const graph = createTestLineGraph([
            ['A', 'B'],
            ['C', 'D'],
            ['E', 'F'],
        ]);
        const definitions = graph.getAttribute('lineDefinitions')!;
        definitions.forEach((line, index) => {
            line.name = [`导入线路 ${index}`, `Imported ${index}`];
            line.openingDate = '1990-01-01';
            line.videoLabel = {
                name: [`视频线路 ${index}`, `Video ${index}`],
                lineNumber: `V${index}`,
                openingDate: '2024-02-29',
                color: '#0088cc',
            };
        });
        const original = await createTimelineProjectFromRmp(makeRmpSave(graph), 'Custom labels');
        const portable = await importTimelineProjectFile(await exportTimelineProjectFile(original));
        expect(portable.revision.graph.attributes.lineDefinitions).toEqual(definitions);

        const replacement = graph.copy();
        const nextDefinitions = structuredClone(definitions);
        nextDefinitions.forEach(line => delete line.videoLabel);
        nextDefinitions[0].name = ['新的铁路名称', 'Updated railway name'];
        nextDefinitions[0].openingDate = '2000-01-01';
        // A visually identical line with a new ID must not inherit a Timeline label.
        nextDefinitions[1].id = 'new-line-identity';
        replacement.dropNode('stn_E');
        replacement.dropNode('stn_F');
        nextDefinitions.pop();
        replacement.setAttribute('lineDefinitions', nextDefinitions);
        const result = await prepareTimelineProjectSync(makeRmpSave(replacement), portable.revision, {
            applyLineInformation: true,
        });
        const synchronized = result.revision.graph.attributes.lineDefinitions!;

        expect(synchronized).toHaveLength(2);
        expect(synchronized[0]).toMatchObject({
            id: definitions[0].id,
            name: ['新的铁路名称', 'Updated railway name'],
            openingDate: '2000-01-01',
            videoLabel: definitions[0].videoLabel,
        });
        expect(synchronized[0].videoLabel).not.toBe(definitions[0].videoLabel);
        expect(synchronized[1].id).toBe('new-line-identity');
        expect(synchronized[1].videoLabel).toBeUndefined();
        expect(synchronized.some(line => line.id === definitions[2].id)).toBe(false);
        expect(portable.revision.graph.attributes.lineDefinitions![0].name).toEqual(definitions[0].name);
        expect(
            JSON.parse(await exportTimelineProjectFile({ ...portable, revision: result.revision })).revision.graph
                .attributes.lineDefinitions
        ).toEqual(synchronized);
    });

    it('rejects unsupported Timeline file versions', async () => {
        await expect(
            importTimelineProjectFile(JSON.stringify({ app: 'rmp-timeline', version: 999, assets: [] }))
        ).rejects.toThrow('Unsupported Timeline project version');
    });
});
