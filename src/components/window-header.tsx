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
import { getEnvironment, getVersion } from '../util/config';
import { useTranslation } from 'react-i18next';
import { RmgEnvBadge } from '@railmapgen/rmg-components';

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
                <ModalHeader>{t('About')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Text mb={5}>{t('about.content1')}</Text>
                    <Text align="right">{t('about.content2')}</Text>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};
