import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { describe, expect, it } from 'vitest';

window.graph = new MultiDirectedGraph();

describe('AppRoot', () => {
    it('Dummy test', () => {
        expect(1 + 1).toBe(2);
    });
});
