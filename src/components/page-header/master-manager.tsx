import { RmgFields, RmgFieldsField, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import {
    Button,
    Flex,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    useToast,
} from '@chakra-ui/react';
import React from 'react';
import { MdDelete, MdDownload, MdUpload } from 'react-icons/md';
import { useTranslation } from 'react-i18next';
import { MiscNodeType } from '../../constants/nodes';
import { defaultMasterTransform, MasterParam } from '../../constants/master';
import { useRootDispatch, useRootSelector } from '../../redux';
import { setRefreshNodes } from '../../redux/runtime/runtime-slice';
import { saveGraph } from '../../redux/param/param-slice';
import { getMasterNodeTypes } from '../../util/graph';
import { MasterImport } from './master-import';
import { downloadAs } from '../../util/download';

export const MasterManager = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();
    const {
        refresh: { nodes: refreshNodes },
    } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);
    const dispatch = useRootDispatch();
    const toast = useToast();

    const [list, setList] = React.useState<MasterParam[]>([]);
    React.useEffect(() => {
        if (isOpen) {
            setList(getMasterNodeTypes(graph.current));
        }
    }, [isOpen, refreshNodes]);

    const [openImport, setOpenImport] = React.useState<string | undefined>(undefined);

    const handleReplace = (s: string) => {
        const p = JSON.parse(s);
        const id = p.id ? p.id : p.randomId;
        const param: MasterParam = {
            randomId: id,
            label: p.label ?? id,
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
        graph.current
            .filterNodes(
                node =>
                    graph.current.getNodeAttribute(node, 'type') === MiscNodeType.Master &&
                    graph.current.getNodeAttributes(node)[MiscNodeType.Master]!.randomId === openImport
            )
            .forEach(node => {
                const newParam = structuredClone(param);
                const nodeAttrs = graph.current.getNodeAttributes(node);
                const attrs = structuredClone(nodeAttrs[MiscNodeType.Master]!);

                const getComponentValue = (query: string) => {
                    attrs.components.forEach(c => {
                        if (c.id === query) {
                            return c.value ?? c.defaultValue;
                        }
                    });
                    return undefined;
                };

                newParam.components.forEach((c, i) => {
                    newParam.components[i].value = getComponentValue(c.id) ?? c.defaultValue;
                });
                if (newParam.color !== undefined)
                    newParam.color.value = attrs.color ? newParam.color.value : newParam.color.defaultValue;
                graph.current.mergeNodeAttributes(node, { [MiscNodeType.Master]: newParam });
            });
        dispatch(setRefreshNodes());
        dispatch(saveGraph(graph.current.export()));
    };

    const handleDownload = (p: MasterParam) => {
        const param = {
            id: p.randomId,
            type: p.nodeType,
            svgs: p.svgs,
            components: p.components,
            color: p.color,
            core: p.core,
            version: p.version,
        };
        param.components.forEach((c, i) => {
            param.components[i].value = c.defaultValue;
        });
        downloadAs(`RMP_Master_Node_${new Date().valueOf()}.json`, 'application/json', JSON.stringify(param));
    };

    const handleRemove = (type: string) => {
        graph.current
            .filterNodes(
                node =>
                    graph.current.getNodeAttribute(node, 'type') === MiscNodeType.Master &&
                    graph.current.getNodeAttributes(node)[MiscNodeType.Master]!.randomId === type
            )
            .forEach(node => {
                graph.current.dropNode(node);
            });
        dispatch(setRefreshNodes());
        dispatch(saveGraph(graph.current.export()));
    };

    const handleSetLabel = (attr: MasterParam, label: string) => {
        graph.current
            .filterNodes(
                node =>
                    graph.current.getNodeAttribute(node, 'type') === MiscNodeType.Master &&
                    graph.current.getNodeAttributes(node)[MiscNodeType.Master]!.randomId === attr.randomId
            )
            .forEach(node => {
                graph.current.mergeNodeAttributes(node, { [MiscNodeType.Master]: { ...attr, label } });
            });
        dispatch(setRefreshNodes());
        dispatch(saveGraph(graph.current.export()));
    };

    const fields: RmgFieldsField[][] = list.map(attrs => {
        return [
            {
                label: 'id',
                type: 'custom',
                component: (
                    <RmgLineBadge
                        name={attrs.randomId}
                        fg={MonoColour.white}
                        bg={attrs.randomId === 'undefined' ? '#000000' : '#19B3EA'}
                    />
                ),
            },
            {
                label: 'label',
                type: 'input',
                value: attrs.label ?? attrs.randomId,
                onChange: value => handleSetLabel(attrs, value),
                hidden: attrs.randomId === 'undefined',
            },
            {
                label: 'label',
                type: 'output',
                value: attrs.label ?? attrs.randomId,
                hidden: attrs.randomId !== 'undefined',
            },
            {
                label: 'type',
                type: 'custom',
                component: (
                    <RmgLineBadge
                        name={attrs.nodeType}
                        fg={MonoColour.white}
                        bg={attrs.nodeType === 'MiscNode' ? '#FF8651' : '#51BC00'}
                    />
                ),
            },
            {
                label: '',
                type: 'custom',
                component: (
                    <Flex direction="row">
                        <Button onClick={() => setOpenImport(attrs.randomId)}>
                            <MdUpload />
                        </Button>
                        <Button onClick={() => handleDownload(attrs)} isDisabled={attrs.randomId === 'undefined'}>
                            <MdDownload />
                        </Button>
                        <Button onClick={() => handleRemove(attrs.randomId)}>
                            <MdDelete />
                        </Button>
                    </Flex>
                ),
            },
        ];
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('Master Node Manager')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody>
                    {fields.map((field, i) => (
                        <RmgFields key={i} fields={field} />
                    ))}
                    <MasterImport
                        isOpen={!!openImport}
                        onClose={() => setOpenImport(undefined)}
                        onSubmit={handleReplace}
                    />
                </ModalBody>

                <ModalFooter>
                    <Button colorScheme="blue" variant="outline" mr="1" onClick={onClose}>
                        {t('close')}
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
};
