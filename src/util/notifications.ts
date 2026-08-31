import rmgRuntime, { type RMNotification } from '@railmapgen/rmg-runtime';

/** 自定义事件名：用于将通知桥接到本地 Toast 显示 */
export const NOTIFICATION_EVENT = 'rmp-timeline:notification';

export const sendErrorNotification = (title: string, message: string) => {
    const payload: Omit<RMNotification, 'id' | 'source'> = {
        title,
        message,
        type: 'error',
        duration: 9000,
    };

    // 发送到宿主窗口（跨窗口通信）
    rmgRuntime.sendNotification(payload);

    // 同时派发本地 DOM 事件，供 AppRoot 中的 Chakra Toast 消费
    window.dispatchEvent(
        new CustomEvent(NOTIFICATION_EVENT, {
            detail: { ...payload, id: '', source: 'local' },
        })
    );
};
