import { Translation } from '@railmapgen/rmg-translate';
import { Node, NodeComponentProps } from '../../../constants/nodes';
import useTranslatedName from '../../../util/hooks';
import text, { TextAttributes, defaultTextAttributes } from './text';

const I18nText = (props: NodeComponentProps<I18nTextAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const translateName = useTranslatedName();

    attrs.content = translateName(attrs.contents);

    const Text = text.component;

    return (
        <Text
            id={id}
            x={x}
            y={y}
            handlePointerDown={handlePointerDown}
            handlePointerMove={handlePointerMove}
            handlePointerUp={handlePointerUp}
            attrs={attrs}
        />
    );
};

/**
 * I18nText specific props.
 */
export interface I18nTextAttributes extends TextAttributes {
    contents: Translation;
}

const defaultI18nTextAttributes: I18nTextAttributes = {
    contents: {},
    ...defaultTextAttributes,
};

const i18nText: Node<I18nTextAttributes> = {
    component: I18nText,
    icon: text.icon,
    defaultAttrs: defaultI18nTextAttributes,
    // @ts-expect-error The additional attributes do not require any inputs.
    attrsComponent: text.attrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.i18nText.displayName',
        tags: [],
    },
};

export default i18nText;
