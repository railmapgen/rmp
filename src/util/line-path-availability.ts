import { LinePathType } from '../constants/lines';
import type { ProjectType } from '../redux/param/param-slice';

/**
 * Keeps project-format compatibility separate from subscription presentation.
 *
 * Map projects deliberately expose only paths whose geometry can be placed
 * directly over geographic features. Diagram-only styles remain unavailable
 * even to subscribers, while Freeform and Bezier are kept out of diagrams.
 */
export const isLinePathTypeAvailableInProject = (projectType: ProjectType, type: LinePathType): boolean => {
    if (projectType === 'map') {
        return type === LinePathType.Simple || type === LinePathType.Freeform || type === LinePathType.Bezier;
    }

    return type !== LinePathType.Freeform && type !== LinePathType.Bezier;
};

/**
 * Returns the types that should be shown in the picker, not whether every shown
 * option is enabled. Simple is hidden without a subscription in both project
 * types. Ray Guided intentionally remains visible in diagrams and is disabled
 * by the caller, allowing users to discover the subscribed feature; it never
 * reaches map projects because the project-compatibility check excludes it.
 */
export const getAvailableLinePathTypes = (projectType: ProjectType, isSubscriber: boolean): LinePathType[] =>
    Object.values(LinePathType).filter(type => {
        if (type === LinePathType.Simple && !isSubscriber) return false;
        return isLinePathTypeAvailableInProject(projectType, type);
    });
