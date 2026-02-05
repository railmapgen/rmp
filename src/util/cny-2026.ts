import { logger } from '@railmapgen/rmg-runtime';

// Chinese New Year 2026 promotional period (UTC+8)
// Start: Feb 15, 2026 00:00:00 UTC+8 = Feb 14, 2026 16:00:00 UTC
// End: Feb 23, 2026 23:59:59 UTC+8 = Feb 23, 2026 15:59:59 UTC
const CNY_START_UTC = new Date('2026-02-14T16:00:00Z').getTime();
const CNY_END_UTC = new Date('2026-02-23T15:59:59Z').getTime();

// Time server endpoints that return timestamps
const TIME_SERVERS = ['https://worldtimeapi.org/api/ip', 'https://timeapi.io/api/Time/current/zone?timeZone=UTC'];

interface WorldTimeAPIResponse {
    unixtime?: number;
    datetime?: string;
}

interface TimeAPIIOResponse {
    dateTime?: string;
}

/**
 * Fetches the current time from multiple time servers.
 * Returns the first successful response as a Unix timestamp in milliseconds.
 * Falls back to local time if all servers fail.
 */
export const fetchNetworkTime = async (): Promise<number> => {
    for (const server of TIME_SERVERS) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await fetch(server, {
                signal: controller.signal,
                cache: 'no-store',
            });
            clearTimeout(timeoutId);

            if (!response.ok) continue;

            const data = (await response.json()) as WorldTimeAPIResponse | TimeAPIIOResponse;

            // worldtimeapi.org returns unixtime in seconds
            if ('unixtime' in data && typeof data.unixtime === 'number') {
                logger.debug(`CNY 2026: Got time from ${server}: ${data.unixtime * 1000}`);
                return data.unixtime * 1000;
            }

            // timeapi.io returns dateTime as ISO string
            if ('dateTime' in data && typeof data.dateTime === 'string') {
                const timestamp = new Date(data.dateTime).getTime();
                logger.debug(`CNY 2026: Got time from ${server}: ${timestamp}`);
                return timestamp;
            }
        } catch (error) {
            logger.debug(`CNY 2026: Failed to fetch time from ${server}: ${error}`);
        }
    }

    // Fallback to local time if all servers fail
    logger.debug('CNY 2026: All time servers failed, using local time');
    return Date.now();
};

/**
 * Checks if the given timestamp is within the CNY 2026 promotional period.
 */
export const isInCNY2026Period = (timestamp: number): boolean => {
    return timestamp >= CNY_START_UTC && timestamp <= CNY_END_UTC;
};

/**
 * Checks if we are currently in the CNY 2026 promotional period.
 * Fetches time from network servers to avoid local time manipulation.
 */
export const checkCNY2026Period = async (): Promise<boolean> => {
    const currentTime = await fetchNetworkTime();
    return isInCNY2026Period(currentTime);
};

// Check interval: 15 minutes in milliseconds
export const CNY_CHECK_INTERVAL = 15 * 60 * 1000;
