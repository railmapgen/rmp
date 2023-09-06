import {
    Avatar,
    Box,
    Flex,
    Heading,
    Image,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalHeader,
    ModalOverlay,
    Tag,
    TagLabel,
    Text,
    VStack,
} from '@chakra-ui/react';
import rmgRuntime from '@railmapgen/rmg-runtime';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { IoMdHeart } from 'react-icons/io';
import { MdOutlineWbIncandescent } from 'react-icons/md';
import { TbPlaystationCircle } from 'react-icons/tb';
import { TfiGallery } from 'react-icons/tfi';
import AfdianIcon from '../../images/afdian.png';
import OpenCollectiveIcon from '../../images/opencollective-icon.webp';

const DonationModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();

    const handleGalleryDonationOpen = () => {
        if (rmgRuntime.isStandaloneWindow()) {
            window.open('/rmp-gallery/donation', '_blank');
        } else {
            rmgRuntime.openApp('rmp-gallery', '/rmg-gallery/donation');
        }
    };

    const issueTemplate = (requestType: string) =>
        new URLSearchParams({
            title: `Donation: New ${requestType} request for [city name]`,
            body: `Hi, I'd like to have new ${requestType}, and here is my support.\n\n<!-- your donation entry -->\n\n<!-- reference (images or URLs) -->\n\n`,
        }).toString();

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.donation.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody paddingBottom={10}>
                    <Flex direction="row" alignItems="center" justifyContent="space-around">
                        <Text fontSize="96px" fontFamily="serif">
                            I
                        </Text>
                        <IoMdHeart size="64px" color="red" />
                        <Image boxSize="96px" src={import.meta.env.BASE_URL + '/logo192.png'} />
                    </Flex>

                    <Box margin={5}>
                        <Text fontSize="xl">{t('header.donation.content')}</Text>
                    </Box>

                    <Heading as="h5" size="sm" mb={2}>
                        {t('header.donation.rewards')}
                    </Heading>

                    <VStack>
                        <Tag size="lg" w="85%" onClick={handleGalleryDonationOpen} cursor="pointer">
                            <Avatar icon={<TfiGallery />} size="lg" my={2} ml={-1} mr={2} />
                            <TagLabel display="block" width="100%" pb={1}>
                                <Text fontSize="lg" fontWeight="bold" mb={1}>
                                    {t('header.donation.gallery')}
                                </Text>
                                <Text fontSize="sm">{t('header.donation.galleryContent')}</Text>
                            </TagLabel>
                        </Tag>
                        <Tag
                            size="lg"
                            w="85%"
                            onClick={() =>
                                window.open(
                                    'https://github.com/railmapgen/rmp/issues/new?' + issueTemplate('stations/nodes'),
                                    '_blank'
                                )
                            }
                            cursor="pointer"
                        >
                            <Avatar icon={<TbPlaystationCircle />} size="lg" my={2} ml={-1} mr={2} />
                            <TagLabel display="block" width="100%" pb={1}>
                                <Text fontSize="lg" fontWeight="bold" mb={1}>
                                    {t('header.donation.nodes')}
                                </Text>
                                <Text fontSize="sm">{t('header.donation.nodesContent')}</Text>
                            </TagLabel>
                        </Tag>
                        <Tag
                            size="lg"
                            w="85%"
                            onClick={() =>
                                window.open(
                                    'https://github.com/railmapgen/rmp/issues/new?' + issueTemplate('features'),
                                    '_blank'
                                )
                            }
                            cursor="pointer"
                        >
                            <Avatar icon={<MdOutlineWbIncandescent />} size="lg" my={2} ml={-1} mr={2} />
                            <TagLabel display="block" width="100%" pb={1}>
                                <Text fontSize="lg" fontWeight="bold" mb={1}>
                                    {t('header.donation.features')}
                                </Text>
                                <Text fontSize="sm">{t('header.donation.featuresContent')}</Text>
                            </TagLabel>
                        </Tag>
                    </VStack>

                    <Heading as="h5" size="sm" mt={3} mb={2}>
                        {t('header.donation.methods')}
                    </Heading>

                    <VStack>
                        <Tag
                            size="lg"
                            w="85%"
                            onClick={() => window.open('https://opencollective.com/rail-map-toolkit', '_blank')}
                            cursor="pointer"
                        >
                            <Avatar src={OpenCollectiveIcon} size="lg" my={2} ml={-1} mr={2} />
                            <TagLabel display="block" width="100%" pb={1}>
                                <Text fontSize="lg" fontWeight="bold" mb={1}>
                                    {t('header.donation.openCollective')}
                                </Text>
                                <Text fontSize="sm">{t('header.donation.viaUSD')}</Text>
                            </TagLabel>
                        </Tag>
                        <Tag
                            size="lg"
                            w="85%"
                            onClick={() => window.open('https://afdian.net/a/rail-map-toolkit', '_blank')}
                            cursor="pointer"
                        >
                            <Avatar src={AfdianIcon} size="lg" my={2} ml={-1} mr={2} />
                            <TagLabel display="block" width="100%" pb={1}>
                                <Text fontSize="lg" fontWeight="bold" mb={1}>
                                    {t('header.donation.afdian')}
                                </Text>
                                <Text fontSize="sm">{t('header.donation.viaCNY')}</Text>
                            </TagLabel>
                        </Tag>
                    </VStack>
                </ModalBody>
            </ModalContent>
        </Modal>
    );
};

export default DonationModal;
