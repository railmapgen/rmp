export const getRmpWatermarkUrl = (): string => {
    const origin = typeof window !== 'undefined' ? (window.location?.origin ?? '') : '';
    let url = 'https://railmapgen.org/';
    if (origin.includes('github')) url = 'https://railmapgen.github.io/';
    else if (origin.includes('gitlab')) url = 'https://railmapgen.gitlab.io/';
    url += '?app=rmp';
    return url;
};
