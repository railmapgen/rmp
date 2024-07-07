import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import {
    Button,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalFooter,
    ModalHeader,
    ModalOverlay,
    useToast,
} from '@chakra-ui/react';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { AttrsProps } from '../../../constants/constants';
import { Node, NodeComponentProps } from '../../../constants/nodes';
import { MasterParam, MasterSvgsElem } from '../../../constants/master';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openPaletteAppClip } from '../../../redux/runtime/runtime-slice';
import ThemeButton from '../../panels/theme-button';

const MasterNode = (props: NodeComponentProps<MasterAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;

    const onPointerDown = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerDown(id, e),
        [id, handlePointerDown]
    );
    const onPointerMove = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerMove(id, e),
        [id, handlePointerMove]
    );
    const onPointerUp = React.useCallback(
        (e: React.PointerEvent<SVGElement>) => handlePointerUp(id, e),
        [id, handlePointerUp]
    );

    const calcFunc = (str: string, ...rest: string[]) => new Function(...rest, `return ${str}`);

    const modifyAttributes = <T extends Record<string, any>>(t: T, varValues: string[], varType: string[]): T => {
        const modifiedAttrs: Partial<T> = {};

        for (const key in t) {
            if (Object.prototype.hasOwnProperty.call(t, key)) {
                try {
                    modifiedAttrs[key] = calcFunc(
                        t[key],
                        ...attrs.components.map(s => s.label),
                        'color'
                    )(
                        ...varValues.map((v, varI) =>
                            varType[varI] === 'number' && !Number.isNaN(Number(v)) ? Number(v) : v
                        ),
                        attrs.color ? attrs.color.value ?? attrs.color.defaultValue : ''
                    );
                } catch (e) {
                    modifiedAttrs[key] = '' as any;
                }
            }
        }

        return modifiedAttrs as T;
    };

    const gPointerEvents =
        attrs.nodeType === 'MiscNode' ? { onPointerDown, onPointerMove, onPointerUp, style: { cursor: 'move' } } : {};

    const dfsCreateElement = (svgs: MasterSvgsElem[]): ReactNode => {
        return svgs.map(s => {
            const coreProps =
                attrs.nodeType === 'Station' && attrs.core && attrs.core === s.id
                    ? { id: `stn_core_${id}`, onPointerDown, onPointerMove, onPointerUp, style: { cursor: 'move' } }
                    : {};
            const calcAttrs = modifyAttributes(
                s.attrs,
                attrs.components.map(s => s.value),
                attrs.components.map(s => s.type)
            );
            return (
                <g key={s.id} transform={`translate(${calcAttrs.x ?? 0}, ${calcAttrs.y ?? 0})`}>
                    {React.createElement(
                        s.type,
                        {
                            ...calcAttrs,
                            x: 0,
                            y: 0,
                            ...coreProps,
                        },
                        s.children
                            ? dfsCreateElement(s.children)
                            : '_rmp_children_text' in calcAttrs
                              ? (calcAttrs._rmp_children_text as string)
                              : null
                    )}
                </g>
            );
        });
    };
    return React.createElement(
        'g',
        { id: id, transform: `translate(${x}, ${y})`, ...gPointerEvents },
        attrs.randomId !== 'undefined' ? (
            dfsCreateElement(attrs.svgs)
        ) : (
            <>
                <circle r={5} />
                <text x={-3.75} y={3} fill="white" fontSize="8" fontWeight="bold">
                    M
                </text>
            </>
        )
    );
};

export interface MasterAttributes extends MasterParam {}

const defaultMasterAttributes: MasterAttributes = {
    randomId: 'undefined',
    nodeType: 'MiscNode',
    svgs: [],
    components: [],
};

export const ImportMaster = (props: { isOpen: boolean; onClose: () => void; onSubmit: (s: string) => void }) => {
    const { isOpen, onClose, onSubmit } = props;
    const { t } = useTranslation();

    const [param, setParam] = React.useState('');
    const [error, setError] = React.useState('');
    const fields: RmgFieldsField[] = [
        {
            type: 'textarea',
            label: t('Paste json from RMP style generator'),
            value: param.toString(),
            onChange: val => setParam(val),
            minW: 'full',
        },
    ];

    const handleChange = () => {
        try {
            onSubmit(param);
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

                <ModalBody>
                    <RmgFields fields={fields} />
                    <span style={{ color: 'red' }}>{error}</span>
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

const attrsComponent = (props: AttrsProps<MasterAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const dispatch = useRootDispatch();
    const toast = useToast();
    const {
        paletteAppClip: { output },
    } = useRootSelector(state => state.runtime);
    const { t } = useTranslation();
    const [openImport, setOpenImport] = React.useState(false);

    const getComponentValue = (query: string) => {
        attrs.components.forEach(c => {
            if (c.id === query) {
                return c.value ?? c.defaultValue;
            }
        });
        return undefined;
    };

    const handleImportParam = (s: string) => {
        const p = JSON.parse(s);
        const param: MasterParam = {
            randomId: p.id,
            nodeType: p.type,
            svgs: p.svgs,
            components: p.components,
            color: p.color,
            core: p.core,
            version: p.version,
        };
        if (!param.version) {
            toast({
                title: 'Outdated configuration!',
                status: 'error' as const,
                duration: 9000,
                isClosable: true,
            });
            return;
        }
        param.components.forEach((c, i) => {
            param.components[i].value = getComponentValue(c.id) ?? c.defaultValue;
        });
        param.svgs.forEach((s, i) => {
            for (const key in s.attrs) {
                if (Object.prototype.hasOwnProperty.call(s.attrs, key)) {
                    param.svgs[i].attrs[key] = s.attrs[key].slice(1);
                }
            }
        });
        if (param.color !== undefined) param.color.value = attrs.color ? attrs.color.value : param.color.defaultValue;
        handleAttrsUpdate(id, param);
    };

    const field: RmgFieldsField[] = [
        {
            type: 'output',
            label: 'Master Type',
            value: attrs.randomId,
        },
        {
            type: 'custom',
            label: '',
            component: <Button onClick={() => setOpenImport(true)}>Upload</Button>,
            oneLine: true,
        },
    ];

    const componentField: RmgFieldsField[] = attrs.components.map((c, i) => {
        const { label, type, defaultValue, value } = c;
        if (type === 'number' || type === 'text') {
            return {
                label: label,
                type: 'input',
                value: value ?? defaultValue,
                onChange: v => {
                    attrs.components[i].value = v;
                    handleAttrsUpdate(id, { ...attrs, components: attrs.components });
                },
            };
        } else if (type === 'switch') {
            return {
                label: label,
                type: 'switch',
                isChecked: (value ?? defaultValue) === 'true',
                onChange: v => {
                    attrs.components[i].value = v;
                    handleAttrsUpdate(id, { ...attrs, components: attrs.components });
                },
            };
        } else if (type === 'textarea') {
            return {
                label: label,
                type: 'textarea',
                value: value ?? defaultValue,
                onChange: v => {
                    attrs.components[i].value = v;
                    handleAttrsUpdate(id, { ...attrs, components: attrs.components });
                },
            };
        } else {
            return {
                type: 'input',
                label: 'undefined',
                value: 'none',
            };
        }
    });

    const [isThemeRequested, setIsThemeRequested] = React.useState(false);
    React.useEffect(() => {
        if (attrs.color && isThemeRequested && output) {
            attrs.color.value = output;
            handleAttrsUpdate(id, { ...attrs, color: attrs.color });
            setIsThemeRequested(false);
        }
    }, [output?.toString()]);

    const colorField: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: (
                <ThemeButton
                    theme={attrs.color?.value}
                    onClick={() => {
                        setIsThemeRequested(true);
                        dispatch(openPaletteAppClip(attrs.color?.value));
                    }}
                />
            ),
        },
    ];

    return (
        <>
            <RmgFields fields={field} />
            {attrs.randomId !== 'undefined' && <RmgFields fields={componentField} minW="full" />}
            {attrs.randomId !== 'undefined' && attrs.color !== undefined && (
                <RmgFields fields={colorField} minW="full" />
            )}
            <ImportMaster isOpen={openImport} onClose={() => setOpenImport(false)} onSubmit={handleImportParam} />
        </>
    );
};

const masterIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="6" stroke="currentColor" fill="none" />
        <text x="8.5" y="15" fill="currentColor" fontSize="8">
            M
        </text>
    </svg>
);

const masterNode: Node<MasterAttributes> = {
    component: MasterNode,
    icon: masterIcon,
    defaultAttrs: defaultMasterAttributes,
    attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.master.displayName',
        tags: [],
    },
};

export default masterNode;