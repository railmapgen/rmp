import { Badge, BadgeProps, Tooltip, useColorModeValue } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useRootSelector } from '../redux';
import type { ActiveSubscriptions } from '../redux/account/account-slice';

type SubscriptionBadgeProps = BadgeProps & {
    subscription: keyof ActiveSubscriptions;
    description?: string;
};

export default function SubscriptionBadge({ subscription, description, ...props }: SubscriptionBadgeProps) {
    const { t } = useTranslation();
    const isSubscribed = useRootSelector(state => state.account.activeSubscriptions[subscription]);
    const colors = useColorModeValue(
        {
            RMP_CLOUD: { bg: '#FFF4E5', color: '#9A4D00', borderColor: '#F2D2A6' },
            RMP_EXPORT: { bg: '#EEF2FF', color: '#3730A3', borderColor: '#C7D2FE' },
        },
        {
            RMP_CLOUD: { bg: '#3D2B18', color: '#F8C77E', borderColor: '#79522B' },
            RMP_EXPORT: { bg: '#282746', color: '#C7D2FE', borderColor: '#56558A' },
        }
    );
    const name = t(subscription);
    const label = isSubscribed
        ? t('subscription.included', { subscription: name })
        : (description ?? t('subscription.required', { subscription: name }));

    return (
        <Tooltip label={label} hasArrow>
            <Badge
                {...colors[subscription]}
                borderWidth="1px"
                borderRadius="4px"
                px="1.5"
                fontSize="xs"
                fontWeight="600"
                lineHeight="18px"
                textTransform="none"
                flexShrink={0}
                tabIndex={0}
                {...props}
            >
                {t(`${subscription}_SHORT_NAME`)}
            </Badge>
        </Tooltip>
    );
}
