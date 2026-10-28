import { fireEvent, screen } from '@testing-library/react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MAX_MASTER_NODE_FREE } from '../constants/master';
import i18n from '../i18n/config';
import { createStore } from '../redux';
import { render } from '../test-utils';
import SubscriptionBadge from './subscription-badge';

describe('SubscriptionBadge', () => {
    afterEach(() => vi.restoreAllMocks());

    it('opens redemption without activating its surrounding control or submitting a form', () => {
        vi.spyOn(rmgRuntime, 'isStandaloneWindow').mockReturnValue(false);
        const postEvent = vi.spyOn(rmgRuntime, 'postEvent').mockImplementation(() => {});
        const onClick = vi.fn();
        const onSubmit = vi.fn(event => event.preventDefault());
        render(
            <form onClick={onClick} onSubmit={onSubmit}>
                <SubscriptionBadge subscription="RMP_CLOUD" />
            </form>
        );

        const badge = screen.getByRole('button', { name: /Proceed Signal/ });
        fireEvent.click(badge);

        expect(badge).toHaveAttribute('type', 'button');
        expect(postEvent).toHaveBeenCalledExactlyOnceWith('OPEN_SUBSCRIPTION_REDEMPTION', undefined);
        expect(onClick).not.toHaveBeenCalled();
        expect(onSubmit).not.toHaveBeenCalled();
    });

    it('does nothing when opened without a host', () => {
        vi.spyOn(rmgRuntime, 'isStandaloneWindow').mockReturnValue(true);
        const postEvent = vi.spyOn(rmgRuntime, 'postEvent').mockImplementation(() => {});
        render(<SubscriptionBadge subscription="RMP_EXPORT" />);
        fireEvent.click(screen.getByRole('button', { name: /Stop and Proceed/ }));
        expect(postEvent).not.toHaveBeenCalled();
    });

    it.each([
        [false, 'Subscribe to Rail Map Painter・Stop and Proceed to unlock this feature.'],
        [true, 'This feature is included in your Rail Map Painter・Stop and Proceed subscription.'],
    ])('describes the required subscription when RMP_EXPORT=%s', async (isSubscribed, expectedDescription) => {
        const account = createStore().getState().account;
        const store = createStore({
            account: {
                ...account,
                activeSubscriptions: { RMP_CLOUD: true, RMP_EXPORT: isSubscribed },
            },
        });

        render(<SubscriptionBadge subscription="RMP_EXPORT" />, { store });

        fireEvent.focus(screen.getByText('Stop and Proceed'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(expectedDescription);
    });

    it('explains the free allowance and names the subscription that removes the limit', async () => {
        render(
            <SubscriptionBadge
                subscription="RMP_CLOUD"
                description={i18n.t('subscription.masterLimit', { count: MAX_MASTER_NODE_FREE })}
            />,
            { store: createStore() }
        );

        fireEvent.focus(screen.getByText('Proceed Signal'));
        expect(await screen.findByRole('tooltip')).toHaveTextContent(
            'Up to 3 master nodes are free. Subscribe to Rail Map Painter・Proceed Signal for unlimited master nodes.'
        );
    });
});
