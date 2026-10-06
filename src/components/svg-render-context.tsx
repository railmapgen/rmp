import { MultiDirectedGraph } from 'graphology';
import React from 'react';
import { EdgeAttributes, GraphAttributes, Id, NodeAttributes, RuntimeMode, StnId } from '../constants/constants';
import { StationAttributes, StationType } from '../constants/stations';
import { loadFont, TextLanguage } from '../util/fonts';
import { imageStoreIndexedDB } from '../util/image-store-indexed-db';

export type RenderGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

export interface SvgRenderContextValue {
    graph: RenderGraph;
    graphRefresh?: unknown;
    imageRefresh?: unknown;
    getImage: (id: string) => Promise<string | undefined>;
    ensureFont: (language: TextLanguage) => void;
    fontRevision?: number;
    selected?: Set<Id>;
    mode?: RuntimeMode;
    svgViewBoxZoom?: number;
    updateStationAttributes?: (id: StnId, type: StationType, attributes: StationAttributes) => void;
}

const fallback: SvgRenderContextValue = {
    get graph() {
        if (!window.graph) throw new Error('SvgRenderContext is missing a graph');
        return window.graph;
    },
    getImage: id => imageStoreIndexedDB.get(id),
    ensureFont: language => void loadFont(language),
};

const SvgRenderContext = React.createContext<SvgRenderContextValue>(fallback);

export const SvgRenderProvider = SvgRenderContext.Provider;
export const useSvgRenderContext = () => React.useContext(SvgRenderContext);
