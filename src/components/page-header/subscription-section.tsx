import { Box, IconButton, Text } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdRefresh } from 'react-icons/md';
import { useRootSelector } from '../../redux';
import { requestToken } from '../../util/rmt-save';

const refreshInterval = 1;

const SubscriptionSection = () => {
    const { state } = useRootSelector(state => state.account);
    const { t } = useTranslation();

    const [isRefreshDisabled, setIsRefreshDisabled] = React.useState(false);
    const [refreshDisabledseconds, setRefreshDisabledSeconds] = React.useState(refreshInterval);

    React.useEffect(() => {
        let timer: number;
        if (isRefreshDisabled && refreshDisabledseconds > 0) {
            timer = window.setTimeout(() => {
                setRefreshDisabledSeconds(refreshDisabledseconds - 1);
            }, 1000);
        } else if (refreshDisabledseconds === 0) {
            setIsRefreshDisabled(false);
        }

        return () => clearTimeout(timer);
    }, [isRefreshDisabled, refreshDisabledseconds]);

    const handleClick = () => {
        setIsRefreshDisabled(true);
        setRefreshDisabledSeconds(refreshInterval);
        requestToken();
    };

    const stateText = {
        'logged-out': t('header.settings.subscription.logged-out'),
        free: t('header.settings.subscription.free'),
        subscriber: t('header.settings.subscription.subscriber'),
        expired: t('header.settings.subscription.expired'),
    };

    return (
        <Box width="100%" mb="3">
            <Text as="b" fontSize="xl">
                {t('header.settings.subscription.title')}
            </Text>
            <Box mt="3">
                <Box display="flex" mb="1">
                    <Text flex="1">{stateText[state]}</Text>
                    <IconButton
                        aria-label="refresh"
                        variant="ghost"
                        size="sm"
                        icon={<MdRefresh />}
                        isDisabled={isRefreshDisabled}
                        onClick={() => handleClick()}
                    />
                </Box>
            </Box>
        </Box>
    );
};

export default SubscriptionSection;
