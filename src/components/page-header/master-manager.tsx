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
} from '@chakra-ui/react';
import { RmgFields, RmgFieldsField, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { MdDelete, MdDownload, MdUpload } from 'react-icons/md';
import { MasterParam } from '../../constants/master';
import { MiscNodeType } from '../../constants/nodes';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/param/param-slice';
import { refreshNodesThunk } from '../../redux/runtime/runtime-slice';
import { downloadAs } from '../../util/download';
import { getMasterNodeTypes } from '../../util/graph';
import { MasterImport } from './master-import';

export const MasterManager = (props: { isOpen: boolean; onClose: () => void }) => {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();
    const {
        refresh: { nodes: refreshNodes },
    } = useRootSelector(state => state.runtime);
    const graph = React.useRef(window.graph);
    const dispatch = useRootDispatch();

    const [list, setList] = React.useState<MasterParam[]>([]);
    React.useEffect(() => {
        if (isOpen) {
            setList(getMasterNodeTypes(graph.current));
        }
    }, [isOpen, refreshNodes]);

    const [openImport, setOpenImport] = React.useState<string | undefined>(undefined);

    const handleReplace = (param: MasterParam) => {
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
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
    };

    const handleDownload = (p: MasterParam) => {
        const param = {
            id: p.randomId,
            type: p.nodeType,
            label: p.label,
            svgs: p.svgs,
            components: p.components,
            color: p.color,
            core: p.core,
            transform: p.transform,
            version: p.version,
        };
        param.components.forEach((c, i) => {
            param.components[i].value = c.defaultValue;
        });
        downloadAs(`RMP_Master_Node_${new Date().valueOf()}.json`, 'application/json', JSON.stringify(param));
    };

    const handleRemove = (type: string | undefined) => {
        graph.current
            .filterNodes(
                node =>
                    graph.current.getNodeAttribute(node, 'type') === MiscNodeType.Master &&
                    graph.current.getNodeAttributes(node)[MiscNodeType.Master]!.randomId === type
            )
            .forEach(node => {
                graph.current.dropNode(node);
            });
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
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
        dispatch(saveGraph(graph.current.export()));
        dispatch(refreshNodesThunk());
    };

    const fields = list.map(attrs => {
        const field: RmgFieldsField[] = [
            {
                label: t('header.settings.procedures.masterManager.id'),
                type: 'custom',
                component: (
                    <RmgLineBadge
                        name={attrs.randomId ?? 'undefined'}
                        fg={attrs.labelColorFg ?? MonoColour.white}
                        bg={attrs.labelColorBg ?? '#000000'}
                    />
                ),
            },
            {
                label: t('header.settings.procedures.masterManager.label'),
                type: 'input',
                value: attrs.label ?? t('panel.details.nodes.master.undefined'),
                onChange: value => handleSetLabel(attrs, value),
                hidden: !attrs.randomId,
            },
            {
                label: t('header.settings.procedures.masterManager.label'),
                type: 'output',
                value: attrs.label ?? t('panel.details.nodes.master.undefined'),
                hidden: !!attrs.randomId,
            },
            {
                label: t('header.settings.procedures.masterManager.type'),
                type: 'custom',
                component: (
                    <RmgLineBadge
                        name={t(`header.settings.procedures.masterManager.types.${attrs.nodeType}`)}
                        fg={MonoColour.white}
                        bg={attrs.nodeType === 'MiscNode' ? '#FF8651' : '#51BC00'}
                    />
                ),
            },
        ];
        return (
            <Flex width="100%" direction="row" key={attrs.randomId}>
                <RmgFields fields={field} minW="120px" />
                <Flex direction="row" mr="auto">
                    <Button onClick={() => setOpenImport(attrs.randomId)}>
                        <MdUpload />
                    </Button>
                    <Button onClick={() => handleDownload(attrs)} isDisabled={!attrs.randomId}>
                        <MdDownload />
                    </Button>
                    <Button onClick={() => handleRemove(attrs.randomId)}>
                        <MdDelete />
                    </Button>
                </Flex>
            </Flex>
        );
    });

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="xl" scrollBehavior="inside">
            <ModalOverlay />
            <ModalContent>
                <ModalHeader>{t('header.settings.procedures.masterManager.title')}</ModalHeader>
                <ModalCloseButton />

                <ModalBody width="100%">
                    {...fields}
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
