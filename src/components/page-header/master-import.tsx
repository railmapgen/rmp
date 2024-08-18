import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
} from '@chakra-ui/react';
import { RmgAutoComplete, RmgFields, RmgFieldsField, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MasterParam } from '../../constants/master';
import { getMasterNodeTypes } from '../../util/graph';
import { useRootSelector } from '../../redux';

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

export const MasterImport = (props: { isOpen: boolean; onClose: () => void; onSubmit: (s: string) => void }) => {
    const { isOpen, onClose, onSubmit } = props;
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);
    const { activeSubscriptions } = useRootSelector(state => state.account);
    const maxNumber = activeSubscriptions.RMP_CLOUD ? Infinity : 3;

    const [list, setList] = React.useState<MasterTypeList[]>([]);
    const [selectedParam, setSelectedParam] = React.useState<MasterTypeList>(defaultMasterSelected);
    const [allowAddNewMaster, setAllowAddNewMaster] = React.useState(false);
    React.useEffect(() => {
        if (isOpen) {
            setParam('');
            setError('');
            setSelectedParam(defaultMasterSelected);
            const masterList = getMasterNodeTypes(graph.current)
                .filter(p => p.randomId)
                .map(p => {
                    return { id: p.randomId!, value: p.label! ?? p.randomId, param: p };
                });
            setAllowAddNewMaster(masterList.length < maxNumber);
            setList(allowAddNewMaster ? [defaultMasterTypeList].concat(masterList) : masterList);
        }
    }, [isOpen]);

    const [param, setParam] = React.useState('');
    const [error, setError] = React.useState('');
    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('panel.details.masterManage.importFrom'),
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
            label: t('panel.details.masterManage.importLabel'),
            value: param.toString(),
            onChange: val => setParam(val),
            minW: 'full',
            hidden: selectedParam.param !== null || !allowAddNewMaster,
        },
    ];

    const handleChange = () => {
        try {
            onSubmit(selectedParam.param === null ? param : JSON.stringify(selectedParam.param));
        } catch (e) {
            setError('Something went wrong.');
            return;
        }
        onClose();
    };

    React.useEffect(() => setError(''), [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('panel.details.masterManage.importTitle')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody minH={250}>
                    <RmgFields fields={fields} />
                    {error && selectedParam.param !== null && <span style={{ color: 'red' }}>{error}</span>}
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
    );
};
