import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import { Button, useToast } from '@chakra-ui/react';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MdSettings, MdUpload } from 'react-icons/md';
import { AttrsProps } from '../../../constants/constants';
import { Node, NodeComponentProps } from '../../../constants/nodes';
import { defaultMasterTransform, MasterParam, MasterSvgsElem } from '../../../constants/master';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { openPaletteAppClip } from '../../../redux/runtime/runtime-slice';
import ThemeButton from '../../panels/theme-button';
import { MasterManager } from '../../page-header/master-manager';
import { MasterImport } from '../../page-header/master-import';

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
                        (t[key] as string).slice(1),
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

    const masterTransform = attrs.transform ?? defaultMasterTransform;

    return React.createElement(
        'g',
        { id: id, transform: `translate(${x}, ${y})`, ...gPointerEvents },
        attrs.randomId !== 'undefined' ? (
            <g
                transform={`translate(${masterTransform.translateX}, ${masterTransform.translateY}) scale(${masterTransform.scale}) rotate(${masterTransform.rotate})`}
            >
                {dfsCreateElement(attrs.svgs)}
            </g>
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
    label: 'Undefined',
    transform: defaultMasterTransform,
    nodeType: 'MiscNode',
    svgs: [],
    components: [],
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
    const [openManager, setOpenManager] = React.useState(false);

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
        const rid = p.id ? p.id : p.randomId;
        const param: MasterParam = {
            randomId: rid,
            label: p.label ?? rid,
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
        param.components.forEach((c, i) => {
            param.components[i].value = getComponentValue(c.id) ?? c.defaultValue;
        });
        if (param.color !== undefined) param.color.value = attrs.color ? attrs.color.value : param.color.defaultValue;
        handleAttrsUpdate(id, param);
    };

    const field: RmgFieldsField[] = [
        {
            type: 'output',
            label: t('panel.details.nodes.master.type'),
            value: attrs.label ?? attrs.randomId,
        },
        {
            type: 'custom',
            label: '',
            component: (
                <>
                    <Button onClick={() => setOpenImport(true)}>
                        <MdUpload />
                    </Button>
                    <Button onClick={() => setOpenManager(true)}>
                        <MdSettings />
                    </Button>
                </>
            ),
            oneLine: true,
        },
    ];

    const componentField: RmgFieldsField[] = attrs.components.map((c, i) => {
        const { label, type, defaultValue, value } = c;
        if (type === 'number' || type === 'text') {
            return {
                label: t(label),
                type: 'input',
                value: value ?? defaultValue,
                onChange: v => {
                    attrs.components[i].value = v;
                    handleAttrsUpdate(id, { ...attrs, components: attrs.components });
                },
            };
        } else if (type === 'switch') {
            return {
                label: t(label),
                type: 'switch',
                isChecked: (value ?? defaultValue) === 'true',
                onChange: v => {
                    attrs.components[i].value = v;
                    handleAttrsUpdate(id, { ...attrs, components: attrs.components });
                },
            };
        } else if (type === 'textarea') {
            return {
                label: t(label),
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
            <MasterImport isOpen={openImport} onClose={() => setOpenImport(false)} onSubmit={handleImportParam} />
            <MasterManager isOpen={openManager} onClose={() => setOpenManager(false)} />
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
