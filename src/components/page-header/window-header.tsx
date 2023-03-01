import React from 'react';
import { Heading, HStack, IconButton, Menu, MenuButton, MenuItem, MenuList, useColorMode } from '@chakra-ui/react';
import { MdDarkMode, MdHelp, MdSettings, MdTranslate } from 'react-icons/md';
import { Trans, useTranslation } from 'react-i18next';
import { RmgEnvBadge, RmgWindowHeader, useReadyConfig } from '@railmapgen/rmg-components';
import { LanguageCode } from '@railmapgen/rmg-translate';
import rmgRuntime, { RmgEnv } from '@railmapgen/rmg-runtime';
import { Events } from '../../constants/constants';
import { useRootSelector } from '../../redux/index';
import OpenActions from './open-actions';
import DownloadActions from './download-actions';
import AboutModal from './about-modal';
import { ZoomPopover } from './zoom-popover';
import SettingsModal from './settings-modal';

export default function WindowHeader() {
    const { t, i18n } = useTranslation();
    const {
        telemetry: { app: isAllowAppTelemetry },
    } = useRootSelector(state => state.app);
    const { toggleColorMode } = useColorMode();

    const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);
    const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false);

    const environment = useReadyConfig(rmgRuntime.getEnv);
    const appVersion = useReadyConfig(rmgRuntime.getAppVersion);

    React.useEffect(() => {
        // environment !== RmgEnv.DEV -> wait after rmgRuntime.ready() in useReadyConfig
        if (isAllowAppTelemetry && environment !== RmgEnv.DEV)
            rmgRuntime.event(Events.APP_LOAD, { isStandaloneWindow: rmgRuntime.isStandaloneWindow() });
    }, [environment]);

    const handleChangeLanguage = async (language: LanguageCode) => {
        rmgRuntime.setLanguage(language);
        const t = await i18n.changeLanguage(language);
        document.documentElement.lang = language;
        document.title = t('header.about.rmp');
    };

    return (
        <RmgWindowHeader>
            <Heading as="h4" size="md" whiteSpace="nowrap" overflow="hidden" textOverflow="ellipsis">
                {t('header.about.rmp')}
            </Heading>
            <RmgEnvBadge
                environment={environment}
                version={appVersion}
                popoverHeader={
                    environment === RmgEnv.PRD ? undefined : (
                        <Trans i18nKey="header.popoverHeader" environment={environment}>
                            You&apos;re on {{ environment }} environment!
                        </Trans>
                    )
                }
                popoverBody={
                    environment === RmgEnv.PRD ? undefined : (
                        <Trans i18nKey="header.popoverBody">
                            This is a testing environment where we test the latest beta RMP.
                        </Trans>
                    )
                }
            />

            <HStack ml="auto">
                <ZoomPopover />

                <OpenActions />

                <DownloadActions />

                <Menu>
                    <MenuButton as={IconButton} icon={<MdTranslate />} variant="ghost" size="sm" />
                    <MenuList>
                        <MenuItem onClick={() => handleChangeLanguage(LanguageCode.English)}>English</MenuItem>
                        <MenuItem onClick={() => handleChangeLanguage(LanguageCode.ChineseSimp)}>简体中文</MenuItem>
                        <MenuItem onClick={() => handleChangeLanguage(LanguageCode.ChineseTrad)}>繁體中文</MenuItem>
                        <MenuItem onClick={() => handleChangeLanguage(LanguageCode.Korean)}>한국어</MenuItem>
                    </MenuList>
                </Menu>

                <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Dark Mode"
                    icon={<MdDarkMode />}
                    onClick={toggleColorMode}
                />

                <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Settings"
                    icon={<MdSettings />}
                    onClick={() => setIsSettingsModalOpen(true)}
                />

                <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Help"
                    icon={<MdHelp />}
                    onClick={() => setIsAboutModalOpen(true)}
                />
            </HStack>

            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        </RmgWindowHeader>
    );
}
