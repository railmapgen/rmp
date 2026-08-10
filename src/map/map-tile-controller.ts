import type { LiveViewport } from '../redux/viewport/viewport-slice';
import { getViewpointSize } from '../util/helpers';
import { ByteLru } from './byte-lru';
import {
    graphToWorldPixel,
    isMapZoomed,
    MAP_BUNDLE_CACHE_MAX_BYTES,
    MAP_BUNDLE_SIDES,
    MAP_COMMON_ZOOM,
    MAP_MAX_FETCHES,
    MAP_RASTER_IDLE_DELAY_MS,
    MAP_RASTER_TILE_SIZE,
    MAP_SOURCE_TTL_MS,
    MAP_TILE_BUFFER,
    MAP_TILE_CACHE_MAX_BYTES,
    MAP_TILE_CACHE_MAX_ENTRIES,
    MAP_TILE_SIZE,
    MAP_WORLD_PIXELS_PER_GRAPH_UNIT,
    worldPixelToGraph,
} from './map-config';
import { createMapAttribution, positionMapAttribution, setMapAttributionText } from './map-attribution';
import { getMapStyleCacheKey, mapRasterCache, MapRasterCacheApi, MapSourceSession } from './map-raster-cache';
import { createMapRasterizer, MapRasterizer } from './map-rasterizer';
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

/**
 * Models only the manifest fields that affect placement and loading. Version 3's
 * `defaultStyle` is deliberately not consumed because RMP owns the stylesheet
 * embedded in both its live canvas and exported SVG.
 */
interface MapManifest {
    formatVersion: number;
    projection: { name: string; tileSize: number };
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

interface MountedTile {
    request: TileRequest;
    svg: SVGSVGElement;
    rasterCacheRevision?: number;
    rasterUnavailable?: boolean;
    raster?: SVGImageElement;
    rasterUrl?: string;
    rasterReady?: boolean;
}

interface MountQueueEntry {
    generation: number;
    request: TileRequest;
    tile: SVGSVGElement;
    rasterCacheRevision?: number;
    rasterUnavailable?: boolean;
    raster?: Blob;
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
    onLoadingChange?: (loading: boolean, progress?: MapLoadingProgress) => void;
    fetch?: typeof globalThis.fetch;
    styleCss?: string;
    rasterCache?: MapRasterCacheApi | null;
    rasterizer?: MapRasterizer | null;
    rasterEnabled?: boolean;
    rasterIdleDelayMs?: number;
    now?: () => number;
}

/**
 * Counts visible tile outcomes instead of bundle downloads. A bundle can serve
 * several tiles or come from cache, so network request counts do not describe
 * how much of the current viewport is ready to display.
 */
export interface MapLoadingProgress {
    completed: number;
    total: number;
}

export interface MapOptimizationProgress {
    optimized: number;
    total: number;
}

/** Graph-coordinate bounds used when the export viewport is larger than the live editor viewport. */
export interface MapRenderBounds {
    xMin: number;
    yMin: number;
    xMax: number;
    yMax: number;
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
 * Connects an exported clone back to the controller that owns its live source
 * layer. DOM cloning cannot copy controller state, while rebuilding a second
 * controller would discard warmed indexes, in-flight requests, and parsed tile
 * caches precisely when a potentially large export needs them most.
 */
const controllersByRoot = new WeakMap<SVGGElement, MapTileController>();

/**
 * Replaces the map content in an export clone with tiles covering its full bounds.
 *
 * The source identifies the live controller; the target remains detached from
 * that controller's normal reconciliation, so preparing an export cannot pan the
 * editor or retain off-screen tiles in the interactive canvas.
 */
export const renderMapLayerForExport = (
    source: SVGGElement,
    target: SVGGElement,
    bounds: MapRenderBounds
): Promise<void> => {
    const controller = controllersByRoot.get(source);
    if (!controller) throw new Error('Map tile controller is not available for export');
    return controller.renderForExport(target, bounds);
};

/** Returns a snapshot of rasterized tiles in the current live viewport. */
export const getMapOptimizationProgress = (root: SVGGElement | null): MapOptimizationProgress => {
    const controller = root ? controllersByRoot.get(root) : undefined;
    return controller?.getOptimizationProgress() ?? { optimized: 0, total: 0 };
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
    private readonly attribution: SVGGElement;

    /**
     * Bundles avoid repeated network/parse work; tile templates avoid repeated
     * UTF-8 and SVG parsing. Templates are never mounted directly because one
     * DOM node cannot represent the same cached tile in multiple mount cycles.
     */
    private readonly bundleCache = new ByteLru<ParsedBundle>(MAP_BUNDLE_CACHE_MAX_BYTES);
    private readonly tileCache = new ByteLru<SVGSVGElement>(MAP_TILE_CACHE_MAX_BYTES, MAP_TILE_CACHE_MAX_ENTRIES);
    private rasterCache: MapRasterCacheApi | undefined;
    private rasterizer: MapRasterizer | undefined;
    private shouldCreateRasterizer: boolean;
    private readonly rasterIdleDelayMs: number;
    private readonly now: () => number;

    // A cache only helps completed work; these maps also deduplicate concurrent requests for the same resource.
    private readonly bundleRequests = new Map<string, Promise<ParsedBundle>>();
    private readonly tileRequests = new Map<string, Promise<SVGSVGElement>>();
    private readonly rasterRequests = new Map<string, Promise<Blob | null | undefined>>();

    // Fetches are queued globally across indexes and tile bundles to cap bursts caused by fast pans.
    private readonly fetchQueue: FetchQueueEntry<unknown>[] = [];

    /**
     * `desired` is recalculated from the latest viewport. The other collections
     * track which desired tiles are mounted, still loading, or definitively
     * finished (including failures), allowing a level switch to terminate even
     * when an individual tile cannot be loaded.
     */
    private readonly nodes = new Map<string, MountedTile>();
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
    private mountQueue: MountQueueEntry[] = [];
    private rasterTimer: ReturnType<typeof setTimeout> | undefined;
    private sourceExpiryTimer: ReturnType<typeof setTimeout> | undefined;
    private sourceSession: MapSourceSession | undefined;
    private styleCss: string;
    private styleKey: string;
    private rasterEnabled: boolean;
    private rasterRevision = 0;
    private rasterWorkActive = false;
    private rasterRescheduleRequested = false;
    private interactionActive = false;
    private lastActivityAt = 0;
    private disposed = false;
    private switching = false;
    private initialization: Promise<void> | undefined;

    constructor(private readonly options: MapTileControllerOptions) {
        this.fetcher = options.fetch ?? globalThis.fetch.bind(globalThis);
        this.rasterCache = options.rasterCache === undefined ? mapRasterCache : (options.rasterCache ?? undefined);
        this.rasterizer = options.rasterizer ?? undefined;
        this.shouldCreateRasterizer = options.rasterizer === undefined;
        this.rasterIdleDelayMs = options.rasterIdleDelayMs ?? MAP_RASTER_IDLE_DELAY_MS;
        this.now = options.now ?? Date.now;
        this.styleCss = options.styleCss ?? '';
        this.styleKey = getMapStyleCacheKey(this.styleCss);
        this.rasterEnabled = options.rasterEnabled ?? true;
        this.tileRoot = document.createElementNS(SVG_NAMESPACE, 'g');
        this.tileRoot.dataset.mapTiles = '';
        this.attribution = createMapAttribution();

        // The basemap is visual context; editor gestures must continue to target the SVG interaction layer above it.
        options.root.style.pointerEvents = 'none';
        options.root.append(this.tileRoot, this.attribution);
        controllersByRoot.set(options.root, this);
    }

    /**
     * Loads both levels before rendering so crossing the zoom threshold never
     * has to reinterpret partially initialized metadata. `updateViewport` may
     * safely run first; its latest value is rendered once initialization ends.
     *
     * Export preparation may join initialization while the live canvas is still
     * starting. Retaining one promise prevents that second consumer from loading
     * and parsing the same manifest and indexes again.
     */
    initialize() {
        this.initialization ??= this.initializeOnce();
        return this.initialization;
    }

    /** Performs the one controller-wide metadata load shared by live rendering and export. */
    private async initializeOnce() {
        const baseUrl = this.options.baseUrl.trim();
        if (!baseUrl) throw new Error('Map tile base URL is not configured');
        this.setLoading(true);
        const manifestUrl = new URL('manifest.json', baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
        this.manifestUrl = manifestUrl;
        this.sourceSession = await this.loadSourceSession(manifestUrl.href);
        const manifest = await this.fetchJson<MapManifest>(manifestUrl);
        if (manifest.formatVersion !== 3 || !Array.isArray(manifest.levels)) {
            throw new Error('Map manifest format version must be 3');
        }
        if (manifest.projection?.name !== 'WebMercatorQuad' || manifest.projection.tileSize !== MAP_TILE_SIZE) {
            // Tile placement assumes this projection and size; accepting another value would silently misalign the map.
            throw new Error('Unsupported map projection or tile size');
        }
        const overviewManifest = requireLevel(manifest, 'overview');
        const zoomedManifest = requireLevel(manifest, 'zoomed');
        const [overview, zoomed] = await Promise.all([
            this.loadLevel(overviewManifest, manifestUrl),
            this.loadLevel(zoomedManifest, manifestUrl),
        ]);
        if (this.disposed) return;
        this.sourceSession = await this.confirmSourceSession(this.sourceSession);
        if (this.disposed) return;
        this.scheduleSourceExpiryCheck();
        this.levels = { overview, zoomed };
        setMapAttributionText(this.attribution, manifest.attribution);
        this.scheduleRender();
    }

    /**
     * Accepts every transient viewport frame because Redux only receives settled
     * pan/zoom state. The latest frame controls both level choice and tile range.
     */
    updateViewport(viewport: LiveViewport) {
        if (this.disposed) return;
        this.markRasterActivity();
        this.viewport = viewport;

        // Attribution must follow even before tile metadata is ready, because viewport updates are independent of loading.
        this.positionAttribution(viewport);
        if (this.levels) {
            const target = isMapZoomed(viewport.zoom) ? this.levels.zoomed : this.levels.overview;
            if (target !== this.activeLevel) this.switchLevel(target);
        }
        this.scheduleRender();
    }

    updateStyle(styleCss: string) {
        if (this.disposed || styleCss === this.styleCss) return;
        this.styleCss = styleCss;
        this.styleKey = getMapStyleCacheKey(styleCss);
        this.rasterRevision += 1;
        this.rasterRequests.clear();
        // A failed raster is scoped by the style cache key, so a new style may try again.
        this.showAllSvgTiles(true);
        this.markRasterActivity();
    }

    setInteractionActive(active: boolean) {
        if (this.disposed || active === this.interactionActive) return;
        this.interactionActive = active;
        this.markRasterActivity();
    }

    setRasterEnabled(enabled: boolean) {
        if (this.disposed || enabled === this.rasterEnabled) return;
        this.rasterEnabled = enabled;
        this.rasterRevision += 1;
        this.rasterRequests.clear();
        if (this.rasterTimer !== undefined) clearTimeout(this.rasterTimer);
        this.rasterTimer = undefined;

        if (!enabled) {
            // Disabling is expected to restore editable SVG immediately, even
            // when a raster render or cache lookup is still finishing.
            this.rasterRescheduleRequested = false;
            this.showAllSvgTiles();
            return;
        }
        this.markRasterActivity();
    }

    getOptimizationProgress(): MapOptimizationProgress {
        let optimized = 0;
        for (const key of this.desired.keys()) {
            if (this.nodes.get(key)?.rasterReady) optimized += 1;
        }
        return { optimized, total: this.desired.size };
    }

    /**
     * Populates a detached export layer without changing the live desired set.
     *
     * Export expands the cloned SVG to graph bounds that are commonly much
     * larger than the editor viewport. Loading those tiles through the normal
     * viewport path would visibly pan the editor and then require another load
     * to restore it. A detached target can instead reuse the same metadata and
     * caches while keeping its DOM lifecycle independent.
     */
    async renderForExport(target: SVGGElement, bounds: MapRenderBounds) {
        if (![bounds.xMin, bounds.yMin, bounds.xMax, bounds.yMax].every(Number.isFinite)) {
            throw new Error('Invalid map export bounds');
        }
        if (bounds.xMax <= bounds.xMin || bounds.yMax <= bounds.yMin) {
            throw new Error('Map export bounds must have positive dimensions');
        }

        await this.initialize();
        if (this.disposed || !this.levels) return;

        /**
         * A single export must not mix overview and detailed geometry. The
         * freshest viewport chooses the same level the live renderer is about
         * to show, even if its coalesced animation frame has not run yet.
         */
        const level = this.viewport && isMapZoomed(this.viewport.zoom) ? this.levels.zoomed : this.levels.overview;
        const requests = this.getTilesForBounds(level, bounds, 0);
        const tiles = await Promise.all(
            [...requests.values()].map(async request => {
                try {
                    const template = await this.loadTileTemplate(request);
                    const tile = template.cloneNode(true) as SVGSVGElement;
                    this.positionTile(tile, request);
                    return tile;
                } catch (error) {
                    // One unavailable/corrupt tile should match live rendering semantics rather than cancel the whole export.
                    console.error(`Map export tile failed: ${request.key}`, error);
                    return undefined;
                }
            })
        );
        if (this.disposed) return;

        const tileRoot = document.createElementNS(SVG_NAMESPACE, 'g');
        tileRoot.dataset.mapTiles = '';
        tileRoot.append(...tiles.filter((tile): tile is SVGSVGElement => tile !== undefined));

        // Clone attribution only after initialization has supplied the manifest text.
        const attribution = this.attribution.cloneNode(true) as SVGGElement;
        target.replaceChildren(tileRoot, attribution);
    }

    /**
     * Makes teardown terminal for active fetches, queued fetches, animation
     * frames, and owned DOM. This matters when the map is disabled while
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
        if (this.rasterTimer !== undefined) clearTimeout(this.rasterTimer);
        if (this.sourceExpiryTimer !== undefined) clearTimeout(this.sourceExpiryTimer);
        this.renderFrame = undefined;
        this.mountFrame = undefined;
        this.rasterTimer = undefined;
        this.sourceExpiryTimer = undefined;
        this.mountQueue = [];
        this.clearMountedTiles();
        this.pending.clear();
        this.desired.clear();
        this.bundleCache.clear();
        this.tileCache.clear();
        this.rasterRequests.clear();
        this.rasterizer?.dispose();
        this.rasterizer = undefined;
        this.shouldCreateRasterizer = false;
        this.rasterRescheduleRequested = false;
        this.options.root.replaceChildren();
        if (controllersByRoot.get(this.options.root) === this) controllersByRoot.delete(this.options.root);
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
        this.rasterRevision += 1;
        this.activeLevel = level;
        this.clearMountedTiles();
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
                this.removeMountedTile(node);
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
        return this.getTilesForBounds(
            level,
            getViewpointSize(viewport, viewport.zoom, size.width, size.height),
            MAP_TILE_BUFFER
        );
    }

    /**
     * Resolves available tiles for either the live viewport or an export clone.
     *
     * The buffer belongs to interactive panning, where one off-screen tile hides
     * frame latency. Export bounds are stable and clipped by the final viewBox,
     * so their caller passes zero to avoid fetching invisible border tiles.
     */
    private getTilesForBounds(level: MapLevel, graphBounds: MapRenderBounds, buffer: number) {
        const worldMin = graphToWorldPixel({ x: graphBounds.xMin, y: graphBounds.yMin });
        const worldMax = graphToWorldPixel({ x: graphBounds.xMax, y: graphBounds.yMax });

        // Level tiles are scaled into the common zoom before converting back to graph units.
        const factor = 2 ** (MAP_COMMON_ZOOM - level.zoom);
        const commonTileSize = MAP_TILE_SIZE * factor;
        const bounds = level.tileBounds;
        const minX = Math.max(bounds.minX, Math.floor(worldMin.x / commonTileSize) - buffer);
        const maxX = Math.min(bounds.maxX, Math.floor(worldMax.x / commonTileSize) + buffer);
        const minY = Math.max(bounds.minY, Math.floor(worldMin.y / commonTileSize) - buffer);
        const maxY = Math.min(bounds.maxY, Math.floor(worldMax.y / commonTileSize) + buffer);
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
        const rasterRevision = this.rasterRevision;
        const session = this.rasterEnabled ? this.sourceSession : undefined;
        const styleKey = this.styleKey;
        const styleCss = this.styleCss;
        this.pending.add(request.key);
        Promise.all([
            this.loadTileTemplate(request),
            session
                ? this.loadCachedRaster(session, styleKey, styleCss, request.key)
                : Promise.resolve<Blob | null | undefined>(undefined),
        ])
            .then(([template, raster]) => {
                if (this.disposed || generation !== this.generation) return;
                if (!this.desired.has(request.key)) {
                    this.pending.delete(request.key);
                    return;
                }

                // The cache retains an unmounted template; every appearance gets an independent DOM node.
                const tile = template.cloneNode(true) as SVGSVGElement;
                this.positionTile(tile, request);
                const currentSession = this.sourceSession;
                const rasterCacheIsCurrent =
                    this.rasterEnabled &&
                    session !== undefined &&
                    currentSession !== undefined &&
                    rasterRevision === this.rasterRevision &&
                    currentSession.sourceKey === session.sourceKey &&
                    currentSession.epoch === session.epoch &&
                    currentSession.expiresAt > this.now();
                this.mountQueue.push({
                    generation,
                    request,
                    tile,
                    rasterCacheRevision: rasterCacheIsCurrent ? rasterRevision : undefined,
                    rasterUnavailable: rasterCacheIsCurrent && raster === null,
                    raster: rasterCacheIsCurrent ? (raster ?? undefined) : undefined,
                });
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
                const { generation, request, tile, rasterCacheRevision, rasterUnavailable, raster } = item;
                if (generation !== this.generation) continue;
                if (!this.desired.has(request.key)) {
                    this.pending.delete(request.key);
                    continue;
                }
                if (!this.nodes.has(request.key)) {
                    fragment.append(tile);
                    const mounted = { request, svg: tile, rasterCacheRevision, rasterUnavailable };
                    this.nodes.set(request.key, mounted);
                    if (raster) this.applyRaster(mounted, raster, true);
                }
                this.pending.delete(request.key);
                this.settled.add(request.key);
            }
            this.tileRoot.append(fragment);
            this.maybeFinishSwitch();
            this.scheduleRasterWork();
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
        let completed = 0;
        for (const key of this.desired.keys()) {
            if (this.settled.has(key)) completed += 1;
        }
        if (completed < this.desired.size) {
            // The desired range may change while panning, so progress always describes the latest viewport.
            this.setLoading(true, { completed, total: this.desired.size });
            return;
        }
        this.switching = false;
        this.setLoading(false);
        this.scheduleRasterWork();
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

    private loadCachedRaster(
        session: MapSourceSession,
        styleKey: string,
        styleCss: string,
        tileKey: string
    ): Promise<Blob | null | undefined> {
        const rasterCache = this.rasterCache;
        if (!rasterCache || session.expiresAt <= this.now()) return Promise.resolve(undefined);
        const requestKey = JSON.stringify([session.sourceKey, session.epoch, styleKey, styleCss, tileKey]);
        const inFlight = this.rasterRequests.get(requestKey);
        if (inFlight) return inFlight;
        const promise = rasterCache
            .getRaster(session, styleKey, styleCss, tileKey, this.now())
            .catch(error => {
                console.warn(`Failed to read cached map raster ${tileKey}`, error);
                if (this.rasterCache === rasterCache) this.rasterCache = undefined;
                return undefined;
            })
            .finally(() => {
                if (this.rasterRequests.get(requestKey) === promise) this.rasterRequests.delete(requestKey);
            });
        this.rasterRequests.set(requestKey, promise);
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
        this.positionTileElement(tile, request);
        tile.setAttribute('overflow', 'hidden');
        tile.classList.add('rmp-map-tile');
    }

    /** Keeps SVG source tiles and their raster replacements on exactly the same graph bounds. */
    private positionTileElement(element: SVGSVGElement | SVGImageElement, request: TileRequest) {
        // Normalize every source level through the common zoom so switching detail never shifts geographic features.
        const factor = 2 ** (MAP_COMMON_ZOOM - request.level.zoom);
        const commonTileSize = MAP_TILE_SIZE * factor;
        const graphPosition = worldPixelToGraph({ x: request.x * commonTileSize, y: request.y * commonTileSize });
        const graphSize = commonTileSize / MAP_WORLD_PIXELS_PER_GRAPH_UNIT;
        element.setAttribute('x', String(graphPosition.x));
        element.setAttribute('y', String(graphPosition.y));
        element.setAttribute('width', String(graphSize));
        element.setAttribute('height', String(graphSize));
        element.dataset.level = request.level.name;
        element.dataset.tileKey = request.key;
    }

    private async loadSourceSession(sourceKey: string): Promise<MapSourceSession> {
        const now = this.now();
        try {
            const session = await this.rasterCache?.getSourceSession(sourceKey, now);
            if (session) return session;
        } catch (error) {
            console.warn('Failed to initialize the map raster cache', error);
            this.rasterCache = undefined;
        }
        return {
            sourceKey,
            epoch: `memory-${now}`,
            expiresAt: now + MAP_SOURCE_TTL_MS,
            refreshSource: true,
        };
    }

    private async confirmSourceSession(session: MapSourceSession) {
        try {
            return (await this.rasterCache?.confirmSourceSession(session)) ?? { ...session, refreshSource: false };
        } catch (error) {
            console.warn('Failed to persist the map source cache epoch', error);
            this.rasterCache = undefined;
            return { ...session, refreshSource: false };
        }
    }

    private markRasterActivity() {
        this.lastActivityAt = this.now();
        // Panning, editing, or a style change invalidates the visible batch.
        this.scheduleRasterWork();
    }

    private scheduleRasterWork() {
        if (this.rasterTimer !== undefined) clearTimeout(this.rasterTimer);
        this.rasterTimer = undefined;
        if (this.rasterWorkActive) {
            this.rasterRescheduleRequested = true;
            return;
        }
        if (this.disposed || !this.rasterEnabled || !this.sourceSession) return;
        if (!this.rasterCache && !this.rasterizer && !this.shouldCreateRasterizer) return;
        if (this.switching || this.interactionActive) return;
        for (const key of this.desired.keys()) {
            if (!this.nodes.has(key)) return;
        }
        const remainingDelay = Math.max(0, this.rasterIdleDelayMs - (this.now() - this.lastActivityAt));
        this.rasterTimer = setTimeout(() => {
            this.rasterTimer = undefined;
            void this.processRasterWork();
        }, remainingDelay);
    }

    private async processRasterWork() {
        if (!this.canContinueRasterWork(this.rasterRevision) || !this.sourceSession) return;
        this.rasterWorkActive = true;
        const revision = this.rasterRevision;
        const session = this.sourceSession;
        const styleKey = this.styleKey;
        const styleCss = this.styleCss;
        const missing: MountedTile[] = [];
        try {
            for (const request of this.desired.values()) {
                if (!this.canContinueRasterWork(revision)) return;
                const mounted = this.nodes.get(request.key);
                if (!mounted || mounted.raster || mounted.rasterUnavailable) continue;
                let cached: Blob | null | undefined;
                if (mounted.rasterCacheRevision !== revision) {
                    cached = await this.loadCachedRaster(session, styleKey, styleCss, request.key);
                    if (!this.canUseRasterResult(mounted, revision)) return;
                    mounted.rasterCacheRevision = revision;
                }
                if (cached === null) {
                    mounted.rasterUnavailable = true;
                } else if (cached) {
                    this.applyRaster(mounted, cached);
                } else {
                    missing.push(mounted);
                }
            }

            if (missing.length === 0 || !this.getRasterizer()) return;
            let completed = 0;
            this.logRasterProgress(completed, missing.length);
            for (const mounted of missing) {
                const rasterizer = this.getRasterizer();
                if (!rasterizer || !this.canContinueRasterWork(revision)) return;
                let blob: Blob;
                try {
                    blob = await rasterizer.render(
                        this.serializeTileForRaster(mounted.svg, MAP_RASTER_TILE_SIZE),
                        MAP_RASTER_TILE_SIZE
                    );
                } catch (error) {
                    if (!this.disposed) console.warn('Map rasterization failed; keeping SVG tiles', error);
                    rasterizer.dispose();
                    if (this.rasterizer === rasterizer) this.rasterizer = undefined;
                    return;
                }
                if (!this.canUseRasterResult(mounted, revision)) return;
                try {
                    await this.rasterCache?.putRaster(
                        session,
                        styleKey,
                        styleCss,
                        mounted.request.key,
                        blob,
                        this.now()
                    );
                } catch (error) {
                    console.warn(`Failed to cache map raster ${mounted.request.key}`, error);
                    this.rasterCache = undefined;
                }
                if (!this.canUseRasterResult(mounted, revision)) return;
                this.applyRaster(mounted, blob);
                completed += 1;
                this.logRasterProgress(completed, missing.length);
            }
        } finally {
            this.rasterWorkActive = false;
            if (this.rasterRescheduleRequested) {
                this.rasterRescheduleRequested = false;
                this.scheduleRasterWork();
            }
        }
    }

    private getRasterizer() {
        if (!this.rasterizer && this.shouldCreateRasterizer) {
            this.shouldCreateRasterizer = false;
            this.rasterizer = createMapRasterizer();
        }
        return this.rasterizer;
    }

    private canContinueRasterWork(revision: number) {
        if (
            this.disposed ||
            !this.rasterEnabled ||
            revision !== this.rasterRevision ||
            this.switching ||
            this.interactionActive ||
            !this.sourceSession ||
            this.sourceSession.expiresAt <= this.now()
        ) {
            return false;
        }
        return this.now() - this.lastActivityAt >= this.rasterIdleDelayMs;
    }

    private canUseRasterResult(mounted: MountedTile, revision: number) {
        return (
            this.canContinueRasterWork(revision) &&
            this.nodes.get(mounted.request.key) === mounted &&
            this.desired.has(mounted.request.key)
        );
    }

    private serializeTileForRaster(tile: SVGSVGElement, size: number) {
        const rasterRoot = document.createElementNS(SVG_NAMESPACE, 'svg');
        rasterRoot.setAttribute('data-map-layer', '');
        rasterRoot.setAttribute('width', String(size));
        rasterRoot.setAttribute('height', String(size));

        const clone = tile.cloneNode(true) as SVGSVGElement;
        clone.removeAttribute('x');
        clone.removeAttribute('y');
        clone.removeAttribute('overflow');
        clone.setAttribute('width', String(size));
        clone.setAttribute('height', String(size));
        clone.style.removeProperty('display');

        const style = document.createElementNS(SVG_NAMESPACE, 'style');
        style.textContent = this.styleCss;
        rasterRoot.append(style, clone);
        return new XMLSerializer().serializeToString(rasterRoot);
    }

    private applyRaster(mounted: MountedTile, blob: Blob, hideSvgWhileLoading = false) {
        if (!this.rasterEnabled || mounted.raster || typeof URL.createObjectURL !== 'function') return;
        const session = this.sourceSession;
        const styleKey = this.styleKey;
        const styleCss = this.styleCss;
        const image = document.createElementNS(SVG_NAMESPACE, 'image');
        const objectUrl = URL.createObjectURL(blob);
        this.positionRasterImage(image, mounted.request);
        image.dataset.mapRaster = '';
        image.style.visibility = 'hidden';
        image.setAttribute('decoding', 'async');
        image.setAttribute('href', objectUrl);
        if (hideSvgWhileLoading) mounted.svg.style.display = 'none';
        image.addEventListener(
            'load',
            () => {
                if (mounted.raster !== image || this.nodes.get(mounted.request.key) !== mounted) return;
                image.style.removeProperty('visibility');
                mounted.svg.style.display = 'none';
                mounted.rasterReady = true;
            },
            { once: true }
        );
        image.addEventListener(
            'error',
            () => {
                if (mounted.raster !== image) return;
                this.clearRaster(mounted);
                mounted.rasterUnavailable = true;
                console.warn(`Failed to decode map raster ${mounted.request.key}; keeping SVG tile`);
                const rasterCache = this.rasterCache;
                if (!rasterCache || !session) return;
                void rasterCache
                    .putRaster(session, styleKey, styleCss, mounted.request.key, null, this.now())
                    .catch(error => {
                        console.warn(`Failed to cache map raster failure ${mounted.request.key}`, error);
                        if (this.rasterCache === rasterCache) this.rasterCache = undefined;
                    });
            },
            { once: true }
        );
        mounted.raster = image;
        mounted.rasterUrl = objectUrl;
        mounted.svg.after(image);
    }

    private positionRasterImage(image: SVGImageElement, request: TileRequest) {
        this.positionTileElement(image, request);
        image.setAttribute('preserveAspectRatio', 'none');
    }

    private showAllSvgTiles(resetRasterAvailability = false) {
        for (const mounted of this.nodes.values()) {
            this.clearRaster(mounted);
            if (resetRasterAvailability) mounted.rasterUnavailable = false;
        }
    }

    private clearMountedTiles() {
        for (const mounted of this.nodes.values()) this.removeMountedTile(mounted);
        this.nodes.clear();
    }

    private removeMountedTile(mounted: MountedTile) {
        this.clearRaster(mounted);
        mounted.svg.remove();
    }

    private clearRaster(mounted: MountedTile) {
        mounted.raster?.remove();
        if (mounted.rasterUrl) URL.revokeObjectURL(mounted.rasterUrl);
        mounted.raster = undefined;
        mounted.rasterUrl = undefined;
        mounted.rasterReady = false;
        mounted.svg.style.removeProperty('display');
    }

    private scheduleSourceExpiryCheck() {
        if (this.sourceExpiryTimer !== undefined) clearTimeout(this.sourceExpiryTimer);
        this.sourceExpiryTimer = undefined;
        if (!this.sourceSession || this.disposed) return;
        const remaining = this.sourceSession.expiresAt - this.now();
        if (remaining <= 0) {
            this.rasterRevision += 1;
            this.rasterRequests.clear();
            this.showAllSvgTiles();
            if (this.rasterTimer !== undefined) clearTimeout(this.rasterTimer);
            this.rasterTimer = undefined;
            return;
        }
        this.sourceExpiryTimer = setTimeout(
            () => this.scheduleSourceExpiryCheck(),
            Math.min(remaining, 24 * 60 * 60 * 1000)
        );
    }

    /** Cache hits stay silent; only newly rendered tiles produce diagnostic progress. */
    private logRasterProgress(completed: number, total: number) {
        console.info(`Background map rasterization: ${completed} / ${total}`);
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
        positionMapAttribution(this.attribution, viewport.x + 8 * unit, viewport.y + height * unit - 8 * unit, unit);
    }

    /** Keeps loading presentation optional so tile lifecycle does not depend on a particular React alert component. */
    private setLoading(loading: boolean, progress?: MapLoadingProgress) {
        this.options.onLoadingChange?.(loading, progress);
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
        const requestUrl = this.getSourceRequestUrl(url);
        const response = await this.fetcher(requestUrl, {
            signal: this.abortController.signal,
            cache: this.sourceSession?.refreshSource ? 'reload' : 'default',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${requestUrl.href}`);
        return response.json() as Promise<T>;
    }

    /** Binary fetches share the same lifetime and HTTP failure semantics as manifest requests. */
    private async fetchArrayBuffer(url: URL) {
        const requestUrl = this.getSourceRequestUrl(url);
        const response = await this.fetcher(requestUrl, {
            signal: this.abortController.signal,
            cache: this.sourceSession?.refreshSource ? 'reload' : 'default',
        });
        if (!response.ok) throw new Error(`HTTP ${response.status} for ${requestUrl.href}`);
        return response.arrayBuffer();
    }

    private getSourceRequestUrl(url: URL) {
        const requestUrl = new URL(url);
        if (this.sourceSession) requestUrl.searchParams.set('rmp-source-epoch', this.sourceSession.epoch);
        return requestUrl;
    }
}
