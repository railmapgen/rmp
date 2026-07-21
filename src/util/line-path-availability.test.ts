import { describe, expect, it } from 'vitest';
import { LinePathType } from '../constants/lines';
import { getAvailableLinePathTypes } from './line-path-availability';

const freeDiagramLinePathTypes = [LinePathType.Diagonal, LinePathType.Perpendicular, LinePathType.RotatePerpendicular];

describe('getAvailableLinePathTypes', () => {
    it('keeps the original diagram paths and adds Simple for subscribers', () => {
        expect(getAvailableLinePathTypes('diagram', true)).toEqual([
            ...freeDiagramLinePathTypes,
            LinePathType.RayGuided,
            LinePathType.Simple,
        ]);
    });

    it('keeps Ray Guided visible but hides Simple from free users in diagram projects', () => {
        expect(getAvailableLinePathTypes('diagram', false)).toEqual([
            ...freeDiagramLinePathTypes,
            LinePathType.RayGuided,
        ]);
    });

    it('only exposes Simple, Freeform and Bezier in map projects for subscribers', () => {
        expect(getAvailableLinePathTypes('map', true)).toEqual([
            LinePathType.Simple,
            LinePathType.Freeform,
            LinePathType.Bezier,
        ]);
    });

    it('only exposes Freeform and Bezier in map projects for free users', () => {
        expect(getAvailableLinePathTypes('map', false)).toEqual([LinePathType.Freeform, LinePathType.Bezier]);
    });
});
