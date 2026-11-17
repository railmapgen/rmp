import React from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { closeRadialTouchMenu } from '../../redux/runtime/runtime-slice';
import { MenuCategory, type MenuItemData, type MenuLayerData, TOUCH_RADIUS } from '../../constants/touch';

export { defaultRadialTouchMenuState } from '../../constants/touch';
export type { RadialTouchMenuState } from '../../constants/touch';

// Menu configuration
const LAYER_SIZE = 5; // Maximum number of layers supported
const CENTER_RADIUS = TOUCH_RADIUS * 1.5;
const QUADRANT_RADIUS = 36;
const SCREEN_MARGIN = 8;
const NOMINAL_SCALE = 1.2;

export interface RadialTouchMenuViewport {
    width: number;
    height: number;
    x: number;
    y: number;
    zoom: number;
}

interface RadialTouchMenuProps {
    highlightedItem?: string;
    viewport?: RadialTouchMenuViewport;
}

/** Fit the populated quadrants while keeping the original interaction position unchanged. */
export const getRadialTouchMenuLayout = (
    data: MenuLayerData,
    position: { x: number; y: number },
    zoom: number,
    viewport?: RadialTouchMenuViewport
) => {
    if (!viewport || viewport.width <= 0 || viewport.height <= 0 || viewport.zoom <= 0) {
        return { position, scale: (NOMINAL_SCALE * zoom) / 100 };
    }

    const radius = (category: MenuCategory) =>
        CENTER_RADIUS + Math.min(data[category].length, LAYER_SIZE + 1) * QUADRANT_RADIUS + 1;
    const left = Math.max(radius(MenuCategory.STATION), radius(MenuCategory.LINE));
    const right = Math.max(radius(MenuCategory.MISC_NODE), radius(MenuCategory.OPERATION));
    const top = Math.max(radius(MenuCategory.STATION), radius(MenuCategory.MISC_NODE));
    const bottom = Math.max(radius(MenuCategory.LINE), radius(MenuCategory.OPERATION));
    const marginX = Math.min(SCREEN_MARGIN, viewport.width / 2);
    const marginY = Math.min(SCREEN_MARGIN, viewport.height / 2);
    const screenScale = Math.min(
        NOMINAL_SCALE,
        (viewport.width - marginX * 2) / (left + right),
        (viewport.height - marginY * 2) / (top + bottom)
    );
    const screenX = ((position.x - viewport.x) * 100) / viewport.zoom;
    const screenY = ((position.y - viewport.y) * 100) / viewport.zoom;
    const centerX = Math.max(
        marginX + left * screenScale,
        Math.min(screenX, viewport.width - marginX - right * screenScale)
    );
    const centerY = Math.max(
        marginY + top * screenScale,
        Math.min(screenY, viewport.height - marginY - bottom * screenScale)
    );

    return {
        position: {
            x: viewport.x + (centerX * viewport.zoom) / 100,
            y: viewport.y + (centerY * viewport.zoom) / 100,
        },
        scale: (screenScale * viewport.zoom) / 100,
    };
};

/**
 * Quadrant-based radial touch menu component.
 * Renders a circular menu divided into four quadrants:
 * - Top-left: Stations
 * - Top-right: Misc nodes
 * - Bottom-left: Lines
 * - Bottom-right: Operations
 */
export const RadialTouchMenu: React.FC<RadialTouchMenuProps> = ({ highlightedItem, viewport }) => {
    const dispatch = useRootDispatch();
    const { svgViewBoxZoom } = useRootSelector(state => state.param.present);
    const { visible, position, data } = useRootSelector(state => state.runtime.radialTouchMenu);

    const elements = [...data[MenuCategory.STATION], ...data[MenuCategory.MISC_NODE], ...data[MenuCategory.LINE]];
    if (!visible || elements.length === 0) {
        return null;
    }

    const handleItemClick = (e: React.PointerEvent<SVGGElement>, action: () => void) => {
        e.stopPropagation(); // stop background event handler
        // A held touch is selected by the gesture controller on release.
        if (e.pointerType === 'touch') return;
        action();
        dispatch(closeRadialTouchMenu());
    };
    const layout = getRadialTouchMenuLayout(data, position, svgViewBoxZoom, viewport);

    return (
        <g
            transform={`translate(${layout.position.x}, ${layout.position.y})scale(${layout.scale})`}
            className="removeMe"
            data-touch-menu=""
        >
            {(Object.entries(data) as [MenuCategory, MenuItemData[]][]).map(([category, layerData]) => {
                if (!layerData || layerData.length === 0) return null;

                // Define quadrant positions based on category
                let quadrantAngleStart: number;
                let quadrantColor: string;

                switch (category) {
                    case MenuCategory.STATION:
                        quadrantAngleStart = Math.PI; // Top-left (180°)
                        quadrantColor = 'hsl(220, 30%, 85%)'; // Blue tint
                        break;
                    case MenuCategory.LINE:
                        quadrantAngleStart = Math.PI / 2; // Bottom-left (270°)
                        quadrantColor = 'hsl(120, 30%, 85%)'; // Green tint
                        break;
                    case MenuCategory.MISC_NODE:
                        quadrantAngleStart = (3 * Math.PI) / 2; // Top-right (90°)
                        quadrantColor = 'hsl(60, 30%, 85%)'; // Yellow tint
                        break;
                    case MenuCategory.OPERATION:
                        quadrantAngleStart = 2 * Math.PI; // Bottom-right (0°)
                        quadrantColor = 'hsl(0, 30%, 85%)'; // Red tint
                        break;
                    default:
                        return null;
                }

                const quadrantAngleEnd = quadrantAngleStart + Math.PI / 2;

                return (
                    <g key={category}>
                        {/* Quadrant items */}
                        {layerData.slice(0, LAYER_SIZE + 1).map((item, itemIndex) => {
                            const itemKey = `${category}:${itemIndex}`;
                            const isHighlighted = highlightedItem === itemKey;
                            // Create quadrant sector path
                            const innerRadius = CENTER_RADIUS + itemIndex * QUADRANT_RADIUS;
                            const outerRadius = CENTER_RADIUS + (itemIndex + 1) * QUADRANT_RADIUS;
                            const startX = innerRadius * Math.cos(quadrantAngleStart);
                            const startY = innerRadius * Math.sin(quadrantAngleStart);
                            const endX = innerRadius * Math.cos(quadrantAngleEnd);
                            const endY = innerRadius * Math.sin(quadrantAngleEnd);
                            const outerStartX = outerRadius * Math.cos(quadrantAngleStart);
                            const outerStartY = outerRadius * Math.sin(quadrantAngleStart);
                            const outerEndX = outerRadius * Math.cos(quadrantAngleEnd);
                            const outerEndY = outerRadius * Math.sin(quadrantAngleEnd);
                            const quadrantPath = `M ${startX} ${startY}
                                     L ${outerStartX} ${outerStartY}
                                     A ${outerRadius} ${outerRadius} 0 0 1 ${outerEndX} ${outerEndY}
                                     L ${endX} ${endY}
                                     A ${innerRadius} ${innerRadius} 0 0 0 ${startX} ${startY}`;

                            const textRadius = CENTER_RADIUS + (itemIndex + 0.5) * QUADRANT_RADIUS;
                            const textStartX = textRadius * Math.cos(quadrantAngleStart);
                            const textStartY = textRadius * Math.sin(quadrantAngleStart);
                            const textEndX = textRadius * Math.cos(quadrantAngleEnd);
                            const textEndY = textRadius * Math.sin(quadrantAngleEnd);
                            const textPath = `M ${textStartX} ${textStartY} A ${textRadius} ${textRadius} 0 0 1 ${textEndX} ${textEndY}`;
                            const arcLength = textRadius * (Math.PI / 2);

                            return (
                                <g
                                    key={item.elementId}
                                    data-touch-menu-item={itemKey}
                                    data-active={isHighlighted ? '' : undefined}
                                    onPointerDown={e => handleItemClick(e, item.action)}
                                >
                                    <path
                                        d={quadrantPath}
                                        fill={isHighlighted ? 'hsl(210, 85%, 75%)' : quadrantColor}
                                        stroke={isHighlighted ? '#1A365D' : 'rgba(0,0,0,0.1)'}
                                        strokeWidth={isHighlighted ? 2 : 1}
                                        fillRule="evenodd"
                                    />
                                    {/* Item text */}
                                    {/* <path id={item.label} d={textPath} stroke="red" strokeWidth="2" fill="none" /> */}
                                    <defs>
                                        <path id={item.label} d={textPath} />
                                    </defs>
                                    <text
                                        textAnchor="middle"
                                        dominantBaseline="middle"
                                        fontSize="10"
                                        fill="#333"
                                        style={{
                                            pointerEvents: 'none',
                                            userSelect: 'none',
                                        }}
                                    >
                                        <textPath
                                            startOffset="50%"
                                            // path={textPath} // Not supported in most browsers
                                            href={`#${item.label}`}
                                            // textLength={arcLength}
                                            // lengthAdjust="spacingAndGlyphs"
                                        >
                                            {item.label}
                                        </textPath>
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                );
            })}

            {/* Center circle */}
            <circle
                cx={0}
                cy={0}
                r={CENTER_RADIUS}
                fill="rgba(255, 255, 255, 0.3)"
                stroke="rgba(0,0,0,0.2)"
                strokeWidth="1"
                onPointerDown={e => {
                    e.stopPropagation();
                    if (e.pointerType !== 'touch') dispatch(closeRadialTouchMenu());
                }}
            />
        </g>
    );
};

export default RadialTouchMenu;
