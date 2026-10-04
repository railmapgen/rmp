import routingSnapshot from './map-routing.generated.json';

// This checked-in snapshot combines rmp-tiles/config/maps.json with
// rmp-tiles/routing/z8-owners.rle.json so registry and ownership ship atomically with RMP.

const MAP_ROUTING_FORMAT_VERSION = 1 as const;
const MAP_OWNER_ZOOM = 8 as const;
const MAP_OWNER_WIDTH = 2 ** MAP_OWNER_ZOOM;
const MAP_OWNER_COUNT = MAP_OWNER_WIDTH * MAP_OWNER_WIDTH;

export interface MapRegionSource {
    readonly id: string;
    readonly ownerId: number;
    readonly origin: string;
}

export interface MapRouting {
    readonly formatVersion: typeof MAP_ROUTING_FORMAT_VERSION;
    readonly ownerZoom: typeof MAP_OWNER_ZOOM;
    readonly owners: Uint8Array;
    readonly regions: ReadonlyMap<number, MapRegionSource>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

const requireInteger = (value: unknown, label: string) => {
    if (!Number.isInteger(value)) throw new Error(`${label} must be an integer`);
    return value as number;
};

const parseRegion = (value: unknown, index: number): MapRegionSource => {
    if (!isRecord(value)) throw new Error(`Map routing region ${index} must be an object`);
    const id = value.id;
    const ownerId = requireInteger(value.ownerId, `Map routing region ${index} ownerId`);
    const origin = value.origin;
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) {
        throw new Error(`Map routing region ${index} has an invalid id`);
    }
    if (ownerId < 1 || ownerId > 255) {
        throw new Error(`Map routing region ${id} ownerId must be between 1 and 255`);
    }
    if (typeof origin !== 'string') throw new Error(`Map routing region ${id} has an invalid origin`);
    let url: URL;
    try {
        url = new URL(origin);
    } catch (error) {
        throw new Error(`Map routing region ${id} has an invalid origin`, { cause: error });
    }
    if (url.protocol !== 'https:' || url.origin !== origin) {
        throw new Error(`Map routing region ${id} origin must be a canonical HTTPS origin`);
    }
    return { id, ownerId, origin };
};

/** Decodes the checked-in regional registry and sparse z8 owner runs into one release snapshot. */
export const decodeMapRouting = (value: unknown): MapRouting => {
    if (!isRecord(value)) throw new Error('Map routing snapshot must be an object');
    if (value.formatVersion !== MAP_ROUTING_FORMAT_VERSION) {
        throw new Error(`Map routing format version must be ${MAP_ROUTING_FORMAT_VERSION}`);
    }
    if (value.ownerZoom !== MAP_OWNER_ZOOM) throw new Error(`Map routing owner zoom must be ${MAP_OWNER_ZOOM}`);
    if (!Array.isArray(value.regions) || value.regions.length === 0) {
        throw new Error('Map routing regions must be a non-empty array');
    }
    if (!Array.isArray(value.runs)) throw new Error('Map routing runs must be an array');

    const regionEntries = value.regions.map(parseRegion);
    if (new Set(regionEntries.map(region => region.id)).size !== regionEntries.length) {
        throw new Error('Map routing region ids must be unique');
    }
    if (new Set(regionEntries.map(region => region.ownerId)).size !== regionEntries.length) {
        throw new Error('Map routing owner ids must be unique');
    }
    if (new Set(regionEntries.map(region => region.origin)).size !== regionEntries.length) {
        throw new Error('Map routing region origins must be unique');
    }
    const regions = new Map(regionEntries.map(region => [region.ownerId, region] as const));
    const owners = new Uint8Array(MAP_OWNER_COUNT);
    let previousEnd = 0;
    let previousOwnerId = 0;

    value.runs.forEach((run, index) => {
        if (!isRecord(run)) throw new Error(`Map routing run ${index} must be an object`);
        const start = requireInteger(run.start, `Map routing run ${index} start`);
        const length = requireInteger(run.length, `Map routing run ${index} length`);
        const ownerId = requireInteger(run.ownerId, `Map routing run ${index} ownerId`);
        const end = start + length;
        if (start < previousEnd || start < 0 || length < 1 || end > MAP_OWNER_COUNT) {
            throw new Error(`Map routing run ${index} has invalid bounds`);
        }
        if (!regions.has(ownerId)) {
            throw new Error(`Map routing run ${index} ownerId ${ownerId} is absent from the region registry`);
        }
        if (start === previousEnd && ownerId === previousOwnerId) {
            throw new Error('Adjacent map routing runs with the same ownerId must be merged');
        }
        owners.fill(ownerId, start, end);
        previousEnd = end;
        previousOwnerId = ownerId;
    });

    return { formatVersion: MAP_ROUTING_FORMAT_VERSION, ownerZoom: MAP_OWNER_ZOOM, owners, regions };
};

/** Maps any supported logical tile to its single z8 owner, returning zero for invalid or unowned coordinates. */
export const ownerForTile = (routing: MapRouting, zoom: number, x: number, y: number) => {
    if (
        !Number.isInteger(zoom) ||
        !Number.isInteger(x) ||
        !Number.isInteger(y) ||
        zoom < routing.ownerZoom ||
        zoom > 30
    ) {
        return 0;
    }
    const extent = 2 ** zoom;
    if (x < 0 || y < 0 || x >= extent || y >= extent) return 0;
    const divisor = 2 ** (zoom - routing.ownerZoom);
    const ownerX = Math.floor(x / divisor);
    const ownerY = Math.floor(y / divisor);
    return routing.owners[ownerY * MAP_OWNER_WIDTH + ownerX] ?? 0;
};

/** Resolves a tile directly to its configured origin without probing any other region. */
export const sourceForTile = (routing: MapRouting, zoom: number, x: number, y: number) => {
    const ownerId = ownerForTile(routing, zoom, x, y);
    if (ownerId === 0) return undefined;
    const source = routing.regions.get(ownerId);
    if (!source) throw new Error(`Unknown regional map owner ${ownerId}`);
    return source;
};

export const MAP_ROUTING = decodeMapRouting(routingSnapshot as unknown);
