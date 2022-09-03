import React from 'react';
import { Flex, Heading, HStack, IconButton } from '@chakra-ui/react';
import { MdHelp } from 'react-icons/md';
import { getEnvironment, getVersion } from '../../util/config';
import { Trans, useTranslation } from 'react-i18next';
import { RmgEnvBadge } from '@railmapgen/rmg-components';
import OpenActions from './open-actions';
import DownloadActions from './download-actions';
import AboutModal from './about';

export default function WindowHeader() {
    const { t } = useTranslation();

    const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false);

    const environment = getEnvironment();

    return (
        <Flex pl={2} pr={2} pb={1} pt={1} align="center">
            <Heading as="h4" size="md" mr="auto">
                {t('Rail Map Painter')}
                <RmgEnvBadge
                    environment={environment}
                    version={getVersion()}
                    popoverHeader={
                        <Trans i18nKey="WindowHeader.popoverHeader" environment={environment}>
                            You're on {{ environment }} environment!
                        </Trans>
                    }
                    popoverBody={
                        <Trans i18nKey="WindowHeader.popoverBody">
                            This is a testing environment where we test the latest beta RMP.
                        </Trans>
                    }
                />
            </Heading>

            <HStack ml="auto">
                <OpenActions />

                <DownloadActions />

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
