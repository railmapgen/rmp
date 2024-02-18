import { Heading, IconButton, Menu, MenuButton, MenuItem, MenuList, Wrap, WrapItem } from '@chakra-ui/react';
import { RmgEnvBadge, RmgWindowHeader, useReadyConfig } from '@railmapgen/rmg-components';
import rmgRuntime, { RmgEnv } from '@railmapgen/rmg-runtime';
import { LANGUAGE_NAMES, LanguageCode } from '@railmapgen/rmg-translate';
import React from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { IoMdHeart } from 'react-icons/io';
import { MdHelp, MdRedo, MdSettings, MdTranslate, MdUndo } from 'react-icons/md';
import { Events } from '../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../redux';
import { redoAction, undoAction } from '../../redux/param/param-slice';
import { setIsDonationModalOpen } from '../../redux/runtime/runtime-slice';
import AboutModal from './about-modal';
import DonationModal from './donation-modal';
import DownloadActions from './download-actions';
import OpenActions from './open-actions';
import SettingsModal from './settings-modal';
import { ZoomPopover } from './zoom-popover';
import { SearchPopover } from './search-popover';

export default function WindowHeader() {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const {
        telemetry: { app: isAllowAppTelemetry },
    } = useRootSelector(state => state.app);
    const { past, future } = useRootSelector(state => state.param);
    const { isDonationModalOpen } = useRootSelector(state => state.runtime);

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
        // do not change language in the global as japanese is not supported in other apps
        // rmgRuntime.setLanguage(language);
        rmgRuntime.getI18nInstance().changeLanguage(language);
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

            <Wrap ml="auto">
                <WrapItem>
                    <SearchPopover />
                </WrapItem>

                <WrapItem>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Undo"
                        icon={<MdUndo />}
                        isDisabled={past.length === 0}
                        onClick={() => dispatch(undoAction())}
                    />
                </WrapItem>
                <WrapItem>
                    <IconButton
                        size="sm"
                        variant="ghost"
                        aria-label="Redo"
                        icon={<MdRedo />}
                        isDisabled={future.length === 0}
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
                                {(['en', 'zh-Hans', 'zh-Hant', 'ja', 'ko'] as LanguageCode[]).map(lang => (
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
                        aria-label="Donation"
                        color="red"
                        icon={<IoMdHeart />}
                        onClick={() => dispatch(setIsDonationModalOpen(true))}
                    />
                </WrapItem>

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

            <DonationModal isOpen={isDonationModalOpen} onClose={() => dispatch(setIsDonationModalOpen(false))} />
            <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setIsSettingsModalOpen(false)} />
            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        </RmgWindowHeader>
    );
}
