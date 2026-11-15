# RMPB2 bundle reader

RMP can read RMPB1 and RMPB2 datasets. RMPB2 increases the largest bundle from
8 × 8 to 64 × 64 tiles (4,096 entries). Existing RMPB1 datasets remain supported.
This change adds consumer support; it does not generate or publish Ocean data.

## Header

All multibyte integers are unsigned and little-endian. Offsets are in bytes.

| Field | RMPB1 offset / type | RMPB2 offset / type |
| --- | --- | --- |
| Magic `RMPB` | 0 / 4 ASCII bytes | 0 / 4 ASCII bytes |
| Version | 4 / uint8 = 1 | 4 / uint8 = 2 |
| Zoom | 5 / uint8 | 5 / uint8 |
| Bundle side | 6 / uint8, 1, 2, 4, 8 | 6 / uint8, 1, 2, 4, 8, 16, 32, 64 |
| Tile count | 7 / uint8 | 8 / uint32 |
| Reserved | — | 7 / uint8 = 0 |
| Bundle X | 8 / uint32 | 12 / uint32 |
| Bundle Y | 12 / uint32 | 16 / uint32 |
| Payload offset | 16 / uint32 | 20 / uint32 |
| Header size | 20 bytes | 24 bytes |

Tile count must be between 1 and `side × side`. Bundles may be sparse. Bundle X/Y
are grid coordinates: a tile's global X/Y is `bundle X/Y × side + local X/Y`.

## Directory and payload

The directory immediately follows the header. Each entry is still 12 bytes:
local X (uint8), local Y (uint8), reserved zero (uint16), relative payload offset
(uint32), and payload length (uint32). Entries are unique and ordered by local Y,
then local X. Payload offset must equal `header size + tile count × 12`.

Each entry points to a complete UTF-8 SVG, including `data-z`, `data-x`, and
`data-y`. Payload spans are nonempty, contiguous, and consume the rest of the
file. The reader retains byte spans and decodes only the tiles it needs; it does
not create SVG DOM nodes for every tile in a large bundle.

## Dataset metadata and rollout

Manifest version remains 3; each level declares `bundleFormat: "RMPB1"` or
`"RMPB2"`. All bundles within that level must match its declaration. Bundle-index
version remains 1, with the same `side`, `x`, and `y` entries and URL template.
Availability bitmaps and regional routing are unchanged.

Deploy a compatible reader before publishing RMPB2 datasets. Old readers reject
RMPB2. The capacity experiment's `RMPB2-EXPERIMENTAL` manifest label is not accepted;
its binary layout matches RMPB2, but its metadata must be prepared for publication.
