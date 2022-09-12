import React from 'react';
import { Flex, Heading, HStack, IconButton, Menu, MenuButton, MenuItem, MenuList } from '@chakra-ui/react';
import { MdHelp, MdTranslate } from 'react-icons/md';
import { Trans, useTranslation } from 'react-i18next';
import { RmgEnvBadge, useAppVersion, useEnvironment } from '@railmapgen/rmg-components';
import { LanguageCode } from '@railmapgen/rmg-translate';
import rmgRuntime from '@railmapgen/rmg-runtime';
import OpenActions from './open-actions';
import DownloadActions from './download-actions';
import AboutModal from './about';

export default function WindowHeader() {
    const { t, i18n } = useTranslation();

    const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false);

    const environment = useEnvironment();
    const appVersion = useAppVersion();

    const handleChangeLanguage = async (language: LanguageCode) => {
        rmgRuntime.setLanguage(language);
        const t = await i18n.changeLanguage(language);
        document.documentElement.lang = language;
        document.title = t('header.about.rmp');
    };

    return (
        <Flex pl={2} pr={2} pb={1} pt={1} align="center">
            <Heading as="h4" size="md" mr="auto">
                {t('header.about.rmp')}
                <RmgEnvBadge
                    environment={environment}
                    version={appVersion}
                    popoverHeader={
                        <Trans i18nKey="header.popoverHeader" environment={environment}>
                            You're on {{ environment }} environment!
                        </Trans>
                    }
                    popoverBody={
                        <Trans i18nKey="header.popoverBody">
                            This is a testing environment where we test the latest beta RMP.
                        </Trans>
                    }
                />
            </Heading>

            <HStack ml="auto">
                <OpenActions />

                <DownloadActions />

                <Menu>
                    <MenuButton as={IconButton} icon={<MdTranslate />} variant="ghost" size="sm" />
                    <MenuList>
                        <MenuItem onClick={() => handleChangeLanguage(LanguageCode.English)}>English</MenuItem>
                        <MenuItem onClick={() => handleChangeLanguage(LanguageCode.ChineseSimp)}>简体中文</MenuItem>
                        <MenuItem onClick={() => handleChangeLanguage(LanguageCode.ChineseTrad)}>繁體中文</MenuItem>
                    </MenuList>
                </Menu>

                <IconButton
                    size="sm"
                    variant="ghost"
                    aria-label="Help"
                    icon={<MdHelp />}
                    onClick={() => setIsAboutModalOpen(true)}
                />
            </HStack>

            <AboutModal isOpen={isAboutModalOpen} onClose={() => setIsAboutModalOpen(false)} />
        </Flex>
    );
}
