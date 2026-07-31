import React from 'react';
import { StnId } from '../constants/constants';
import { StationOverlayProps, StationType } from '../constants/stations';
import { useRootSelector } from '../redux';
import stations from './svgs/stations/stations';

/**
 * Mount the selected station type's direct-manipulation UI above the normal graph layers.
 *
 * Like line-path overlays, station overlays are opt-in and only appear for one unambiguous selection.
 */
export const StationOverlayLayer = () => {
    const selected = useRootSelector(state => state.runtime.selected);
    const svgViewBoxZoom = useRootSelector(state => state.param.svgViewBoxZoom);
    const svgViewBoxMin = useRootSelector(state => state.param.svgViewBoxMin);
    if (selected.size !== 1) return null;

    const [selectedId] = selected;
    if (!selectedId.startsWith('stn_') || !window.graph.hasNode(selectedId)) return null;

    const id = selectedId as StnId;
    const type = window.graph.getNodeAttribute(id, 'type') as StationType;
    const OverlayComponent = stations[type]?.overlayComponent as React.FC<StationOverlayProps> | undefined;
    if (!OverlayComponent) return null;

    return <OverlayComponent key={id} id={id} svgViewBoxZoom={svgViewBoxZoom} svgViewBoxMin={svgViewBoxMin} />;
};
