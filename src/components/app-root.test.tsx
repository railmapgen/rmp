import React from 'react';
import { render } from '../test-utils';
import AppRoot from './app-root';
import { screen } from '@testing-library/react';

describe('AppRoot', () => {
    it('Can render window header', () => {
        render(<AppRoot />);

        expect(screen.getByRole('heading').textContent).toContain('Seed Project');
    });
});
