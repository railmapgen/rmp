import { MAP_BUNDLE_SIDES } from './map-config';

export interface AvailabilityIndex {
    zoom: number;
    minX: number;
    minY: number;
    width: number;
    height: number;
    tileCount: number;
    bits: Uint8Array;
}

export interface BundleAddress {
    zoom: number;
    side: number;
    x: number;
    y: number;
}

export interface BundleEntry {
    start: number;
    length: number;
}

export interface ParsedBundle {
    address: BundleAddress;
    bytes: Uint8Array;
    entries: Map<string, BundleEntry>;
}

const ascii = (bytes: Uint8Array, start: number, length: number) =>
    String.fromCharCode(...bytes.subarray(start, start + length));

export const parseAvailability = (buffer: ArrayBuffer): AvailabilityIndex => {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 28 || ascii(bytes, 0, 4) !== 'RMPT') throw new Error('Invalid availability magic');
    if (bytes[4] !== 1) throw new Error(`Unsupported availability version ${bytes[4]}`);
    if (bytes[6] !== 0 || bytes[7] !== 0) throw new Error('Invalid availability reserved bytes');
    const view = new DataView(buffer);
    const index = {
        zoom: bytes[5],
        minX: view.getUint32(8, true),
        minY: view.getUint32(12, true),
        width: view.getUint32(16, true),
        height: view.getUint32(20, true),
        tileCount: view.getUint32(24, true),
        bits: bytes.subarray(28),
    };
    const area = index.width * index.height;
    const extent = 2 ** index.zoom;
    if (
        index.zoom > 30 ||
        index.width < 1 ||
        index.height < 1 ||
        !Number.isSafeInteger(area) ||
        index.minX + index.width > extent ||
        index.minY + index.height > extent
    ) {
        throw new Error('Invalid availability bounds');
    }
    const requiredBytes = Math.ceil(area / 8);
    if (index.bits.length !== requiredBytes) throw new Error('Invalid availability bitmap length');
    let availableTiles = 0;
    for (let bit = 0; bit < index.bits.length * 8; bit += 1) {
        const isSet = (index.bits[bit >> 3] & (1 << (bit & 7))) !== 0;
        if (bit >= area && isSet) throw new Error('Invalid availability padding bits');
        if (bit < area && isSet) availableTiles += 1;
    }
    if (availableTiles !== index.tileCount) throw new Error('Invalid availability tile count');
    return index;
};

export const hasAvailableTile = (index: AvailabilityIndex, x: number, y: number) => {
    const localX = x - index.minX;
    const localY = y - index.minY;
    if (localX < 0 || localY < 0 || localX >= index.width || localY >= index.height) return false;
    const bit = localY * index.width + localX;
    return (index.bits[bit >> 3] & (1 << (bit & 7))) !== 0;
};

export const parseBundle = (buffer: ArrayBuffer): ParsedBundle => {
    const bytes = new Uint8Array(buffer);
    if (bytes.length < 20 || ascii(bytes, 0, 4) !== 'RMPB') throw new Error('Invalid RMPB magic');
    if (bytes[4] !== 1) throw new Error(`Unsupported RMPB version ${bytes[4]}`);
    const zoom = bytes[5];
    const side = bytes[6];
    const tileCount = bytes[7];
    if (!(MAP_BUNDLE_SIDES as readonly number[]).includes(side)) throw new Error(`Invalid RMPB side ${side}`);
    if (tileCount < 1 || tileCount > 64 || tileCount > side * side) {
        throw new Error(`Invalid RMPB tile count ${tileCount}`);
    }

    const view = new DataView(buffer);
    const address = { zoom, side, x: view.getUint32(8, true), y: view.getUint32(12, true) };
    const payloadOffset = view.getUint32(16, true);
    const expectedPayloadOffset = 20 + tileCount * 12;
    if (payloadOffset !== expectedPayloadOffset || payloadOffset > bytes.length) {
        throw new Error('Invalid RMPB payload offset');
    }

    const entries = new Map<string, BundleEntry>();
    const localCoordinates = new Set<string>();
    let expectedRelativeOffset = 0;
    let previousLocalX = -1;
    let previousLocalY = -1;
    for (let index = 0; index < tileCount; index += 1) {
        const offset = 20 + index * 12;
        const localX = bytes[offset];
        const localY = bytes[offset + 1];
        if (localX >= side || localY >= side) throw new Error('Invalid RMPB local coordinate');
        if (view.getUint16(offset + 2, true) !== 0) throw new Error('Invalid RMPB reserved bytes');
        const localKey = `${localX}/${localY}`;
        if (localCoordinates.has(localKey)) throw new Error('Duplicate RMPB local coordinate');
        localCoordinates.add(localKey);
        if (localY < previousLocalY || (localY === previousLocalY && localX <= previousLocalX)) {
            throw new Error('RMPB entries are not in Y/X order');
        }
        const relativeOffset = view.getUint32(offset + 4, true);
        const length = view.getUint32(offset + 8, true);
        if (relativeOffset !== expectedRelativeOffset || length < 1) throw new Error('Invalid RMPB payload span');
        const end = relativeOffset + length;
        if (end > bytes.length - payloadOffset) throw new Error('RMPB payload span is out of range');
        const x = address.x * side + localX;
        const y = address.y * side + localY;
        entries.set(`${zoom}/${x}/${y}`, { start: payloadOffset + relativeOffset, length });
        expectedRelativeOffset = end;
        previousLocalX = localX;
        previousLocalY = localY;
    }
    if (payloadOffset + expectedRelativeOffset !== bytes.length) throw new Error('RMPB has trailing bytes');
    return { address, bytes, entries };
};
