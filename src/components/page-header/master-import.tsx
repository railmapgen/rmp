import {
    Button,
    CloseButton,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    SystemStyleObject,
    useToast,
} from '@chakra-ui/react';
import { RmgAppClip, RmgAutoComplete, RmgFields, RmgFieldsField, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MasterParam } from '../../constants/master';
import { getMasterNodeTypes } from '../../util/graph';

const RMP_MASTER_CHANNEL_NAME = 'RMP_MASTER_CHANNEL';
const RMP_MASTER_CHANNEL_REQUEST = 'MASTER_REQUEST';
const RMP_MASTER_CHANNEL_POST = 'MASTER_POST';
const CHN = new BroadcastChannel(RMP_MASTER_CHANNEL_NAME);

interface MasterTypeList {
    id: string;
    value: string;
    param: MasterParam | null;
}

const defaultMasterTypeList: MasterTypeList = {
    id: 'new',
    value: 'Upload a new param',
    param: null,
};

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
    const toast = useToast();

    const [list, setList] = React.useState<MasterTypeList[]>([]);
    const [selectedParam, setSelectedParam] = React.useState<MasterTypeList>(defaultMasterSelected);
    const paramRef = React.useRef('');
    const allowAddNewMaster = true;
    React.useEffect(() => {
        if (isOpen) {
            paramRef.current = '';
            setError('');
            setSelectedParam(defaultMasterSelected);
            const masterList = getMasterNodeTypes(graph.current)
                .filter(p => p.randomId)
                .map(p => {
                    return { id: p.randomId!, value: p.label! ?? p.randomId, param: p };
                });
            setList(allowAddNewMaster ? [defaultMasterTypeList].concat(masterList) : masterList);
        }
    }, [isOpen]);

    const [error, setError] = React.useState('');
    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('header.settings.procedures.masterManager.importFrom'),
            component: (
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
                        Object.values(item.id).some(name => name.toLowerCase().includes(query.toLowerCase()))
                    }
                    value={selectedParam.value}
                    onChange={item => setSelectedParam(item)}
                />
            ),
        },
        {
            type: 'textarea',
            label: t('header.settings.procedures.masterManager.importLabel'),
            value: paramRef.current.toString(),
            onChange: val => (paramRef.current = val),
            minW: 'full',
            hidden: selectedParam.param !== null || !allowAddNewMaster,
        },
    ];

    const handleChange = () => {
        try {
            onSubmit(selectedParam.param === null ? paramRef.current : JSON.stringify(selectedParam.param));
        } catch (e) {
            setError('Something went wrong.');
            return;
        }
        onClose();
    };

    const timeoutRef = React.useRef<NodeJS.Timeout | null>(null);
    const isOpenRef = React.useRef(isOpen);
    const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
    const isGalleryOpenRef = React.useRef(false);
    React.useEffect(() => {
        isOpenRef.current = isOpen;
        setError('');
    }, [isOpen]);
    React.useEffect(() => {
        isGalleryOpenRef.current = isGalleryOpen;
    }, [isGalleryOpen]);
    React.useEffect(() => {
        const handleMaster = (e: MessageEvent) => {
            const { event, data } = e.data;
            if (event === RMP_MASTER_CHANNEL_POST && isOpenRef.current) {
                paramRef.current = data;
                setLoading(false);
                if (timeoutRef.current) {
                    clearTimeout(timeoutRef.current);
                    timeoutRef.current = null;
                }
                if (isGalleryOpenRef.current) {
                    setIsGalleryOpen(false);
                }
                handleChange();
            }
        };
        CHN.addEventListener('message', handleMaster);
        return () => {
            CHN.removeEventListener('message', handleMaster);
        };
    }, []);

    const [loading, setLoading] = React.useState(false);

    const handleDesigner = async () => {
        setLoading(true);

        timeoutRef.current = setTimeout(() => {
            setLoading(false);
            toast({
                title: 'timeout',
                status: 'error' as const,
                duration: 9000,
                isClosable: true,
            });
            timeoutRef.current = null;
        }, 6000);

        CHN.postMessage({ event: RMP_MASTER_CHANNEL_REQUEST });
    };

    const handleGallery = () => {
        setIsGalleryOpen(true);
    };

    return (
        <>
            <Modal isOpen={isOpen} onClose={onClose} size="sm" scrollBehavior="inside">
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>{t('header.settings.procedures.masterManager.importTitle')}</ModalHeader>
                    <ModalCloseButton />

                    <ModalBody minH={250}>
                        <RmgFields fields={fields} />
                        {error && selectedParam.param !== null && <span style={{ color: 'red' }}>{error}</span>}
                        <Button onClick={handleDesigner} isLoading={loading}>
                            {t('from designer')}
                        </Button>
                        <Button onClick={handleGallery} isDisabled={loading}>
                            {t('from gallery')}
                        </Button>
                    </ModalBody>

                    <ModalFooter>
                        <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                            {t('cancel')}
                        </Button>
                        <Button colorScheme="blue" variant="outline" mr="1" onClick={handleChange}>
                            {t('apply')}
                        </Button>
                    </ModalFooter>
                </ModalContent>
            </Modal>
            <MasterImportGalleryAppClip isOpen={isGalleryOpen} onClose={() => setIsGalleryOpen(false)} />
        </>
    );
};

const MasterImportGalleryAppClip = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;

    return (
        <RmgAppClip isOpen={isOpen} onClose={onClose} size="full" sx={styles}>
            <iframe src="https://uat-railmapgen.github.io/rmp-gallery/?tabId=2&master=true" loading="lazy" />
            <CloseButton onClick={onClose} position="fixed" top="5px" right="15px" />
        </RmgAppClip>
    );
};
