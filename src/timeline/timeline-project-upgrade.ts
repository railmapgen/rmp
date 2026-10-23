import { normalizeTimelineDocument, type TimelineDocumentLike } from '../util/timeline';
import { TIMELINE_PROJECT_VERSION } from './timeline-project';

type RawTimelineProject = Record<string, unknown> & { version: number; revision: Record<string, unknown> };

/** The same envelope migrations apply to local records and portable project files. */
export const TIMELINE_PROJECT_UPGRADE_COLLECTION: Record<number, (project: RawTimelineProject) => RawTimelineProject> =
    {
        1: project => ({
            ...project,
            version: 2,
            revision: {
                ...project.revision,
                timeline: normalizeTimelineDocument(project.revision.timeline as TimelineDocumentLike | undefined),
            },
        }),
    };

export const upgradeTimelineProject = (source: unknown): RawTimelineProject => {
    if (!source || typeof source !== 'object') throw new Error('Invalid Timeline project');
    let project = structuredClone(source) as RawTimelineProject;
    let version = project.version;
    if (!Number.isInteger(version) || version < 1 || version > TIMELINE_PROJECT_VERSION) {
        throw new Error(`Unsupported Timeline project version: ${version}`);
    }
    if (!project.revision || typeof project.revision !== 'object') throw new Error('Invalid Timeline project');
    while (version < TIMELINE_PROJECT_VERSION) {
        const upgrade = TIMELINE_PROJECT_UPGRADE_COLLECTION[version];
        if (!upgrade) throw new Error(`Unsupported Timeline project version: ${version}`);
        project = upgrade(project);
        if (project.version <= version) throw new Error('Invalid Timeline project upgrade');
        version = project.version;
    }
    project.revision.timeline = normalizeTimelineDocument(
        project.revision.timeline as TimelineDocumentLike | undefined
    );
    return project;
};
