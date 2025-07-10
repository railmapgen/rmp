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
import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useRootDispatch } from '../../../redux';
import { saveGraph } from '../../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk } from '../../../redux/runtime/runtime-slice';

export const TranslateNodesModal = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const dispatch = useRootDispatch();
    const { t } = useTranslation();
    const graph = React.useRef(window.graph);

    const [x, setX] = React.useState(0);
    const [y, setY] = React.useState(0);
    const fields: RmgFieldsField[] = [
        {
            type: 'input',
            label: t('header.settings.procedures.translate.x'),
            value: x.toString(),
            variant: 'number',
            onChange: val => setX(Number(val)),
            minW: 'full',
        },
        {
            type: 'input',
            label: t('header.settings.procedures.translate.y'),
            value: y.toString(),
            variant: 'number',
            onChange: val => setY(Number(val)),
            minW: 'full',
        },
    ];

    const handleChange = () => {
        graph.current.forEachNode((node, attr) => {
            graph.current.updateNodeAttribute(node, 'x', val => (val ?? 0) + x);
            graph.current.updateNodeAttribute(node, 'y', val => (val ?? 0) + y);
        });
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.translate.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    {t('header.settings.procedures.translate.content')}
                    <RmgFields fields={fields} />
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                    <Button colorScheme="red" onClick={handleChange}>
                        {t('apply')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
