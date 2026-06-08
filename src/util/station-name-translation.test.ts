import { afterEach, describe, expect, it, vi } from 'vitest';
import { translateStationNameByPinyin, translateStationNameBySemantic } from './station-name-translation';

afterEach(() => {
    vi.unstubAllGlobals();
});

describe('translateStationNameByPinyin', () => {
    it('romanises Chinese station names with spaced title-case pinyin by default', () => {
        expect(translateStationNameByPinyin('南京东路')).toBe('Nan Jing Dong Lu');
        expect(translateStationNameByPinyin('龙阳路')).toBe('Long Yang Lu');
    });

    it('romanises Chinese station names with compact title-case pinyin', () => {
        expect(translateStationNameByPinyin('南京东路', 'pinyin-compact')).toBe('Nanjingdonglu');
        expect(translateStationNameByPinyin('龙阳路', 'pinyin-compact')).toBe('Longyanglu');
    });

    it('romanises Chinese station names with uppercase pinyin', () => {
        expect(translateStationNameByPinyin('南京东路', 'pinyin-uppercase')).toBe('NANJINGDONGLU');
        expect(translateStationNameByPinyin('龙阳路', 'pinyin-uppercase')).toBe('LONGYANGLU');
    });

    it('keeps multiline station names multiline', () => {
        expect(translateStationNameByPinyin('南京东路\n上海火车站')).toBe('Nan Jing Dong Lu\nShang Hai Huo Che Zhan');
    });

    it('preserves adjacent Latin letters and digits', () => {
        expect(translateStationNameByPinyin('T3航站楼')).toBe('T3 Hang Zhan Lou');
        expect(translateStationNameByPinyin('10号线')).toBe('10 Hao Xian');
        expect(translateStationNameByPinyin('T3航站楼', 'pinyin-compact')).toBe('T3Hangzhanlou');
        expect(translateStationNameByPinyin('10号线', 'pinyin-uppercase')).toBe('10HAOXIAN');
    });
});

describe('translateStationNameBySemantic', () => {
    it('returns the server translation result', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ en: 'East Nanjing Road' }),
            })
        );

        await expect(translateStationNameBySemantic('南京东路', 'token')).resolves.toBe('East Nanjing Road');
        expect(fetch).toHaveBeenCalledWith(
            'https://railmapgen.org/v1/stationNameTranslation',
            expect.objectContaining({
                method: 'POST',
                headers: expect.objectContaining({
                    Authorization: 'Bearer token',
                }),
                body: '{"zhName":"南京东路"}',
            })
        );
    });

    it('throws on failed server response', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: false,
                statusText: 'Bad Gateway',
            })
        );

        await expect(translateStationNameBySemantic('南京东路', 'token')).rejects.toThrow('Bad Gateway');
    });
});
