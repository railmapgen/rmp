import { RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
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
} from '@chakra-ui/react';
import React from 'react';
import { MdError } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { useDispatch } from 'react-redux';
import { nanoid } from 'nanoid';
import { MiscNodeId } from '../../constants/constants';
import { imageStoreIndexedDB } from '../../util/image-store-indexed-db';
import { setRefreshNodes } from '../../redux/runtime/runtime-slice';
import { ImageAttributes } from '../svgs/nodes/image';

interface ImageImportList {
    id: MiscNodeId;
    attrs: ImageAttributes;
    error: boolean;
}

export const ImageImportModal = (props: { trigger: number }) => {
    const { trigger } = props;
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);
    const dispatch = useDispatch();

    const [list, setList] = React.useState<ImageImportList[]>([]);
    const [isOpen, setIsOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, id: MiscNodeId, attrs: ImageAttributes) => {
        const file = event.target.files?.[0];
        console.log('File selected:', file);
        if (file) {
            const reader = new FileReader();
            reader.onload = () => {
                if (typeof reader.result === 'string') {
                    console.log('File read as base64:', reader.result);
                    imageStoreIndexedDB.save(id as MiscNodeId, reader.result);
                    graph.current.mergeNodeAttributes(id, { ['image']: { ...attrs, href: `${id}+${nanoid(5)}` } });
                    dispatch(setRefreshNodes());
                }
            };
            reader.readAsDataURL(file);
        }
    };

    // const loadExternalImage = async (importList: ImageImportList[]) => {
    //     importList.forEach(async (l, i) => {
    //         if (l.type === 'url') {
    //             try {
    //                 const url = l.href;
    //                 const response = await fetch(url);
    //                 if (!response.ok) {
    //                     throw new Error(`下载失败: ${url}`);
    //                 }
    //                 const arrayBuffer = await response.arrayBuffer();

    //                 const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    //                 const hashHex = bufferToHex(hashBuffer);

    //                 if (hashHex !== l.hash || hashHex === undefined) {
    //                     throw new Error(`hash not match: ${l.hash} !== ${hashHex}`);
    //                 }

    //                 const base64String = bufferToBase64(arrayBuffer);
    //                 const mimeType = response.headers.get('Content-Type') || 'image/jpeg';
    //                 const href = `data:${mimeType};base64,${base64String}`;

    //                 dispatch(addImageHref({ id: l.id, href }));
    //             } catch (err) {
    //                 console.error(err);
    //                 list[i].error = true;
    //                 setList(list);
    //             } finally {
    //                 setLoading(false);
    //             }
    //         }
    //     });
    // };

    React.useEffect(() => {
        const imageNodes = graph.current.filterNodes(
            (id, attr) => id.startsWith('misc_node') && attr.type === 'image'
        ) as MiscNodeId[];
        imageStoreIndexedDB.deleteExcept(imageNodes);
        const newList: ImageImportList[] = imageNodes
            .filter(id => !imageStoreIndexedDB.has(id))
            .map(id => {
                const attrs = graph.current.getNodeAttributes(id)['image'];
                return {
                    id: id as MiscNodeId,
                    attrs: attrs!,
                    error: false,
                } as ImageImportList;
            });
        setList(newList);

        if (newList.length !== 0) {
            // setLoading(true);
            setIsOpen(true);
            // loadExternalImage(newList);
        }
    }, [trigger]);

    return (
        <>
            <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="xl" scrollBehavior="inside">
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
                        {!loading &&
                            list.map(l => (
                                <Flex direction="row" width="100%" mb="3">
                                    <Heading size="sm" mr="2" isTruncated w="30%">
                                        {l.attrs.label}
                                    </Heading>
                                    <RmgLineBadge
                                        maxW="30%"
                                        maxH="6"
                                        name={l.attrs.type}
                                        fg={MonoColour.white}
                                        bg="#11D3AA"
                                    />
                                    <Input
                                        maxW="60%"
                                        ml="auto"
                                        variant="flushedd"
                                        type="file"
                                        accept="image/*"
                                        onChange={e => handleFileChange(e, l.id, l.attrs)}
                                    />
                                    {l.error && <MdError color="red" />}
                                </Flex>
                            ))}
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme="blue" variant="outline" mr="1" onClick={() => setIsOpen(false)}>
                            {t('close')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    );
};
