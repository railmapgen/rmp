import React from 'react';
import { MenuLayerData, MenuCategory, MenuItemData } from '../../util/hooks/use-nearby-elements';

// Menu configuration
const CENTER_RADIUS = 20;
const QUADRANT_RADIUS = 80;
const MENU_SIZE = CENTER_RADIUS + QUADRANT_RADIUS + 20;

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
 * - Top-right: Misc nodes
 * - Bottom-left: Lines
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

    const handleBackgroundClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    const handleBackgroundTouch = (e: React.TouchEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    return (
        <div
            className="radial-touch-menu-overlay"
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
            onClick={handleBackgroundClick}
            onTouchStart={handleBackgroundTouch}
        >
            <svg
                width={MENU_SIZE * 2}
                height={MENU_SIZE * 2}
                style={{
                    position: 'absolute',
                    left: position.x - MENU_SIZE,
                    top: position.y - MENU_SIZE,
                    pointerEvents: 'none',
                }}
            >
                <defs>
                    <filter id="shadow">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" floodOpacity="0.3" />
                    </filter>
                </defs>

                {/* Center circle */}
                {/* <circle
                    cx={MENU_SIZE}
                    cy={MENU_SIZE}
                    r={CENTER_RADIUS}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.2)"
                    strokeWidth="1"
                    filter="url(#shadow)"
                /> */}

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

                    // Create quadrant sector path
                    const outerRadius = CENTER_RADIUS + QUADRANT_RADIUS;
                    const startX = MENU_SIZE + CENTER_RADIUS * Math.cos(quadrantAngleStart);
                    const startY = MENU_SIZE + CENTER_RADIUS * Math.sin(quadrantAngleStart);
                    const endX = MENU_SIZE + CENTER_RADIUS * Math.cos(quadrantAngleEnd);
                    const endY = MENU_SIZE + CENTER_RADIUS * Math.sin(quadrantAngleEnd);

                    const outerStartX = MENU_SIZE + outerRadius * Math.cos(quadrantAngleStart);
                    const outerStartY = MENU_SIZE + outerRadius * Math.sin(quadrantAngleStart);
                    const outerEndX = MENU_SIZE + outerRadius * Math.cos(quadrantAngleEnd);
                    const outerEndY = MENU_SIZE + outerRadius * Math.sin(quadrantAngleEnd);

                    const quadrantPath = `M ${startX} ${startY}
                                         L ${outerStartX} ${outerStartY}
                                         A ${outerRadius} ${outerRadius} 0 0 1 ${outerEndX} ${outerEndY}
                                         L ${endX} ${endY}
                                         A ${CENTER_RADIUS} ${CENTER_RADIUS} 0 0 0 ${startX} ${startY}`;

                    return (
                        <g key={category}>
                            {/* Quadrant background */}
                            <path
                                d={quadrantPath}
                                fill={quadrantColor}
                                stroke="rgba(0, 0, 0, 0.1)"
                                strokeWidth="1"
                                filter="url(#shadow)"
                                fillRule="evenodd"
                            />

                            {/* Quadrant items */}
                            {layerData.slice(0, 6).map((item, itemIndex) => {
                                // Position items within the quadrant
                                const itemAngle =
                                    quadrantAngleStart + Math.PI / 4 + (itemIndex - layerData.length / 2 + 0.5) * 0.2;
                                const itemRadius = (CENTER_RADIUS + outerRadius) / 2;
                                const x = MENU_SIZE + itemRadius * Math.cos(itemAngle);
                                const y = MENU_SIZE + itemRadius * Math.sin(itemAngle);

                                // Create smaller circular touch area for each item
                                const touchRadius = 15;

                                return (
                                    <g key={itemIndex}>
                                        {/* Touch area */}
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r={touchRadius}
                                            fill="transparent"
                                            style={{
                                                pointerEvents: 'auto',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() => handleItemClick(item.action)}
                                            onTouchStart={e => {
                                                e.preventDefault();
                                                handleItemClick(item.action);
                                            }}
                                        />

                                        {/* Item highlight on hover */}
                                        <circle
                                            cx={x}
                                            cy={y}
                                            r={touchRadius}
                                            fill="rgba(0, 123, 255, 0.1)"
                                            opacity="0"
                                            style={{
                                                transition: 'opacity 0.2s ease',
                                                pointerEvents: 'none',
                                            }}
                                            className="item-highlight"
                                        />

                                        {/* Item text */}
                                        <text
                                            x={x}
                                            y={y}
                                            textAnchor="middle"
                                            dominantBaseline="middle"
                                            fontSize="10"
                                            fill="#333"
                                            style={{
                                                pointerEvents: 'none',
                                                fontWeight: '500',
                                                userSelect: 'none',
                                            }}
                                        >
                                            {item.label}
                                        </text>
                                    </g>
                                );
                            })}
                        </g>
                    );
                })}

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

            <style>{`
                .radial-touch-menu-overlay .item-highlight {
                    opacity: 0;
                }
                .radial-touch-menu-overlay path:hover + .item-highlight {
                    opacity: 1;
                }
            `}</style>
        </div>
    );
};

export default RadialTouchMenu;
