import type { LiveViewport } from '../redux/viewport/viewport-slice';
import { ByteLru } from './byte-lru';
import {
    graphToWorldPixel,
    isMapZoomed,
    MAP_BUNDLE_CACHE_MAX_BYTES,
    MAP_BUNDLE_SIDES,
    MAP_COMMON_ZOOM,
    MAP_MAX_FETCHES,
    MAP_TILE_BUFFER,
    MAP_TILE_CACHE_MAX_BYTES,
    MAP_TILE_CACHE_MAX_ENTRIES,
    MAP_TILE_SIZE,
    MAP_WORLD_PIXELS_PER_GRAPH_UNIT,
    worldPixelToGraph,
} from './map-config';
import {
    AvailabilityIndex,
    BundleAddress,
    hasAvailableTile,
    ParsedBundle,
    parseAvailability,
    parseBundle,
} from './tile-format';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';

export type MapLevelName = 'overview' | 'zoomed';

interface MapLevelManifest {
    name: MapLevelName;
    zoom: number;
    bundleFormat: 'RMPB1';
    bundleIndex: string;
    bundleTemplate: string;
    availability: string;
    tileBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

interface MapManifest {
    formatVersion: number;
    levels: MapLevelManifest[];
    attribution: string;
}

interface BundleIndexEntry {
    side: number;
    x: number;
    y: number;
}

interface MapLevel extends MapLevelManifest {
    availabilityIndex: AvailabilityIndex;
    bundles: Map<string, BundleIndexEntry>;
}

interface TileRequest {
    key: string;
    x: number;
    y: number;
    level: MapLevel;
    address: BundleAddress;
    url: string;
}

interface FetchQueueEntry<T> {
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
}

export interface MapTileControllerOptions {
    root: SVGGElement;
    baseUrl: string;
    getViewportSize: () => { width: number; height: number };
    onLoadingChange?: (loading: boolean) => void;
    fetch?: typeof globalThis.fetch;
}

const bundleAddressKey = (address: Pick<BundleAddress, 'side' | 'x' | 'y'>) =>
    `${address.side}/${address.x}/${address.y}`;

const requireLevel = (manifest: MapManifest, name: MapLevelName): MapLevelManifest => {
    const matches = manifest.levels.filter(level => level.name === name);
    if (matches.length !== 1) throw new Error(`Expected exactly one ${name} level`);
    const level = matches[0];
    if (
        !Number.isInteger(level.zoom) ||
        level.bundleFormat !== 'RMPB1' ||
        typeof level.bundleIndex !== 'string' ||
        typeof level.bundleTemplate !== 'string' ||
        typeof level.availability !== 'string'
    ) {
        throw new Error(`Invalid ${name} level`);
    }
    const bounds = level.tileBounds;
    if (!bounds || ![bounds.minX, bounds.minY, bounds.maxX, bounds.maxY].every(Number.isInteger)) {
        throw new Error(`Invalid ${name} tile bounds`);
    }
    return level;
};

export class MapTileController {
    private readonly fetcher: typeof globalThis.fetch;
    private readonly abortController = new AbortController();
    private readonly tileRoot: SVGGElement;
    private readonly attribution: SVGTextElement;
    private readonly bundleCache = new ByteLru<ParsedBundle>(MAP_BUNDLE_CACHE_MAX_BYTES);
    private readonly tileCache = new ByteLru<SVGSVGElement>(MAP_TILE_CACHE_MAX_BYTES, MAP_TILE_CACHE_MAX_ENTRIES);
    private readonly bundleRequests = new Map<string, Promise<ParsedBundle>>();
    private readonly tileRequests = new Map<string, Promise<SVGSVGElement>>();
    private readonly fetchQueue: FetchQueueEntry<unknown>[] = [];
    private readonly nodes = new Map<string, SVGSVGElement>();
    private readonly pending = new Set<string>();
    private readonly settled = new Set<string>();
    private desired = new Map<string, TileRequest>();
    private levels: Record<MapLevelName, MapLevel> | undefined;
    private manifestUrl: URL | undefined;
    private viewport: LiveViewport | undefined;
    private activeLevel: MapLevel | undefined;
    private activeFetches = 0;
    private generation = 0;
    private renderFrame: number | undefined;
    private mountFrame: number | undefined;
    private mountQueue: Array<{ generation: number; request: TileRequest; tile: SVGSVGElement }> = [];
    private disposed = false;
    private switching = false;

    constructor(private readonly options: MapTileControllerOptions) {
        this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.tileRoot = document.createElementNS(SVG_NAMESPACE, 'g');
        this.tileRoot.dataset.mapTiles = '';
        this.attribution = document.createElementNS(SVG_NAMESPACE, 'text');
        this.attribution.dataset.mapAttribution = '';
        this.attribution.setAttribute('fill', '#4a4a4a');
        this.attribution.setAttribute('font-family', 'Arial, sans-serif');
        this.attribution.setAttribute('opacity', '0.8');
        options.root.style.pointerEvents = 'none';
        options.root.append(this.tileRoot, this.attribution);
    }

    async initialize() {
        const baseUrl = this.options.baseUrl.trim();
        if (!baseUrl) throw new Error('Map tile base URL is not configured');
        this.setLoading(true);
        const manifestUrl = new URL('manifest.json', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
        this.manifestUrl = manifestUrl;
        const manifest = await this.fetchJson<MapManifest>(manifestUrl);
        if (manifest.formatVersion !== 2 || !Array.isArray(manifest.levels)) {
            throw new Error('Map manifest format version must be 2');
        }
        const overviewManifest = requireLevel(manifest, 'overview');
        const zoomedManifest = requireLevel(manifest, 'zoomed');
        const [overview, zoomed] = await Promise.all([
            this.loadLevel(overviewManifest, manifestUrl),
            this.loadLevel(zoomedManifest, manifestUrl),
        ]);
        if (this.disposed) return;
        this.levels = { overview, zoomed };
        this.attribution.textContent = manifest.attribution || 'OpenStreetMap contributors / ODbL';
        this.scheduleRender();
    }

    updateViewport(viewport: LiveViewport) {
        if (this.disposed) return;
        this.viewport = viewport;
        this.positionAttribution(viewport);
        if (this.levels) {
            const target = isMapZoomed(viewport.zoom) ? this.levels.zoomed : this.levels.overview;
            if (target !== this.activeLevel) this.switchLevel(target);
        }
        this.scheduleRender();
    }

    dispose() {
        this.disposed = true;
        this.generation += 1;
        this.abortController.abort();
        const abortError = new DOMException('Map tile controller disposed', 'AbortError');
        for (const entry of this.fetchQueue.splice(0)) entry.reject(abortError);
        if (this.renderFrame !== undefined) cancelAnimationFrame(this.renderFrame);
        if (this.mountFrame !== undefined) cancelAnimationFrame(this.mountFrame);
        this.renderFrame = undefined;
        this.mountFrame = undefined;
        this.mountQueue = [];
        this.nodes.clear();
        this.pending.clear();
        this.desired.clear();
        this.bundleCache.clear();
        this.tileCache.clear();
        this.options.root.replaceChildren();
    }

    private async loadLevel(level: MapLevelManifest, manifestUrl: URL): Promise<MapLevel> {
        const [availabilityIndex, bundleIndex] = await Promise.all([
            this.fetchArrayBuffer(new URL(level.availability, manifestUrl)).then(parseAvailability),
            this.fetchJson<{ formatVersion: number; level: string; zoom: number; bundles: BundleIndexEntry[] }>(
                new URL(level.bundleIndex, manifestUrl)
            ),
        ]);
        if (availabilityIndex.zoom !== level.zoom) {
            throw new Error(`Availability zoom ${availabilityIndex.zoom} does not match level ${level.zoom}`);
        }
        if (
            bundleIndex.formatVersion !== 1 ||
            bundleIndex.level !== level.name ||
            bundleIndex.zoom !== level.zoom ||
            !Array.isArray(bundleIndex.bundles)
        ) {
            throw new Error(`Invalid bundle index for ${level.name}`);
        }
        const bundles = new Map<string, BundleIndexEntry>();
        for (const entry of bundleIndex.bundles) {
            if (
                !(MAP_BUNDLE_SIDES as readonly number[]).includes(entry.side) ||
                !Number.isInteger(entry.x) ||
                !Number.isInteger(entry.y)
            ) {
                throw new Error(`Invalid bundle index entry for ${level.name}`);
            }
            const key = bundleAddressKey(entry);
            if (bundles.has(key)) throw new Error(`Duplicate bundle index entry for ${level.name}`);
            bundles.set(key, entry);
        }
        return { ...level, availabilityIndex, bundles };
    }

    private scheduleRender() {
        if (!this.levels || !this.viewport || this.renderFrame !== undefined || this.disposed) return;
        this.renderFrame = requestAnimationFrame(() => {
            this.renderFrame = undefined;
            this.render();
        });
    }

    private render() {
        if (!this.levels || !this.viewport || this.disposed) return;
        const target = isMapZoomed(this.viewport.zoom) ? this.levels.zoomed : this.levels.overview;
        if (target !== this.activeLevel) this.switchLevel(target);
        this.syncVisibleTiles(target, this.viewport);
    }

    private switchLevel(level: MapLevel) {
        this.generation += 1;
        this.activeLevel = level;
        this.nodes.clear();
        this.pending.clear();
        this.settled.clear();
        this.desired.clear();
        this.mountQueue = [];
        this.tileRoot.replaceChildren();
        this.switching = true;
        this.setLoading(true);
    }

    private syncVisibleTiles(level: MapLevel, viewport: LiveViewport) {
        const nextDesired = this.getVisibleTiles(level, viewport);
        this.desired = nextDesired;
        for (const [key, node] of this.nodes) {
            if (!nextDesired.has(key)) {
                node.remove();
                this.nodes.delete(key);
            }
        }
        for (const key of [...this.settled]) {
            if (!nextDesired.has(key)) this.settled.delete(key);
        }
        for (const request of nextDesired.values()) {
            if (this.nodes.has(request.key)) this.settled.add(request.key);
            else if (!this.pending.has(request.key) && !this.settled.has(request.key)) this.requestTile(request);
        }
        this.maybeFinishSwitch();
    }

    private getVisibleTiles(level: MapLevel, viewport: LiveViewport) {
        const size = this.options.getViewportSize();
        const graphMax = {
            x: viewport.x + (size.width * viewport.zoom) / 100,
            y: viewport.y + (size.height * viewport.zoom) / 100,
        };
        const worldMin = graphToWorldPixel(viewport);
        const worldMax = graphToWorldPixel(graphMax);
        const factor = 2 ** (MAP_COMMON_ZOOM - level.zoom);
        const commonTileSize = MAP_TILE_SIZE * factor;
        const bounds = level.tileBounds;
        const minX = Math.max(bounds.minX, Math.floor(worldMin.x / commonTileSize) - MAP_TILE_BUFFER);
        const maxX = Math.min(bounds.maxX, Math.floor(worldMax.x / commonTileSize) + MAP_TILE_BUFFER);
        const minY = Math.max(bounds.minY, Math.floor(worldMin.y / commonTileSize) - MAP_TILE_BUFFER);
        const maxY = Math.min(bounds.maxY, Math.floor(worldMax.y / commonTileSize) + MAP_TILE_BUFFER);
        const desired = new Map<string, TileRequest>();
        for (let y = minY; y <= maxY; y += 1) {
            for (let x = minX; x <= maxX; x += 1) {
                if (!hasAvailableTile(level.availabilityIndex, x, y)) continue;
                const bundle = this.resolveBundle(level, x, y);
                if (!bundle) {
                    console.error(`Available tile has no bundle: ${level.zoom}/${x}/${y}`);
                    continue;
                }
                const key = `${level.zoom}/${x}/${y}`;
                desired.set(key, { key, x, y, level, ...bundle });
            }
        }
        return desired;
    }

    private resolveBundle(level: MapLevel, x: number, y: number) {
        for (const side of MAP_BUNDLE_SIDES) {
            const address = { zoom: level.zoom, side, x: Math.floor(x / side), y: Math.floor(y / side) };
            if (!level.bundles.has(bundleAddressKey(address))) continue;
            const relative = level.bundleTemplate
                .replace('{side}', String(side))
                .replace('{x}', String(address.x))
                .replace('{y}', String(address.y));
            return { address, url: new URL(relative, this.manifestUrl).href };
        }
        return undefined;
    }

    private requestTile(request: TileRequest) {
        const generation = this.generation;
        this.pending.add(request.key);
        this.loadTileTemplate(request)
            .then(template => {
                if (this.disposed || generation !== this.generation) return;
                if (!this.desired.has(request.key)) {
                    this.pending.delete(request.key);
                    return;
                }
                const tile = template.cloneNode(true) as SVGSVGElement;
                this.positionTile(tile, request);
                this.mountQueue.push({ generation, request, tile });
                this.scheduleMount();
            })
            .catch(error => {
                if (this.disposed || generation !== this.generation) return;
                console.error(`Map tile failed: ${request.key}`, error);
                this.pending.delete(request.key);
                if (this.desired.has(request.key)) this.settled.add(request.key);
                this.maybeFinishSwitch();
            });
    }

    private scheduleMount() {
        if (this.mountFrame !== undefined) return;
        this.mountFrame = requestAnimationFrame(() => {
            this.mountFrame = undefined;
            const fragment = document.createDocumentFragment();
            for (const item of this.mountQueue.splice(0)) {
                const { generation, request, tile } = item;
                if (generation !== this.generation) continue;
                if (!this.desired.has(request.key)) {
                    this.pending.delete(request.key);
                    continue;
                }
                if (!this.nodes.has(request.key)) {
                    fragment.append(tile);
                    this.nodes.set(request.key, tile);
                }
                this.pending.delete(request.key);
                this.settled.add(request.key);
            }
            this.tileRoot.append(fragment);
            this.maybeFinishSwitch();
        });
    }

    private maybeFinishSwitch() {
        if (!this.switching) return;
        for (const key of this.desired.keys()) {
            if (!this.settled.has(key)) return;
        }
        this.switching = false;
        this.setLoading(false);
    }

    private loadTileTemplate(request: TileRequest): Promise<SVGSVGElement> {
        const cached = this.tileCache.get(request.key);
        if (cached) return Promise.resolve(cached);
        const inFlight = this.tileRequests.get(request.key);
        if (inFlight) return inFlight;
        const promise = this.loadBundle(request.url, request.address)
            .then(bundle => {
                const entry = bundle.entries.get(request.key);
                if (!entry) throw new Error(`RMPB tile is missing ${request.key}`);
                const payload = bundle.bytes.subarray(entry.start, entry.start + entry.length);
                const source = new TextDecoder('utf-8', { fatal: true }).decode(payload);
                const template = this.parseTileTemplate(source, request.key, request.url);
                this.tileCache.set(request.key, template, entry.length);
                return template;
            })
            .finally(() => {
                if (this.tileRequests.get(request.key) === promise) this.tileRequests.delete(request.key);
            });
        this.tileRequests.set(request.key, promise);
        return promise;
    }

    private loadBundle(url: string, expectedAddress: BundleAddress): Promise<ParsedBundle> {
        const cached = this.bundleCache.get(url);
        if (cached) {
            this.assertBundleAddress(cached, expectedAddress, url);
            return Promise.resolve(cached);
        }
        let inFlight = this.bundleRequests.get(url);
        if (!inFlight) {
            inFlight = this.enqueueFetch(() => this.fetchArrayBuffer(new URL(url)).then(parseBundle));
            this.bundleRequests.set(url, inFlight);
            const clearRequest = () => {
                if (this.bundleRequests.get(url) === inFlight) this.bundleRequests.delete(url);
            };
            inFlight.then(clearRequest, clearRequest);
        }
        return inFlight.then(bundle => {
            this.assertBundleAddress(bundle, expectedAddress, url);
            this.bundleCache.set(url, bundle, bundle.bytes.byteLength);
            return bundle;
        });
    }

    private assertBundleAddress(bundle: ParsedBundle, expected: BundleAddress, url: string) {
        const actual = bundle.address;
        if (
            actual.zoom !== expected.zoom ||
            actual.side !== expected.side ||
            actual.x !== expected.x ||
            actual.y !== expected.y
        ) {
            this.bundleCache.delete(url);
            throw new Error(`RMPB address mismatch for ${url}`);
        }
    }

    private parseTileTemplate(source: string, tileKey: string, url: string) {
        const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
        if (parsed.querySelector('parsererror')) throw new Error(`Invalid SVG in ${url}`);
        const root = parsed.documentElement;
        const [zoom, x, y] = tileKey.split('/');
        if (
            root.namespaceURI !== SVG_NAMESPACE ||
            root.localName !== 'svg' ||
            root.getAttribute('data-z') !== zoom ||
            root.getAttribute('data-x') !== x ||
            root.getAttribute('data-y') !== y
        ) {
            throw new Error(`SVG coordinate metadata mismatch in ${url}`);
        }
        return document.importNode(root, true) as unknown as SVGSVGElement;
    }

    private positionTile(tile: SVGSVGElement, request: TileRequest) {
        const factor = 2 ** (MAP_COMMON_ZOOM - request.level.zoom);
        const commonTileSize = MAP_TILE_SIZE * factor;
        const graphPosition = worldPixelToGraph({ x: request.x * commonTileSize, y: request.y * commonTileSize });
        const graphSize = commonTileSize / MAP_WORLD_PIXELS_PER_GRAPH_UNIT;
        tile.setAttribute('x', String(graphPosition.x));
        tile.setAttribute('y', String(graphPosition.y));
        tile.setAttribute('width', String(graphSize));
        tile.setAttribute('height', String(graphSize));
        tile.setAttribute('overflow', 'hidden');
        tile.dataset.tileKey = request.key;
    }

    private positionAttribution(viewport: LiveViewport) {
        const { width, height } = this.options.getViewportSize();
        const unit = viewport.zoom / 100;
        this.attribution.setAttribute('x', String(viewport.x + 8 * unit));
        this.attribution.setAttribute('y', String(viewport.y + height * unit - 8 * unit));
        this.attribution.setAttribute('font-size', String(10 * unit));
    }

    private setLoading(loading: boolean) {
        this.options.onLoadingChange?.(loading);
    }

    private enqueueFetch<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.fetchQueue.push({ task, resolve: resolve as (value: unknown) => void, reject });
            this.drainFetchQueue();
        });
    }

    private drainFetchQueue() {
        while (this.activeFetches < MAP_MAX_FETCHES && this.fetchQueue.length > 0) {
            const entry = this.fetchQueue.shift()!;
            this.activeFetches += 1;
            Promise.resolve()
                .then(entry.task)
                .then(entry.resolve, entry.reject)
                .finally(() => {
                    this.activeFetches -= 1;
                    this.drainFetchQueue();
                });
        }
    }

    private async fetchJson<T>(url: URL): Promise<T> {
        const response = await this.fetcher(url, { signal: this.abortController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.href}`);
        return response.json() as Promise<T>;
    }

    private async fetchArrayBuffer(url: URL) {
        const response = await this.fetcher(url, { signal: this.abortController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.href}`);
        return response.arrayBuffer();
    }
}
