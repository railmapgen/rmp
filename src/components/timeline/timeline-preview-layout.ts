/** Fit a 16:9 video against one pair of edges without cropping or extra padding. */
export const fitVideoPreviewFrame = (availableWidth: number, availableHeight: number) => {
    const width = Math.max(0, Number.isFinite(availableWidth) ? availableWidth : 0);
    const height = Math.max(0, Number.isFinite(availableHeight) ? availableHeight : 0);
    const frameWidth = Math.min(width, (height * 16) / 9);
    return { width: frameWidth, height: (frameWidth * 9) / 16 };
};
