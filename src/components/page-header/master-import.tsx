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
    Spacer,
    SystemStyleObject,
} from '@chakra-ui/react';
import { RmgAppClip, RmgAutoComplete, RmgLabel, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MasterParam } from '../../constants/master';
import { getMasterNodeTypes } from '../../util/graph';

const RMP_MASTER_CHANNEL_NAME = 'RMP_MASTER_CHANNEL';
const RMP_MASTER_CHANNEL_POST = 'MASTER_POST';
const CHN = new BroadcastChannel(RMP_MASTER_CHANNEL_NAME);

interface MasterTypeList {
    id: string;
    value: string;
    param: MasterParam | null;
}

const defaultMasterSelected: MasterTypeList = {
    id: 'null',
    value: '',
    param: null,
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

export const MasterImport = (props: { isOpen: boolean; onClose: () => void; onSubmit: (s: string) => void }) => {
    const { isOpen, onClose, onSubmit } = props;
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const [list, setList] = React.useState<MasterTypeList[]>([]);
    const [selectedParam, setSelectedParam] = React.useState<MasterTypeList>(defaultMasterSelected);
    const paramRef = React.useRef('');
    React.useEffect(() => {
        if (isOpen) {
            paramRef.current = '';
            setSelectedParam(defaultMasterSelected);
            setList(
                getMasterNodeTypes(graph.current)
                    .filter(p => p.randomId)
                    .map(p => {
                        return { id: p.randomId!, value: p.label! ?? p.randomId, param: p };
                    })
            );
        }
    }, [isOpen]);

    const handleChange = () => {
        try {
            onSubmit(selectedParam.param === null ? paramRef.current : JSON.stringify(selectedParam.param));
        } catch (e) {
            // setError('Something went wrong.');
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
                paramRef.current = data;
                setAppClipOpen(false);
                handleChange();
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
                                        fg={MonoColour.white}
                                        bg={item.param === null ? '#000000' : '#19B3EA'}
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
                                onChange={item => setSelectedParam(item)}
                            />
                        </RmgLabel>
                        <RmgLabel label={t('header.settings.procedures.masterManager.importOther')}>
                            <Flex direction="row" width="100%">
                                <Spacer />
                                <Button m={1} width="100%" onClick={handleDesigner}>
                                    {t('RMP Designer')}
                                </Button>
                                <Button m={1} width="100%" onClick={handleGallery}>
                                    {t('RMP Gallery')}
                                </Button>
                            </Flex>
                        </RmgLabel>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <Button colorScheme="blue" variant="solid" mr="1" onClick={handleChange}>
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
    const url =
        source === 'DESIGNER'
            ? 'https://uat-railmapgen.github.io/rmp-designer/#/export'
            : 'https://uat-railmapgen.github.io/rmp-gallery/?tabId=2&master=true';

    return (
        <RmgAppClip isOpen={isOpen} onClose={onClose} size="full" sx={styles}>
            <iframe src={url} loading="lazy" />
            <CloseButton onClick={onClose} position="fixed" top="5px" right="15px" />
        </RmgAppClip>
    );
};
