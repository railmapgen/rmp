import { describe, expect, it } from 'vitest';
import { LinePathType } from '../../../../constants/lines';
import { makeLinearPath, makePoint, makeRoundedTurnPath } from '../../../../constants/path';
import { concatOpenPaths } from '../../../../util/path';
import jrEastSingleColorPattern from './jr-east-single-color-pattern';

describe('jrEastSingleColorPattern pathGenerator', () => {
    it('generates a closed outline for complex open paths', () => {
        const path = concatOpenPaths([
            makeLinearPath(makePoint(0, 0), makePoint(10, 0)),
            makeRoundedTurnPath(
                makePoint(10, 0),
                makePoint(15, 0),
                makePoint(20, 0),
                makePoint(20, 5),
                makePoint(20, 10),
                makePoint(25, 10)
            ),
        ]);

        const result = jrEastSingleColorPattern.pathGenerator!(
            path,
            LinePathType.RayGuided,
            jrEastSingleColorPattern.defaultAttrs
        );

        expect(result.outline.kind).toBe('closed-area');
    });
});
