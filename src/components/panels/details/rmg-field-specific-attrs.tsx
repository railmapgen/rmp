import { RmgFields, RmgFieldsField } from '@railmapgen/rmg-components';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { NodeAttributes } from '../../../constants/constants';
import { useRootDispatch, useRootSelector } from '../../../redux';
import { setGlobalAlert, setRefreshEdges, setRefreshNodes } from '../../../redux/runtime/runtime-slice';
import { saveGraph } from '../../../redux/param/param-slice';

/**
 * @deprecated
 * A legacy slightly different `RmgFieldsField` format that could be used in `RmgFieldsFieldSpecificAttributes`.
 *
 * Use `attrsComponent` instead.
 */
export type RmgFieldsFieldDetail<T> = (Omit<RmgFieldsField, 'value' | 'disabledOptions' | 'onChange'> & {
    value?: (attrs?: T) => string | number;
    disabledOptions?: (attrs?: T) => (string | number)[];
    onChange?: (val: string | number, attrs_?: T) => T;
})[];

/**
 * @deprecated
 * An adapter accepts legacy `fields` and display them in the details panel.
 *
 * Use `attrsComponent` instead.
 */
export const RmgFieldsFieldSpecificAttributes = (props: {
    fields: RmgFieldsFieldDetail<any>;
    type?: 'type' | 'style';
}) => {
    const { t } = useTranslation();
    const dispatch = useRootDispatch();
    const { selected } = useRootSelector(state => state.runtime);
    const [selectedFirst] = selected;
    const graph = React.useRef(window.graph);

    const fields: RmgFieldsField[] = [];

    if (selected.size === 1 && graph.current.hasNode(selectedFirst)) {
        const type = graph.current.getNodeAttribute(selectedFirst, 'type');
        const attrs = graph.current.getNodeAttribute(selectedFirst, type) as any;
        fields.push(
            ...props.fields
                .filter(field => field.type !== 'custom')
                .map(
                    (field: any) =>
                        ({
                            type: field.type,
                            label: t(field.label),
                            value: field.value?.(attrs),
                            isChecked: field.isChecked?.(attrs),
                            hidden: field.hidden?.(attrs),
                            options: field.options,
                            disabledOptions: field.disabledOptions && field.disabledOptions(attrs),
                            validator: field.validator,
                            oneLine: field.oneLine,
                            // TODO: val could be string | number | boolean or others in different types.
                            onChange: (val: any) => {
                                let updatedAttrs: NodeAttributes;
                                try {
                                    updatedAttrs = field.onChange(val, attrs);
                                } catch (error) {
                                    dispatch(
                                        setGlobalAlert({
                                            status: 'error',
                                            message: t(`err-code.${error as string}`),
                                        })
                                    );
                                    return;
                                }

                                graph.current.mergeNodeAttributes(selectedFirst, {
                                    [type]: updatedAttrs,
                                });
                                dispatch(setRefreshNodes());
                                dispatch(saveGraph(graph.current.export()));
                            },
                        }) as RmgFieldsField
                ),
            // @ts-expect-error
            ...props.fields.filter(field => field.type === 'custom').map(field => ({ ...field, label: t(field.label) }))
        );
    }

    if (selected.size === 1 && graph.current.hasEdge(selectedFirst) && props.type !== 'style') {
        const type = graph.current.getEdgeAttribute(selectedFirst, 'type');
        const attrs = graph.current.getEdgeAttribute(selectedFirst, type);
        fields.push(
            ...props.fields.map(
                (field: any) =>
                    ({
                        // TODO: fix this
                        type: field.type,
                        label: t(field.label),
                        // @ts-ignore-error
                        value: field.value(attrs),
                        // @ts-ignore-error
                        options: field.options,
                        // @ts-ignore-error
                        disabledOptions: field.disabledOptions && field.disabledOptions(attrs),
                        // @ts-ignore-error
                        validator: field.validator,
                        onChange: (val: string | number) => {
                            graph.current.mergeEdgeAttributes(selectedFirst, {
                                // @ts-ignore-error
                                [type]: field.onChange(val, attrs),
                            });
                            // console.log(graph.current.getEdgeAttributes(selectedFirst));
                            dispatch(setRefreshEdges());
                            dispatch(saveGraph(graph.current.export()));
                        },
                    }) as RmgFieldsField
            )
        );
    }
    if (selected.size === 1 && graph.current.hasEdge(selectedFirst) && props.type === 'style') {
        const style = graph.current.getEdgeAttribute(selectedFirst, 'style');
        const styleAttrs = graph.current.getEdgeAttribute(selectedFirst, style);
        fields.push(
            ...props.fields
                .filter(field => field.type !== 'custom')
                .map(
                    (field: any) =>
                        ({
                            // TODO: fix this
                            type: field.type,
                            label: t(field.label),
                            // @ts-ignore-error
                            value: field.value(styleAttrs),
                            // @ts-ignore-error
                            options: field.options,
                            // @ts-ignore-error
                            disabledOptions: field.disabledOptions && field.disabledOptions(styleAttrs),
                            // @ts-ignore-error
                            validator: field.validator,
                            onChange: (val: string | number) => {
                                graph.current.mergeEdgeAttributes(selectedFirst, {
                                    // @ts-ignore-error
                                    [style]: field.onChange(val, styleAttrs),
                                });
                                // console.log(graph.current.getEdgeAttributes(selectedFirst));
                                dispatch(setRefreshEdges());
                                dispatch(saveGraph(graph.current.export()));
                            },
                        }) as RmgFieldsField
                ),
            // @ts-expect-error
            ...props.fields.filter(field => field.type === 'custom').map(field => ({ ...field, label: t(field.label) }))
        );
    }

    return <RmgFields fields={fields} minW={276} />;
};
