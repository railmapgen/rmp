import { describe, expect, it, vi } from 'vitest';
import { LineId, NodeId } from '../constants/constants';
import { createVideoFrameScene, VIDEO_FRAME_BASE_VARIANT, VideoFrameSceneState } from './video-frame-scene';

const parseSvg = (markup: string) =>
    new DOMParser().parseFromString(markup, 'image/svg+xml').documentElement as unknown as SVGSVGElement;

const template = (markup: string) =>
    parseSvg(`<svg xmlns="http://www.w3.org/2000/svg">${markup}</svg>`).firstElementChild as SVGElement;

const makeScene = (maxCachedVariants?: number) => {
    const svg = parseSvg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 100">
        <defs><style>.station { fill: red; }</style><symbol id="facility"><path d="M0 0L2 2"/></symbol></defs>
        <g id="stations">
            <g id="stn_a" transform="translate(10, 20)" opacity="0.8"><path class="hit" opacity="0" d="M0 0L10 0"/><text>A</text></g>
            <g id="stn_a.post" transform="translate(10, 20)"><use href="#facility"/></g>
            <g id="stn_b" transform="translate(30, 40) scale(2)"><circle r="4"/></g>
            <g id="stn_b.post"><text>B</text></g>
            <g id="misc_node_label"><g opacity="0.4"><path opacity="0.7" d="M0 0L2 0"/></g><text opacity="0.2">Name<tspan opacity="0.3">name</tspan></text></g>
        </g>
        <g id="lines">
            <g id="line_ab.pre"><path d="M0 0L100 0" data-length="100"/></g>
            <g id="line_ab"><path d="M0 0L100 0" data-length="100" stroke-dasharray="4 2" stroke-dashoffset="3" data-old="remove"/></g>
            <g id="line_ab.post"><path d="M0 0L100 0" data-length="100"/></g>
            <g id="line_hidden.pre"><path d="M0 0L10 0" data-length="10"/></g>
            <g id="line_hidden"><path d="M0 0L10 0" data-length="10"/></g>
        </g>
        <image href="data:image/png;base64,AAAA"/>
    </svg>`);
    const measurePath = vi.fn((path: SVGPathElement) => Number(path.getAttribute('data-length') ?? 0));
    const scene = createVideoFrameScene(svg, {
        nodeIds: ['stn_a', 'stn_b', 'misc_node_label'],
        edgeIds: ['line_ab', 'line_hidden'],
        maxCachedVariants,
        measurePath,
    });
    return { svg, scene, measurePath };
};

const frame = (overrides: Partial<VideoFrameSceneState> = {}): VideoFrameSceneState => ({
    visibleNodes: new Set<NodeId>(['stn_a', 'misc_node_label']),
    visibleEdges: new Set<LineId>(['line_ab']),
    nodeProgress: new Map(),
    edgeProgress: new Map(),
    edgeDirections: new Map(),
    ...overrides,
});

describe('persistent video frame scene', () => {
    it('keeps the prepared SVG, group and path references and skips mutations on an unchanged frame', () => {
        const { svg, scene } = makeScene();
        const group = scene.getGroup('line_ab')!;
        const path = group.firstElementChild!;
        const state = frame({ viewBox: { x: 10, y: 20, width: 400, height: 225 } });
        expect(scene.applyFrame(state)).toBe(svg);
        const observer = new MutationObserver(() => undefined);
        observer.observe(svg, { attributes: true, childList: true, subtree: true, characterData: true });
        const query = vi.spyOn(svg, 'querySelectorAll');
        const groupQuery = vi.spyOn(group, 'querySelectorAll');

        scene.applyFrame(state);

        expect(scene.getGroup('line_ab')).toBe(group);
        expect(group.firstElementChild).toBe(path);
        expect(observer.takeRecords()).toHaveLength(0);
        expect(query).not.toHaveBeenCalled();
        expect(groupQuery).not.toHaveBeenCalled();
        expect(svg.getAttribute('viewBox')).toBe('10 20 400 225');
        observer.disconnect();
    });

    it('fades stations at their original size from clean baselines in either seek direction', () => {
        const { scene } = makeScene();
        const station = scene.getGroup('stn_a')!;
        const hitRegion = station.querySelector('.hit')!;
        scene.applyNode('stn_a', { visible: true, progress: 0.5 });
        expect(Number(station.getAttribute('opacity'))).toBeCloseTo(0.4);
        expect(station.getAttribute('transform')).toBe('translate(10, 20)');
        expect(hitRegion.getAttribute('opacity')).toBe('0');

        scene.applyNode('stn_a', { visible: true, progress: 0.2 });
        expect(Number(station.getAttribute('opacity'))).toBeCloseTo(0.16);
        expect(station.getAttribute('transform')).toBe('translate(10, 20)');
        scene.applyNode('stn_a', { visible: true });
        expect(station.getAttribute('opacity')).toBe('0.8');
        expect(station.getAttribute('transform')).toBe('translate(10, 20)');
        expect(scene.getGroup('stn_a.post')!.getAttribute('opacity')).toBe('1');
    });

    it('restores explicit node positions, preserves an existing scale, and can force a same-time refresh', () => {
        const { scene } = makeScene();
        const station = scene.getGroup('stn_a')!;
        scene.applyNode('stn_a', { visible: true, transform: 'translate(50, 60)' });
        expect(station.getAttribute('transform')).toBe('translate(50, 60)');
        scene.applyNode('stn_a', { visible: true });
        expect(station.getAttribute('transform')).toBe('translate(10, 20)');
        station.setAttribute('transform', 'translate(300, 400)');
        scene.invalidate();
        scene.applyNode('stn_a', { visible: true });
        expect(station.getAttribute('transform')).toBe('translate(10, 20)');

        scene.applyNode('stn_b', { visible: true, progress: 0.5 });
        expect(scene.getGroup('stn_b')!.getAttribute('transform')).toBe('translate(30, 40) scale(2)');
    });

    it('retains each miscellaneous descendant opacity and the existing text reveal semantics', () => {
        const { scene } = makeScene();
        const label = scene.getGroup('misc_node_label')!;
        scene.applyNode('misc_node_label', { visible: true, progress: 0.5, textProgress: 0.1 });
        expect(label.firstElementChild!.getAttribute('opacity')).toBe('0.2');
        expect(Number(label.querySelector('path')!.getAttribute('opacity'))).toBeCloseTo(0.35);
        expect(label.querySelector('text')!.getAttribute('opacity')).toBe('0.5');
        expect(label.querySelector('tspan')!.getAttribute('opacity')).toBe('0.3');
        scene.applyNode('misc_node_label', { visible: true, progress: 0.25 });
        expect(label.firstElementChild!.getAttribute('opacity')).toBe('0.1');
        scene.applyNode('misc_node_label', { visible: true });
        expect(label.querySelector('path')!.getAttribute('opacity')).toBe('0.7');
        expect(label.querySelector('text')!.getAttribute('opacity')).toBe('1');
    });

    it('measures each edge path once, changes reverse drawing, and restores original dash attributes', () => {
        const { scene, measurePath } = makeScene();
        const path = scene.getGroup('line_ab')!.firstElementChild!;
        scene.applyEdge('line_ab', { visible: true, progress: 0.25 });
        expect(path.getAttribute('stroke-dasharray')).toBe('25 200');
        expect(path.getAttribute('stroke-dashoffset')).toBe('0');
        expect(measurePath).toHaveBeenCalledTimes(3);
        scene.applyEdge('line_ab', { visible: true, progress: 0.6, reverse: true });
        expect(path.getAttribute('stroke-dasharray')).toBe('60 200');
        expect(path.getAttribute('stroke-dashoffset')).toBe('-40');
        expect(measurePath).toHaveBeenCalledTimes(3);
        scene.applyEdge('line_ab', { visible: true });
        expect(path.getAttribute('stroke-dasharray')).toBe('4 2');
        expect(path.getAttribute('stroke-dashoffset')).toBe('3');
        expect(scene.getGroup('line_ab.pre')!.firstElementChild!.hasAttribute('stroke-dasharray')).toBe(false);
        scene.applyEdge('line_ab', { visible: true, progress: 0.1 });
        expect(path.getAttribute('stroke-dasharray')).toBe('10 200');
        expect(measurePath).toHaveBeenCalledTimes(3);
    });

    it.each([false, true])('hides zero-progress round caps and restores drawing when seeking (reverse=%s)', reverse => {
        const { scene, measurePath } = makeScene();
        const ids = ['line_ab', 'line_ab.pre', 'line_ab.post'];
        for (const id of ids) scene.getGroup(id)!.firstElementChild!.setAttribute('stroke-linecap', 'round');

        for (const progress of [0, 0.25, 1, 0, 0.25]) {
            scene.applyEdge('line_ab', { visible: true, progress, reverse });
            for (const id of ids) {
                expect(scene.getGroup(id)!.getAttribute('display')).toBe(progress === 0 ? 'none' : null);
                expect(scene.snapshot().getElementById(id) === null).toBe(progress === 0);
            }
            if (progress === 0) continue;
            const path = scene.getGroup('line_ab')!.firstElementChild!;
            expect(path.getAttribute('stroke-dasharray')).toBe(progress === 1 ? '4 2' : '25 200');
            expect(path.getAttribute('stroke-dashoffset')).toBe(progress === 1 ? '3' : reverse ? '-75' : '0');
        }
        expect(measurePath).toHaveBeenCalledTimes(3);
    });

    it.each([false, true])('keeps repeated dashes beyond the path at tiny progress (reverse=%s)', reverse => {
        const { scene } = makeScene();
        scene.applyEdge('line_ab', { visible: true, progress: 1e-12, reverse });
        const path = scene.getGroup('line_ab')!.firstElementChild!;
        const [dash, gap] = path.getAttribute('stroke-dasharray')!.split(' ').map(Number);
        const offset = Number(path.getAttribute('stroke-dashoffset'));
        const nextDashStart = -offset + dash + gap;
        const previousDashEnd = -offset - gap;
        expect(scene.getGroup('line_ab')!.hasAttribute('display')).toBe(false);
        expect(dash).toBeCloseTo(1e-10, 12);
        expect(nextDashStart).toBeGreaterThanOrEqual(200);
        expect(previousDashEnd).toBeLessThanOrEqual(-100);
    });

    it('hides the live groups but removes unrevealed main/pre/post groups only from export snapshots', () => {
        const { svg, scene } = makeScene();
        scene.applyFrame(frame());
        expect(scene.getGroup('stn_b')!.getAttribute('display')).toBe('none');
        expect(scene.getGroup('stn_b.post')!.getAttribute('display')).toBe('none');
        expect(scene.getGroup('line_hidden.pre')!.getAttribute('display')).toBe('none');
        expect(scene.getGroup('stn_a')!.hasAttribute('display')).toBe(false);
        const snapshot = scene.snapshot();
        expect(snapshot).not.toBe(svg);
        for (const id of ['stn_b', 'stn_b.post', 'line_hidden', 'line_hidden.pre']) {
            expect(snapshot.getElementById(id)).toBeNull();
            expect(svg.getElementById(id)).not.toBeNull();
        }
        expect(snapshot.getElementById('stn_a')!.hasAttribute('display')).toBe(false);
        expect(snapshot.getElementById('facility')).not.toBeNull();
        expect(snapshot.querySelector('style')!.textContent).toContain('fill: red');
        expect(snapshot.querySelector('image')!.getAttribute('href')).toBe('data:image/png;base64,AAAA');
    });

    it('produces the same completed snapshot after arbitrary forward and backward seeks', () => {
        const { scene } = makeScene();
        scene.applyFrame(frame());
        const completed = scene.snapshot().outerHTML;
        scene.applyFrame(
            frame({
                visibleNodes: new Set(['stn_b']),
                visibleEdges: new Set(['line_hidden']),
                nodeProgress: new Map([['stn_b', 0.3]]),
                edgeProgress: new Map([['line_hidden', 0.4]]),
            })
        );
        scene.applyFrame(
            frame({
                nodeProgress: new Map([
                    ['stn_a', 0.2],
                    ['misc_node_label', 0.4],
                ]),
                edgeProgress: new Map([['line_ab', 0.3]]),
                edgeDirections: new Map([['line_ab', true]]),
            })
        );
        scene.applyFrame(frame());
        expect(scene.snapshot().outerHTML).toBe(completed);
    });

    it('patches matching geometry and text in place, removes old attributes and caches metrics per variant', () => {
        const { scene, measurePath } = makeScene();
        const group = scene.getGroup('line_ab')!;
        const path = group.firstElementChild!;
        scene.applyEdge('line_ab', { visible: true, progress: 0.5 });
        const next = template('<g id="line_ab"><path d="M0 0L200 0" data-length="200" stroke="blue"/></g>');
        scene.replaceGroup('line_ab', 'moved', next);
        expect(scene.getGroup('line_ab')).toBe(group);
        expect(group.firstElementChild).toBe(path);
        expect(path.hasAttribute('data-old')).toBe(false);
        scene.applyEdge('line_ab', { visible: true, progress: 0.5 });
        expect(path.getAttribute('stroke-dasharray')).toBe('100 400');
        expect(measurePath).toHaveBeenCalledTimes(4);
        scene.replaceGroup('line_ab', VIDEO_FRAME_BASE_VARIANT);
        scene.applyEdge('line_ab', { visible: true, progress: 0.25 });
        expect(path.getAttribute('stroke-dasharray')).toBe('25 200');
        expect(path.getAttribute('data-old')).toBe('remove');
        scene.replaceGroup('line_ab', 'moved');
        scene.applyEdge('line_ab', { visible: true, progress: 0.75 });
        expect(path.getAttribute('stroke-dasharray')).toBe('150 400');
        expect(measurePath).toHaveBeenCalledTimes(4);

        const post = scene.getGroup('stn_b.post')!;
        const text = post.firstElementChild!;
        scene.replaceGroup('stn_b.post', 'translated', template('<g id="stn_b.post"><text>C</text></g>'));
        expect(post.firstElementChild).toBe(text);
        expect(text.textContent).toBe('C');
    });

    it('invalidates a path metric when geometry changes directly even with unchanged frame progress', () => {
        const { scene, measurePath } = makeScene();
        const path = scene.getGroup('line_ab')!.firstElementChild!;
        scene.applyEdge('line_ab', { visible: true, progress: 0.5 });
        path.setAttribute('d', 'M0 0L250 0');
        path.setAttribute('data-length', '250');
        scene.applyEdge('line_ab', { visible: true, progress: 0.5 });
        expect(path.getAttribute('stroke-dasharray')).toBe('125 500');
        expect(measurePath).toHaveBeenCalledTimes(4);
        scene.applyEdge('line_ab', { visible: true, progress: 0.5 });
        expect(measurePath).toHaveBeenCalledTimes(4);
    });

    it('replaces only structurally changed children and does no work for a cached markup variant', () => {
        const { scene } = makeScene();
        const station = scene.getGroup('stn_a')!;
        const oldPath = station.firstElementChild!;
        const markup = '<circle r="6"/><text>Interchange</text>';
        scene.replaceGroupContents('stn_a', 'interchange', markup);
        expect(scene.getGroup('stn_a')).toBe(station);
        expect(station.firstElementChild).not.toBe(oldPath);
        const observer = new MutationObserver(() => undefined);
        observer.observe(station, { attributes: true, childList: true, subtree: true });
        const query = vi.spyOn(station, 'querySelectorAll');
        scene.replaceGroupContents('stn_a', 'interchange', markup);
        expect(observer.takeRecords()).toHaveLength(0);
        expect(query).not.toHaveBeenCalled();
        observer.disconnect();
        scene.applyNode('stn_a', { visible: true, progress: 0.5 });
        expect(Number(station.getAttribute('opacity'))).toBeCloseTo(0.4);
        scene.replaceGroupContents('stn_a', VIDEO_FRAME_BASE_VARIANT);
        scene.applyNode('stn_a', { visible: true });
        expect(station.firstElementChild!.tagName).toBe('path');
        expect(station.getAttribute('opacity')).toBe('0.8');
    });

    it('inserts missing pre/post groups beside their main group and keeps hidden owners hidden', () => {
        const { scene } = makeScene();
        scene.applyFrame(frame());
        const main = scene.getGroup('misc_node_label')!;
        const pre = scene.replaceGroup('misc_node_label.pre', 'station', template('<g><text>before</text></g>'));
        const post = scene.replaceGroup('line_hidden.post', 'station', template('<g><path d="M0 0L10 0"/></g>'));
        expect(pre.nextElementSibling).toBe(main);
        expect(post.previousElementSibling).toBe(scene.getGroup('line_hidden'));
        expect(post.getAttribute('display')).toBe('none');
        expect(scene.snapshot().getElementById('line_hidden.post')).toBeNull();
        scene.applyEdge('line_hidden', { visible: true });
        expect(post.hasAttribute('display')).toBe(false);
    });

    it('bounds geometry variants with an LRU cache while retaining the base variant', () => {
        const { scene } = makeScene(3);
        for (const key of ['one', 'two', 'three']) {
            scene.replaceGroup('line_ab', key, template(`<g><path d="${key}"/></g>`));
        }
        expect(() => scene.replaceGroup('line_ab', 'one')).toThrow('not cached');
        expect(() => scene.replaceGroup('line_ab', VIDEO_FRAME_BASE_VARIANT)).not.toThrow();
        scene.replaceGroup('line_ab', 'two');
        scene.replaceGroup('line_ab', 'four', template('<g><path d="four"/></g>'));
        expect(() => scene.replaceGroup('line_ab', 'three')).toThrow('not cached');
        expect(() => scene.replaceGroup('line_ab', 'two')).not.toThrow();
    });
});
