import React from 'react';
import { MenuLayerData } from '../../util/hooks/use-nearby-elements';

interface RadialTouchMenuProps {
    /** Menu data organized in layers from inner to outer */
    data: MenuLayerData[];
    /** Center position in screen coordinates */
    position: { x: number; y: number };
    /** Callback when menu should be closed */
    onClose: () => void;
    /** Whether menu is visible */
    visible: boolean;
}

/**
 * Multi-layer radial touch menu component.
 * Renders up to 5 concentric rings around a center point.
 * Each ring represents a category of elements (stations, nodes, lines, operations).
 */
export const RadialTouchMenu: React.FC<RadialTouchMenuProps> = ({ data, position, onClose, visible }) => {
    if (!visible || data.length === 0) {
        return null;
    }

    // Menu configuration
    const CENTER_RADIUS = 20;
    const LAYER_THICKNESS = 50;
    const MENU_SIZE = CENTER_RADIUS + LAYER_THICKNESS * Math.min(data.length, 5) + 20;

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
                <circle
                    cx={MENU_SIZE}
                    cy={MENU_SIZE}
                    r={CENTER_RADIUS}
                    fill="rgba(255, 255, 255, 0.9)"
                    stroke="rgba(0, 0, 0, 0.2)"
                    strokeWidth="1"
                    filter="url(#shadow)"
                />

                {/* Render layers */}
                {data.slice(0, 5).map((layer, layerIndex) => {
                    const innerRadius = CENTER_RADIUS + layerIndex * LAYER_THICKNESS;
                    const outerRadius = innerRadius + LAYER_THICKNESS;
                    const itemCount = layer.items.length;
                    const angleStep = (2 * Math.PI) / itemCount;

                    return (
                        <g key={layerIndex}>
                            {/* Layer background ring */}
                            <path
                                d={`M ${MENU_SIZE - outerRadius} ${MENU_SIZE} 
                                    A ${outerRadius} ${outerRadius} 0 1 1 ${MENU_SIZE + outerRadius} ${MENU_SIZE}
                                    A ${outerRadius} ${outerRadius} 0 1 1 ${MENU_SIZE - outerRadius} ${MENU_SIZE}
                                    M ${MENU_SIZE - innerRadius} ${MENU_SIZE}
                                    A ${innerRadius} ${innerRadius} 0 1 0 ${MENU_SIZE + innerRadius} ${MENU_SIZE}
                                    A ${innerRadius} ${innerRadius} 0 1 0 ${MENU_SIZE - innerRadius} ${MENU_SIZE}`}
                                fill={`hsl(${layerIndex * 60}, 20%, 95%)`}
                                stroke="rgba(0, 0, 0, 0.1)"
                                strokeWidth="1"
                                filter="url(#shadow)"
                                fillRule="evenodd"
                            />

                            {/* Layer items */}
                            {layer.items.map((item, itemIndex) => {
                                const angle = itemIndex * angleStep - Math.PI / 2; // Start from top
                                const itemRadius = (innerRadius + outerRadius) / 2;
                                const x = MENU_SIZE + itemRadius * Math.cos(angle);
                                const y = MENU_SIZE + itemRadius * Math.sin(angle);

                                // Create sector path for touch area
                                const startAngle = angle - angleStep / 2;
                                const endAngle = angle + angleStep / 2;

                                const startX = MENU_SIZE + innerRadius * Math.cos(startAngle);
                                const startY = MENU_SIZE + innerRadius * Math.sin(startAngle);
                                const endX = MENU_SIZE + innerRadius * Math.cos(endAngle);
                                const endY = MENU_SIZE + innerRadius * Math.sin(endAngle);

                                const outerStartX = MENU_SIZE + outerRadius * Math.cos(startAngle);
                                const outerStartY = MENU_SIZE + outerRadius * Math.sin(startAngle);
                                const outerEndX = MENU_SIZE + outerRadius * Math.cos(endAngle);
                                const outerEndY = MENU_SIZE + outerRadius * Math.sin(endAngle);

                                const largeArcFlag = angleStep > Math.PI ? 1 : 0;

                                const sectorPath = `M ${startX} ${startY}
                                                   L ${outerStartX} ${outerStartY}
                                                   A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${outerEndX} ${outerEndY}
                                                   L ${endX} ${endY}
                                                   A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${startX} ${startY}`;

                                return (
                                    <g key={itemIndex}>
                                        {/* Touch area */}
                                        <path
                                            d={sectorPath}
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
                                        <path
                                            d={sectorPath}
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
                                            fontSize="12"
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
                <text
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
                </text>
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
