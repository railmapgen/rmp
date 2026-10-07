import { MultiDirectedGraph } from 'graphology';
import { nanoid } from 'nanoid';
import { EdgeAttributes, GraphAttributes, LocalStorageKey, NodeAttributes } from '../constants/constants';
import { LineDefinition } from '../constants/line-definitions';
import { MiscNodeType } from '../constants/nodes';
import { image_endpoint } from '../constants/server';
import { createEmptyTimelineDocument, TimelineDocument } from '../constants/timeline';
import { DEFAULT_MAP_STYLE, normalizeMapStyle } from '../map/map-style';
import { blobToBase64 } from '../util/binary';
import { reconcileLineDefinitions } from '../util/line-definitions';
import { yieldLineCalculation } from '../util/line-export';
import { RMPSave, upgradeWithoutBackup } from '../util/save';
import { normalizeTimelineDocument } from '../util/timeline';
import { populateTimelineFromLineInformation } from '../util/timeline-line-import';
import { timelineProjectDB } from './timeline-project-db';
import {
    TIMELINE_PROJECT_APP,
    TIMELINE_PROJECT_VERSION,
    TimelineAssetRecord,
    TimelineProjectFile,
    TimelineProjectRecord,
    TimelineProjectRevision,
} from './timeline-project';

type TimelineGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

const dataUrlToBlob = async (data: string) => {
    const response = await fetch(data);
    if (!response.ok) throw new Error('Unable to decode embedded Timeline resource');
    return response.blob();
};

const getImageReferences = (graph: TimelineGraph) =>
    graph
        .filterNodes((_id, attributes) => attributes.type === MiscNodeType.Image)
        .map(id => graph.getNodeAttribute(id, MiscNodeType.Image)?.href)
        .filter((id): id is string => typeof id === 'string');

const collectRmpImageAssets = async (save: RMPSave, graph: TimelineGraph) => {
    const embedded = new Map((save.images ?? []).map(image => [image.id, image.base64]));
    const assets: Omit<TimelineAssetRecord, 'key' | 'projectId'>[] = [];

    for (const id of new Set(getImageReferences(graph))) {
        const data = embedded.get(id);
        if (data) {
            assets.push({ id, kind: 'image', blob: await dataUrlToBlob(data) });
            continue;
        }

        const nodeId = graph.findNode((_node, attributes) => attributes[MiscNodeType.Image]?.href === id);
        const hash = nodeId ? graph.getNodeAttribute(nodeId, MiscNodeType.Image)?.hash : undefined;
        if (id.startsWith('img-s_') && hash) {
            const serverId = id.slice(6);
            const response = await fetch(`${image_endpoint}/data/${serverId}/${hash}`);
            if (response.ok) {
                assets.push({ id, kind: 'image', blob: await response.blob() });
                continue;
            }
        }
        throw new Error(`Missing image resource: ${id}`);
    }
    return assets;
};

export interface ParsedRmpTimelineSource {
    revision: TimelineProjectRevision;
    assets: Omit<TimelineAssetRecord, 'key' | 'projectId'>[];
}

export interface RmpTimelineImportOptions {
    applyLineInformation?: boolean;
}

/**
 * Build a self-contained RMP source from the project currently saved by the
 * painter. This bridge is only invoked by an explicit Timeline menu action;
 * importing Timeline itself does not read the painter's LocalStorage or image
 * database.
 */
export const getOpenRmpProjectSource = async (): Promise<string> => {
    const source = window.localStorage.getItem(LocalStorageKey.PARAM);
    if (!source) throw new Error('No project is currently open in the painter');

    await yieldLineCalculation();
    const save = JSON.parse(await upgradeWithoutBackup(source)) as RMPSave;
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.import(save.graph);
    const localImageIds = [...new Set(getImageReferences(graph).filter(id => id.startsWith('img-l')))];
    if (localImageIds.length === 0) return JSON.stringify(save);

    const { imageStoreIndexedDB } = await import('../util/image-store-indexed-db');
    const images = await Promise.all(
        localImageIds.map(async id => {
            const base64 = await imageStoreIndexedDB.get(id);
            if (!base64) throw new Error(`Missing image resource: ${id}`);
            return { id, base64 };
        })
    );
    return JSON.stringify({ ...save, images });
};

export const parseRmpTimelineSource = async (
    source: string,
    fallbackLineDefinitions?: LineDefinition[]
): Promise<ParsedRmpTimelineSource> => {
    await yieldLineCalculation();
    const upgraded = await upgradeWithoutBackup(source);
    const save = JSON.parse(upgraded) as RMPSave;
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    // Before its first line-information request, a painter save may have no IDs.
    // Reuse the imported ownership when syncing such a source so Timeline labels
    // retain their identity. Explicit painter definitions always take precedence.
    const sourceGraph =
        fallbackLineDefinitions && !save.graph.attributes?.lineDefinitions
            ? {
                  ...save.graph,
                  attributes: {
                      ...save.graph.attributes,
                      lineDefinitions: structuredClone(fallbackLineDefinitions),
                  },
              }
            : save.graph;
    // Painter saves can retain stale ownership until a consumer requests line information.
    graph.import(reconcileLineDefinitions(sourceGraph));

    return {
        revision: {
            rmpVersion: save.version,
            graph: graph.export(),
            mapEnabled: !!save.mapEnabled,
            mapStyle: normalizeMapStyle(save.mapStyle ?? DEFAULT_MAP_STYLE),
            svgViewBoxZoom: typeof save.svgViewBoxZoom === 'number' ? save.svgViewBoxZoom : 100,
            svgViewBoxMin:
                typeof save.svgViewBoxMin?.x === 'number' && typeof save.svgViewBoxMin?.y === 'number'
                    ? save.svgViewBoxMin
                    : { x: 0, y: 0 },
            // A Timeline project always starts with a new, empty document.
            timeline: createEmptyTimelineDocument(),
        },
        assets: await collectRmpImageAssets(save, graph),
    };
};

export const createTimelineProjectFromParsedRmp = async (
    parsed: ParsedRmpTimelineSource,
    name: string,
    options: RmpTimelineImportOptions = {}
): Promise<TimelineProjectRecord> => {
    const revision = structuredClone(parsed.revision);
    if (options.applyLineInformation) {
        await yieldLineCalculation();
        revision.timeline = populateTimelineFromLineInformation(revision.graph, revision.timeline);
    }
    const now = Date.now();
    const record: TimelineProjectRecord = {
        id: `timeline_project_${nanoid(12)}`,
        name,
        version: TIMELINE_PROJECT_VERSION,
        createdAt: now,
        updatedAt: now,
        revision,
    };
    await timelineProjectDB.createProject(record, parsed.assets);
    return record;
};

export const createTimelineProjectFromRmp = async (
    source: string,
    name: string,
    options: RmpTimelineImportOptions = {}
): Promise<TimelineProjectRecord> =>
    createTimelineProjectFromParsedRmp(await parseRmpTimelineSource(source), name, options);

const normalizeTimelineProjectFile = (raw: unknown): TimelineProjectFile => {
    if (!raw || typeof raw !== 'object') throw new Error('Invalid Timeline project file');
    const file = raw as Partial<TimelineProjectFile>;
    if (file.app !== TIMELINE_PROJECT_APP) throw new Error('This is not a Timeline project file');
    if (file.version !== TIMELINE_PROJECT_VERSION)
        throw new Error(`Unsupported Timeline project version: ${file.version}`);
    const revision = file.revision as Partial<TimelineProjectRevision> | undefined;
    if (
        !revision?.graph ||
        !Number.isInteger(revision.rmpVersion) ||
        typeof revision.mapEnabled !== 'boolean' ||
        !revision.mapStyle ||
        typeof revision.svgViewBoxZoom !== 'number' ||
        !Number.isFinite(revision.svgViewBoxZoom) ||
        typeof revision.svgViewBoxMin?.x !== 'number' ||
        typeof revision.svgViewBoxMin?.y !== 'number' ||
        typeof file.name !== 'string' ||
        !Array.isArray(file.assets)
    ) {
        throw new Error('Invalid Timeline project file');
    }
    const validRevision = revision as TimelineProjectRevision;
    const graph = new MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>();
    graph.import(validRevision.graph);
    return {
        app: TIMELINE_PROJECT_APP,
        version: TIMELINE_PROJECT_VERSION,
        name: file.name,
        revision: {
            ...structuredClone(validRevision),
            graph: graph.export(),
            mapStyle: normalizeMapStyle(validRevision.mapStyle),
            timeline: normalizeTimelineDocument(validRevision.timeline),
        },
        assets: file.assets.filter(
            asset =>
                asset &&
                (asset.kind === 'image' || asset.kind === 'audio') &&
                typeof asset.id === 'string' &&
                typeof asset.data === 'string'
        ),
    };
};

export const importTimelineProjectFile = async (source: string): Promise<TimelineProjectRecord> => {
    const file = normalizeTimelineProjectFile(JSON.parse(source));
    const assets = await Promise.all(
        file.assets.map(async asset => ({
            id: asset.id,
            kind: asset.kind,
            name: asset.name,
            blob: await dataUrlToBlob(asset.data),
        }))
    );
    const now = Date.now();
    const record: TimelineProjectRecord = {
        id: `timeline_project_${nanoid(12)}`,
        name: file.name,
        version: TIMELINE_PROJECT_VERSION,
        createdAt: now,
        updatedAt: now,
        revision: file.revision,
    };
    await timelineProjectDB.createProject(record, assets);
    return record;
};

export const exportTimelineProjectFile = async (record: TimelineProjectRecord): Promise<string> => {
    const assets = await timelineProjectDB.getAssets(record.id);
    const file: TimelineProjectFile = {
        app: TIMELINE_PROJECT_APP,
        version: TIMELINE_PROJECT_VERSION,
        name: record.name,
        revision: structuredClone(record.revision),
        assets: await Promise.all(
            assets.map(async asset => ({
                kind: asset.kind,
                id: asset.id,
                name: asset.name,
                data: await blobToBase64(asset.blob),
            }))
        ),
    };
    return JSON.stringify(file);
};

/** Remove missing map references and rebase independently placed clip anchors. */
export const reconcileTimelineAfterRmpSync = (timeline: TimelineDocument, graph: TimelineGraph): TimelineDocument => {
    const retainedIndexes: number[] = [];
    const track = timeline.track.filter((entry, index) => {
        const keep =
            entry.kind === 'pause' ||
            (entry.kind === 'node' && graph.hasNode(entry.refId)) ||
            (entry.kind === 'edge' && graph.hasEdge(entry.refId)) ||
            (entry.kind === 'keyframe' && graph.hasNode(entry.refId));
        if (keep) retainedIndexes.push(index);
        return keep;
    });
    const mapSlot = (slot: number) => retainedIndexes.filter(index => index < slot).length;
    const audioTrack = timeline.audioTrack?.map(entry => {
        const startSlot = Math.min(track.length, mapSlot(Math.round(entry.startSlot)));
        const endSlot = Math.min(track.length, Math.max(startSlot, mapSlot(Math.round(entry.endSlot))));
        return { ...entry, startSlot, endSlot };
    });
    const labelTrack = timeline.labelTrack?.map(entry => {
        const startSlot = Math.min(track.length, mapSlot(Math.round(entry.startSlot)));
        const endSlot = Math.min(track.length, Math.max(startSlot, mapSlot(Math.round(entry.endSlot))));
        return { ...entry, startSlot, endSlot };
    });
    return { ...timeline, track, ...(audioTrack ? { audioTrack } : {}), ...(labelTrack ? { labelTrack } : {}) };
};

export const prepareTimelineProjectSync = async (
    source: string,
    current: TimelineProjectRevision,
    options: RmpTimelineImportOptions = {}
) => {
    const parsed = await parseRmpTimelineSource(source, current.graph.attributes.lineDefinitions);
    // Video labels belong to the Timeline project. Refresh the imported railway
    // metadata while retaining overrides only for surviving, stable line IDs.
    const labels = new Map(
        (current.graph.attributes.lineDefinitions ?? [])
            .filter(line => line.videoLabel)
            .map(line => [line.id, line.videoLabel!] as const)
    );
    const definitions = parsed.revision.graph.attributes.lineDefinitions;
    if (definitions) {
        parsed.revision.graph.attributes.lineDefinitions = definitions.map(line => {
            const videoLabel = labels.get(line.id);
            return videoLabel ? { ...line, videoLabel: structuredClone(videoLabel) } : line;
        });
    }
    const graph = MultiDirectedGraph.from(parsed.revision.graph) as TimelineGraph;
    const currentGraph = MultiDirectedGraph.from(current.graph) as TimelineGraph;
    const reconciled = reconcileTimelineAfterRmpSync(current.timeline, graph);
    if (options.applyLineInformation) await yieldLineCalculation();
    const timeline = options.applyLineInformation
        ? populateTimelineFromLineInformation(parsed.revision.graph, reconciled)
        : reconciled;
    return {
        revision: { ...parsed.revision, timeline },
        assets: parsed.assets,
        removedEntries: current.timeline.track.length - reconciled.track.length,
        nodeCount: graph.order,
        edgeCount: graph.size,
        changes: {
            addedNodes: graph.filterNodes(id => !currentGraph.hasNode(id)).length,
            removedNodes: currentGraph.filterNodes(id => !graph.hasNode(id)).length,
            addedEdges: graph.filterEdges(id => !currentGraph.hasEdge(id)).length,
            removedEdges: currentGraph.filterEdges(id => !graph.hasEdge(id)).length,
        },
    };
};

export const getTimelineRevisionAssetIds = (revision: TimelineProjectRevision) => {
    const graph = MultiDirectedGraph.from(revision.graph) as TimelineGraph;
    return {
        image: new Set(getImageReferences(graph)),
        audio: new Set((revision.timeline.audioTrack ?? []).map(entry => entry.blobId)),
    };
};
