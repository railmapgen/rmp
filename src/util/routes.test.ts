import { describe, expect, it } from 'vitest';
import { isTimelineHash } from './routes';

describe('timeline routes', () => {
    it.each(['#/timeline', '#/timeline/', '#/timeline/project?view=edit'])(
        'recognises the Timeline hash route %s',
        hash => {
            expect(isTimelineHash(hash)).toBe(true);
        }
    );

    it.each(['', '#/', '#/timelines', '#/editor/timeline'])('does not recognise a non-Timeline hash route %s', hash => {
        expect(isTimelineHash(hash)).toBe(false);
    });
});
