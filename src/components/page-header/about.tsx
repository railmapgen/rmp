import { useTranslation } from 'react-i18next';
import {
    Avatar,
    Box,
    Flex,
    Heading,
    Image,
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    Tag,
    TagLabel,
    Text,
    VStack,
} from '@chakra-ui/react';
import { getVersion } from '../../util/config';

const AboutModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.about.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody paddingBottom={10}>
                    <Flex direction="row">
                        <Image boxSize="128px" src={process.env.PUBLIC_URL + '/logo192.png'} />
                        <Flex direction="column" width="100%" alignItems="center" justifyContent="center">
                            <Text fontSize="xl" as="b">
                                {t('header.about.rmp')}
                            </Text>
                            <Text>{getVersion()}</Text>
                            <Text> </Text>
                            <Text fontSize="md">A railmapgen project</Text>
                        </Flex>
                    </Flex>

                    <Box margin={10}>
                        <Text fontSize="xl">{t('header.about.desc')}</Text>
                    </Box>

                    <Heading as="h5" size="sm" mt={3} mb={2}>
                        {t('header.about.contributors')}
                    </Heading>

                    <Heading as="h6" size="xs" my={2}>
                        {t('header.about.coreContributors')}
                    </Heading>

                    <VStack>
                        <Tag
                            size="lg"
                            minW="80%"
                            onClick={() => window.open('https://github.com/thekingofcity', '_blank')}
                            cursor="pointer"
                        >
                            <Avatar src="https://github.com/thekingofcity.png" size="lg" my={2} ml={-1} mr={2} />
                            <TagLabel>
                                <Text fontSize="lg" fontWeight="bold" mb={1}>
                                    thekingofcity
                                </Text>
                                <Text fontSize="sm">{t('header.about.content1')}</Text>
                                <Text fontSize="sm" align="right">
                                    {t('header.about.content2')}
                                </Text>
                            </TagLabel>
                        </Tag>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default AboutModal;
