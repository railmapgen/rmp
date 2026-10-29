import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { MAX_MASTER_NODE_FREE } from '../constants/master';
import i18n from '../i18n/config';
import { createStore } from '../redux';
import { render } from '../test-utils';
import SubscriptionBadge from './subscription-badge';

describe('SubscriptionBadge', () => {
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
