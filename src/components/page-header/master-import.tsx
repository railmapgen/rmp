import {
    Button,
    CloseButton,
    Flex,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SystemStyleObject,
    Textarea,
    useToast,
} from '@chakra-ui/react';
import { RmgAppClip, RmgAutoComplete, RmgLabel, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { defaultMasterTransform, MasterParam } from '../../constants/master';
import { getContrastingColor, getRandomHexColor } from '../../util/color';
import { getMasterNodeTypes } from '../../util/graph';

const RMP_MASTER_CHANNEL_NAME = 'RMP_MASTER_CHANNEL';
const RMP_MASTER_CHANNEL_POST = 'MASTER_POST';
const CHN = new BroadcastChannel(RMP_MASTER_CHANNEL_NAME);

interface MasterTypeList {
    id: string;
    value: string;
    param: MasterParam | null;
    bg: `#${string}`;
    fg: MonoColour;
}

const defaultMasterSelected: MasterTypeList = {
    id: 'null',
    value: '',
    param: null,
    bg: '#000000',
    fg: MonoColour.white,
};

const styles: SystemStyleObject = {
    h: '80%',
    w: '80%',

    '& iframe': {
        h: '100%',
        w: '100%',
    },

    '& div': {
        h: '100%',
        w: '100%',
    },
};

export const MasterImport = (props: {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (param: MasterParam) => void;
}) => {
    const { isOpen, onClose, onSubmit } = props;
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);
    const toast = useToast();

    const [list, setList] = React.useState<MasterTypeList[]>([]);
    const [selectedParam, setSelectedParam] = React.useState<MasterTypeList>(defaultMasterSelected);
    const [param, setParam] = React.useState('');
    const [useTextarea, setUseTextarea] = React.useState(false);
    const [textareaInvalid, setTextareaInvalid] = React.useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setParam('');
            setSelectedParam(defaultMasterSelected);
            setUseTextarea(false);
            setList(
                getMasterNodeTypes(graph.current)
                    .filter(p => p.randomId)
                    .map(p => {
                        return {
                            id: p.randomId!,
                            value: p.label! ?? p.randomId,
                            param: p,
                            bg: p.labelColorBg ?? defaultMasterSelected.bg,
                            fg: p.labelColorFg ?? defaultMasterSelected.fg,
                        };
                    })
            );
        }
    }, [isOpen]);

    const handleChange = (importedParam: string) => {
        try {
            const p = selectedParam.param ?? JSON.parse(importedParam);
            const rid = p.id ? p.id : p.randomId;
            const hex = p.labelColorBg ?? getRandomHexColor();
            const param: MasterParam = {
                randomId: rid,
                label: p.label ?? rid,
                labelColorBg: hex,
                labelColorFg: getContrastingColor(hex),
                nodeType: p.nodeType ?? p.type,
                transform: p.transform ?? defaultMasterTransform,
                svgs: p.svgs,
                components: p.components,
                color: p.color,
                core: p.core,
                version: p.version,
            };
            if (!param.version || param.version < 2) {
                toast({
                    title: 'Outdated configuration!',
                    status: 'error' as const,
                    duration: 9000,
                    isClosable: true,
                });
                return;
            }
            onSubmit(param);
        } catch (e) {
            setTextareaInvalid(true);
            return;
        }
        onClose();
    };

    const isOpenRef = React.useRef(isOpen);
    const [appClipType, setAppClipType] = React.useState<'DESIGNER' | 'GALLERY'>('DESIGNER');
    const [appClipOpen, setAppClipOpen] = React.useState(false);
    React.useEffect(() => {
        isOpenRef.current = isOpen;
    }, [isOpen]);
    React.useEffect(() => {
        const handleMaster = (e: MessageEvent) => {
            const { event, data } = e.data;
            if (event === RMP_MASTER_CHANNEL_POST && isOpenRef.current) {
                setAppClipOpen(false);
                handleChange(data);
            }
        };
        CHN.addEventListener('message', handleMaster);
        return () => {
            CHN.removeEventListener('message', handleMaster);
        };
    }, []);

    const handleDesigner = async () => {
        setAppClipType('DESIGNER');
        setAppClipOpen(true);
    };
    const handleGallery = () => {
        setAppClipType('GALLERY');
        setAppClipOpen(true);
    };

    const handleTextareaChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        setTextareaInvalid(false);
        setParam(event.target.value);
        setSelectedParam(defaultMasterSelected);
    };

    const handleCompleteChange = (item: MasterTypeList) => {
        setSelectedParam(item);
        setUseTextarea(false);
        setParam('');
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="sm" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.settings.procedures.masterManager.importTitle')}</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody>
                        <RmgLabel label={t('header.settings.procedures.masterManager.importFrom')}>
                            <RmgAutoComplete
                                data={list}
                                displayHandler={item => (
                                    <RmgLineBadge
                                        name={item.value}
                                        fg={item.fg}
                                        bg={item.bg}
                                        title={item.value}
                                        sx={{
                                            display: 'inline-block',
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                        }}
                                    />
                                )}
                                filter={(query, item) =>
                                    item.id.toLowerCase().includes(query.toLowerCase()) ||
                                    Object.values(item.id).some(name =>
                                        name.toLowerCase().includes(query.toLowerCase())
                                    )
                                }
                                value={selectedParam.value}
                                onChange={handleCompleteChange}
                            />
                        </RmgLabel>
                        <RmgLabel label={t('header.settings.procedures.masterManager.importOther')}>
                            <Flex direction="row" width="100%">
                                <Button m={1} width="100%" onClick={handleDesigner}>
                                    {t('RMP Designer')}
                                </Button>
                                <Button m={1} width="100%" onClick={handleGallery}>
                                    {t('RMP Gallery')}
                                </Button>
                            </Flex>
                            <Button m={1} onClick={() => setUseTextarea(true)}>
                                {t('header.settings.procedures.masterManager.importParam')}
                            </Button>
                            <Textarea
                                width="100%"
                                placeholder="qwq"
                                fontSize="sm"
                                fontFamily="monospace"
                                hidden={!useTextarea}
                                onChange={handleTextareaChange}
                                isInvalid={textareaInvalid}
                            />
                        </RmgLabel>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <Button
                            colorScheme="blue"
                            variant="solid"
                            mr="1"
                            onClick={() => handleChange(param)}
                            isDisabled={selectedParam.id === 'null' && param === ''}
                        >
                            {t('apply')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <MasterImportGalleryAppClip
                isOpen={appClipOpen}
                onClose={() => setAppClipOpen(false)}
                source={appClipType}
            />
        </>
    );
};

const MasterImportGalleryAppClip = (props: {
    isOpen: boolean;
    onClose: () => void;
    source: 'DESIGNER' | 'GALLERY';
}) => {
    const { isOpen, onClose, source } = props;
    const url = source === 'DESIGNER' ? '/rmp-designer/#/export' : '/rmp-gallery/?tabId=2&master=true';

    return (
        <RmgAppClip isOpen={isOpen} onClose={onClose} size="full" sx={styles}>
            <iframe src={url} loading="lazy" />
            <CloseButton onClick={onClose} position="fixed" top="5px" right="15px" />
        </RmgAppClip>
    );
};
