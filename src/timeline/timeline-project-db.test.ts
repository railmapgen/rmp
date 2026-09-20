import { MultiDirectedGraph } from 'graphology';
import { describe, expect, it } from 'vitest';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { createEmptyTimelineDocument } from '../constants/timeline';
import { DEFAULT_MAP_STYLE } from '../map/map-style';
import { TimelineProjectDB } from './timeline-project-db';
import { TimelineProjectRecord } from './timeline-project';

const makeDB = () => new TimelineProjectDB(`RmpTimelineDB-test-${Date.now()}-${Math.random()}`);

const makeProject = (id: string, zoom = 100): TimelineProjectRecord => ({
    id,
    name: `Project ${id}`,
    version: 1,
    createdAt: 1,
    updatedAt: zoom,
    revision: {
        rmpVersion: 80,
        graph: new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>().export(),
        mapEnabled: false,
        mapStyle: structuredClone(DEFAULT_MAP_STYLE),
        svgViewBoxZoom: zoom,
        svgViewBoxMin: { x: 0, y: 0 },
        timeline: createEmptyTimelineDocument(),
    },
});

describe('TimelineProjectDB', () => {
    it('creates, lists, renames and deletes independent projects and assets', async () => {
        const db = makeDB();
        await db.createProject(makeProject('one'), [{ kind: 'image', id: 'shared-id', blob: new Blob(['one']) }]);
        await db.createProject(makeProject('two', 200), [
            { kind: 'image', id: 'shared-id', blob: new Blob(['two']), name: 'two' },
        ]);

        expect((await db.listProjects()).map(project => project.id)).toEqual(['two', 'one']);
        expect((await db.getAsset('one', 'image', 'shared-id'))?.projectId).toBe('one');
        expect((await db.getAsset('two', 'image', 'shared-id'))?.name).toBe('two');

        const renamed = await db.renameProject('one', 'Renamed');
        expect(renamed.name).toBe('Renamed');
        expect((await db.getProject('one'))?.name).toBe('Renamed');

        await db.deleteProject('one');
        expect(await db.getProject('one')).toBeUndefined();
        expect(await db.getAsset('one', 'image', 'shared-id')).toBeUndefined();
        expect(await db.getAsset('two', 'image', 'shared-id')).toBeDefined();
    });

    it('rolls back project and assets together when creation fails', async () => {
        const db = makeDB();
        await db.createProject(makeProject('duplicate'), []);

        await expect(
            db.createProject({ ...makeProject('duplicate'), name: 'Must not replace' }, [
                { kind: 'audio', id: 'rolled-back', blob: new Blob(['audio']) },
            ])
        ).rejects.toBeDefined();

        expect((await db.getProject('duplicate'))?.name).toBe('Project duplicate');
        expect(await db.getAsset('duplicate', 'audio', 'rolled-back')).toBeUndefined();
    });

    it('serializes writes per project so a slower earlier call cannot win', async () => {
        const db = makeDB();
        const initial = makeProject('ordered');
        await db.createProject(initial, []);

        const first = db.saveProject({ ...initial, revision: { ...initial.revision, svgViewBoxZoom: 120 } });
        const second = db.saveProject({ ...initial, revision: { ...initial.revision, svgViewBoxZoom: 240 } });
        await Promise.all([first, second]);

        expect((await db.getProject('ordered'))?.revision.svgViewBoxZoom).toBe(240);
    });

    it('garbage collects only unreferenced assets from the selected project', async () => {
        const db = makeDB();
        await db.createProject(makeProject('gc'), [
            { kind: 'image', id: 'keep-image', blob: new Blob(['keep']) },
            { kind: 'image', id: 'drop-image', blob: new Blob(['drop']) },
            { kind: 'audio', id: 'keep-audio', blob: new Blob(['keep']) },
            { kind: 'audio', id: 'drop-audio', blob: new Blob(['drop']) },
        ]);
        await db.garbageCollectAssets('gc', {
            image: new Set(['keep-image']),
            audio: new Set(['keep-audio']),
        });

        expect((await db.getAssets('gc')).map(asset => asset.id).sort()).toEqual(['keep-audio', 'keep-image']);
    });
});
