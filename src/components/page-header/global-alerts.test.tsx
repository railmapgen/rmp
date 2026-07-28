import { fireEvent, screen, within } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { GlobalAlertId } from '../../constants/global-alerts';
import rootReducer, { createStore } from '../../redux';
import { setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { render } from '../../test-utils';
import GlobalAlerts from './global-alerts';

const realStore = rootReducer.getState();
const createMockStore = () =>
    createStore({
        runtime: {
            ...realStore.runtime,
            globalAlerts: {
                [GlobalAlertId.LocalStorageQuotaExceeded]: {
                    status: 'info',
                    message: 'Test info message',
                    url: 'https://example.com',
                },
                [GlobalAlertId.MasterNodeLimitExceeded]: {
                    status: 'warning',
                    message: 'Test warning message',
                },
            },
        },
    });

describe('GlobalAlerts', () => {
    it('Can render alerts in correct order as expected', () => {
        render(<GlobalAlerts />, { store: createMockStore() });

        // order matters
        const alerts = screen.getAllByRole('alert');
        expect(alerts).toHaveLength(2);
        expect(alerts[0].textContent).toContain('info');
        expect(alerts[1].textContent).toContain('warning');

        // can render link
        expect(within(alerts[0]).getByRole('link')).toBeInTheDocument();
    });

    it('closes an alert by id without dismissing another alert with the same status', () => {
        const mockStore = createMockStore();
        mockStore.dispatch(
            setGlobalAlert({
                id: GlobalAlertId.ParallelLineLimitExceeded,
                status: 'warning',
                message: 'Test parallel warning',
            })
        );
        render(<GlobalAlerts />, { store: mockStore });

        fireEvent.click(
            within(screen.getByText('Test warning message').closest('[role="alert"]')!).getByRole('button')
        );

        expect(screen.queryByText('Test warning message')).not.toBeInTheDocument();
        expect(screen.getByText('Test parallel warning')).toBeInTheDocument();
        expect(mockStore.getState().runtime.globalAlerts[GlobalAlertId.MasterNodeLimitExceeded]).toBeUndefined();
    });
});
