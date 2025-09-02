import { createAsyncThunk } from '@reduxjs/toolkit';
import { MiscNodeType } from '../../constants/nodes';
import { fetchAndSaveImage } from '../../util/image';
import { imageStoreIndexedDB } from '../../util/image-store-indexed-db';
import type { RootState } from '../index';
import { setRefreshNodes } from '../runtime/runtime-slice';

/**
 * Scan the current graph for cloud images and ensure they are cached locally.
 * Also trigger a canvas refresh.
 */
export const pullCloudImages = createAsyncThunk<void, void, { state: RootState }>(
    'image/pullCloudImages',
    async (_: void, { getState, dispatch }) => {
        const state = getState();
        const token = state.account.token;

        // Ensure all server images used in the graph are available in IndexedDB.
        window.graph
            .filterNodes(
                (id: string, attr: any) => id.startsWith('misc_node') && attr.type === 'image' && attr['image']?.href
            )
            .forEach(async (id: string) => {
                const { href, hash } = window.graph.getNodeAttribute(id, MiscNodeType.Image)!;
                if (href && href.startsWith('img-s') && !imageStoreIndexedDB.has(href) && hash) {
                    await fetchAndSaveImage(href, hash, token);
                }
            });

        // Trigger a canvas refresh to reflect any newly cached images.
        dispatch(setRefreshNodes());
    }
);
