import React from 'react';
import {
    Heading,
    IconButton,
    Menu,
    MenuButton,
    MenuItem,
    MenuList,
    useColorModeValue,
    Wrap,
    WrapItem,
} from '@chakra-ui/react';
import { MdHelp, MdRedo, MdSettings, MdTranslate, MdUndo } from 'react-icons/md';
import { Trans, useTranslation } from 'react-i18next';
import { RmgEnvBadge, RmgWindowHeader, useReadyConfig } from '@railmapgen/rmg-components';
import { LANGUAGE_NAMES, LanguageCode, SUPPORTED_LANGUAGES } from '@railmapgen/rmg-translate';
import rmgRuntime, { RmgEnv } from '@railmapgen/rmg-runtime';
import { Events } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import { redoAction, undoAction } from '../../redux/param/param-slice';
import OpenActions from './open-actions';
import DownloadActions from './download-actions';
import AboutModal from './about-modal';
import { ZoomPopover } from './zoom-popover';
import SettingsModal from './settings-modal';

export default function WindowHeader() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        telemetry: { app: isAllowAppTelemetry },
    } = useRootSelector(state => state.app);
    const { past, future } = useRootSelector(state => state.param);
    const bgColor = useColorModeValue('white', 'gray.800');

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
        rmgRuntime.getI18nInstance().changeLanguage(language);
    };

    return (
        <RmgWindowHeader style={{ background: bgColor }}>
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

            <Wrap ml="auto">
                <WrapItem>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Undo"
                        icon={<MdUndo />}
                        disabled={past.length === 0}
                        onClick={() => dispatch(undoAction())}
                    />
                </WrapItem>
                <WrapItem>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Redo"
                        icon={<MdRedo />}
                        disabled={future.length === 0}
                        onClick={() => dispatch(redoAction())}
                    />
                </WrapItem>

                <WrapItem>
                    <ZoomPopover />
                </WrapItem>

                <WrapItem>
                    <OpenActions />
                </WrapItem>

                <WrapItem>
                    <DownloadActions />
                </WrapItem>

                {rmgRuntime.isStandaloneWindow() && (
                    <WrapItem>
                        <Menu>
                            <MenuButton as={IconButton} icon={<MdTranslate />} variant="ghost" size="sm" />
                            <MenuList>
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <MenuItem key={lang} onClick={() => handleChangeLanguage(lang)}>
                                        {LANGUAGE_NAMES[lang][lang]}
                                    </MenuItem>
                                ))}
                            </MenuList>
                        </Menu>
                    </WrapItem>
                )}

                <WrapItem>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Settings"
                        icon={<MdSettings />}
                        onClick={() => setIsSettingsModalOpen(true)}
                    />
                </WrapItem>

                <WrapItem>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Help"
                        icon={<MdHelp />}
                        onClick={() => setIsAboutModalOpen(true)}
                    />
                </WrapItem>
            </Wrap>

            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        </RmgWindowHeader>
    );
}
