import { Box, IconButton, Text } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdRefresh } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { updateLoginStateAndSubscriptions } from '../../util/rmt-save';

const refreshInterval = 1;

const SubscriptionSection = () => {
    const dispatch = useRootDispatch();
    const { state, token } = useRootSelector(state => state.account);
    const { t } = useTranslation();

    const [isRefreshDisabled, setIsRefreshDisabled] = React.useState(false);
    const [refreshDisabledSeconds, setRefreshDisabledSeconds] = React.useState(refreshInterval);

    React.useEffect(() => {
        let timer: number;
        if (isRefreshDisabled && refreshDisabledSeconds > 0) {
            timer = window.setTimeout(() => {
                setRefreshDisabledSeconds(refreshDisabledSeconds - 1);
            }, 1000);
        } else if (refreshDisabledSeconds === 0) {
            setIsRefreshDisabled(false);
        }

        return () => clearTimeout(timer);
    }, [isRefreshDisabled, refreshDisabledSeconds]);

    const handleClick = () => {
        setIsRefreshDisabled(true);
        setRefreshDisabledSeconds(refreshInterval);
        if (!token) return;
        updateLoginStateAndSubscriptions(dispatch, token);
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
