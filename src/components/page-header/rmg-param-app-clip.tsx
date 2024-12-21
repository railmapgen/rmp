import { SystemStyleObject } from '@chakra-ui/react';
import { RmgAppClip } from '@railmapgen/rmg-components';
import rmgRuntime from '@railmapgen/rmg-runtime';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Events } from '../../constants/constants';
import { RMGParam } from '../../constants/rmg';
import { useRootDispatch, useRootSelector } from '../../redux';
import { saveGraph } from '../../redux/param/param-slice';
import { refreshEdgesThunk, refreshNodesThunk, setGlobalAlert } from '../../redux/runtime/runtime-slice';
import { getCanvasSize } from '../../util/helpers';
import { useWindowSize } from '../../util/hooks';
import { parseRmgParam } from '../../util/rmg-param-parser';

const CHANNEL_PREFIX = 'rmg-bridge--';

const styles: SystemStyleObject = {
    h: 500,
    maxH: '70%',

    '& iframe': {
        h: '100%',
        w: '100%',
    },
};

interface RmgAppClipProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function RmgParamAppClip(props: RmgAppClipProps) {
    const { isOpen, onClose } = props;
    const { t } = useTranslation();

    const {
        preference: { autoParallel },
    } = useRootSelector(state => state.app);
    const { svgViewBoxZoom, svgViewBoxMin } = useRootSelector(state => state.param);
    const dispatch = useRootDispatch();
    const isAllowAppTelemetry = rmgRuntime.isAllowAnalytics();

    const size = useWindowSize();
    const { height, width } = getCanvasSize(size);

    const graph = useRef(window.graph);

    const [appClipId] = useState(crypto.randomUUID());
    const frameUrl =
        '/rmg/#/import?' +
        new URLSearchParams({
            parentComponent: rmgRuntime.getAppName(),
            parentId: appClipId,
        });

    const refreshAndSave = useCallback(() => {
        dispatch(refreshNodesThunk());
        dispatch(refreshEdgesThunk());
        dispatch(saveGraph(graph.current.export()));
    }, [dispatch, refreshNodesThunk, refreshEdgesThunk, saveGraph, graph]);

    const handleImportRMGProject = (param: RMGParam) => {
        try {
            if (isAllowAppTelemetry) rmgRuntime.event(Events.IMPORT_RMG_PARAM, {});
            const x = svgViewBoxMin.x + (width * svgViewBoxZoom) / 100 / 3;
            const y = svgViewBoxMin.y + (height * svgViewBoxZoom) / 100 / 3;
            parseRmgParam(graph.current, param, x, y, autoParallel);
            refreshAndSave();
        } catch (err) {
            dispatch(setGlobalAlert({ status: 'error', message: t('header.open.unknownError') }));
            console.error('OpenActions.handleUploadRMG():: Unknown error occurred while parsing the RMG project', err);
        } finally {
            onClose();
        }
    };

    useEffect(() => {
        const channel = new BroadcastChannel(CHANNEL_PREFIX + appClipId);
        channel.onmessage = ev => {
            const { event, data } = ev.data;
            console.log('[rmp] Received event from RMG app clip:', event);
            if (event === 'CLOSE') {
                onClose();
            } else if (event === 'IMPORT') {
                handleImportRMGProject(data as RMGParam);
            }
        };
        return () => channel.close();
    }, [svgViewBoxMin.x, svgViewBoxMin.y, svgViewBoxZoom, height, width, autoParallel]);

    return (
        <RmgAppClip isOpen={isOpen} onClose={onClose} sx={styles}>
            <iframe src={frameUrl} loading="lazy" />
        </RmgAppClip>
    );
}
