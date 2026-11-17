import { createHash, blobToBase64 } from '../util/binary';
import { MAP_BUNDLE_SIDES, MAP_COMMON_ZOOM, MAP_TILE_SIZE } from './map-config';
import { MAP_LABEL_KINDS, normalizeLocalMapReference } from './map-style';
import { MAP_ROUTING, MapRouting } from './map-routing';
import { hasAvailableTile, parseAvailability, parseBundle } from './tile-format';
export { normalizeLocalMapReference } from './map-style';

// Semantic SVG profile shared with RMW; keep imported markup inert before mounting it.
const AREA_KINDS = [
    'landuse-residential',
    'landuse-commercial',
    'landuse-industrial',
    'landuse-education',
    'landuse-healthcare',
    'area-farmland',
    'area-forest',
    'area-grass',
    'area-park',
    'area-cemetery',
    'area-water',
];
const LINE_KINDS = ['road-path', 'road-local', 'road-collector', 'road-arterial', 'rail-metro', 'rail-national'];
const LABEL_KINDS = MAP_LABEL_KINDS;
type Tile = { x: number; y: number };

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const allowedElements = new Set(['g', 'path', 'text', 'tspan']);
const classes = new Set<string>([
    ...AREA_KINDS,
    ...LINE_KINDS,
    'building',
    'road-area',
    'road',
    'rail',
    'casing',
    'detail',
    'labels',
    ...LABEL_KINDS.map(kind => `label-${kind}`),
]);
const number = '[+-]?(?:(?:\\d+\\.?\\d*)|(?:\\.\\d+))(?:[eE][+-]?\\d+)?';
const numberList = new RegExp(`^\\s*${number}(?:[\\s,]+${number})*\\s*$`);
const pathData = /^[MmLlHhVvCcSsQqTtAaZz0-9eE+.,\s-]*$/;
const transforms = new RegExp(
    `(?:matrix|translate|scale|rotate|skewX|skewY)\\(\\s*${number}(?:[\\s,]+${number})*\\s*\\)`,
    'g'
);
const pathToken = new RegExp(`[MmLlHhVvCcSsQqTtAaZz]|${number}`, 'g');
const pathArity: Record<string, number> = { M: 2, L: 2, H: 1, V: 1, C: 6, S: 4, Q: 4, T: 2, A: 7, Z: 0 };
function validatePathData(value: string) {
    if (!value.trim() || !pathData.test(value) || value.replace(pathToken, '').replace(/[\s,]+/g, ''))
        throw new Error('Invalid SVG path data');
    const tokens = value.match(pathToken) ?? [];
    if (!tokens.length || !/^[Mm]$/.test(tokens[0] ?? '')) throw new Error('SVG paths must start with moveto');
    let cursor = 0;
    while (cursor < tokens.length) {
        const command = tokens[cursor++];
        if (!/^[MmLlHhVvCcSsQqTtAaZz]$/.test(command)) throw new Error('Invalid SVG path command');
        const numbers: number[] = [];
        while (cursor < tokens.length && !/^[MmLlHhVvCcSsQqTtAaZz]$/.test(tokens[cursor]))
            numbers.push(Number(tokens[cursor++]));
        const arity = pathArity[command.toUpperCase()];
        if (
            numbers.some(value => !Number.isFinite(value)) ||
            (arity ? numbers.length < arity || numbers.length % arity !== 0 : numbers.length > 0)
        )
            throw new Error('Invalid SVG path arguments');
        if (command.toUpperCase() === 'A')
            for (let i = 0; i < numbers.length; i += 7) {
                if (
                    numbers[i] < 0 ||
                    numbers[i + 1] < 0 ||
                    ![0, 1].includes(numbers[i + 3]) ||
                    ![0, 1].includes(numbers[i + 4])
                )
                    throw new Error('Invalid SVG arc arguments');
            }
    }
}

/** Strict profile validation before any imported SVG reaches a live document. */
export function validateSvg(svg: string, tile: Tile): void {
    if (!svg || svg.charCodeAt(0) === 0xfeff || /<!DOCTYPE|<!ENTITY|<\?/i.test(svg))
        throw new Error('SVG declarations are prohibited');
    const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
    if (parsed.getElementsByTagName('parsererror').length || !parsed.documentElement)
        throw new Error('Invalid SVG XML');
    const root = parsed.documentElement;
    if (
        root.tagName !== 'svg' ||
        root.namespaceURI !== SVG_NAMESPACE ||
        root.getAttribute('viewBox') !== '0 0 256 256' ||
        root.getAttribute('data-z') !== '13' ||
        root.getAttribute('data-x') !== String(tile.x) ||
        root.getAttribute('data-y') !== String(tile.y)
    )
        throw new Error('Invalid SVG tile coordinates or viewBox');
    const visit = (element: typeof root, isRoot = false) => {
        if (!isRoot && (!allowedElements.has(element.tagName) || element.namespaceURI !== SVG_NAMESPACE))
            throw new Error(`SVG element ${element.tagName} is prohibited`);
        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes.item(i)!;
            const name = attr.name,
                value = attr.value;
            if (isRoot && ['xmlns', 'viewBox', 'data-z', 'data-x', 'data-y'].includes(name)) continue;
            if (name === 'class') {
                if (
                    !value.trim() ||
                    value
                        .trim()
                        .split(/\s+/)
                        .some(token => !classes.has(token))
                )
                    throw new Error('Unknown SVG semantic class');
            } else if (name === 'd' && element.tagName === 'path') {
                validatePathData(value);
            } else if (
                ['x', 'y', 'dx', 'dy', 'rotate'].includes(name) &&
                (element.tagName === 'text' || element.tagName === 'tspan')
            ) {
                const positioned = name === 'dx' || name === 'dy' ? value.replace(/em(?=\s|,|$)/g, '') : value;
                if (
                    !numberList.test(positioned) ||
                    positioned
                        .trim()
                        .split(/[\s,]+/)
                        .some(v => !Number.isFinite(Number(v)))
                )
                    throw new Error('Invalid SVG text positioning');
            } else if (name === 'transform') {
                const remaining = value.replace(transforms, '').replace(/[\s,]+/g, '');
                if (
                    !value.trim() ||
                    remaining ||
                    (value.match(/[+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/g) ?? []).some(
                        v => !Number.isFinite(Number(v))
                    )
                )
                    throw new Error('Invalid SVG transform');
            } else if (
                name === 'xml:space' &&
                (element.tagName === 'text' || element.tagName === 'tspan') &&
                ['default', 'preserve'].includes(value)
            ) {
                // XML whitespace is presentation-neutral and does not override semantic styles.
            } else throw new Error(`SVG attribute ${name} is prohibited`);
        }
        for (let child = element.firstChild; child; child = child.nextSibling) {
            if (child.nodeType === 1) visit(child as typeof root);
            else if (child.nodeType === 3 || child.nodeType === 4) {
                if (!['text', 'tspan'].includes(element.tagName) && child.nodeValue?.trim())
                    throw new Error('Unexpected text in SVG');
            } else if (child.nodeType !== 8) throw new Error('Unexpected SVG XML node');
        }
    };
    visit(root, true);
    for (let child = parsed.firstChild; child; child = child.nextSibling) {
        if (child !== root && child.nodeType !== 8 && !(child.nodeType === 3 && !child.nodeValue?.trim()))
            throw new Error('Unexpected node outside SVG root');
    }
}

const MAX_THUMBNAIL_BYTES = 4 * 1024 * 1024;
const MAX_THUMBNAIL_SIDE = 4096;
const ascii = (bytes: Uint8Array, start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));
const dimensions = (width: number, height: number) => {
    if (width < 1 || height < 1 || width > MAX_THUMBNAIL_SIDE || height > MAX_THUMBNAIL_SIDE)
        throw new Error('Map thumbnail dimensions exceed 4096 pixels');
};

/** Inspect dimensions before an imported thumbnail can enter the browser image decoder. */
export function validateMapThumbnail(bytes: Uint8Array, mime: string): void {
    if (bytes.length > MAX_THUMBNAIL_BYTES) throw new Error('Map thumbnail exceeds 4 MiB');
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (mime === 'image/png') {
        if (
            bytes.length < 33 ||
            ![137, 80, 78, 71, 13, 10, 26, 10].every((byte, index) => bytes[index] === byte) ||
            view.getUint32(8) !== 13 ||
            ascii(bytes, 12, 4) !== 'IHDR'
        )
            throw new Error('Invalid PNG thumbnail');
        dimensions(view.getUint32(16), view.getUint32(20));
        return;
    }
    if (
        mime !== 'image/webp' ||
        bytes.length < 20 ||
        ascii(bytes, 0, 4) !== 'RIFF' ||
        ascii(bytes, 8, 4) !== 'WEBP' ||
        view.getUint32(4, true) + 8 !== bytes.length
    )
        throw new Error('Invalid WebP thumbnail');
    let foundImage = false;
    let offset = 12;
    while (offset < bytes.length) {
        if (offset + 8 > bytes.length) throw new Error('Invalid WebP thumbnail chunk');
        const chunk = ascii(bytes, offset, 4);
        const size = view.getUint32(offset + 4, true);
        const start = offset + 8;
        const end = start + size;
        if (end > bytes.length) throw new Error('Invalid WebP thumbnail chunk');
        if (chunk === 'VP8X') {
            if (size < 10 || bytes[start] & 2) throw new Error('Animated WebP thumbnails are unsupported');
            dimensions(
                1 + bytes[start + 4] + (bytes[start + 5] << 8) + (bytes[start + 6] << 16),
                1 + bytes[start + 7] + (bytes[start + 8] << 8) + (bytes[start + 9] << 16)
            );
        } else if (chunk === 'VP8L') {
            if (size < 5 || bytes[start] !== 0x2f) throw new Error('Invalid lossless WebP thumbnail');
            dimensions(
                1 + bytes[start + 1] + ((bytes[start + 2] & 0x3f) << 8),
                1 + (bytes[start + 2] >> 6) + (bytes[start + 3] << 2) + ((bytes[start + 4] & 15) << 10)
            );
            foundImage = true;
        } else if (chunk === 'VP8 ') {
            if (
                size < 10 ||
                bytes[start] & 1 ||
                bytes[start + 3] !== 0x9d ||
                bytes[start + 4] !== 1 ||
                bytes[start + 5] !== 0x2a
            )
                throw new Error('Invalid lossy WebP thumbnail');
            dimensions(view.getUint16(start + 6, true) & 0x3fff, view.getUint16(start + 8, true) & 0x3fff);
            foundImage = true;
        } else if (chunk === 'ANIM' || chunk === 'ANMF') throw new Error('Animated WebP thumbnails are unsupported');
        offset = end + (size & 1);
    }
    if (!foundImage || offset !== bytes.length) throw new Error('Invalid WebP thumbnail image');
}

export interface LocalMapReference {
    mapId: string;
    revision: number;
    sha256: string;
}
export interface LocalMapRecord extends LocalMapReference {
    name: string;
    bounds: [number, number, number, number];
    defaultView: { center: [number, number]; zoom: number };
    importedAt: number;
    attribution: string;
    tileCount: number;
    byteLength: number;
    description?: string;
    author?: string;
    thumbnail?: Blob;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_ENTRY_BYTES = 128 * 1024 * 1024;
const MAX_ARCHIVE_BYTES = 512 * 1024 * 1024;
const MANIFEST = 'manifest.json';
const AVAILABILITY = 'availability/z13.bin';
const INDEX = 'bundle-index/z13.json';
const TEMPLATE = 'bundles/z13/{side}/{x}/{y}.rmpb';
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true });
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const object = (value: unknown): Record<string, unknown> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected an object');
    return value as Record<string, unknown>;
};
function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}
const sameReference = (record: LocalMapReference, ref: LocalMapReference) =>
    record.mapId === ref.mapId && record.revision === ref.revision && record.sha256 === ref.sha256;
function validatePath(path: string) {
    assert(
        path &&
            !path.startsWith('/') &&
            !path.includes('\\') &&
            !/^[a-z][a-z0-9+.-]*:/i.test(path) &&
            !path.split('/').some(part => !part || part === '.' || part === '..'),
        `Unsafe ZIP path: ${path}`
    );
}
const toBuffer = (bytes: Uint8Array) => bytes.slice().buffer as ArrayBuffer;
const jsonBlob = (value: unknown) => new Blob([encoder.encode(JSON.stringify(value))], { type: 'application/json' });
const mime = (path: string) =>
    path.endsWith('.json')
        ? 'application/json'
        : path.endsWith('.webp')
          ? 'image/webp'
          : path.endsWith('.png')
            ? 'image/png'
            : 'application/octet-stream';

/** Validate all renderable bytes before committing any resource to persistent storage. */
export async function readLocalMapPackage(
    archive: Blob
): Promise<{ record: LocalMapRecord; resources: Map<string, Blob> }> {
    assert(archive.size > 0 && archive.size <= MAX_ARCHIVE_BYTES, 'Map archive exceeds 512 MiB');
    const { BlobReader, Uint8ArrayWriter, ZipReader } = await import('@zip.js/zip.js');
    const reader = new ZipReader(new BlobReader(archive), { useWebWorkers: false });
    try {
        const entries = await reader.getEntries();
        assert(entries.length > 0 && entries.length <= 100_000, 'Invalid ZIP directory size');
        const names = new Set<string>();
        const files = new Map<string, (typeof entries)[number]>();
        let total = 0;
        for (const entry of entries) {
            const path = entry.directory ? entry.filename.replace(/\/$/, '') : entry.filename;
            validatePath(path);
            assert(!names.has(path), `Duplicate ZIP entry: ${path}`);
            names.add(path);
            assert(!entry.encrypted, 'Encrypted ZIP entries are unsupported');
            assert(
                entry.compressionMethod === 0 || entry.compressionMethod === 8,
                'Only STORE and DEFLATE ZIP entries are supported'
            );
            assert(
                Number.isSafeInteger(entry.uncompressedSize) && entry.uncompressedSize <= MAX_ENTRY_BYTES,
                `ZIP entry is too large: ${path}`
            );
            total += entry.uncompressedSize;
            assert(total <= MAX_ARCHIVE_BYTES, 'Expanded map package exceeds 512 MiB');
            if (!entry.directory) files.set(path, entry);
        }
        const resources = new Map<string, Blob>();
        const read = async (path: string): Promise<Uint8Array> => {
            const cached = resources.get(path);
            if (cached) return new Uint8Array(await cached.arrayBuffer());
            const entry = files.get(path);
            assert(entry && !entry.directory && entry.getData, `Missing ZIP entry: ${path}`);
            const bytes = await entry.getData(new Uint8ArrayWriter(), { checkSignature: true });
            assert(bytes && bytes.length === entry.uncompressedSize, `Invalid ZIP entry length: ${path}`);
            resources.set(path, new Blob([toBuffer(bytes)], { type: mime(path) }));
            return bytes;
        };
        const json = async (path: string) => {
            const bytes = await read(path);
            assert(!(bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf), `UTF-8 BOM is prohibited: ${path}`);
            try {
                return object(JSON.parse(decoder.decode(bytes)));
            } catch {
                throw new Error(`Invalid UTF-8 JSON: ${path}`);
            }
        };
        const metadata = await json('map-package.json');
        assert(
            metadata.format === 'rmp-map-package' && metadata.formatVersion === 1,
            'Unsupported map package version'
        );
        assert(
            metadata.coordinateProfile === 'rmp-webmercator-z13-v1' &&
                metadata.svgProfile === 'rmp-svg-tile-v1' &&
                metadata.styleProfile === 'rmp-semantic-z13-v1',
            'Unsupported map profiles'
        );
        assert(typeof metadata.mapId === 'string' && UUID.test(metadata.mapId), 'Invalid package map UUID');
        assert(
            Number.isSafeInteger(metadata.revision) && (metadata.revision as number) > 0,
            'Invalid package revision'
        );
        assert(
            typeof metadata.name === 'string' && metadata.name.trim() && metadata.manifest === MANIFEST,
            'Invalid package name or manifest path'
        );
        assert(
            Array.isArray(metadata.bounds) && metadata.bounds.length === 4 && metadata.bounds.every(finite),
            'Invalid geographic bounds'
        );
        const bounds = metadata.bounds as LocalMapRecord['bounds'];
        assert(
            bounds[0] >= -180 &&
                bounds[2] <= 180 &&
                bounds[0] < bounds[2] &&
                bounds[1] >= -85.05112879 &&
                bounds[3] <= 85.05112879 &&
                bounds[1] < bounds[3],
            'Package crosses unsupported geographic bounds'
        );
        const view = object(metadata.defaultView);
        assert(
            Array.isArray(view.center) &&
                view.center.length === 2 &&
                view.center.every(finite) &&
                finite(view.zoom) &&
                view.zoom >= 0 &&
                view.zoom <= 24,
            'Invalid package default view'
        );
        assert(
            view.center[0] >= bounds[0] &&
                view.center[0] <= bounds[2] &&
                view.center[1] >= bounds[1] &&
                view.center[1] <= bounds[3],
            'Default view lies outside map bounds'
        );
        for (const field of ['description', 'author', 'attributionUrl', 'thumbnail']) {
            assert(metadata[field] === undefined || typeof metadata[field] === 'string', `Invalid ${field}`);
        }
        const manifest = await json(MANIFEST);
        const projection = object(manifest.projection);
        assert(
            manifest.formatVersion === 4 &&
                projection.name === 'WebMercatorQuad' &&
                projection.tileSize === MAP_TILE_SIZE,
            'Unsupported manifest or projection'
        );
        assert(
            typeof manifest.attribution === 'string' && Array.isArray(manifest.levels) && manifest.levels.length === 1,
            'A v4 map needs exactly one level'
        );
        const level = object(manifest.levels[0]);
        assert(
            level.name === 'zoomed' &&
                level.zoom === MAP_COMMON_ZOOM &&
                level.bundleFormat === 'RMPB1' &&
                level.bundleIndex === INDEX &&
                level.bundleTemplate === TEMPLATE &&
                level.availability === AVAILABILITY,
            'Unsupported z13 manifest level'
        );
        const tileBounds = object(level.tileBounds);
        assert(
            ['minX', 'minY', 'maxX', 'maxY'].every(
                field =>
                    Number.isInteger(tileBounds[field]) &&
                    (tileBounds[field] as number) >= 0 &&
                    (tileBounds[field] as number) < 8192
            ) &&
                (tileBounds.minX as number) <= (tileBounds.maxX as number) &&
                (tileBounds.minY as number) <= (tileBounds.maxY as number),
            'Invalid manifest tile bounds'
        );
        const availability = parseAvailability(toBuffer(await read(AVAILABILITY)));
        assert(availability.zoom === MAP_COMMON_ZOOM && availability.tileCount > 0, 'Invalid map availability level');
        assert(
            availability.minX === tileBounds.minX &&
                availability.minY === tileBounds.minY &&
                availability.minX + availability.width - 1 === tileBounds.maxX &&
                availability.minY + availability.height - 1 === tileBounds.maxY,
            'Manifest and RMPT bounds disagree'
        );
        const world = 2 ** MAP_COMMON_ZOOM;
        const longitude = (tile: number) => (tile / world) * 360 - 180;
        const latitude = (tile: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * tile) / world))) * 180) / Math.PI;
        const expectedBounds = [
            longitude(availability.minX),
            latitude(availability.minY + availability.height),
            longitude(availability.minX + availability.width),
            latitude(availability.minY),
        ];
        assert(
            bounds.every((value, index) => Math.abs(value - expectedBounds[index]) < 1e-8),
            'Geographic bounds do not match tile coverage'
        );
        const index = await json(INDEX);
        assert(
            index.formatVersion === 1 &&
                index.level === 'zoomed' &&
                index.zoom === MAP_COMMON_ZOOM &&
                Array.isArray(index.bundles),
            'Invalid bundle index'
        );
        const declared = new Set<string>();
        const covered = new Set<string>();
        for (const value of index.bundles) {
            const address = object(value);
            assert(
                finite(address.side) &&
                    (MAP_BUNDLE_SIDES as readonly number[]).includes(address.side) &&
                    Number.isInteger(address.x) &&
                    Number.isInteger(address.y) &&
                    (address.x as number) >= 0 &&
                    (address.y as number) >= 0,
                'Invalid bundle index address'
            );
            const path = `bundles/z13/${address.side}/${address.x}/${address.y}.rmpb`;
            assert(!declared.has(path), 'Duplicate bundle index entry');
            declared.add(path);
            const bundle = parseBundle(toBuffer(await read(path)));
            assert(
                bundle.address.zoom === MAP_COMMON_ZOOM &&
                    bundle.address.side === address.side &&
                    bundle.address.x === address.x &&
                    bundle.address.y === address.y,
                'Bundle path and header disagree'
            );
            for (const [tileId, span] of bundle.entries) {
                const [, x, y] = tileId.split('/').map(Number);
                assert(
                    hasAvailableTile(availability, x, y) && !covered.has(tileId),
                    'Duplicate or unavailable bundle tile'
                );
                validateSvg(decoder.decode(bundle.bytes.subarray(span.start, span.start + span.length)), { x, y });
                covered.add(tileId);
            }
        }
        assert(covered.size === availability.tileCount, 'Availability references missing SVG payloads');
        for (const path of files.keys())
            if (path.endsWith('.rmpb')) assert(declared.has(path), 'Unindexed RMPB bundle');
        let thumbnail: Blob | undefined;
        if (metadata.thumbnail !== undefined) {
            validatePath(metadata.thumbnail as string);
            const thumbnailBytes = await read(metadata.thumbnail as string);
            thumbnail = resources.get(metadata.thumbnail as string);
            assert(thumbnail && ['image/webp', 'image/png'].includes(thumbnail.type), 'Unsupported map thumbnail');
            validateMapThumbnail(thumbnailBytes, thumbnail.type);
        }
        // Editor source is not executed or persisted as a render resource. Legacy bundles may include it.
        if (metadata.editor !== undefined) {
            const editor = object(metadata.editor);
            assert(
                editor.app === 'rmw' && editor.formatVersion === 1 && editor.project === 'project/rmw.json',
                'Unsupported editor extension'
            );
            const source = await json('project/rmw.json');
            assert(
                source.format === 'rmw-project' &&
                    source.formatVersion === 1 &&
                    source.mapId === metadata.mapId &&
                    source.revision === metadata.revision &&
                    source.name === metadata.name,
                'Editable source and package metadata disagree'
            );
            assert(
                source.description === (metadata.description ?? '') && source.author === (metadata.author ?? ''),
                'Editable source and package author metadata disagree'
            );
            assert(
                Array.isArray(source.tiles) && source.tiles.length === covered.size,
                'Editable source and published coverage disagree'
            );
            const sourceTiles = new Set<string>();
            for (const value of source.tiles) {
                const tile = object(value);
                assert(
                    Number.isInteger(tile.x) && Number.isInteger(tile.y) && covered.has(`13/${tile.x}/${tile.y}`),
                    'Editable source and published coverage disagree'
                );
                sourceTiles.add(`13/${tile.x}/${tile.y}`);
            }
            assert(sourceTiles.size === covered.size, 'Duplicate editable source tile');
            resources.delete('project/rmw.json');
        }
        const digest = await crypto.subtle.digest('SHA-256', await archive.arrayBuffer());
        const sha256 = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
        const record: LocalMapRecord = {
            mapId: metadata.mapId,
            revision: metadata.revision as number,
            sha256,
            name: metadata.name,
            bounds,
            defaultView: { center: view.center as [number, number], zoom: view.zoom },
            importedAt: Date.now(),
            attribution: manifest.attribution,
            tileCount: availability.tileCount,
            byteLength: archive.size,
            ...(typeof metadata.description === 'string' ? { description: metadata.description } : {}),
            ...(typeof metadata.author === 'string' ? { author: metadata.author } : {}),
            ...(thumbnail ? { thumbnail } : {}),
        };
        // Keep JSON resources in a canonical encoding; no editor state is used by the renderer.
        resources.set('map-package.json', jsonBlob(metadata));
        return { record, resources };
    } finally {
        await reader.close().catch(() => undefined);
    }
}

const requestValue = <T>(request: IDBRequest<T>) =>
    new Promise<T>((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
const done = (transaction: IDBTransaction) =>
    new Promise<void>((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => reject(transaction.error);
        transaction.onabort = () => reject(transaction.error ?? new Error('Map storage transaction aborted'));
    });

/** Source archives are permanent user data, separate from the disposable map raster cache. */
export class LocalMapStore {
    private connection?: Promise<IDBDatabase>;
    constructor(private readonly dbName = 'RmpLocalMapLibrary') {}
    private db() {
        if (!this.connection)
            this.connection = new Promise<IDBDatabase>((resolve, reject) => {
                const request = indexedDB.open(this.dbName, 1);
                request.onupgradeneeded = () => {
                    const db = request.result;
                    db.createObjectStore('maps', { keyPath: 'sha256' });
                    db.createObjectStore('archives');
                    const resources = db.createObjectStore('resources', { keyPath: ['sha256', 'path'] });
                    resources.createIndex('sha256', 'sha256');
                };
                request.onsuccess = () => {
                    const db = request.result;
                    db.onversionchange = () => {
                        db.close();
                        this.connection = undefined;
                    };
                    db.onclose = () => {
                        this.connection = undefined;
                    };
                    resolve(db);
                };
                request.onerror = () => {
                    this.connection = undefined;
                    reject(request.error);
                };
                request.onblocked = () => {
                    this.connection = undefined;
                    reject(new Error('Local map storage is blocked by another tab'));
                };
            });
        return this.connection;
    }
    async importPackage(archive: Blob, expectedReference?: LocalMapReference): Promise<LocalMapRecord> {
        const { record, resources } = await readLocalMapPackage(archive);
        if (expectedReference)
            assert(
                sameReference(record, normalizeLocalMapReference(expectedReference)!),
                'Embedded map reference does not match its archive'
            );
        const db = await this.db();
        const tx = db.transaction(['maps', 'archives', 'resources'], 'readwrite');
        const completion = done(tx);
        const previous = (await requestValue(tx.objectStore('maps').get(record.sha256))) as LocalMapRecord | undefined;
        if (previous) {
            await completion;
            return previous;
        }
        try {
            tx.objectStore('maps').put(record);
            tx.objectStore('archives').put(archive, record.sha256);
            for (const [path, blob] of resources)
                tx.objectStore('resources').put({ sha256: record.sha256, path, blob });
            await completion;
            return record;
        } catch (error) {
            try {
                tx.abort();
            } catch {
                /* A request error may already have aborted the transaction. */
            }
            await completion.catch(() => undefined);
            throw error;
        }
    }
    async list(): Promise<LocalMapRecord[]> {
        const db = await this.db();
        const tx = db.transaction('maps', 'readonly');
        const completion = done(tx);
        const records = (await requestValue(tx.objectStore('maps').getAll())) as LocalMapRecord[];
        await completion;
        return records.sort((a, b) => b.importedAt - a.importedAt || a.name.localeCompare(b.name));
    }
    async get(reference: LocalMapReference): Promise<LocalMapRecord | undefined> {
        const ref = normalizeLocalMapReference(reference)!;
        const db = await this.db();
        const tx = db.transaction('maps', 'readonly');
        const completion = done(tx);
        const record = (await requestValue(tx.objectStore('maps').get(ref.sha256))) as LocalMapRecord | undefined;
        await completion;
        return record && sameReference(record, ref) ? record : undefined;
    }
    async getArchive(reference: LocalMapReference): Promise<Blob | undefined> {
        const ref = normalizeLocalMapReference(reference)!;
        if (!(await this.get(ref))) return undefined;
        const db = await this.db();
        const tx = db.transaction('archives', 'readonly');
        const completion = done(tx);
        const blob = (await requestValue(tx.objectStore('archives').get(ref.sha256))) as Blob | undefined;
        await completion;
        return blob;
    }
    async getResource(reference: LocalMapReference, path: string): Promise<Blob | undefined> {
        const ref = normalizeLocalMapReference(reference)!;
        validatePath(path);
        if (!(await this.get(ref))) return undefined;
        const db = await this.db();
        const tx = db.transaction('resources', 'readonly');
        const completion = done(tx);
        const resource = (await requestValue(tx.objectStore('resources').get([ref.sha256, path]))) as
            | { blob: Blob }
            | undefined;
        await completion;
        return resource?.blob;
    }
    async delete(reference: LocalMapReference): Promise<void> {
        const ref = normalizeLocalMapReference(reference)!;
        if (!(await this.get(ref))) return;
        const db = await this.db();
        const tx = db.transaction(['maps', 'archives', 'resources'], 'readwrite');
        const completion = done(tx);
        tx.objectStore('maps').delete(ref.sha256);
        tx.objectStore('archives').delete(ref.sha256);
        const cursor = tx.objectStore('resources').index('sha256').openCursor(IDBKeyRange.only(ref.sha256));
        cursor.onsuccess = () => {
            const value = cursor.result;
            if (value) {
                value.delete();
                value.continue();
            }
        };
        await completion;
    }
    close() {
        void this.connection?.then(
            db => db.close(),
            () => undefined
        );
        this.connection = undefined;
    }
}
export const localMapStore = new LocalMapStore();

export interface ResolvedMapSource {
    routing: MapRouting;
    fetch?: typeof globalThis.fetch;
    forceDetailed: boolean;
    showAttribution: boolean;
}

/** Both editor and detached export controllers use this exact source selection. */
export function resolveMapSource(reference?: LocalMapReference): ResolvedMapSource {
    const ref = normalizeLocalMapReference(reference);
    if (!ref) return { routing: MAP_ROUTING, forceDetailed: false, showAttribution: true };
    const origin = `https://${ref.sha256.slice(0, 32)}.${ref.sha256.slice(32)}.rmw.invalid`;
    // A local package has one owner. Its authoritative sparse availability index
    // clips tile coverage; no online region is ever used outside that coverage.
    const routing: MapRouting = {
        formatVersion: 1,
        ownerZoom: 8,
        owners: new Uint8Array(256 * 256).fill(1),
        regions: new Map([[1, { id: `rmw-${ref.sha256}`, ownerId: 1, origin }]]),
    };
    const fetchResource: typeof globalThis.fetch = async (input, init) => {
        const url = new URL(input instanceof Request ? input.url : String(input));
        if (url.origin !== origin || url.username || url.password || url.hash)
            throw new Error('Invalid local map resource URL');
        const method = init?.method ?? (input instanceof Request ? input.method : 'GET');
        if (method !== 'GET') throw new Error('Local map resources are read-only');
        const signal = init?.signal ?? (input instanceof Request ? input.signal : undefined);
        const checkAbort = () => {
            if (signal?.aborted) throw signal.reason ?? new DOMException('Map request aborted', 'AbortError');
        };
        checkAbort();
        let path: string;
        try {
            path = decodeURIComponent(url.pathname.slice(1));
        } catch {
            throw new Error('Invalid local map resource path');
        }
        const blob = await localMapStore.getResource(ref, path);
        checkAbort();
        if (!blob) throw new Error(`Local map resource is missing: ${path}. Reimport its .rmpmap package.`);
        return new Response(await blob.arrayBuffer(), {
            status: 200,
            headers: { 'Content-Type': blob.type || 'application/octet-stream' },
        });
    };
    return { routing, fetch: fetchResource, forceDetailed: true, showAttribution: false };
}

const EVENT = 'rmp-map-library-changed';
const CHANNEL = 'rmp-map-library-updates-v1';
const senderId = crypto.randomUUID();

export function notifyMapLibraryChanged() {
    window.dispatchEvent(new Event(EVENT));
    if (typeof BroadcastChannel !== 'undefined') {
        const channel = new BroadcastChannel(CHANNEL);
        channel.postMessage({ senderId });
        channel.close();
    }
}

export function subscribeMapLibrary(listener: () => void) {
    window.addEventListener(EVENT, listener);
    const channel = typeof BroadcastChannel === 'undefined' ? undefined : new BroadcastChannel(CHANNEL);
    if (channel)
        channel.onmessage = event => {
            if (event.data?.senderId !== senderId) listener();
        };
    return () => {
        window.removeEventListener(EVENT, listener);
        channel?.close();
    };
}

const MAX_EMBEDDED_LENGTH = Math.ceil(MAX_ARCHIVE_BYTES / 3) * 4 + 256;

export interface EmbeddedMapPackage {
    sha256: string;
    data: string;
}

const readBlob = (blob: Blob): Promise<ArrayBuffer> =>
    typeof blob.arrayBuffer === 'function'
        ? blob.arrayBuffer()
        : new Promise((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as ArrayBuffer);
              reader.onerror = () => reject(reader.error);
              reader.readAsArrayBuffer(blob);
          });

/** Portable files carry the original archive; autosaves retain only its immutable reference. */
export const embedMapPackages = async (reference?: LocalMapReference): Promise<EmbeddedMapPackage[] | undefined> => {
    const ref = normalizeLocalMapReference(reference);
    if (!ref) return undefined;
    const archive = await localMapStore.getArchive(ref);
    if (!archive) throw new Error('Missing local map resource. Import its .rmpmap package before exporting.');
    if ((await createHash(await readBlob(archive))) !== ref.sha256)
        throw new Error('Local map archive does not match its saved reference.');
    return [{ sha256: ref.sha256, data: await blobToBase64(archive) }];
};

/** Restore embedded resources before replacing the open project. Missing external packages retain their reference. */
export const restoreMapPackages = async (
    reference?: LocalMapReference,
    packages?: EmbeddedMapPackage[]
): Promise<void> => {
    const ref = normalizeLocalMapReference(reference);
    if (packages === undefined) return;
    if (!Array.isArray(packages)) throw new Error('Invalid embedded map packages.');
    if (packages.length === 0) return;
    if (!ref || packages.length !== 1) throw new Error('Embedded map package is not referenced by this project.');
    const entry = packages[0];
    if (
        !entry ||
        typeof entry.sha256 !== 'string' ||
        entry.sha256.toLowerCase() !== ref.sha256 ||
        typeof entry.data !== 'string'
    )
        throw new Error('Embedded map package does not match its saved reference.');
    if (entry.data.length > MAX_EMBEDDED_LENGTH) throw new Error('Embedded map package is too large.');
    const match = /^data:[^,]*;base64,([a-zA-Z0-9+/]*={0,2})$/.exec(entry.data);
    if (!match) throw new Error('Invalid embedded map package data.');
    let bytes: Uint8Array;
    try {
        bytes = Uint8Array.from(atob(match[1]), char => char.charCodeAt(0));
    } catch {
        throw new Error('Invalid embedded map package data.');
    }
    if (bytes.byteLength > MAX_ARCHIVE_BYTES) throw new Error('Embedded map package is too large.');
    const buffer = bytes.buffer as ArrayBuffer;
    if ((await createHash(buffer)) !== ref.sha256) throw new Error('Embedded map package checksum mismatch.');
    const record = await localMapStore.importPackage(new Blob([buffer], { type: 'application/octet-stream' }), ref);
    if (record.mapId !== ref.mapId || record.revision !== ref.revision || record.sha256 !== ref.sha256)
        throw new Error('Embedded map package identity does not match its saved reference.');
    notifyMapLibraryChanged();
};
