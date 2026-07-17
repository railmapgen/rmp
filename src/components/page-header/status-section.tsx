import { Box, IconButton, Text } from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdRefresh } from 'react-icons/md';
import { useRootDispatch, useRootSelector } from '../../redux';
import { fetchLoginStateAndSubscriptions } from '../../util/rmt-save';

const refreshInterval = 1;

export const StatusSection = () => {
    const dispatch = useRootDispatch();
    const { state, token } = useRootSelector(state => state.account);
    const {
        count: { stations, miscNodes, masters, lines, parallel },
    } = useRootSelector(state => state.runtime);
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
        fetchLoginStateAndSubscriptions(dispatch, token);
    };

    const stateText = {
        'logged-out': t('header.settings.status.subscription.logged-out'),
        free: t('header.settings.status.subscription.free'),
        subscriber: t('header.settings.status.subscription.subscriber'),
        expired: t('header.settings.status.subscription.expired'),
    };

    return (
        <Box width="100%" mb="3">
            <Text as="b" fontSize="xl">
                {t('header.settings.status.title')}
            </Text>
            <Box mt="3">
                <Box mb="1">
                    <Box display="flex" mb="1">
                        <Text flex="1">{t('header.settings.status.count.stations')}</Text>
                        <Text>{stations}</Text>
                    </Box>
                    <Box display="flex" mb="1">
                        <Text flex="1">{t('header.settings.status.count.miscNodes')}</Text>
                        <Text>{miscNodes}</Text>
                    </Box>
                    <Box display="flex" mb="1">
                        <Text flex="1">{t('header.settings.status.count.masters')}</Text>
                        <Text>{masters}</Text>
                    </Box>
                    <Box display="flex" mb="1">
                        <Text flex="1">{t('header.settings.status.count.lines')}</Text>
                        <Text>{lines}</Text>
                    </Box>
                    <Box display="flex" mb="1">
                        <Text flex="1">{t('header.settings.status.count.parallel')}</Text>
                        <Text>{parallel}</Text>
                    </Box>
                </Box>
                <Box display="flex" mb="1">
                    <Text flex="1">
                        {t('header.settings.status.subscription.content')} {stateText[state]}
                    </Text>
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
