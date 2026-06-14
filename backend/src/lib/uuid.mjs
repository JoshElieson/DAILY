// UUID v7 generator (time-ordered, RFC 9562). The schema (BACKEND-SCHEMA-API.md
// §0) specifies UUID v7 for index-friendly, enumeration-resistant, sync-safe
// primary keys. Implemented on `node:crypto` to avoid a dependency and to keep
// generation deterministic in shape.

import { randomFillSync } from 'node:crypto';

/** Generate a UUID v7 string. */
export function uuidv7() {
  const bytes = new Uint8Array(16);
  randomFillSync(bytes);

  const ts = Date.now(); // unix epoch ms — the time-ordered prefix
  // 48-bit big-endian timestamp in bytes 0..5
  bytes[0] = (ts / 2 ** 40) & 0xff;
  bytes[1] = (ts / 2 ** 32) & 0xff;
  bytes[2] = (ts / 2 ** 24) & 0xff;
  bytes[3] = (ts / 2 ** 16) & 0xff;
  bytes[4] = (ts / 2 ** 8) & 0xff;
  bytes[5] = ts & 0xff;

  // version 7 in the high nibble of byte 6
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  // variant 10xx in the high bits of byte 8
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [];
  for (let i = 0; i < 16; i++) hex.push(bytes[i].toString(16).padStart(2, '0'));
  return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex
    .slice(6, 8)
    .join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v) {
  return typeof v === 'string' && UUID_RE.test(v);
}
