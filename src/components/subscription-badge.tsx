import { Badge, BadgeProps, Image, Tooltip, useColorModeValue } from '@chakra-ui/react';
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
            RMP_CLOUD: {
                bg: 'linear-gradient(to bottom right, #E8F7EE, #CFEEDB)',
                color: '#22613E',
                borderColor: '#39835B',
            },
            RMP_EXPORT: {
                bg: 'linear-gradient(to bottom right, #FDECEE, #F8D2D9)',
                color: '#8D3043',
                borderColor: '#B64C61',
            },
        },
        {
            RMP_CLOUD: {
                bg: 'linear-gradient(to bottom right, #163727, #255239)',
                color: '#C2EED2',
                borderColor: '#8DCBA6',
            },
            RMP_EXPORT: {
                bg: 'linear-gradient(to bottom right, #3F1E28, #5C2A38)',
                color: '#FFD2DB',
                borderColor: '#E8A1B1',
            },
        }
    );
    const iconColorScheme = useColorModeValue('light', 'dark');
    const name = t(subscription);
    const icon = subscription === 'RMP_CLOUD' ? 'shuppatsu_shinko.svg' : 'ichido_teishi.svg';
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
                display="inline-flex"
                alignItems="center"
                gap="1"
                verticalAlign="middle"
                flexShrink={0}
                tabIndex={0}
                {...props}
            >
                <Image
                    src={import.meta.env.BASE_URL + `images/subscriptions/${icon}`}
                    alt=""
                    boxSize="18px"
                    flexShrink={0}
                    sx={{ colorScheme: iconColorScheme }}
                />
                {t(`${subscription}_SHORT_NAME`)}
            </Badge>
        </Tooltip>
    );
}
