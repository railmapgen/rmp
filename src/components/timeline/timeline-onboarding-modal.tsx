import {
    Badge,
    Box,
    Button,
    Checkbox,
    Flex,
    Heading,
    HStack,
    Image,
    ListItem,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    OrderedList,
    Text,
    useColorModeValue,
} from '@chakra-ui/react';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { LocalStorageKey } from '../../constants/constants';

interface TimelineOnboardingModalProps {
    projectId: string;
}

const PAGE_COUNT = 2;

export default function TimelineOnboardingModal({ projectId }: TimelineOnboardingModalProps) {
    const { t } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);
    const [pageIndex, setPageIndex] = React.useState(0);
    const [dontShowAgain, setDontShowAgain] = React.useState(false);
    const imageBackground = useColorModeValue('gray.50', 'whiteAlpha.100');
    const tipBackground = useColorModeValue('purple.50', 'whiteAlpha.100');
    const tipColor = useColorModeValue('purple.700', 'purple.200');

    React.useEffect(() => {
        const isDismissed = window.localStorage.getItem(LocalStorageKey.TIMELINE_ONBOARDING_DISMISSED) === 'true';
        setPageIndex(0);
        setDontShowAgain(isDismissed);
        setIsOpen(!isDismissed);
    }, [projectId]);

    const handleClose = () => {
        if (dontShowAgain) {
            window.localStorage.setItem(LocalStorageKey.TIMELINE_ONBOARDING_DISMISSED, 'true');
        } else {
            window.localStorage.removeItem(LocalStorageKey.TIMELINE_ONBOARDING_DISMISSED);
        }
        setIsOpen(false);
    };

    const isAddLinePage = pageIndex === 0;
    const pageKey = isAddLinePage ? 'addLine' : 'exportVideo';
    const imageSrc = `${import.meta.env.BASE_URL}images/timeline-tutorial/${
        isAddLinePage ? 'add-line' : 'export-video'
    }.webp`;

    return (
        <Modal isOpen={isOpen} onClose={handleClose} size="4xl" isCentered scrollBehavior="inside">
            <ModalOverlay bg="blackAlpha.600" backdropFilter="blur(4px)" />
            <ModalContent overflow="hidden" mx={4}>
                <ModalHeader pb={2} pr={12}>
                    <HStack spacing={3}>
                        <Badge colorScheme="purple" borderRadius="full" px={2.5} py={1} textTransform="none">
                            {t('header.timelinePage.onboarding.stepCount', {
                                current: pageIndex + 1,
                                total: PAGE_COUNT,
                            })}
                        </Badge>
                        <Text>{t('header.timelinePage.onboarding.title')}</Text>
                    </HStack>
                </ModalHeader>
                <ModalCloseButton />

                <ModalBody px={6} pt={2} pb={5}>
                    <Flex
                        direction={{ base: 'column', md: 'row' }}
                        gap={{ base: 5, md: 7 }}
                        align={{ base: 'stretch', md: 'flex-start' }}
                    >
                        <Flex
                            flex="1.12"
                            minW={0}
                            align="center"
                            justify="center"
                            bg={imageBackground}
                            borderRadius="xl"
                            overflow="hidden"
                            borderWidth="1px"
                        >
                            <Image
                                src={imageSrc}
                                alt={t(`header.timelinePage.onboarding.${pageKey}.imageAlt`)}
                                width="100%"
                                aspectRatio={3 / 2}
                                objectFit="cover"
                            />
                        </Flex>

                        <Flex flex="0.88" minW={0} direction="column" justify="center">
                            <Heading as="h3" size="md" mb={1.5}>
                                {t(`header.timelinePage.onboarding.${pageKey}.title`)}
                            </Heading>
                            <Text color="gray.500" fontSize="sm" mb={3}>
                                {t(`header.timelinePage.onboarding.${pageKey}.description`)}
                            </Text>
                            <OrderedList spacing={2} pl={1} mb={3} fontSize="sm">
                                {[1, 2, 3].map(step => (
                                    <ListItem key={step} pl={1}>
                                        {t(`header.timelinePage.onboarding.${pageKey}.step${step}`)}
                                    </ListItem>
                                ))}
                            </OrderedList>
                            <Box bg={tipBackground} color={tipColor} borderRadius="lg" px={3} py={2.5} fontSize="sm">
                                <Text as="span" fontWeight="bold">
                                    {t('header.timelinePage.onboarding.tipLabel')}
                                </Text>{' '}
                                {t(`header.timelinePage.onboarding.${pageKey}.tip`)}
                            </Box>
                        </Flex>
                    </Flex>
                </ModalBody>

                <ModalFooter borderTopWidth="1px" gap={3} flexWrap="wrap">
                    <Checkbox
                        mr="auto"
                        isChecked={dontShowAgain}
                        onChange={event => setDontShowAgain(event.target.checked)}
                    >
                        {t('noShowAgain')}
                    </Checkbox>
                    <HStack spacing={2}>
                        {pageIndex > 0 && (
                            <Button variant="ghost" onClick={() => setPageIndex(index => index - 1)}>
                                {t('header.timelinePage.onboarding.previous')}
                            </Button>
                        )}
                        {pageIndex < PAGE_COUNT - 1 ? (
                            <Button colorScheme="purple" onClick={() => setPageIndex(index => index + 1)}>
                                {t('header.timelinePage.onboarding.next')}
                            </Button>
                        ) : (
                            <Button colorScheme="purple" onClick={handleClose}>
                                {t('header.timelinePage.onboarding.done')}
                            </Button>
                        )}
                    </HStack>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}
