import React from 'react';
import { render } from '../test-utils';
import AppRoot from './app-root';
import { screen } from '@testing-library/react';
import { MultiDirectedGraph } from 'graphology';

window.graph = new MultiDirectedGraph();

describe('AppRoot', () => {
    it('Dummy test', () => {
        expect(1 + 1).toBe(2);
    });
});
