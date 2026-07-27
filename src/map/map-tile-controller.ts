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

/**
 * A level is described by separate availability and bundle indexes so the
 * client can rule out empty tiles without downloading their binary bundles.
 */
interface MapLevelManifest {
    name: MapLevelName;
    zoom: number;
    bundleFormat: 'RMPB1';
    bundleIndex: string;
    bundleTemplate: string;
    availability: string;
    tileBounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** Top-level metadata is intentionally small so no tile payload is needed to initialize the map. */
interface MapManifest {
    formatVersion: number;
    levels: MapLevelManifest[];
    attribution: string;
}

/** The bundle index lists only files actually published for a sparse level. */
interface BundleIndexEntry {
    side: number;
    x: number;
    y: number;
}

interface MapLevel extends MapLevelManifest {
    // Parsed lookup structures are kept with the manifest to prevent cross-level coordinate mistakes.
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

/** Queued promises retain their own resolvers because some tasks wait before fetch even starts. */
interface FetchQueueEntry<T> {
    task: () => Promise<T>;
    resolve: (value: T) => void;
    reject: (reason: unknown) => void;
}

export interface MapTileControllerOptions {
    /**
     * This root is owned imperatively for the controller's entire lifetime.
     * React must not mount children inside it because level switches and dispose
     * intentionally replace all of its children.
     */
    root: SVGGElement;
    baseUrl: string;
    getViewportSize: () => { width: number; height: number };
    onLoadingChange?: (loading: boolean) => void;
    fetch?: typeof globalThis.fetch;
}

/**
 * Bundle maps are already scoped to one level, so zoom is intentionally omitted
 * from this key. Using the same encoding for index creation and lookup prevents
 * subtle disagreement over bundle coordinates.
 */
const bundleAddressKey = (address: Pick<BundleAddress, 'side' | 'x' | 'y'>) =>
    `${address.side}/${address.x}/${address.y}`;

/**
 * Requires exactly one level instead of accepting the first match. Duplicate or
 * incomplete manifests would otherwise produce order-dependent rendering.
 */
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

/**
 * Imperatively streams sparse map tiles into an SVG layer.
 *
 * React owns the stable layer boundary and style element; this controller owns
 * high-frequency visibility calculation, bounded network/cache work, and tile
 * DOM beneath that boundary. Keeping those lifecycles separate avoids rerendering
 * the editor tree on every viewport frame.
 */
export class MapTileController {
    private readonly fetcher: typeof globalThis.fetch;
    private readonly abortController = new AbortController();
    private readonly tileRoot: SVGGElement;
    private readonly attribution: SVGTextElement;

    /**
     * Bundles avoid repeated network/parse work; tile templates avoid repeated
     * UTF-8 and SVG parsing. Templates are never mounted directly because one
     * DOM node cannot represent the same cached tile in multiple mount cycles.
     */
    private readonly bundleCache = new ByteLru<ParsedBundle>(MAP_BUNDLE_CACHE_MAX_BYTES);
    private readonly tileCache = new ByteLru<SVGSVGElement>(MAP_TILE_CACHE_MAX_BYTES, MAP_TILE_CACHE_MAX_ENTRIES);

    // A cache only helps completed work; these maps also deduplicate concurrent requests for the same resource.
    private readonly bundleRequests = new Map<string, Promise<ParsedBundle>>();
    private readonly tileRequests = new Map<string, Promise<SVGSVGElement>>();

    // Fetches are queued globally across indexes and tile bundles to cap bursts caused by fast pans.
    private readonly fetchQueue: FetchQueueEntry<unknown>[] = [];

    /**
     * `desired` is recalculated from the latest viewport. The other collections
     * track which desired tiles are mounted, still loading, or definitively
     * finished (including failures), allowing a level switch to terminate even
     * when an individual tile cannot be loaded.
     */
    private readonly nodes = new Map<string, SVGSVGElement>();
    private readonly pending = new Set<string>();
    private readonly settled = new Set<string>();
    private desired = new Map<string, TileRequest>();
    private levels: Record<MapLevelName, MapLevel> | undefined;
    private manifestUrl: URL | undefined;
    private viewport: LiveViewport | undefined;
    private activeLevel: MapLevel | undefined;
    private activeFetches = 0;

    /**
     * Network promises may outlive a viewport or level. Capturing this generation
     * at request time prevents stale completions from mounting into the new level.
     */
    private generation = 0;

    // Rendering and DOM insertion are independently batched to one write per animation frame.
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

        // The basemap is visual context; editor gestures must continue to target the SVG interaction layer above it.
        options.root.style.pointerEvents = 'none';
        options.root.append(this.tileRoot, this.attribution);
    }

    /**
     * Loads both levels before rendering so crossing the zoom threshold never
     * has to reinterpret partially initialized metadata. `updateViewport` may
     * safely run first; its latest value is rendered once initialization ends.
     */
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

    /**
     * Accepts every transient viewport frame because Redux only receives settled
     * pan/zoom state. The latest frame controls both level choice and tile range.
     */
    updateViewport(viewport: LiveViewport) {
        if (this.disposed) return;
        this.viewport = viewport;

        // Attribution must follow even before tile metadata is ready, because viewport updates are independent of loading.
        this.positionAttribution(viewport);
        if (this.levels) {
            const target = isMapZoomed(viewport.zoom) ? this.levels.zoomed : this.levels.overview;
            if (target !== this.activeLevel) this.switchLevel(target);
        }
        this.scheduleRender();
    }

    /**
     * Makes teardown terminal for active fetches, queued fetches, animation
     * frames, and owned DOM. This matters when project type changes while
     * initialization or tile decoding is still in flight.
     */
    dispose() {
        this.disposed = true;
        this.generation += 1;
        this.abortController.abort();
        const abortError = new DOMException('Map tile controller disposed', 'AbortError');

        // AbortController only rejects requests that already started; queued tasks need an explicit terminal result.
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

    /**
     * Cross-checks separately published indexes before combining them. A level
     * must never use availability or bundle coordinates generated for another
     * name or zoom, even if each file is valid by itself.
     */
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
            // Accept only bundle shapes the resolver knows how to address; silently accepting another size loses tiles.
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

    /** Coalesces high-frequency viewport changes before doing visibility math. */
    private scheduleRender() {
        if (!this.levels || !this.viewport || this.renderFrame !== undefined || this.disposed) return;

        // Pan events can outpace paint; coalescing them avoids calculating visibility for viewports never shown.
        this.renderFrame = requestAnimationFrame(() => {
            this.renderFrame = undefined;
            this.render();
        });
    }

    /**
     * Re-evaluates the level inside the scheduled frame because the viewport may
     * have crossed the threshold after that frame was requested.
     */
    private render() {
        if (!this.levels || !this.viewport || this.disposed) return;
        const target = isMapZoomed(this.viewport.zoom) ? this.levels.zoomed : this.levels.overview;
        if (target !== this.activeLevel) this.switchLevel(target);
        this.syncVisibleTiles(target, this.viewport);
    }

    /** Invalidates all level-specific async and DOM state before accepting tiles from a new source level. */
    private switchLevel(level: MapLevel) {
        // Overlapping coordinates still refer to different source geometry, so nodes cannot be reused across levels.
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

    /**
     * Reconciles against existing nodes rather than rebuilding every visible
     * tile on a pan. Retaining overlap reduces DOM churn and prevents avoidable
     * flashes while only the newly exposed edge is loading.
     */
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

    /**
     * Computes coverage in the common world-pixel space so overview and detailed
     * levels select the same geographic area despite using different source zooms.
     */
    private getVisibleTiles(level: MapLevel, viewport: LiveViewport) {
        const size = this.options.getViewportSize();
        const graphMax = {
            x: viewport.x + (size.width * viewport.zoom) / 100,
            y: viewport.y + (size.height * viewport.zoom) / 100,
        };
        const worldMin = graphToWorldPixel(viewport);
        const worldMax = graphToWorldPixel(graphMax);

        // Level tiles are scaled into the common zoom before converting back to graph units.
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

    /**
     * Resolves only bundles declared by the index; deriving a plausible URL is
     * not enough at sparse dataset boundaries where that file may not exist.
     */
    private resolveBundle(level: MapLevel, x: number, y: number) {
        // `MAP_BUNDLE_SIDES` is largest-first so dense areas are served with fewer requests.
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

    /**
     * Separates async decode from frame-batched mounting and captures the current
     * level generation so a late completion cannot reintroduce stale geometry.
     */
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

                // The cache retains an unmounted template; every appearance gets an independent DOM node.
                const tile = template.cloneNode(true) as SVGSVGElement;
                this.positionTile(tile, request);
                this.mountQueue.push({ generation, request, tile });
                this.scheduleMount();
            })
            .catch(error => {
                if (this.disposed || generation !== this.generation) return;
                console.error(`Map tile failed: ${request.key}`, error);
                this.pending.delete(request.key);

                // A failed desired tile is terminal for this switch; otherwise the loading state could remain forever.
                if (this.desired.has(request.key)) this.settled.add(request.key);
                this.maybeFinishSwitch();
            });
    }

    /** Batches decoded tiles into a single live-DOM mutation and rechecks relevance at the last possible moment. */
    private scheduleMount() {
        if (this.mountFrame !== undefined) return;
        this.mountFrame = requestAnimationFrame(() => {
            this.mountFrame = undefined;

            // A fragment turns a burst of completed requests into one mutation of the live SVG tree.
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

    /**
     * Ends level-switch loading only after the current viewport has a terminal
     * result for every desired tile. The desired set may change during a pan, so
     * this cannot rely on a fixed request counter.
     */
    private maybeFinishSwitch() {
        if (!this.switching) return;

        // "Finished" means every currently visible tile either mounted or failed, not that every request succeeded.
        for (const key of this.desired.keys()) {
            if (!this.settled.has(key)) return;
        }
        this.switching = false;
        this.setLoading(false);
    }

    /**
     * Caches parsed, unmounted SVG templates and deduplicates concurrent requests
     * for the same tile. Keeping templates detached makes later cloning safe.
     */
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

    /**
     * Shares a bundle download among all contained tile requests. Address
     * validation still runs for cache hits and joined promises because URL
     * identity alone cannot prove the server published the expected content.
     */
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
            // URLs are cache keys, but embedded coordinates remain the authority for detecting a mispublished bundle.
            this.assertBundleAddress(bundle, expectedAddress, url);
            this.bundleCache.set(url, bundle, bundle.bytes.byteLength);
            return bundle;
        });
    }

    /** Evicts mismatched cached data so a bad response cannot remain a reusable success. */
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

    /**
     * Verifies embedded tile coordinates before importing the SVG into this
     * document. Correct metadata is required because placement uses the requested
     * key, not coordinates inferred from arbitrary SVG content.
     */
    private parseTileTemplate(source: string, tileKey: string, url: string) {
        const parsed = new DOMParser().parseFromString(source, 'image/svg+xml');
        if (parsed.querySelector('parsererror')) throw new Error(`Invalid SVG in ${url}`);
        const root = parsed.documentElement;
        const [zoom, x, y] = tileKey.split('/');

        // Reject coordinate mismatches before positioning; displaying a valid SVG in the wrong tile is harder to diagnose.
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

    /** Converts source-level tile coordinates to graph geometry through the shared reference zoom. */
    private positionTile(tile: SVGSVGElement, request: TileRequest) {
        // Normalize every source level through the common zoom so switching detail never shifts geographic features.
        const factor = 2 ** (MAP_COMMON_ZOOM - request.level.zoom);
        const commonTileSize = MAP_TILE_SIZE * factor;
        const graphPosition = worldPixelToGraph({ x: request.x * commonTileSize, y: request.y * commonTileSize });
        const graphSize = commonTileSize / MAP_WORLD_PIXELS_PER_GRAPH_UNIT;
        tile.setAttribute('x', String(graphPosition.x));
        tile.setAttribute('y', String(graphPosition.y));
        tile.setAttribute('width', String(graphSize));
        tile.setAttribute('height', String(graphSize));
        tile.setAttribute('overflow', 'hidden');
        tile.classList.add('rmp-map-tile');
        tile.dataset.level = request.level.name;
        tile.dataset.tileKey = request.key;
    }

    /** Keeps attribution at a constant visual inset and size in the interactive viewport. */
    private positionAttribution(viewport: LiveViewport) {
        const { width, height } = this.options.getViewportSize();

        /**
         * SVG text uses graph units inside the transformed viewport. Scaling the
         * inset and font by the inverse screen transform keeps both visually
         * constant while panning and zooming.
         */
        const unit = viewport.zoom / 100;
        this.attribution.setAttribute('x', String(viewport.x + 8 * unit));
        this.attribution.setAttribute('y', String(viewport.y + height * unit - 8 * unit));
        this.attribution.setAttribute('font-size', String(10 * unit));
    }

    /** Keeps loading presentation optional so tile lifecycle does not depend on a particular React alert component. */
    private setLoading(loading: boolean) {
        this.options.onLoadingChange?.(loading);
    }

    /** Routes every deferred fetch through one concurrency budget, regardless of which tile requested it. */
    private enqueueFetch<T>(task: () => Promise<T>): Promise<T> {
        return new Promise<T>((resolve, reject) => {
            this.fetchQueue.push({ task, resolve: resolve as (value: unknown) => void, reject });
            this.drainFetchQueue();
        });
    }

    /** Starts queued work until the shared network cap is reached. */
    private drainFetchQueue() {
        // Starting the next queued task in `finally` preserves the cap for successes, failures, and aborts alike.
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

    /** Applies the controller-wide abort signal so project changes terminate manifest and index requests too. */
    private async fetchJson<T>(url: URL): Promise<T> {
        const response = await this.fetcher(url, { signal: this.abortController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.href}`);
        return response.json() as Promise<T>;
    }

    /** Binary fetches share the same lifetime and HTTP failure semantics as manifest requests. */
    private async fetchArrayBuffer(url: URL) {
        const response = await this.fetcher(url, { signal: this.abortController.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${url.href}`);
        return response.arrayBuffer();
    }
}
