import React from 'react';
import {
    Flex,
    Heading,
    HStack,
    IconButton,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    Text,
} from '@chakra-ui/react';
import { MdHelp } from 'react-icons/md';
import { getEnvironment, getVersion } from '../../util/config';
import { useTranslation } from 'react-i18next';
import { RmgEnvBadge } from '@railmapgen/rmg-components';
import OpenActions from './open-actions';
import DownloadActions from './download-actions';

export default function WindowHeader() {
    const { t } = useTranslation();

    const [isAboutModalOpen, setIsAboutModalOpen] = React.useState(false);

    const environment = getEnvironment();

    return (
        <Flex pl={2} pr={2} pb={1} pt={1} align="center">
            <Heading as="h4" size="md" mr="auto">
                {t('Rail Map Painter')}
                <RmgEnvBadge environment={environment} version={getVersion()} />
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

const AboutModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.about.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text mb={5}>{t('header.about.content1')}</Text>
                    <Text align="right">{t('header.about.content2')}</Text>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
