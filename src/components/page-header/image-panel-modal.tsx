import {
    Alert,
    AlertDescription,
    AlertIcon,
    AlertTitle,
    Badge,
    Box,
    Button,
    Card,
    CardBody,
    CardFooter,
    CloseButton,
    Flex,
    Heading,
    IconButton,
    Image,
    Input,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    Spinner,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Tabs,
    Text,
    Tooltip,
} from '@chakra-ui/react';
import { logger } from '@railmapgen/rmg-runtime';
import { nanoid } from 'nanoid';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdCheck, MdDelete, MdDownload } from 'react-icons/md';
import { useDispatch } from 'react-redux';
import { MiscNodeId } from '../../constants/constants';
import { MiscNodeType } from '../../constants/nodes';
import { image_endpoint } from '../../constants/server';
import { useRootSelector } from '../../redux';
import { setRefreshNodes } from '../../redux/runtime/runtime-slice';
import { createHash, fileToBytes } from '../../util/binary';
import {
    downloadBase64Image,
    fetchAndSaveImage,
    fetchLocalImageList,
    fetchServerImageList,
    getExtFromBase64,
    ImageList,
} from '../../util/image';
import { imageStoreIndexedDB } from '../../util/image-store-indexed-db';

export const ImagePanelModal = (props: {
    id: MiscNodeId;
    isOpen: boolean;
    onClose: () => void;
    onChange: (id: MiscNodeId, href: string, type: 'local' | 'server', hash?: string) => void;
}) => {
    const { id, isOpen, onClose, onChange } = props;
    const { t } = useTranslation();
    const {
        token,
        activeSubscriptions: { RMP_EXPORT },
    } = useRootSelector(state => state.account);
    const graph = React.useRef(window.graph);
    const dispatch = useDispatch();

    const [activeTab, setActiveTab] = React.useState(0);
    const [loading, setLoading] = React.useState(false);
    const [localList, setLocalList] = React.useState<ImageList[]>([]);
    const [cloudList, setCloudList] = React.useState<ImageList[]>([]);
    const [error, setError] = React.useState<string | undefined>(undefined);

    const [selected, setSelected] = React.useState<ImageList[]>([]);

    const tabs = [localList, cloudList];

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, tabId: number) => {
        const type = tabId === 0 ? 'local' : 'server';
        const file = event.target.files?.[0];
        logger.debug('File selected:', file);
        if (file) {
            if (type === 'server') {
                if (file.size > 4 * 1024 * 1024) {
                    setError('Image is too big.');
                    return;
                }

                const bytes = await fileToBytes(file);
                const hash = await createHash(bytes);
                const reader = new FileReader();

                const formData = new FormData();
                formData.append('image', new Blob([bytes], { type: file.type }), file.name);
                formData.append('mimetype', file.type);
                formData.append('hash', hash);

                try {
                    const response = await fetch(image_endpoint, {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        body: formData,
                    });
                    const data = await response.json();
                    if (!data.code || data.code === 201) {
                        const imgId = `img-s_${data.id}`;
                        imageStoreIndexedDB.save(imgId, reader.result as string);
                        setCloudList(await fetchServerImageList(token));
                    } else {
                        setError(data.message);
                    }
                } catch (error) {
                    logger.error('Error uploading image:', error);
                }
            } else {
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        const imgId = `img-l_${nanoid(10)}`; // Use timestamp to ensure unique ID
                        imageStoreIndexedDB.save(imgId, reader.result);
                        setLocalList(prev => [...prev, { id: imgId, thumbnail: reader.result as string }]);
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    };

    React.useEffect(() => {
        const runEffect = async (fetchList: () => Promise<void>) => {
            setLoading(true);
            setError(undefined);
            await fetchList();
            setSelected([]);
            setLoading(false);
        };

        if (isOpen) {
            const fetchList =
                activeTab === 0
                    ? async () => setLocalList(await fetchLocalImageList())
                    : async () => setCloudList(await fetchServerImageList(token));
            runEffect(fetchList);
        }
    }, [isOpen, activeTab]);

    const handleChange = async () => {
        setLoading(true);
        if (selected.length > 0) {
            const imgId = selected[0].id;
            const hash = selected[0].hash;
            if (imgId.startsWith('img-l')) {
                onChange(id, imgId, 'local');
            } else {
                await fetchAndSaveImage(imgId, hash!);
                onChange(id, imgId, 'server', hash);
            }
        }
        setLoading(false);
        onClose();
    };

    const handleDelete = async (id: string) => {
        graph.current
            .filterNodes(
                (n: string, attr: any) =>
                    n.startsWith('misc_node') && attr.type === 'image' && attr['image']?.href === id
            )
            .forEach(node => {
                const attrs = graph.current.getNodeAttribute(node, MiscNodeType.Image)!;
                attrs.href = undefined;
                graph.current.mergeNodeAttributes(node, { [MiscNodeType.Image]: attrs });
            });

        if (id.startsWith('img-l')) {
            // Local image
            imageStoreIndexedDB.delete(id);
            setLocalList(prev => prev.filter(img => img.id !== id));
        } else {
            // Server image
            const serverId = id.slice(6); // Remove 'img-X_' prefix
            try {
                const response = await fetch(`${image_endpoint}/data/${serverId}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                });
                if (response.ok) {
                    setCloudList(prev => prev.filter(img => img.id !== id));
                    imageStoreIndexedDB.delete(id);
                } else {
                    logger.error('Failed to delete image from server');
                }
            } catch (error) {
                logger.error('Error deleting image:', error);
            }
        }

        dispatch(setRefreshNodes());
    };

    const handleDownload = async (image: ImageList) => {
        if (image.id.startsWith('img-s') && (await imageStoreIndexedDB.has(image.id)) === false) {
            await fetchAndSaveImage(image.id, image.hash!);
        }
        const base64 = await imageStoreIndexedDB.get(image.id);
        if (base64) {
            const ext = getExtFromBase64(base64) ?? 'jpg';
            downloadBase64Image(base64, `image_${image.id}.${ext}`);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t(`panel.details.image.importTitle`)}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    <Tabs isLazy isFitted overflow="hidden" index={activeTab} onChange={idx => setActiveTab(idx)}>
                        <TabList>
                            <Tab>{t('panel.details.image.local')}</Tab>
                            {RMP_EXPORT ? (
                                <Tab>
                                    {t('panel.details.image.server')}
                                    <Badge
                                        ml="1"
                                        color="gray.50"
                                        background="radial-gradient(circle, #3f5efb, #fc466b)"
                                    >
                                        PRO
                                    </Badge>
                                </Tab>
                            ) : (
                                <Tooltip label={t('header.settings.pro')} hasArrow>
                                    <Tab isDisabled>
                                        {t('panel.details.image.server')}
                                        <Badge
                                            ml="1"
                                            color="gray.50"
                                            background="radial-gradient(circle, #3f5efb, #fc466b)"
                                        >
                                            PRO
                                        </Badge>
                                    </Tab>
                                </Tooltip>
                            )}
                        </TabList>

                        <TabPanels overflow="hidden" h="100%">
                            {tabs.map((g, i) => (
                                <TabPanel key={i} overflowY="auto" h="calc(100% - 2rem - 8px)">
                                    {loading ? (
                                        <Box textAlign="center" py={10}>
                                            <Spinner size="xl" />
                                            <Text mt={4}>{t('panel.details.image.loading')}</Text>
                                        </Box>
                                    ) : (
                                        <Card mt="2">
                                            <CardBody paddingTop="0">
                                                <Flex flexWrap="wrap">
                                                    {g.map(k => (
                                                        <Flex direction="column" key={k.id}>
                                                            <Box
                                                                key={k.id}
                                                                boxSize="300px"
                                                                m="2"
                                                                border="1px solid"
                                                                borderColor="gray.200"
                                                                overflow="hidden"
                                                                borderRadius="md"
                                                            >
                                                                <Image
                                                                    id={`image_thumbnail_${k.id}`}
                                                                    src={k.thumbnail}
                                                                    boxSize="100%"
                                                                    objectFit="cover"
                                                                />
                                                            </Box>
                                                            <Flex direction="row" width="100%">
                                                                <IconButton
                                                                    m="1"
                                                                    aria-label={t('download')}
                                                                    icon={<MdDownload />}
                                                                    colorScheme="blue"
                                                                    onClick={() => handleDownload(k)}
                                                                />
                                                                <IconButton
                                                                    m="1"
                                                                    width="100%"
                                                                    aria-label={t('select')}
                                                                    icon={<MdCheck />}
                                                                    colorScheme={
                                                                        selected.find(s => s.id === k.id)
                                                                            ? 'blue'
                                                                            : 'gray'
                                                                    }
                                                                    onClick={() => setSelected([k])}
                                                                />
                                                                <IconButton
                                                                    m="1"
                                                                    aria-label="Delete"
                                                                    icon={<MdDelete />}
                                                                    colorScheme="red"
                                                                    onClick={() => handleDelete(k.id)}
                                                                />
                                                            </Flex>
                                                        </Flex>
                                                    ))}
                                                </Flex>
                                            </CardBody>
                                            <CardFooter>
                                                <Flex width="100%" direction="column">
                                                    <Flex direction="row">
                                                        <Heading size="md" width="100%">
                                                            {t('panel.details.image.add')}
                                                        </Heading>
                                                        <Input
                                                            variant="flushed"
                                                            type="file"
                                                            accept="image/*"
                                                            onChange={e => handleFileChange(e, i)}
                                                        />
                                                    </Flex>
                                                    {error && (
                                                        <Alert
                                                            status="error"
                                                            variant="left-accent"
                                                            borderRadius="md"
                                                            boxShadow="md"
                                                            position="relative"
                                                        >
                                                            <AlertIcon />
                                                            <Box flex="1">
                                                                <AlertTitle>
                                                                    {t('panel.details.image.error')}
                                                                </AlertTitle>
                                                                <AlertDescription>{error}</AlertDescription>
                                                            </Box>
                                                            <CloseButton
                                                                position="absolute"
                                                                right="8px"
                                                                top="8px"
                                                                onClick={() => setError(undefined)}
                                                            />
                                                        </Alert>
                                                    )}
                                                </Flex>
                                            </CardFooter>
                                        </Card>
                                    )}
                                </TabPanel>
                            ))}
                        </TabPanels>
                    </Tabs>
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('close')}
                    </Button>
                    <Button
                        colorScheme="blue"
                        variant="solid"
                        mr="1"
                        onClick={handleChange}
                        isDisabled={selected.length === 0}
                    >
                        {t('apply')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
