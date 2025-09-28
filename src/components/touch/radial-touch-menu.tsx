import React from 'react';
import { MenuLayerData, MenuCategory, MenuItemData } from '../../util/hooks/use-nearby-elements';

// Menu configuration
const LAYER_SIZE = 5; // Maximum number of layers supported
const CENTER_RADIUS = 20;
const QUADRANT_RADIUS = 40;
const MENU_SIZE = CENTER_RADIUS + QUADRANT_RADIUS * LAYER_SIZE + 20;

interface RadialTouchMenuProps {
    /** Menu data organized in layers from inner to outer */
    data: MenuLayerData;
    /** Center position in screen coordinates */
    position: { x: number; y: number };
    /** Callback when menu should be closed */
    onClose: () => void;
    /** Whether menu is visible */
    visible: boolean;
}

/**
 * Quadrant-based radial touch menu component.
 * Renders a circular menu divided into four quadrants:
 * - Top-left: Stations
 * - Top-right: Lines
 * - Bottom-left: Misc nodes
 * - Bottom-right: Operations
 */
export const RadialTouchMenu: React.FC<RadialTouchMenuProps> = ({ data, position, onClose, visible }) => {
    const elements = [...data[MenuCategory.STATION], ...data[MenuCategory.MISC_NODE], ...data[MenuCategory.LINE]];
    if (!visible || elements.length === 0) {
        return null;
    }

    const handleItemClick = (action: () => void) => {
        action();
        onClose();
    };

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                zIndex: 9999,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
            }}
            onTouchStart={onClose}
        >
            <svg
                width={MENU_SIZE * 2}
                height={MENU_SIZE * 2}
                style={{
                    position: 'absolute',
                    left: position.x - MENU_SIZE,
                    top: position.y - MENU_SIZE,
                }}
            >
                {/* Render quadrants */}
                {(Object.entries(data) as [MenuCategory, MenuItemData[]][]).map(([category, layerData]) => {
                    if (!layerData || layerData.length === 0) return null;

                    // Define quadrant positions based on category
                    let quadrantAngleStart: number;
                    let quadrantColor: string;

                    switch (category) {
                        case MenuCategory.STATION:
                            quadrantAngleStart = Math.PI; // Top-left (180°)
                            quadrantColor = 'hsl(220, 20%, 95%)'; // Blue tint
                            break;
                        case MenuCategory.LINE:
                            quadrantAngleStart = Math.PI / 2; // Bottom-left (270°)
                            quadrantColor = 'hsl(120, 20%, 95%)'; // Green tint
                            break;
                        case MenuCategory.MISC_NODE:
                            quadrantAngleStart = (3 * Math.PI) / 2; // Top-right (90°)
                            quadrantColor = 'hsl(60, 20%, 95%)'; // Yellow tint
                            break;
                        case MenuCategory.OPERATION:
                            quadrantAngleStart = 2 * Math.PI; // Bottom-right (0°)
                            quadrantColor = 'hsl(0, 20%, 95%)'; // Red tint
                            break;
                        default:
                            return null;
                    }

                    const quadrantAngleEnd = quadrantAngleStart + Math.PI / 2;

                    return (
                        <g key={category}>
                            {/* Quadrant background */}
                            {/* <path
                                d={quadrantPath}
                                fill={quadrantColor}
                                stroke="rgba(0, 0, 0, 0.1)"
                                strokeWidth="1"
                                fillRule="evenodd"
                            /> */}

                            {/* Quadrant items */}
                            {layerData.slice(0, LAYER_SIZE + 1).map((item, itemIndex) => {
                                // Position items within the quadrant
                                // const itemAngle =
                                //     quadrantAngleStart + Math.PI / 4 + (itemIndex - layerData.length / 2 + 0.5) * 0.2;
                                // const itemRadius = (CENTER_RADIUS + outerRadius) / 2;
                                // const x = MENU_SIZE + itemRadius * Math.cos(itemAngle);
                                // const y = MENU_SIZE + itemRadius * Math.sin(itemAngle);

                                // Create smaller circular touch area for each item
                                // const touchRadius = 15;

                                // Create quadrant sector path
                                const innerRadius = CENTER_RADIUS + itemIndex * QUADRANT_RADIUS;
                                const outerRadius = CENTER_RADIUS + (itemIndex + 1) * QUADRANT_RADIUS;
                                const startX = MENU_SIZE + innerRadius * Math.cos(quadrantAngleStart);
                                const startY = MENU_SIZE + innerRadius * Math.sin(quadrantAngleStart);
                                const endX = MENU_SIZE + innerRadius * Math.cos(quadrantAngleEnd);
                                const endY = MENU_SIZE + innerRadius * Math.sin(quadrantAngleEnd);
                                const outerStartX = MENU_SIZE + outerRadius * Math.cos(quadrantAngleStart);
                                const outerStartY = MENU_SIZE + outerRadius * Math.sin(quadrantAngleStart);
                                const outerEndX = MENU_SIZE + outerRadius * Math.cos(quadrantAngleEnd);
                                const outerEndY = MENU_SIZE + outerRadius * Math.sin(quadrantAngleEnd);
                                const quadrantPath = `M ${startX} ${startY}
                                         L ${outerStartX} ${outerStartY}
                                         A ${outerRadius} ${outerRadius} 0 0 1 ${outerEndX} ${outerEndY}
                                         L ${endX} ${endY}
                                         A ${innerRadius} ${innerRadius} 0 0 0 ${startX} ${startY}`;

                                const textRadius = CENTER_RADIUS + (itemIndex + 0.5) * QUADRANT_RADIUS;
                                const textStartX = MENU_SIZE + textRadius * Math.cos(quadrantAngleStart);
                                const textStartY = MENU_SIZE + textRadius * Math.sin(quadrantAngleStart);
                                const textEndX = MENU_SIZE + textRadius * Math.cos(quadrantAngleEnd);
                                const textEndY = MENU_SIZE + textRadius * Math.sin(quadrantAngleEnd);
                                const textPath = `M ${textStartX} ${textStartY}
                                    A ${textRadius} ${textRadius} 0 0 1 ${textEndX} ${textEndY}`;

                                // const textPath = `M ${MENU_SIZE + ((innerRadius + outerRadius) / 2) * Math.cos(quadrantAngleStart)} ${
                                //     MENU_SIZE + ((innerRadius + outerRadius) / 2) * Math.sin(quadrantAngleStart)
                                // } A ${(innerRadius + outerRadius) / 2} ${(innerRadius + outerRadius) / 2} 0 0 1 ${
                                //     MENU_SIZE + ((innerRadius + outerRadius) / 2) * Math.cos(quadrantAngleEnd)
                                // } ${MENU_SIZE + ((innerRadius + outerRadius) / 2) * Math.sin(quadrantAngleEnd)}`;

                                return (
                                    <g key={item.elementId} onPointerDown={() => handleItemClick(item.action)}>
                                        <path
                                            d={quadrantPath}
                                            fill={quadrantColor}
                                            stroke="rgba(0, 0, 0, 0.1)"
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
                                                // textLength="10%"
                                                lengthAdjust="spacingAndGlyphs"
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
                    cx={MENU_SIZE}
                    cy={MENU_SIZE}
                    r={CENTER_RADIUS}
                    fill="white"
                    stroke="rgba(0, 0, 0, 0.2)"
                    strokeWidth="1"
                    onTouchStart={onClose}
                />

                {/* Center label */}
                {/* <text
                    x={MENU_SIZE}
                    y={MENU_SIZE}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fontSize="10"
                    fill="#666"
                    style={{
                        pointerEvents: 'none',
                        userSelect: 'none',
                    }}
                >
                    Touch
                </text> */}
            </svg>
        </div>
    );
};

export default RadialTouchMenu;
