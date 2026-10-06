import React from 'react';
import { MultiDirectedGraph } from 'graphology';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { blobToBase64 } from '../util/binary';
import { loadFont, Node2Font, TextLanguage } from '../util/fonts';
import { SvgRenderProvider } from '../components/svg-render-context';
import { timelineProjectDB } from './timeline-project-db';

export type TimelineGraph = MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>;

interface TimelineProjectContextValue {
    projectId: string;
    graph: TimelineGraph;
    languages: TextLanguage[];
    getAudio: (id: string) => Promise<Blob | undefined>;
    saveAudio: (id: string, blob: Blob, name?: string) => Promise<void>;
}

const TimelineProjectContext = React.createContext<TimelineProjectContextValue | undefined>(undefined);

export const useTimelineProjectContext = () => {
    const value = React.useContext(TimelineProjectContext);
    if (!value) throw new Error('TimelineProjectProvider is missing');
    return value;
};

export const useOptionalTimelineProjectContext = () => React.useContext(TimelineProjectContext);

const getGraphLanguages = (graph: TimelineGraph) => {
    const languages = new Set<TextLanguage>();

    graph.forEachNode((_id, attributes) => {
        for (const language of Node2Font[attributes.type] ?? []) languages.add(language);

        if (attributes.type === MiscNodeType.Text || attributes.type === MiscNodeType.I18nText) {
            const language = attributes[attributes.type]?.language;
            if (language) languages.add(language);
        }
    });

    return [...languages];
};

export function TimelineProjectProvider({
    projectId,
    graph,
    revision,
    children,
}: React.PropsWithChildren<{ projectId: string; graph: TimelineGraph; revision: unknown }>) {
    const imageCache = React.useRef(new Map<string, string>());
    const graphLanguages = React.useMemo(() => getGraphLanguages(graph), [graph]);
    const [requestedLanguages, setRequestedLanguages] = React.useState<TextLanguage[]>([]);
    const languages = React.useMemo(
        () => [...new Set([...graphLanguages, ...requestedLanguages])],
        [graphLanguages, requestedLanguages]
    );
    const [fontRevision, setFontRevision] = React.useState(0);
    const getImage = React.useCallback(
        async (id: string) => {
            const cached = imageCache.current.get(id);
            if (cached) return cached;
            const asset = await timelineProjectDB.getAsset(projectId, 'image', id);
            if (!asset) return undefined;
            const source = await blobToBase64(asset.blob);
            imageCache.current.set(id, source);
            return source;
        },
        [projectId]
    );
    const ensureFont = React.useCallback((language: TextLanguage) => {
        setRequestedLanguages(current => (current.includes(language) ? current : [...current, language]));
    }, []);
    React.useEffect(() => {
        let cancelled = false;

        void Promise.allSettled(languages.map(language => loadFont(language)))
            .then(() => document.fonts?.ready)
            .then(() => {
                if (!cancelled) setFontRevision(current => current + 1);
            });

        return () => {
            cancelled = true;
        };
    }, [languages]);
    const getAudio = React.useCallback(
        async (id: string) => (await timelineProjectDB.getAsset(projectId, 'audio', id))?.blob,
        [projectId]
    );
    const saveAudio = React.useCallback(
        (id: string, blob: Blob, name?: string) => timelineProjectDB.putAsset(projectId, 'audio', id, blob, name),
        [projectId]
    );

    const projectValue = React.useMemo(
        () => ({ projectId, graph, languages, getAudio, saveAudio }),
        [projectId, graph, languages, getAudio, saveAudio]
    );
    const renderValue = React.useMemo(
        () => ({ graph, graphRefresh: revision, imageRefresh: revision, getImage, ensureFont, fontRevision }),
        [graph, revision, getImage, ensureFont, fontRevision]
    );

    return (
        <TimelineProjectContext.Provider value={projectValue}>
            <SvgRenderProvider value={renderValue}>{children}</SvgRenderProvider>
        </TimelineProjectContext.Provider>
    );
}
