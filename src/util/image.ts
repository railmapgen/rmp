import { logger } from '@railmapgen/rmg-runtime';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { MultiDirectedGraph } from 'graphology';
import { extension } from 'mime-types';
import { nanoid } from 'nanoid';
import { EdgeAttributes, GraphAttributes, NodeAttributes } from '../constants/constants';
import { MiscNodeType } from '../constants/nodes';
import { image_endpoint } from '../constants/server';
import { RootState } from '../redux';
import { setRefreshImages } from '../redux/runtime/runtime-slice';
import { blobToBase64 } from './binary';
import { imageStoreIndexedDB } from './image-store-indexed-db';

export interface ImageList {
    id: string;
    thumbnail: string;
    hash?: string;
}

export const fetchImageAsBase64 = async (url: string): Promise<string> => {
    const response = await fetch(url);
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
    }

    const blob = await response.blob();
    return await blobToBase64(blob);
};

export const fetchAndSaveImage = async (id: string, hash: string) => {
    const serverId = id.slice(6); // Remove 'img-s_' prefix
    const src = await fetchImageAsBase64(`${image_endpoint}/data/${serverId}/${hash}`);
    if (src) {
        await imageStoreIndexedDB.save(id, src);
    } else {
        logger.error('Failed to fetch image from server');
    }
};

export const fetchServerImageList = async (token: string | undefined): Promise<ImageList[]> => {
    if (!token) return [];
    const rep = await fetch(image_endpoint, {
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
    });
    if (rep.status !== 200) {
        return [];
    }
    const { images } = await rep.json();

    return await Promise.all(
        images.map(async (img: { id: string; hash: string }) => {
            const id = `img-s_${img.id}`;
            const localId = `${id}_thumbnail`;
            if ((await imageStoreIndexedDB.has(localId)) === false) {
                await imageStoreIndexedDB.save(
                    localId,
                    await fetchImageAsBase64(`${image_endpoint}/thumbnail/${img.id}`)
                );
            }
            const thumbnail = await imageStoreIndexedDB.get(localId);
            return {
                id,
                hash: img.hash,
                thumbnail,
            };
        })
    );
};

export const fetchLocalImageList = async (): Promise<ImageList[]> => {
    const allImages = await imageStoreIndexedDB.getAll();
    return Array.from(allImages.entries())
        .filter(([id, img]) => img && id.startsWith('img-l'))
        .map(([id, thumbnail]) => ({
            id,
            thumbnail,
        }));
};

export const downloadBase64Image = (base64: string, filename: string) => {
    const arr = base64.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) throw new Error('Invalid base64 string');
    const mime = mimeMatch[1];

    const bstr = atob(arr[1]);
    const n = bstr.length;
    const u8arr = new Uint8Array(n);
    for (let i = 0; i < n; i++) {
        u8arr[i] = bstr.charCodeAt(i);
    }

    const blob = new Blob([u8arr], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

export const getExtFromBase64 = (base64: string): string | undefined => {
    const match = base64.match(/^data:(.+?);base64,/);
    if (!match) return undefined;
    return extension(match[1]) || undefined;
};

export const saveImagesFromParam = async (
    graph: MultiDirectedGraph<NodeAttributes, EdgeAttributes, GraphAttributes>,
    images: { id: string; base64: string }[]
) => {
    for (const { id, base64 } of images) {
        if (id && base64) {
            if ((await imageStoreIndexedDB.has(id)) === false) {
                // not exist => save
                await imageStoreIndexedDB.save(id, base64);
            } else if ((await imageStoreIndexedDB.get(id)) !== base64) {
                // conflict name => rename new one
                const newId = `img-l_${nanoid(10)}`;
                await imageStoreIndexedDB.save(newId, base64);
                graph
                    .filterNodes(
                        (n: string, attr: any) =>
                            n.startsWith('misc_node') && attr.type === 'image' && attr['image']?.href === id
                    )
                    .forEach(node => {
                        const attrs = graph.getNodeAttribute(node, MiscNodeType.Image)!;
                        attrs.href = newId;
                        graph.mergeNodeAttributes(node, { [MiscNodeType.Image]: attrs });
                    });
            }
        }
    }
};

/**
 * Scan the current graph for cloud images and ensure they are cached locally.
 * Also trigger a canvas refresh.
 */
export const pullServerImages = createAsyncThunk<void, void, { state: RootState }>(
    'image/pullServerImages',
    async (_: void, { getState, dispatch }) => {
        // Ensure all server images used in the graph are available in IndexedDB.
        await Promise.all(
            window.graph
                .filterNodes(
                    (id, attr) =>
                        id.startsWith('misc_node') && attr.type === 'image' && attr['image']?.href !== undefined
                )
                .map(async id => {
                    const { href, hash } = window.graph.getNodeAttribute(id, MiscNodeType.Image)!;
                    if (href && href.startsWith('img-s') && !(await imageStoreIndexedDB.has(href)) && hash) {
                        await fetchAndSaveImage(href, hash);
                    }
                })
        );

        // Trigger a canvas refresh to reflect any newly cached images.
        dispatch(setRefreshImages());
    }
);
