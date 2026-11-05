import { fireEvent, screen, waitFor } from '@testing-library/react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createStore } from '../../redux';
import { render } from '../../test-utils';
import { ImagePanelModal } from './image-panel-modal';

describe('ImagePanelModal subscription label', () => {
    afterEach(() => vi.restoreAllMocks());
    it.each([false, true])('identifies the image subscription when RMP_EXPORT=%s', async isSubscribed => {
        const account = createStore().getState().account;
        const store = createStore({
            account: {
                ...account,
                activeSubscriptions: { RMP_CLOUD: true, RMP_EXPORT: isSubscribed },
            },
        });

        vi.spyOn(rmgRuntime, 'isStandaloneWindow').mockReturnValue(false);
        const postEvent = vi.spyOn(rmgRuntime, 'postEvent').mockImplementation(() => {});
        render(<ImagePanelModal id="misc_node_image" isOpen onClose={vi.fn()} onChange={vi.fn()} />, { store });

        const cloudTab = screen.getByRole('tab', { name: /Stop and Proceed/ });
        if (isSubscribed) {
            expect(cloudTab).toBeEnabled();
        } else {
            expect(cloudTab).toBeDisabled();
        }
        expect(screen.queryByText('Proceed Signal')).not.toBeInTheDocument();
        await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());
        const badge = screen.getByRole('button', { name: /Redeem.*Stop and Proceed/ });
        expect(cloudTab).not.toContainElement(badge);
        fireEvent.click(badge);
        expect(postEvent).toHaveBeenCalledExactlyOnceWith('OPEN_SUBSCRIPTION_REDEMPTION', undefined);
        expect(cloudTab).toHaveAttribute('aria-selected', 'false');
    });
});
