import { extension } from 'mime-types';
import { image_endpoint } from '../constants/server';
import { imageStoreIndexedDB } from './image-store-indexed-db';

export interface ImageList {
    id: string;
    thumbnail: string;
    hash?: string;
}

export const fetchImageAsBase64 = async (url: string, token: string | undefined): Promise<string> => {
    if (!token) throw new Error('No token provided for image fetch');
    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    if (!response.ok) {
        throw new Error(`Failed to download: ${response.statusText}`);
    }

    const blob = await response.blob();
    return await blobToBase64(blob);
};

export const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject('Failed to convert blob to base64');
            }
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
};

export const fetchAndSaveImage = async (id: string, hash: string, token: string | undefined) => {
    if (!token) return;
    const serverId = id.slice(6); // Remove 'img-s_' prefix
    const src = await fetchImageAsBase64(`${image_endpoint}/data/${serverId}/${hash}`, token);
    if (src) {
        await imageStoreIndexedDB.save(id, src);
    } else {
        console.error('Failed to fetch image from server');
    }
};

export const fetchImageList = async (token: string | undefined): Promise<ImageList[]> => {
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

    const list = await Promise.all(
        images.map(async (img: { id: string; hash: string }) => {
            const id = `img-s_${img.id}`;
            const localId = `${id}_thumbnail`;
            if ((await imageStoreIndexedDB.has(localId)) === false) {
                await imageStoreIndexedDB.save(
                    localId,
                    await fetchImageAsBase64(`${image_endpoint}/thumbnail/${img.id}`, token)
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
    return list;
};

export const getLocalImageList = async (): Promise<ImageList[]> => {
    const list: ImageList[] = [];
    (await imageStoreIndexedDB.getAll()).forEach((img, id) => {
        if (img && id.startsWith('img-l')) {
            list.push({
                id,
                thumbnail: img,
            });
        }
    });
    return list;
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

export const saveImagesFromParam = async (images: { id: string; base64: string }[]) => {
    for (const { id, base64 } of images) {
        if (id && base64) await imageStoreIndexedDB.save(id, base64);
    }
};
