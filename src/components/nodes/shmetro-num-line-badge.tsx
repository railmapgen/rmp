import React from 'react';
import { CityCode, MonoColour } from '@railmapgen/rmg-palette-resources';
import { Theme } from '../../constants/constants';
import { MiscNodeType, Node, NodeComponentProps } from '../../constants/nodes';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/app/app-slice';
import { setRefresh } from '../../redux/runtime/runtime-slice';
import ThemeButton from '../panel/theme-button';
import ColourModal from '../panel/colour-modal/colour-modal';

const ShmetroNumLineBadge = (props: NodeComponentProps<ShmetroNumLineBadgeAttributes>) => {
    const { id, x, y, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const { num = defaultShmetroNumLineBadgeAttributes.num, color = defaultShmetroNumLineBadgeAttributes.color } =
        attrs ?? defaultShmetroNumLineBadgeAttributes;

    const numLineEl = React.useRef<SVGGElement | null>(null);
    const [bBox, setBBox] = React.useState({ width: 12 } as DOMRect);
    React.useEffect(() => setBBox(numLineEl.current!.getBBox()), [num, setBBox, numLineEl]);

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

    return React.useMemo(
        () => (
            <g id={id} transform={`translate(${x}, ${y})scale(2)`}>
                <rect fill={color[2]} x={0} width={bBox.width + 3} height="16" />
                <g ref={numLineEl}>
                    <text textAnchor="middle" x={(bBox.width + 3) / 2} y="14" fill={color[3]}>
                        {num}
                    </text>
                </g>
                <text x={bBox.width + 5} y="9" fontSize="10">
                    号线
                </text>
                <text x={bBox.width + 5} y="16" fontSize="6">
                    Line {num}
                </text>
                <rect
                    fill="white"
                    fillOpacity="0"
                    x={0}
                    width={bBox.width + 3}
                    height={10}
                    onPointerDown={onPointerDown}
                    onPointerMove={onPointerMove}
                    onPointerUp={onPointerUp}
                    style={{ cursor: 'move' }}
                />
            </g>
        ),
        [id, x, y, num, bBox, ...color, onPointerDown, onPointerMove, onPointerUp]
    );
};

/**
 * <ShmetroNumLineBadge /> specific props.
 */
export interface ShmetroNumLineBadgeAttributes {
    num: number;
    color: Theme;
}

const defaultShmetroNumLineBadgeAttributes: ShmetroNumLineBadgeAttributes = {
    num: 1,
    color: [CityCode.Shanghai, 'sh1', '#E4002B', MonoColour.white],
};

const Color = () => {
    const dispatch = useRootDispatch();
    const hardRefresh = React.useCallback(() => {
        dispatch(setRefresh());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, setRefresh, saveGraph]);
    const { selected } = useRootSelector(state => state.runtime);
    const selectedFirst = selected.at(0);
    const graph = React.useRef(window.graph);

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const handleChangeColor = (color: Theme) => {
        if (selectedFirst && graph.current.hasNode(selectedFirst)) {
            const attrs =
                graph.current.getNodeAttribute(selectedFirst, MiscNodeType.ShmetroNumLineBadge) ??
                defaultShmetroNumLineBadgeAttributes;
            attrs.color = color;
            graph.current.mergeNodeAttributes(selectedFirst, { [MiscNodeType.ShmetroNumLineBadge]: attrs });
            hardRefresh();
        }
    };

    const theme =
        selectedFirst &&
        graph.current.hasNode(selectedFirst) &&
        graph.current.getNodeAttribute(selectedFirst, 'type') === MiscNodeType.ShmetroNumLineBadge
            ? (
                  graph.current.getNodeAttribute(selectedFirst, MiscNodeType.ShmetroNumLineBadge) ??
                  defaultShmetroNumLineBadgeAttributes
              ).color
            : defaultShmetroNumLineBadgeAttributes.color;

    return (
        <>
            <ThemeButton theme={theme} onClick={() => setIsModalOpen(true)} />
            <ColourModal
                isOpen={isModalOpen}
                defaultTheme={theme}
                onClose={() => setIsModalOpen(false)}
                onUpdate={nextTheme => handleChangeColor(nextTheme)}
            />
        </>
    );
};

const ShmetroNumLineBadgeFields = [
    {
        type: 'input',
        label: 'panel.details.node.shmetroNumLineBadge.num',
        value: (attrs?: ShmetroNumLineBadgeAttributes) => (attrs ?? defaultShmetroNumLineBadgeAttributes).num,
        validator: (val: string) => !Number.isNaN(val),
        onChange: (val: string | number, attrs_: ShmetroNumLineBadgeAttributes | undefined) => {
            // set default value if switched from another type
            const attrs = attrs_ ?? defaultShmetroNumLineBadgeAttributes;
            // return if invalid
            if (Number.isNaN(val)) return attrs;
            // set value
            attrs.num = Number(val);
            // return modified attrs
            return attrs;
        },
    },
    {
        type: 'custom',
        component: <Color />,
    },
];

const ShmetroNumLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect fill="currentColor" x="2" y="4" width="10" height="16" />
        <text x="4" y="18" fill="white">
            1
        </text>
        <text x="14" y="10" fontSize="5">
            号线
        </text>
        <text x="14" y="18" fontSize="4">
            Line 1
        </text>
    </svg>
);

const shmetroNumLineBadge: Node<ShmetroNumLineBadgeAttributes> = {
    component: ShmetroNumLineBadge,
    icon: ShmetroNumLineBadgeIcon,
    defaultAttrs: defaultShmetroNumLineBadgeAttributes,
    // TODO: fix this
    // @ts-ignore-error
    fields: ShmetroNumLineBadgeFields,
    metadata: {
        displayName: 'panel.details.node.shmetroNumLineBadge.displayName',
        tags: [],
    },
};

export default shmetroNumLineBadge;
