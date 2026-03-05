import { Button, Flex, IconButton, Spacer } from '@chakra-ui/react';
import { RmgFields, RmgFieldsField, RmgLabel, RmgLineBadge } from '@railmapgen/rmg-components';
import { MonoColour } from '@railmapgen/rmg-palette-resources';
import React, { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { MdSettings, MdUpload } from 'react-icons/md';
import { AttrsProps, Theme } from '../../../constants/constants';
import { defaultMasterTransform, MasterParam, MasterSvgsElem } from '../../../constants/master';
import { Node, NodeComponentProps } from '../../../constants/nodes';
import { usePaletteTheme } from '../../../util/hooks';
import { MasterImport } from '../../page-header/master-import';
import { MasterManager } from '../../page-header/master-manager';
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
                        (t[key] as string).slice(1),
                        ...attrs.components.map(s => s.label),
                        'color'
                    )(
                        ...varValues.map((v, varI) =>
                            varType[varI] === 'number' && !Number.isNaN(Number(v)) ? Number(v) : v
                        ),
                        attrs.color ? (attrs.color.value ?? attrs.color.defaultValue) : ''
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

    /**
     * Fix #843: We add an ID filter to apply style to class only under this ID.
     *   In node A, <style> .cls1{ fill: white } </style>
     *   In node B, <style> .cls1{ fill: black } </style>
     *   There is a conflict of styles between A and B.
     *   So we add selector #ID for them.
     *   e.g.  .cls-1 { ... }  =>  #A .cls-1 { ... }
     * */
    const updateCSS = (cssString: string) => {
        return cssString.replace(/(^|,)\s*([^{},]+)/g, `$1 #${id} $2`);
    };

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
                            : !('_rmp_children_text' in calcAttrs)
                              ? null
                              : s.type === 'style'
                                ? updateCSS(calcAttrs._rmp_children_text)
                                : (calcAttrs._rmp_children_text as string)
                    )}
                </g>
            );
        });
    };

    const masterTransform = attrs.transform ?? defaultMasterTransform;

    const elements = React.useMemo(() => dfsCreateElement(attrs.svgs), [JSON.stringify(attrs)]);

    return React.createElement(
        'g',
        { id: id, transform: `translate(${x}, ${y})`, ...gPointerEvents },
        attrs.randomId ? (
            <g
                transform={`translate(${masterTransform.translateX}, ${masterTransform.translateY}) scale(${masterTransform.scale}) rotate(${masterTransform.rotate})`}
            >
                {elements}
            </g>
        ) : (
            <g>
                <circle r="5.5" />
                <g transform="translate(-4.7, -5) scale(0.8)">
                    <polygon
                        points="6,1 7.5,4.25 11,4.65 8.5,7.1 9.2,10.75 6,9 2.8,10.75 3.5,7.1 1,4.65 4.5,4.25"
                        fill="white"
                    />
                </g>
            </g>
        )
    );
};

export interface MasterAttributes extends MasterParam {}

const defaultMasterAttributes: MasterAttributes = {
    randomId: undefined,
    label: undefined,
    transform: defaultMasterTransform,
    nodeType: 'MiscNode',
    svgs: [],
    components: [],
};

const attrsComponent = (props: AttrsProps<MasterAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;
    const { t } = useTranslation();
    const [openImport, setOpenImport] = React.useState(false);
    const [openManager, setOpenManager] = React.useState(false);

    const getComponentValue = (query: string) => {
        const p = attrs.components.find(c => c.id === query);
        return p ? (p.value ?? p.defaultValue) : undefined;
    };

    const handleImportParam = (param: MasterParam) => {
        param.components.forEach((c, i) => {
            param.components[i].value = getComponentValue(c.id) ?? c.defaultValue;
        });
        if (param.color !== undefined) param.color.value = attrs.color ? attrs.color.value : param.color.defaultValue;
        handleAttrsUpdate(id, param);
    };

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
                isChecked: value !== undefined ? !!value : defaultValue,
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

    const handleChangeColor = (theme: Theme) => {
        if (attrs.color) {
            attrs.color.value = theme;
            handleAttrsUpdate(id, { ...attrs, color: attrs.color });
        }
    };

    const { theme, requestThemeChange } = usePaletteTheme({
        theme: attrs.color?.value,
        onThemeApplied: handleChangeColor,
    });

    const colorField: RmgFieldsField[] = [
        {
            type: 'custom',
            label: t('color'),
            component: <ThemeButton theme={theme} onClick={requestThemeChange} />,
        },
    ];

    return (
        <>
            <Flex direction="row" mr="auto" width="100%">
                <RmgLabel width="100%" overflow="hidden" label={t('panel.details.nodes.master.type')}>
                    <Flex width="100%" overflow="hidden">
                        <RmgLineBadge
                            name={attrs.label ?? t('panel.details.nodes.master.undefined')}
                            fg={attrs.labelColorFg ?? MonoColour.white}
                            bg={attrs.labelColorBg ?? '#000000'}
                            sx={{
                                display: 'inline-block',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                            }}
                            mr={1}
                        />
                        <RmgLineBadge
                            name={attrs.randomId ?? 'UNDEFINED'}
                            fg={MonoColour.white}
                            bg={attrs.randomId ? '#19B3EA' : '#000000'}
                            sx={{ display: 'inline-block' }}
                            mr={1}
                        />
                    </Flex>
                </RmgLabel>
                <Spacer />
                <IconButton icon={<MdUpload />} onClick={() => setOpenImport(true)} aria-label="upload" />
            </Flex>
            <Button width="100%" leftIcon={<MdSettings />} onClick={() => setOpenManager(true)}>
                {t('header.settings.procedures.masterManager.title')}
            </Button>
            {attrs.randomId && <RmgFields fields={componentField} minW="full" />}
            {attrs.randomId && attrs.color !== undefined && <RmgFields fields={colorField} minW="full" />}
            <MasterImport isOpen={openImport} onClose={() => setOpenImport(false)} onSubmit={handleImportParam} />
            <MasterManager isOpen={openManager} onClose={() => setOpenManager(false)} />
        </>
    );
};

const masterIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <circle cx="12" cy="12" r="6" stroke="currentColor" fill="none" />
        <g transform="translate(7.25, 7) scale(0.8)">
            <polygon
                points="6,1 7.5,4.25 11,4.65 8.5,7.1 9.2,10.75 6,9 2.8,10.75 3.5,7.1 1,4.65 4.5,4.25"
                fill="currentColor"
            />
        </g>
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
