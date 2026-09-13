import { describe, expect, it } from 'vitest';
import { findConnectableTarget } from './svg-canvas-graph';

describe('findConnectableTarget', () => {
    it('resolves a connectable target from an ancestor element', () => {
        const core = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        core.setAttribute('id', 'stn_core_misc_node_target');

        const child = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        core.appendChild(child);

        expect(findConnectableTarget([child])).toEqual({
            id: 'stn_core_misc_node_target',
            matchedPrefix: 'stn_core_',
        });
    });

    it('continues scanning later elements when the first element is not connectable', () => {
        const nonConnectable = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        const connectable = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        connectable.setAttribute('id', 'virtual_circle_misc_node_target');

        expect(findConnectableTarget([nonConnectable, connectable])).toEqual({
            id: 'virtual_circle_misc_node_target',
            matchedPrefix: 'virtual_circle_',
        });
    });
});
