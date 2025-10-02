import React from 'react';
import { useRootDispatch, useRootSelector } from '../../redux';
import { closeRadialTouchMenu } from '../../redux/runtime/runtime-slice';
import {
    emptyMenuLayerData,
    MenuCategory,
    MenuItemData,
    MenuLayerData,
    TOUCH_RADIUS,
} from '../../util/graph-nearby-elements';

// Menu configuration
const LAYER_SIZE = 5; // Maximum number of layers supported
const CENTER_RADIUS = TOUCH_RADIUS;
const QUADRANT_RADIUS = 40;

export interface RadialTouchMenuState {
    visible: boolean;
    position: { x: number; y: number };
    data: MenuLayerData;
}

export const defaultRadialTouchMenuState: RadialTouchMenuState = {
    visible: false,
    position: { x: 0, y: 0 },
    data: emptyMenuLayerData,
};

/**
 * Quadrant-based radial touch menu component.
 * Renders a circular menu divided into four quadrants:
 * - Top-left: Stations
 * - Top-right: Lines
 * - Bottom-left: Misc nodes
 * - Bottom-right: Operations
 */
export const RadialTouchMenu: React.FC = () => {
    const dispatch = useRootDispatch();
    const { svgViewBoxZoom } = useRootSelector(state => state.param);
    const { visible, position, data } = useRootSelector(state => state.runtime.radialTouchMenu);

    const elements = [...data[MenuCategory.STATION], ...data[MenuCategory.MISC_NODE], ...data[MenuCategory.LINE]];
    if (!visible || elements.length === 0) {
        return null;
    }

    const handleItemClick = (e: React.PointerEvent<SVGGElement>, action: () => void) => {
        e.stopPropagation(); // stop background event handler
        action();
        dispatch(closeRadialTouchMenu());
    };

    return (
        <g
            transform={`translate(${position.x}, ${position.y})scale(${(0.8 * svgViewBoxZoom) / 100})`}
            className="removeMe"
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
                                <g key={item.elementId} onPointerDown={e => handleItemClick(e, item.action)}>
                                    <path
                                        d={quadrantPath}
                                        fill={quadrantColor}
                                        stroke="rgba(0,0,0,0.1)"
                                        strokeWidth="1"
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
                onPointerDown={() => dispatch(closeRadialTouchMenu())}
            />
        </g>
    );
};

export default RadialTouchMenu;
