import { TimelineSettings } from '../../constants/timeline';
import { VideoExportOptions, videoPreviewDefaultOptions } from '../../util/video-export';

export const TIMELINE_PREVIEW_PROFILE = { resolution: '720p', fps: 15 } as const;

/** Preview quality is independent of the export dialog; authored appearance and drawing speed stay shared. */
export const createTimelinePreviewOptions = (settings: TimelineSettings): VideoExportOptions => ({
    ...videoPreviewDefaultOptions,
    ...TIMELINE_PREVIEW_PROFILE,
    ...settings,
    hideWatermark: true,
});
