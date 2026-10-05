import { Id, LineId, NodeId } from '../constants/constants';

export const VIDEO_FRAME_BASE_VARIANT = 'base';

export interface VideoFrameSceneOptions {
    nodeIds: Iterable<NodeId>;
    edgeIds: Iterable<LineId>;
    maxCachedVariants?: number;
    measurePath?: (path: SVGPathElement, groupId: string, pathIndex: number) => number;
}

export interface VideoSceneNodeState {
    visible: boolean;
    progress?: number;
    /** Retained for the shared frame-state contract; the current animation fades names with their node. */
    textProgress?: number;
    transform?: string;
}

export interface VideoSceneEdgeState {
    visible: boolean;
    progress?: number;
    reverse?: boolean;
}

export interface VideoFrameSceneState {
    visibleNodes: ReadonlySet<NodeId>;
    visibleEdges: ReadonlySet<LineId>;
    nodeProgress: ReadonlyMap<NodeId, number>;
    textProgress?: ReadonlyMap<NodeId, number>;
    edgeProgress: ReadonlyMap<LineId, number>;
    edgeDirections: ReadonlyMap<LineId, boolean>;
    nodeTransforms?: ReadonlyMap<NodeId, string>;
    viewBox?: string | { x: number; y: number; width: number; height: number };
}

interface OpacityTarget {
    element: SVGElement;
    opacity: number;
    isText: boolean;
}

interface PathTarget {
    element: SVGPathElement;
    dasharray: string | null;
    dashoffset: string | null;
}

interface CachedVariant {
    template: SVGElement;
    source: SVGElement;
    sourcePaths: SVGPathElement[];
    markup?: string | SVGElement;
    lengths: Map<number, { d: string | null; length: number }>;
}

interface GroupRecord {
    id: string;
    owner: Id;
    element: SVGElement;
    variants: Map<string, CachedVariant>;
    variantKey: string;
    opacity: number;
    transform: string | null;
    display: string | null;
    opacityTargets: OpacityTarget[];
    paths: PathTarget[];
}

const clamp01 = (value: number | undefined, fallback = 1) =>
    value === undefined || !Number.isFinite(value) ? fallback : Math.max(0, Math.min(1, value));

const numericOpacity = (element: Element) => {
    const value = Number(element.getAttribute('opacity') ?? 1);
    return Number.isFinite(value) ? value : 1;
};

/** Attribute equality avoids redundant mutations, style invalidations and mutation observers. */
const writeAttribute = (element: Element, name: string, value: string | null) => {
    if (element.getAttribute(name) === value) return;
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
};

/** Only changed geometry/appearance variants walk a subtree; ordinary frames never call this. */
const patchElement = (element: SVGElement, template: SVGElement) => {
    for (const attribute of Array.from(element.attributes)) {
        if (!template.hasAttribute(attribute.name)) element.removeAttribute(attribute.name);
    }
    for (const attribute of Array.from(template.attributes)) {
        writeAttribute(element, attribute.name, attribute.value);
    }

    const children = Array.from(element.childNodes);
    const nextChildren = Array.from(template.childNodes);
    const compatible =
        children.length === nextChildren.length &&
        children.every(
            (child, index) =>
                child.nodeType === nextChildren[index].nodeType &&
                (!(child instanceof Element) || child.tagName === (nextChildren[index] as Element).tagName)
        );
    if (!compatible) {
        element.replaceChildren(...nextChildren.map(child => child.cloneNode(true)));
        return;
    }
    children.forEach((child, index) => {
        const next = nextChildren[index];
        if (child instanceof Element) patchElement(child as SVGElement, next as SVGElement);
        else if (child.nodeValue !== next.nodeValue) child.nodeValue = next.nodeValue;
    });
};

const cacheVariant = (source: SVGElement, markup?: string | SVGElement): CachedVariant => ({
    template: source.cloneNode(true) as SVGElement,
    source,
    sourcePaths: Array.from(source.querySelectorAll<SVGPathElement>('path')),
    markup,
    lengths: new Map(),
});

const captureBaselines = (record: GroupRecord) => {
    const { element } = record;
    record.opacity = numericOpacity(element);
    record.transform = element.getAttribute('transform');
    record.display = element.getAttribute('display');
    record.opacityTargets = Array.from(element.querySelectorAll<SVGElement>('*')).flatMap(child => {
        const tag = child.tagName.toLowerCase();
        if (tag === 'tspan') return [];
        return [{ element: child, opacity: numericOpacity(child), isText: tag === 'text' }];
    });
    record.paths = Array.from(element.querySelectorAll<SVGPathElement>('path')).map(path => ({
        element: path,
        dasharray: path.getAttribute('stroke-dasharray'),
        dashoffset: path.getAttribute('stroke-dashoffset'),
    }));
};

const sameNodeState = (a: VideoSceneNodeState | undefined, b: VideoSceneNodeState) =>
    a?.visible === b.visible && a.progress === b.progress && a.transform === b.transform;

const sameEdgeState = (a: VideoSceneEdgeState | undefined, b: VideoSceneEdgeState) =>
    a?.visible === b.visible && a.progress === b.progress && a.reverse === b.reverse;

/**
 * Own a prepared SVG without rebuilding its graph or resources during playback.
 * The supplied graph IDs are indexed once. Frames compare their cached state and
 * mutate only indexed attributes; geometry/appearance changes patch local groups.
 */
export const createVideoFrameScene = (svg: SVGSVGElement, options: VideoFrameSceneOptions) => {
    const nodeIds = new Set(options.nodeIds);
    const edgeIds = new Set(options.edgeIds);
    const groups = new Map<string, GroupRecord>();
    const ownerGroups = new Map<Id, GroupRecord[]>();
    const dirty = new Set<Id>();
    const visibleNodes = new Set(nodeIds);
    const visibleEdges = new Set(edgeIds);
    const nodeStates = new Map<NodeId, VideoSceneNodeState>();
    const edgeStates = new Map<LineId, VideoSceneEdgeState>();
    const requestedLimit = options.maxCachedVariants ?? 8;
    const maxCachedVariants = Number.isFinite(requestedLimit) ? Math.max(2, Math.floor(requestedLimit)) : 8;
    const measurePath = options.measurePath ?? ((path: SVGPathElement) => path.getTotalLength());

    const register = (id: string, owner: Id, element: SVGElement) => {
        const record: GroupRecord = {
            id,
            owner,
            element,
            variants: new Map([[VIDEO_FRAME_BASE_VARIANT, cacheVariant(element)]]),
            variantKey: VIDEO_FRAME_BASE_VARIANT,
            opacity: 1,
            transform: null,
            display: null,
            opacityTargets: [],
            paths: [],
        };
        captureBaselines(record);
        groups.set(id, record);
        ownerGroups.set(owner, [...(ownerGroups.get(owner) ?? []), record]);
        dirty.add(owner);
        return record;
    };
    for (const owner of [...nodeIds, ...edgeIds]) {
        for (const id of [owner, `${owner}.pre`, `${owner}.post`]) {
            const element = svg.getElementById(id) as SVGElement | null;
            if (element) register(id, owner, element);
        }
    }

    const pathLength = (record: GroupRecord, index: number) => {
        const target = record.paths[index]?.element;
        if (!target) return 0;
        const variant = record.variants.get(record.variantKey)!;
        const d = target.getAttribute('d');
        const cached = variant.lengths.get(index);
        if (cached?.d === d) return cached.length;
        const source = variant.sourcePaths[index];
        const measurable = source?.getAttribute('d') === d ? source : target;
        let length = 0;
        try {
            const measured = measurePath(measurable, record.id, index);
            if (Number.isFinite(measured) && measured >= 0) length = measured;
        } catch {
            // An injected graph/path metric can support DOM implementations without SVG measurement APIs.
        }
        variant.lengths.set(index, { d, length });
        return length;
    };

    const applyNode = (id: NodeId, input: VideoSceneNodeState) => {
        const state: VideoSceneNodeState = {
            visible: input.visible,
            progress: clamp01(input.progress),
            transform: input.transform,
        };
        if (!dirty.has(id) && sameNodeState(nodeStates.get(id), state)) return;
        for (const record of ownerGroups.get(id) ?? []) {
            writeAttribute(record.element, 'display', state.visible ? record.display : 'none');
            if (!state.visible) continue;
            writeAttribute(record.element, 'transform', state.transform ?? record.transform);
            if (id.startsWith('stn_')) {
                writeAttribute(record.element, 'opacity', String(record.opacity * state.progress!));
            } else {
                for (const target of record.opacityTargets) {
                    writeAttribute(
                        target.element,
                        'opacity',
                        String(target.isText ? state.progress : target.opacity * state.progress!)
                    );
                }
            }
        }
        nodeStates.set(id, state);
        if (state.visible) visibleNodes.add(id);
        else visibleNodes.delete(id);
        dirty.delete(id);
    };

    const applyEdge = (id: LineId, input: VideoSceneEdgeState) => {
        const progress = clamp01(input.progress);
        const state: VideoSceneEdgeState = {
            // Zero-length dashes still paint round caps, so hide every layer until drawing starts.
            visible: input.visible && progress > 0,
            progress,
            reverse: !!input.reverse,
        };
        const unchanged = !dirty.has(id) && sameEdgeState(edgeStates.get(id), state);
        // Only an animated edge checks its indexed paths for externally updated d attributes.
        if (unchanged && (!state.visible || state.progress === 1)) return;
        for (const record of ownerGroups.get(id) ?? []) {
            if (!unchanged) writeAttribute(record.element, 'display', state.visible ? record.display : 'none');
            if (!state.visible) continue;
            record.paths.forEach((target, index) => {
                if (state.progress === 1) {
                    writeAttribute(target.element, 'stroke-dasharray', target.dasharray);
                    writeAttribute(target.element, 'stroke-dashoffset', target.dashoffset);
                } else {
                    const length = pathLength(record, index);
                    const dashLength = length * state.progress!;
                    // Keep the next dash beyond the path even when tiny progress rounds to zero in SVG rendering.
                    writeAttribute(target.element, 'stroke-dasharray', `${dashLength} ${length * 2}`);
                    writeAttribute(
                        target.element,
                        'stroke-dashoffset',
                        state.reverse ? String(-(length - dashLength)) : '0'
                    );
                }
            });
        }
        edgeStates.set(id, state);
        if (state.visible) visibleEdges.add(id);
        else visibleEdges.delete(id);
        dirty.delete(id);
    };

    const touchVariant = (record: GroupRecord, key: string) => {
        const variant = record.variants.get(key)!;
        record.variants.delete(key);
        record.variants.set(key, variant);
        while (record.variants.size > maxCachedVariants) {
            const oldest = [...record.variants.keys()].find(key => key !== VIDEO_FRAME_BASE_VARIANT);
            if (oldest === undefined) break;
            record.variants.delete(oldest);
        }
        return variant;
    };

    /** Full group template. Matching nodes/paths retain their DOM identity as geometry changes. */
    const replaceGroup = (id: string, variantKey: string, template?: SVGElement) => {
        let record = groups.get(id);
        if (!record) {
            if (!template) throw new Error(`A template is required for new SVG group ${id}`);
            const owner = id.replace(/\.(pre|post)$/, '') as Id;
            const main = groups.get(owner)?.element;
            if (!main?.parentElement) throw new Error(`The main SVG group ${owner} is missing`);
            const element = template.cloneNode(true) as SVGElement;
            element.id = id;
            if (id.endsWith('.pre')) main.parentElement.insertBefore(element, main);
            else main.parentElement.insertBefore(element, main.nextSibling);
            record = register(id, owner, element);
        }
        let variant = record.variants.get(variantKey);
        const changedTemplate = !!template && (variant?.source !== template || template === record.element);
        if (template && changedTemplate) {
            variant = cacheVariant(template);
            const previous = record.variants.get(variantKey);
            if (previous) variant.lengths = previous.lengths;
            record.variants.set(variantKey, variant);
        }
        if (!variant) throw new Error(`SVG group variant ${variantKey} is not cached for ${id}`);
        touchVariant(record, variantKey);
        if (record.variantKey === variantKey && !changedTemplate) return record.element;
        patchElement(record.element, variant.template);
        record.element.id = id;
        record.variantKey = variantKey;
        captureBaselines(record);
        const visible = record.owner.startsWith('line_')
            ? visibleEdges.has(record.owner as LineId)
            : visibleNodes.has(record.owner as NodeId);
        if (!visible) writeAttribute(record.element, 'display', 'none');
        dirty.add(record.owner);
        return record.element;
    };

    /** Station markup changes retain the group's initial placement and update only its children. */
    const replaceGroupContents = (id: string, variantKey: string, markup?: string | SVGElement) => {
        const record = groups.get(id);
        if (!record) throw new Error(`SVG group ${id} is missing`);
        const cached = record.variants.get(variantKey);
        if (cached && (markup === undefined || cached.markup === markup)) return replaceGroup(id, variantKey);
        if (markup === undefined) throw new Error(`SVG group variant ${variantKey} is not cached for ${id}`);
        const template = record.variants.get(VIDEO_FRAME_BASE_VARIANT)!.template.cloneNode(true) as SVGElement;
        if (typeof markup === 'string') template.innerHTML = markup;
        else template.replaceChildren(markup.cloneNode(true));
        const result = replaceGroup(id, variantKey, template);
        record.variants.get(variantKey)!.markup = markup;
        return result;
    };

    const applyFrame = (state: VideoFrameSceneState) => {
        for (const id of visibleNodes) {
            if (!state.visibleNodes.has(id)) applyNode(id, { visible: false });
        }
        for (const id of state.visibleNodes) {
            applyNode(id, {
                visible: true,
                progress: state.nodeProgress.get(id),
                textProgress: state.textProgress?.get(id),
                transform: state.nodeTransforms?.get(id),
            });
        }
        for (const id of visibleEdges) {
            if (!state.visibleEdges.has(id)) applyEdge(id, { visible: false });
        }
        for (const id of state.visibleEdges) {
            applyEdge(id, {
                visible: true,
                progress: state.edgeProgress.get(id),
                reverse: state.edgeDirections.get(id),
            });
        }
        if (state.viewBox !== undefined) {
            const value =
                typeof state.viewBox === 'string'
                    ? state.viewBox
                    : `${state.viewBox.x} ${state.viewBox.y} ${state.viewBox.width} ${state.viewBox.height}`;
            writeAttribute(svg, 'viewBox', value);
        }
        return svg;
    };

    /** Export owns a clone and keeps the historical absence semantics for unrevealed elements. */
    const snapshot = () => {
        const clone = svg.cloneNode(true) as SVGSVGElement;
        for (const record of groups.values()) {
            const visible = record.owner.startsWith('line_')
                ? visibleEdges.has(record.owner as LineId)
                : visibleNodes.has(record.owner as NodeId);
            if (!visible) clone.getElementById(record.id)?.remove();
        }
        return clone;
    };

    return {
        svg,
        /** Restore indexed baselines on the next frame, including after a preview drag changes live attributes. */
        invalidate: () => {
            for (const owner of ownerGroups.keys()) dirty.add(owner);
        },
        applyFrame,
        applyNode,
        applyEdge,
        replaceGroup,
        replaceGroupContents,
        getGroup: (id: string) => groups.get(id)?.element,
        getEdgeLength: (id: LineId) => {
            const record = groups.get(id);
            return record ? pathLength(record, 0) : 0;
        },
        snapshot,
    };
};

export type VideoFrameScene = ReturnType<typeof createVideoFrameScene>;
