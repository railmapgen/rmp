import { ColourHex } from '@railmapgen/rmg-palette-resources';

export default class ColourUtil {
    private static hexToRgb(hex: ColourHex): [number, number, number] {
        return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
    }

    public static fade(hex: ColourHex, alpha: number): `rgba(${string})` {
        return `rgba(${[...this.hexToRgb(hex), alpha].join(',')})`;
    }

    public static euclideanDistance(hex1: ColourHex, hex2: ColourHex): number {
        return this.hexToRgb(hex1).reduce((acc, cur, idx) => {
            return acc + Math.pow(cur - this.hexToRgb(hex2)[idx], 2);
        }, 0);
    }
}
