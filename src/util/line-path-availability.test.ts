import { describe, expect, it } from 'vitest';
import { lineStyles } from '../components/svgs/lines/lines';
import { LinePathType, LineStyleType } from '../constants/lines';
import {
    canUseLine,
    canUseLinePath,
    canUseLineStyle,
    DIAGRAM_NATIVE_LINE_PATHS,
    isLinePolicyVisible,
    MAP_NATIVE_LINE_PATHS,
    requiresSubscriptionForLinePath,
} from './line-path-availability';

describe('contextual line subscription policy', () => {
    const legacySimplePathAvailableStyles = [
        LineStyleType.ShmetroVirtualInt,
        LineStyleType.GzmtrVirtualInt,
        LineStyleType.River,
        LineStyleType.MTRPaidArea,
        LineStyleType.MTRUnpaidArea,
        LineStyleType.MRTTapeOut,
    ];

    it('keeps the native path sets disjoint and complete by intent', () => {
        expect([...MAP_NATIVE_LINE_PATHS]).toEqual([LinePathType.Bezier, LinePathType.Freeform]);
        expect([...DIAGRAM_NATIVE_LINE_PATHS]).toEqual([
            LinePathType.Diagonal,
            LinePathType.Perpendicular,
            LinePathType.RotatePerpendicular,
            LinePathType.RayGuided,
        ]);
        expect([...MAP_NATIVE_LINE_PATHS].filter(type => DIAGRAM_NATIVE_LINE_PATHS.has(type))).toEqual([]);
        expect(MAP_NATIVE_LINE_PATHS.has(LinePathType.Simple)).toBe(false);
        expect(DIAGRAM_NATIVE_LINE_PATHS.has(LinePathType.Simple)).toBe(false);
    });

    it('requires a subscription for paths outside the current map-display context', () => {
        expect(requiresSubscriptionForLinePath(LinePathType.Diagonal, false)).toBe(false);
        expect(requiresSubscriptionForLinePath(LinePathType.Diagonal, true)).toBe(true);
        expect(requiresSubscriptionForLinePath(LinePathType.Bezier, false)).toBe(true);
        expect(requiresSubscriptionForLinePath(LinePathType.Bezier, true)).toBe(false);
    });

    it('keeps statically Pro paths subscribed in both contexts', () => {
        for (const mapEnabled of [false, true]) {
            expect(requiresSubscriptionForLinePath(LinePathType.RayGuided, mapEnabled)).toBe(true);
            expect(requiresSubscriptionForLinePath(LinePathType.Simple, mapEnabled)).toBe(true);
        }
    });

    it('allows subscribers to author every known path and rejects unknown authoring', () => {
        for (const type of Object.values(LinePathType)) {
            expect(canUseLinePath(type, false, true)).toBe(true);
            expect(canUseLinePath(type, true, true)).toBe(true);
        }
        expect(canUseLinePath('future-path', false, true)).toBe(false);
    });

    it('combines path and style policy for authoring', () => {
        expect(canUseLine(LinePathType.Diagonal, LineStyleType.SingleColor, false, false)).toBe(true);
        expect(canUseLine(LinePathType.Bezier, LineStyleType.SingleColor, false, false)).toBe(false);
        expect(canUseLine(LinePathType.Bezier, LineStyleType.SingleColor, false, true)).toBe(true);
        expect(canUseLineStyle(LineStyleType.Unknown, true)).toBe(false);
        expect(canUseLine(LinePathType.Diagonal, 'future-style', false, true)).toBe(false);
    });

    it.each([false, true])('preserves the legacy free Simple combinations when mapEnabled is %s', mapEnabled => {
        for (const style of legacySimplePathAvailableStyles) {
            expect(canUseLine(LinePathType.Simple, style, mapEnabled, false)).toBe(true);
            expect(isLinePolicyVisible({ type: LinePathType.Simple, style }, mapEnabled, false)).toBe(true);
        }

        expect(canUseLinePath(LinePathType.Simple, mapEnabled, false)).toBe(false);
        expect(canUseLine(LinePathType.Simple, LineStyleType.SingleColor, mapEnabled, false)).toBe(false);
        expect(
            isLinePolicyVisible({ type: LinePathType.Simple, style: LineStyleType.SingleColor }, mapEnabled, false)
        ).toBe(false);
    });

    it('independently enforces a style marked as Pro', () => {
        const style = lineStyles[LineStyleType.Generic] as (typeof lineStyles)[LineStyleType.Generic] & {
            isPro?: boolean;
        };
        const previous = style.isPro;
        style.isPro = true;

        try {
            expect(canUseLineStyle(LineStyleType.Generic, false)).toBe(false);
            expect(canUseLine(LinePathType.Diagonal, LineStyleType.Generic, false, false)).toBe(false);
            expect(
                isLinePolicyVisible({ type: LinePathType.Diagonal, style: LineStyleType.Generic }, false, false)
            ).toBe(false);
            expect(canUseLineStyle(LineStyleType.Generic, true)).toBe(true);
        } finally {
            if (previous === undefined) delete style.isPro;
            else style.isPro = previous;
        }
    });

    it('preserves unknown existing paths for fallback rendering', () => {
        expect(
            isLinePolicyVisible(
                {
                    type: 'future-path' as LinePathType,
                    style: LineStyleType.Unknown,
                },
                false,
                false
            )
        ).toBe(true);
    });
});
