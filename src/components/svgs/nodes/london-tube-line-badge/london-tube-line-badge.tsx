import React from 'react';
import { AttrsProps } from '../../../../constants/constants';
import { LINE_WIDTH } from '../../../../constants/lines';
import { Node, NodeComponentProps } from '../../../../constants/nodes';
import { getLangStyle, TextLanguage } from '../../../../util/fonts';
import LineFlagItemsField from './london-tube-line-badge-field';
import {
    createDefaultLondonTubeLineBadgeItem,
    getLondonTubeLineBadgeDisplayLines,
    getLondonTubeLineBadgeHeight,
    getLondonTubeLineBadgeSubtitle,
    LondonTubeLineBadgeAttributes,
    LondonTubeLineBadgeItem,
    normalizeLondonTubeLineBadgeItem,
} from './london-tube-line-badge-utils';

const TITLE_FONT_SIZE = 0.72 * LINE_WIDTH;
const SUBTITLE_FONT_SIZE = 0.42 * LINE_WIDTH;
const HORIZONTAL_PADDING = 0.7 * LINE_WIDTH;
const MIN_WIDTH = 7 * LINE_WIDTH;
const DOUBLE_LINE_CENTER_OFFSET = 0.35 * LINE_WIDTH;
const WALKING_SINGLE_TITLE_CENTER_Y = -0.18 * LINE_WIDTH;
const WALKING_MULTI_TITLE_START_Y = -0.62 * LINE_WIDTH;
const WALKING_TITLE_LINE_STEP = 0.62 * LINE_WIDTH;
const WALKING_SUBTITLE_GAP = 0.64 * LINE_WIDTH;

const defaultLondonTubeLineBadgeAttributes: LondonTubeLineBadgeAttributes = {
    items: [createDefaultLondonTubeLineBadgeItem()],
};

const areWidthsEqual = (prev: number[], next: number[]) =>
    prev.length === next.length && prev.every((width, index) => Math.abs(width - next[index]) < 0.01);

const getWalkingTitleYs = (lineCount: number) => {
    if (lineCount <= 1) {
        return [WALKING_SINGLE_TITLE_CENTER_Y];
    }

    return Array.from(
        { length: lineCount },
        (_, index) => WALKING_MULTI_TITLE_START_Y + index * WALKING_TITLE_LINE_STEP
    );
};

const LondonTubeLineBadge = (props: NodeComponentProps<LondonTubeLineBadgeAttributes>) => {
    const { id, attrs, handlePointerDown, handlePointerMove, handlePointerUp } = props;
    const items = React.useMemo(
        () => (attrs?.items ?? defaultLondonTubeLineBadgeAttributes.items).map(normalizeLondonTubeLineBadgeItem),
        [attrs]
    );

    const textRefs = React.useRef<(SVGGElement | null)[]>([]);
    const [contentWidths, setContentWidths] = React.useState<number[]>([]);

    const measure = React.useCallback(() => {
        const next = items.map((_, index) => {
            const textRef = textRefs.current[index];
            if (!textRef) return 0;

            try {
                return Number(textRef.getBBox().width.toFixed(2));
            } catch {
                return 0;
            }
        });

        setContentWidths(prev => (areWidthsEqual(prev, next) ? prev : next));
    }, [items]);

    React.useLayoutEffect(() => {
        measure();
        const rafId = requestAnimationFrame(measure);

        const fontSet = document.fonts;
        const handleLoadingDone = () => measure();
        void fontSet.ready.then(measure);
        fontSet.addEventListener('loadingdone', handleLoadingDone);

        return () => {
            cancelAnimationFrame(rafId);
            fontSet.removeEventListener('loadingdone', handleLoadingDone);
        };
    }, [measure]);

    const stackWidth = Math.max(MIN_WIDTH, ...contentWidths.map(width => width + 2 * HORIZONTAL_PADDING));
    const itemHeights = items.map(item => getLondonTubeLineBadgeHeight(item, LINE_WIDTH));
    const totalHeight = itemHeights.reduce((sum, height) => sum + height, 0);

    const itemCenters = React.useMemo(() => {
        let offsetY = -totalHeight / 2;
        return itemHeights.map(height => {
            const centerY = offsetY + height / 2;
            offsetY += height;
            return centerY;
        });
    }, [itemHeights, totalHeight]);

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

    if (items.length === 0 || totalHeight === 0) {
        return null;
    }

    return (
        <g>
            {items.map((item, index) => {
                const lines = getLondonTubeLineBadgeDisplayLines(item);
                const subtitle = item.kind === 'filled-walking' ? getLondonTubeLineBadgeSubtitle(item) : '';
                const walkingTitleYs = item.kind === 'filled-walking' ? getWalkingTitleYs(lines.length) : [];
                const walkingSubtitleY = walkingTitleYs.length
                    ? walkingTitleYs[walkingTitleYs.length - 1] + WALKING_SUBTITLE_GAP
                    : 0;

                return (
                    <g key={`${item.kind}-${index}`} transform={`translate(0, ${itemCenters[index]})`}>
                        <rect
                            x={-stackWidth / 2}
                            y={-itemHeights[index] / 2}
                            width={stackWidth}
                            height={itemHeights[index]}
                            fill={item.color[2]}
                        />

                        <g
                            ref={el => {
                                textRefs.current[index] = el;
                            }}
                            fill={item.color[3]}
                            textAnchor="middle"
                        >
                            {item.kind === 'filled-walking' ? (
                                <>
                                    {lines.map((line, lineIndex) => (
                                        <text
                                            key={`${line}-${lineIndex}`}
                                            {...getLangStyle(TextLanguage.tube)}
                                            y={walkingTitleYs[lineIndex]}
                                            fontSize={TITLE_FONT_SIZE}
                                            dominantBaseline="central"
                                        >
                                            {line}
                                        </text>
                                    ))}
                                    <text
                                        {...getLangStyle(TextLanguage.tube)}
                                        y={walkingSubtitleY}
                                        fontSize={SUBTITLE_FONT_SIZE}
                                        dominantBaseline="central"
                                    >
                                        {subtitle}
                                    </text>
                                </>
                            ) : lines.length > 1 ? (
                                <>
                                    <text
                                        {...getLangStyle(TextLanguage.tube)}
                                        y={-DOUBLE_LINE_CENTER_OFFSET}
                                        fontSize={TITLE_FONT_SIZE}
                                        dominantBaseline="central"
                                    >
                                        {lines[0]}
                                    </text>
                                    <text
                                        {...getLangStyle(TextLanguage.tube)}
                                        y={DOUBLE_LINE_CENTER_OFFSET}
                                        fontSize={TITLE_FONT_SIZE}
                                        dominantBaseline="central"
                                    >
                                        {lines[1]}
                                    </text>
                                </>
                            ) : (
                                <text
                                    {...getLangStyle(TextLanguage.tube)}
                                    y={0}
                                    fontSize={TITLE_FONT_SIZE}
                                    dominantBaseline="central"
                                >
                                    {lines[0] ?? ''}
                                </text>
                            )}
                        </g>
                    </g>
                );
            })}

            <rect
                id={`misc_node_connectable_${id}`}
                x={-stackWidth / 2}
                y={-totalHeight / 2}
                width={stackWidth}
                height={totalHeight}
                fill="transparent"
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                style={{ cursor: 'move' }}
            />
        </g>
    );
};

const londonTubeLineBadgeAttrsComponent = (props: AttrsProps<LondonTubeLineBadgeAttributes>) => {
    const { id, attrs, handleAttrsUpdate } = props;

    const items = (attrs.items ?? defaultLondonTubeLineBadgeAttributes.items).map(normalizeLondonTubeLineBadgeItem);

    const handleChange = (nextItems: LondonTubeLineBadgeItem[]) => {
        handleAttrsUpdate(id, {
            ...attrs,
            items: nextItems.map(normalizeLondonTubeLineBadgeItem),
        });
    };

    return <LineFlagItemsField items={items} onChange={handleChange} />;
};

const londonTubeLineBadgeIcon = (
    <svg viewBox="0 0 24 24" height={40} width={40} focusable={false}>
        <rect x="4" y="4" width="16" height="4" fill="#00782A" />
        <rect x="4" y="8" width="16" height="7" fill="#DC241F" />
        <rect x="4" y="15" width="16" height="5" fill="#3D3D3D" />
    </svg>
);

const londonTubeLineBadge: Node<LondonTubeLineBadgeAttributes> = {
    component: LondonTubeLineBadge,
    icon: londonTubeLineBadgeIcon,
    defaultAttrs: defaultLondonTubeLineBadgeAttributes,
    attrsComponent: londonTubeLineBadgeAttrsComponent,
    metadata: {
        displayName: 'panel.details.nodes.londonTubeLineBadge.displayName',
        tags: [],
    },
};

export type { LondonTubeLineBadgeAttributes } from './london-tube-line-badge-utils';
export default londonTubeLineBadge;
