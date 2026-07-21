import { LinePathType } from '../constants/lines';
import type { ProjectType } from '../redux/param/param-slice';

export const isLinePathTypeAvailableInProject = (projectType: ProjectType, type: LinePathType): boolean => {
    if (projectType === 'map') {
        return type === LinePathType.Simple || type === LinePathType.Freeform || type === LinePathType.Bezier;
    }

    return type !== LinePathType.Freeform && type !== LinePathType.Bezier;
};

export const getAvailableLinePathTypes = (projectType: ProjectType, isSubscriber: boolean): LinePathType[] =>
    Object.values(LinePathType).filter(type => {
        if (type === LinePathType.Simple && !isSubscriber) return false;
        return isLinePathTypeAvailableInProject(projectType, type);
    });
