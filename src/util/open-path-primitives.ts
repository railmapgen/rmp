import { Bezier } from 'bezier-js';
import { OpenPath, PathPoint } from '../constants/path';
import { dropInitialMoveTo } from './path';

/**
 * Low-level geometric segment extracted from an `OpenPath`.
 *
 * In the structured path model, an `OpenPath` is stored as a single command stream:
 * `M ... (L|C) ...`.
 * For length measurement, slicing, and Bezier-specific math we need a flatter view:
 * a path as an ordered list of standalone segments.
 *
 * This file introduces that flattened vocabulary:
 * - a line primitive is one straight segment from `start` to `end`
 * - a cubic primitive is one cubic Bezier segment from `start` to `end`
 *
 * "Primitive" here intentionally means "one indivisible geometric segment as authored",
 * not "the smallest possible mathematical entity". We preserve original segment boundaries
 * so later helpers can map arc-length positions back to the exact source segment.
 */

export interface OpenPathLinePrimitive {
    kind: 'line';
    start: PathPoint;
    end: PathPoint;
}

export interface OpenPathCubicPrimitive {
    kind: 'cubic';
    start: PathPoint;
    c1: PathPoint;
    c2: PathPoint;
    end: PathPoint;
}

export type OpenPathPrimitive = OpenPathLinePrimitive | OpenPathCubicPrimitive;

/** Convert a path-model point into the plain `{x, y}` shape expected by `bezier-js`. */
const toBezierPoint = (point: PathPoint) => ({ x: point.x, y: point.y });

/**
 * Lift one primitive into a `bezier-js` curve instance.
 *
 * Lines are represented as first-order Beziers and cubics stay cubic. This lets downstream
 * helpers use a single library API for `.length()`, `.split()`, and `.get(t)` without caring
 * whether the source segment was originally linear or curved.
 */
export const primitiveToBezier = (primitive: OpenPathPrimitive): Bezier =>
    primitive.kind === 'line'
        ? new Bezier([toBezierPoint(primitive.start), toBezierPoint(primitive.end)])
        : new Bezier([
              toBezierPoint(primitive.start),
              toBezierPoint(primitive.c1),
              toBezierPoint(primitive.c2),
              toBezierPoint(primitive.end),
          ]);

/**
 * Measure a primitive's geometric length.
 *
 * We keep line measurement explicit and cheap, while cubic measurement delegates to
 * `bezier-js`'s numerical arc-length routine.
 */
export const primitiveLength = (primitive: OpenPathPrimitive): number =>
    primitive.kind === 'line'
        ? Math.hypot(primitive.end.x - primitive.start.x, primitive.end.y - primitive.start.y)
        : primitiveToBezier(primitive).length();

/**
 * Flatten an `OpenPath` command stream into ordered primitives.
 *
 * The resulting list preserves:
 * - original drawing order
 * - exact segment boundaries
 * - exact start/end control geometry for every line/cubic
 *
 * This is the bridge between the app's semantic path model and the geometry helpers that
 * operate segment-by-segment.
 */
export const getOpenPathPrimitives = (path: OpenPath): OpenPathPrimitive[] => {
    let start = path.commands[0].to;

    return dropInitialMoveTo(path).map(command => {
        if (command.cmd === 'L') {
            const primitive: OpenPathLinePrimitive = {
                kind: 'line',
                start,
                end: command.to,
            };
            start = command.to;
            return primitive;
        }

        const primitive: OpenPathCubicPrimitive = {
            kind: 'cubic',
            start,
            c1: command.c1,
            c2: command.c2,
            end: command.to,
        };
        start = command.to;
        return primitive;
    });
};
