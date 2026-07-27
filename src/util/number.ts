/** Narrow unknown input to finite numbers before persisted or imported data enters geometry code. */
export const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

/** Bound a value to a closed interval; callers keep the domain-specific meaning of that interval. */
export const clamp = (value: number, min: number, max: number): number => Math.min(max, Math.max(min, value));

/** Format generated numeric output compactly while avoiding the invalid-looking `-0` artifact. */
export const formatNumber = (value: number): string => {
    const rounded = Math.round(value * 1000) / 1000;
    return Object.is(rounded, -0) ? '0' : String(rounded);
};
