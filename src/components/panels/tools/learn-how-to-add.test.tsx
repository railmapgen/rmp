import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { render } from '../../../test-utils';
import LearnHowToAdd from './learn-how-to-add';

describe('LearnHowToAdd', () => {
    it.each([
        ['line-styles', 'line-styles.md'],
        ['station', 'stations.md'],
        ['misc-node', 'nodes.md'],
    ] as const)('links %s to its documentation page', (type, document) => {
        render(<LearnHowToAdd type={type} expand />);

        expect(screen.getByRole('link')).toHaveAttribute(
            'href',
            `https://github.com/railmapgen/rmp/blob/main/docs/${document}`
        );
    });
});
