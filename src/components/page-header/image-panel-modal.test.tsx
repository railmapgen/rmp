import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import { ImagePanelModal } from './image-panel-modal';

describe('ImagePanelModal subscription label', () => {
    it.each([false, true])('identifies the image subscription when RMP_EXPORT=%s', async isSubscribed => {
        const account = createStore().getState().account;
        const store = createStore({
            account: {
                ...account,
                activeSubscriptions: { RMP_CLOUD: true, RMP_EXPORT: isSubscribed },
            },
        });

        render(<ImagePanelModal id="misc_node_image" isOpen onClose={vi.fn()} onChange={vi.fn()} />, { store });

        const cloudTab = screen.getByRole('tab', { name: /Stop and Proceed/ });
        if (isSubscribed) {
            expect(cloudTab).toBeEnabled();
        } else {
            expect(cloudTab).toBeDisabled();
        }
        expect(screen.queryByText('Proceed Signal')).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
    });
});
