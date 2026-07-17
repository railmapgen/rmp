import rmgRuntime from '@railmapgen/rmg-runtime';

export const sendErrorNotification = (title: string, message: string) => {
    rmgRuntime.sendNotification({
        title,
        message,
        type: 'error',
        duration: 9000,
    });
};
