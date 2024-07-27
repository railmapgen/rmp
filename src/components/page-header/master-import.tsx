import { RmgAutoComplete, RmgFields, RmgFieldsField, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
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
import React from 'react';
import { useTranslation } from 'react-i18next';
import { getMasterNodeTypes } from '../../util/graph';
import { MasterParam } from '../../constants/master';

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

    const allowAddNewMaster = true;

    const [list, setList] = React.useState<MasterTypeList[]>([]);
    const [selectedParam, setSelectedParam] = React.useState<MasterTypeList>(defaultMasterSelected);
    React.useEffect(() => {
        if (isOpen) {
            setParam('');
            setError('');
            setSelectedParam(defaultMasterSelected);
            const masterList = getMasterNodeTypes(graph.current)
                .filter(p => p.randomId !== 'undefined')
                .map(p => {
                    return { id: p.randomId, value: p.randomId, param: p };
                });
            setList(allowAddNewMaster ? [defaultMasterTypeList].concat(masterList) : masterList);
        }
    }, [isOpen]);

    const [param, setParam] = React.useState('');
    const [error, setError] = React.useState('');
    const fields: RmgFieldsField[] = [
        {
            type: 'custom',
            label: 'Import from',
            component: (
                <RmgAutoComplete
                    data={list}
                    displayHandler={item => (
                        <RmgLineBadge
                            name={item.value}
                            fg={MonoColour.white}
                            bg={item.param === null ? '#000000' : '#ff8651'}
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
            label: t('Paste JSON from RMP Designer'),
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
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('Upload master parameter')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody minH={200}>
                    <RmgFields fields={fields} />
                    <span style={{ color: 'red' }} hidden={selectedParam.param !== null}>
                        {error}
                    </span>
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
