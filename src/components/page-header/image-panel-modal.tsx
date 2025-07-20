import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalCloseButton,
    ModalBody,
    Button,
    ModalFooter,
    Input,
    Flex,
    Heading,
    Text,
    Box,
    Spinner,
    Tabs,
    Card,
    CardBody,
    IconButton,
    Tab,
    TabList,
    TabPanel,
    TabPanels,
    Image,
    CardFooter,
    AlertIcon,
    AlertTitle,
    Alert,
    AlertDescription,
    CloseButton,
    Tooltip,
    Badge,
} from '@chakra-ui/react';
import React from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { MdCheck, MdDelete } from 'react-icons/md';
import { nanoid } from 'nanoid';
import { MiscNodeId } from '../../constants/constants';
import { image_endpoint } from '../../constants/server';
import { useRootSelector } from '../../redux';
import { setRefreshNodes } from '../../redux/runtime/runtime-slice';
import { imageStoreIndexedDB } from '../../util/image-store-indexed-db';
import { bytesToBase64DataURL } from '../../util/helpers';

interface ImageList {
    id: string;
    thumbnail: string;
    hash?: string;
}

// TEST USAGE !
const RMP_EXPORT = true;

export const ImagePanelModal = (props: {
    id: MiscNodeId;
    isOpen: boolean;
    fetchImage?: number;
    onClose: () => void;
    onChange: (id: MiscNodeId, href: string, type: 'local' | 'server') => void;
}) => {
    const { id, isOpen, fetchImage, onClose, onChange } = props;
    const { t } = useTranslation();
    const {
        token,
        // activeSubscriptions: { RMP_EXPORT },
    } = useRootSelector(state => state.account);
    const graph = React.useRef(window.graph);
    const dispatch = useDispatch();

    const [loading, setLoading] = React.useState(false);
    const [refresh, _setRefresh] = React.useState(0);
    const setRefresh = () => _setRefresh(refresh + 1);
    const [localList, setLocalList] = React.useState<ImageList[]>([]);
    const [cloudList, setCloudList] = React.useState<ImageList[]>([]);
    const [selected, setSelected] = React.useState<ImageList | undefined>(undefined);
    const [error, setError] = React.useState<string | undefined>(undefined);

    const tabs = [localList, cloudList];

    function fileToBytes(file: File): Promise<Uint8Array> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
                resolve(new Uint8Array(reader.result as ArrayBuffer));
            };
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
        });
    }

    async function sha256(bytes: Uint8Array): Promise<string> {
        const hashBuffer = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(hashBuffer))
            .map(b => b.toString(16).padStart(2, '0'))
            .join('');
    }

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>, tabId: number) => {
        const type = tabId === 0 ? 'local' : 'server';
        const file = event.target.files?.[0];
        console.log('File selected:', file);
        if (file) {
            if (type === 'server') {
                const bytes = await fileToBytes(file);
                const hash = await sha256(bytes);
                const reader = new FileReader();

                const formData = new FormData();
                formData.append('image', new Blob([bytes], { type: file.type }), file.name);
                formData.append('mimetype', file.type);
                formData.append('hash', hash);

                fetch(image_endpoint, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                })
                    .then(response => response.json())
                    .then(data => {
                        if (!data.code || data.code === 201) {
                            const imgId = `s${data.id}`;
                            const newImage = {
                                id: imgId,
                                hash: data.hash,
                                thumbnail: bytesToBase64DataURL(data.thumbnail, 'jpeg'),
                            };
                            setCloudList(prev => [...prev, newImage]);
                            imageStoreIndexedDB.save(imgId, reader.result as string);
                            setRefresh();
                        } else {
                            setError(data.message);
                        }
                    })
                    .catch(error => console.error('Error uploading image:', error));
            } else {
                const reader = new FileReader();
                reader.onload = () => {
                    if (typeof reader.result === 'string') {
                        const imgId = `l${nanoid(5)}`; // Use timestamp to ensure unique ID
                        imageStoreIndexedDB.save(imgId, reader.result);
                        setLocalList(prev => [...prev, { id: imgId, thumbnail: reader.result as string }]);
                        setRefresh();
                    }
                };
                reader.readAsDataURL(file);
            }
        }
    };

    async function fetchImageAsBase64(url: string): Promise<string> {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to download: ${response.statusText}`);
        }

        const blob = await response.blob();
        return await blobToBase64(blob);
    }

    function blobToBase64(blob: Blob): Promise<string> {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                if (typeof reader.result === 'string') {
                    resolve(reader.result);
                } else {
                    reject('Failed to convert blob to base64');
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    const fetchImageList = async () => {
        if (!token) return;
        const rep = await fetch(image_endpoint, {
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
        });
        if (rep.status !== 200) {
            return;
        }
        const { images } = await rep.json();

        const list = await Promise.all(
            images.map(async (img: { id: string; hash: string }) => {
                const thumbnail = await fetchImageAsBase64(`${image_endpoint}/thumbnail/${img.id}`);
                return {
                    id: `s${img.id}`,
                    hash: img.hash,
                    thumbnail,
                };
            })
        );
        setCloudList(list);
    };

    const getLocalImageList = async () => {
        const list: ImageList[] = [];
        (await imageStoreIndexedDB.getAll()).forEach((img, id) => {
            if (img && id.startsWith('l')) {
                list.push({
                    id,
                    thumbnail: img,
                });
            }
        });
        setLocalList(list);
    };

    React.useEffect(() => {
        if (isOpen) {
            setLoading(true);
            setError(undefined);
            setSelected(undefined);
            getLocalImageList();
            fetchImageList();
            setLoading(false);
        }
    }, [isOpen, refresh]);

    React.useEffect(() => {
        if (fetchImage !== undefined) {
            graph.current
                .filterNodes(
                    (id, attr) =>
                        id.startsWith('misc_node') && attr.type === 'image' && attr['image']!.href !== undefined
                )
                .forEach(id => {
                    const attr = graph.current.getNodeAttributes(id)['image']!;
                    if (attr.href && attr.href.startsWith('s') && !imageStoreIndexedDB.has(attr.href)) {
                        fetchImageAsBase64(`${image_endpoint}/thumbnail/${attr.href.slice(1)}`).then(src => {
                            if (src) {
                                imageStoreIndexedDB.save(attr.href!, src);
                                dispatch(setRefreshNodes());
                            }
                        });
                    }
                });
        }
    }, [fetchImage]);

    const handleChange = async () => {
        if (selected) {
            const imgId = selected.id;
            if (imgId.startsWith('l')) {
                // Local image
                onChange(id, imgId, 'local');
            } else {
                const serverId = imgId.slice(1); // Remove 's' prefix
                const src = await fetchImageAsBase64(`${image_endpoint}/data/${serverId}`);
                if (src) {
                    imageStoreIndexedDB.save(imgId, src);
                    onChange(id, imgId, 'server');
                } else {
                    console.error('Failed to fetch image from server');
                    return;
                }
            }
        }
        onClose();
    };

    const handleDelete = (id: string) => {
        if (id.startsWith('l')) {
            // Local image
            imageStoreIndexedDB.delete(id);
            setLocalList(prev => prev.filter(img => img.id !== id));
        } else {
            // Server image
            const serverId = id.slice(1); // Remove 's' prefix
            fetch(`${image_endpoint}/data/${serverId}`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })
                .then(response => {
                    if (response.ok) {
                        setCloudList(prev => prev.filter(img => img.id !== id));
                        imageStoreIndexedDB.delete(id);
                    } else {
                        console.error('Failed to delete image from server');
                    }
                })
                .catch(error => console.error('Error deleting image:', error));
        }
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="3xl" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.settings...importTitle')}</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        {loading && (
                            <Box textAlign="center" py={10}>
                                <Spinner size="xl" />
                                <Text mt={4}>Loading...</Text>
                            </Box>
                        )}
                        {!loading && (
                            <Tabs isLazy isFitted overflow="hidden">
                                <TabList>
                                    <Tab>{t('gallery.type.local')}</Tab>
                                    {RMP_EXPORT ? (
                                        <Tab>
                                            {t('gallery.type.server')}
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
                                                {t('gallery.type.server')}
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
                                                                        width="100%"
                                                                        aria-label={t('gallery.select')}
                                                                        icon={<MdCheck />}
                                                                        colorScheme={
                                                                            selected && selected.id === k.id
                                                                                ? 'blue'
                                                                                : 'gray'
                                                                        }
                                                                        onClick={() => setSelected(k)}
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
                                                                Add new
                                                            </Heading>
                                                            <Input
                                                                variant="flushedd"
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
                                                                    <AlertTitle>Failed to upload!</AlertTitle>
                                                                    <AlertDescription>{error}</AlertDescription>
                                                                </Box>
                                                                {onClose && (
                                                                    <CloseButton
                                                                        position="absolute"
                                                                        right="8px"
                                                                        top="8px"
                                                                        onClick={onClose}
                                                                    />
                                                                )}
                                                            </Alert>
                                                        )}
                                                    </Flex>
                                                </CardFooter>
                                            </Card>
                                        </TabPanel>
                                    ))}
                                </TabPanels>
                            </Tabs>
                        )}
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                            {t('close')}
                        </Button>
                        <Button colorScheme="blue" variant="solid" mr="1" onClick={handleChange} isDisabled={!selected}>
                            {t('change')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};
