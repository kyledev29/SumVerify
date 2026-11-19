import {
  createSHA256, createSHA512, createSHA1, createMD5, createCRC32, createBLAKE2b, createBLAKE3,
  createSHA224, createSHA384, createSHA3, createBLAKE2s,
} from 'hash-wasm';

/* Small pure-JS checksums with the same streaming interface as hash-wasm: update(u8) / digest() */
function refl(poly, init, xo, len) {
  const T = new Uint32Array(256);
  let c = init;
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 1 ? (v >>> 1) ^ poly : v >>> 1;
    T[n] = v >>> 0;
  }
  return {
    update(u) { for (let i = 0; i < u.length; i++) c = T[(c ^ u[i]) & 255] ^ (c >>> 8); },
    digest() { return ((c ^ xo) >>> 0).toString(16).padStart(len, '0'); },
  };
}
function crc8() {
  const T = new Uint8Array(256);
  let c = 0;
  for (let n = 0; n < 256; n++) {
    let v = n;
    for (let k = 0; k < 8; k++) v = v & 128 ? ((v << 1) ^ 7) & 255 : (v << 1) & 255;
    T[n] = v;
  }
  return {
    update(u) { for (let i = 0; i < u.length; i++) c = T[c ^ u[i]]; },
    digest() { return c.toString(16).padStart(2, '0'); },
  };
}
function adler() {
  let a = 1, b = 0, k = 0;
  return {
    update(u) {
      for (let i = 0; i < u.length; i++) {
        a += u[i]; b += a;
        if (++k === 3800) { a %= 65521; b %= 65521; k = 0; }
      }
    },
    digest() { a %= 65521; b %= 65521; return (((b << 16) | a) >>> 0).toString(16).padStart(8, '0'); },
  };
}
function fl16() {
  let s1 = 0, s2 = 0;
  return {
    update(u) {
      for (let i = 0; i < u.length; i++) {
        s1 += u[i]; if (s1 >= 255) s1 -= 255;
        s2 += s1; if (s2 >= 255) s2 -= 255;
      }
    },
    digest() { return ((s2 << 8) | s1).toString(16).padStart(4, '0'); },
  };
}
function fl32() {
  let s1 = 0, s2 = 0, p = -1;
  const w = (x) => { s1 = (s1 + x) % 65535; s2 = (s2 + s1) % 65535; };
  return {
    update(u) {
      for (let i = 0; i < u.length; i++) {
        if (p < 0) p = u[i];
        else { w(p | (u[i] << 8)); p = -1; }
      }
    },
    digest() { if (p >= 0) { w(p); p = -1; } return (((s2 << 16) | s1) >>> 0).toString(16).padStart(8, '0'); },
  };
}

/** name -> factory returning (a Promise of) a streaming hasher */
export const FACTORIES = {
  'SHA-256': () => createSHA256(), 'SHA-512': () => createSHA512(), 'SHA-1': () => createSHA1(), 'MD5': () => createMD5(),
  'CRC32': () => createCRC32(), 'CRC32C': () => refl(0x82F63B78, 0xFFFFFFFF, 0xFFFFFFFF, 8),
  'BLAKE2b': () => createBLAKE2b(512), 'BLAKE3': () => createBLAKE3(),
  'SHA-224': () => createSHA224(), 'SHA-384': () => createSHA384(),
  'SHA3-224': () => createSHA3(224), 'SHA3-256': () => createSHA3(256), 'SHA3-384': () => createSHA3(384), 'SHA3-512': () => createSHA3(512),
  'BLAKE2s': () => createBLAKE2s(256), 'CRC16': () => refl(0xA001, 0, 0, 4), 'CRC8': crc8,
  'Adler-32': adler, 'Fletcher-16': fl16, 'Fletcher-32': fl32,
};

/* Hash types in order of real-world checksum popularity. Each type is hashed in its own
   streaming pass over the file (8 MB chunks), one type at a time, most common first. */
export const ORDER = ['SHA-256', 'MD5', 'SHA-1', 'SHA-512', 'CRC32', 'BLAKE2b', 'BLAKE3', 'CRC32C'];
export const MORE = ['SHA-384', 'SHA3-256', 'SHA-224', 'SHA3-512', 'BLAKE2s', 'SHA3-384', 'SHA3-224', 'Adler-32', 'CRC16', 'Fletcher-32', 'Fletcher-16', 'CRC8'];
export const CHUNK = 8 * 1024 * 1024;
export const MIN_HASH_MS = 100;
