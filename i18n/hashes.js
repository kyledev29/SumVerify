/**
 * Language-neutral facts about the 21 supported hash types, in order of real-world popularity.
 * This order drives: the "Tools" menu, the hash-type grid on the home page and the
 * "Other hash types" group in the checker. Texts that need translating live in i18n/locales/*.json
 * (keys `hashpage` and `hashes.<slug>`).
 *
 *  tier: strong | medium | weak  (see SECURITY in src/checker/hashers.js)
 *  empty: the checksum of an empty file (used as a worked example on each page)
 */
export default [
  {
    "name": "SHA-256",
    "slug": "sha256",
    "bits": 256,
    "hexLen": 64,
    "family": "SHA-2",
    "year": "2001",
    "designer": "NSA / NIST",
    "standard": "FIPS 180-4",
    "tier": "strong",
    "ext": ".sha256",
    "successor": "SHA-256",
    "related": [
      "sha512",
      "sha3-256",
      "blake3",
      "sha1"
    ],
    "cmds": [
      [
        "Linux",
        "sha256sum file.iso"
      ],
      [
        "macOS",
        "shasum -a 256 file.iso"
      ],
      [
        "Windows PowerShell",
        "Get-FileHash file.iso -Algorithm SHA256"
      ]
    ],
    "empty": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "variant": ""
  },
  {
    "name": "MD5",
    "slug": "md5",
    "bits": 128,
    "hexLen": 32,
    "family": "MD",
    "year": "1991",
    "designer": "Ronald Rivest",
    "standard": "RFC 1321",
    "tier": "medium",
    "ext": ".md5",
    "successor": "SHA-256",
    "related": [
      "sha256",
      "sha1",
      "crc32"
    ],
    "cmds": [
      [
        "Linux",
        "md5sum file.iso"
      ],
      [
        "macOS",
        "md5 file.iso"
      ],
      [
        "Windows PowerShell",
        "Get-FileHash file.iso -Algorithm MD5"
      ]
    ],
    "empty": "d41d8cd98f00b204e9800998ecf8427e",
    "variant": ""
  },
  {
    "name": "SHA-1",
    "slug": "sha1",
    "bits": 160,
    "hexLen": 40,
    "family": "SHA-1",
    "year": "1995",
    "designer": "NSA",
    "standard": "FIPS 180-4",
    "tier": "medium",
    "ext": ".sha1",
    "successor": "SHA-256",
    "related": [
      "sha256",
      "md5",
      "sha512"
    ],
    "cmds": [
      [
        "Linux",
        "sha1sum file.iso"
      ],
      [
        "macOS",
        "shasum -a 1 file.iso"
      ],
      [
        "Windows PowerShell",
        "Get-FileHash file.iso -Algorithm SHA1"
      ]
    ],
    "empty": "da39a3ee5e6b4b0d3255bfef95601890afd80709",
    "variant": ""
  },
  {
    "name": "SHA-512",
    "slug": "sha512",
    "bits": 512,
    "hexLen": 128,
    "family": "SHA-2",
    "year": "2001",
    "designer": "NSA / NIST",
    "standard": "FIPS 180-4",
    "tier": "strong",
    "ext": ".sha512",
    "successor": "SHA-256",
    "related": [
      "sha256",
      "sha384",
      "sha3-512",
      "blake2b"
    ],
    "cmds": [
      [
        "Linux",
        "sha512sum file.iso"
      ],
      [
        "macOS",
        "shasum -a 512 file.iso"
      ],
      [
        "Windows PowerShell",
        "Get-FileHash file.iso -Algorithm SHA512"
      ]
    ],
    "empty": "cf83e1357eefb8bdf1542850d66d8007d620e4050b5715dc83f4a921d36ce9ce47d0d13c5d85f2b0ff8318d2877eec2f63b931bd47417a81a538327af927da3e",
    "variant": ""
  },
  {
    "name": "CRC32",
    "slug": "crc32",
    "bits": 32,
    "hexLen": 8,
    "family": "CRC",
    "year": "",
    "designer": "",
    "standard": "ISO 3309 / IEEE 802.3",
    "tier": "weak",
    "ext": ".sfv",
    "successor": "SHA-256",
    "related": [
      "crc32c",
      "adler32",
      "sha256",
      "md5"
    ],
    "cmds": [],
    "empty": "00000000",
    "variant": ""
  },
  {
    "name": "BLAKE2b",
    "slug": "blake2b",
    "bits": 512,
    "hexLen": 128,
    "family": "BLAKE",
    "year": "2012",
    "designer": "Aumasson, Neves, Wilcox-O’Hearn, Winnerlein",
    "standard": "RFC 7693",
    "tier": "strong",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "blake2s",
      "blake3",
      "sha512"
    ],
    "cmds": [
      [
        "Linux",
        "b2sum file.iso"
      ]
    ],
    "empty": "786a02f742015903c6c6fd852552d272912f4740e15847618a86e217f71f5419d25e1031afee585313896444934eb04b903a685b1448b755d56f701afe9be2ce",
    "variant": ""
  },
  {
    "name": "BLAKE3",
    "slug": "blake3",
    "bits": 256,
    "hexLen": 64,
    "family": "BLAKE",
    "year": "2020",
    "designer": "O’Connor, Aumasson, Neves, Wilcox-O’Hearn",
    "standard": "",
    "tier": "strong",
    "ext": ".b3",
    "successor": "SHA-256",
    "related": [
      "blake2b",
      "sha256",
      "sha3-256"
    ],
    "cmds": [
      [
        "b3sum",
        "b3sum file.iso"
      ]
    ],
    "empty": "af1349b9f5f9a1a6a0404dea36dcc9499bcb25c9adc112b7cc9a93cae41f3262",
    "variant": ""
  },
  {
    "name": "CRC32C",
    "slug": "crc32c",
    "bits": 32,
    "hexLen": 8,
    "family": "CRC",
    "year": "1993",
    "designer": "Guy Castagnoli",
    "standard": "RFC 3720 (iSCSI)",
    "tier": "weak",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "crc32",
      "crc16",
      "sha256"
    ],
    "cmds": [],
    "empty": "00000000",
    "variant": ""
  },
  {
    "name": "SHA-384",
    "slug": "sha384",
    "bits": 384,
    "hexLen": 96,
    "family": "SHA-2",
    "year": "2001",
    "designer": "NSA / NIST",
    "standard": "FIPS 180-4",
    "tier": "strong",
    "ext": ".sha384",
    "successor": "SHA-256",
    "related": [
      "sha512",
      "sha256",
      "sha3-384"
    ],
    "cmds": [
      [
        "Linux",
        "sha384sum file.iso"
      ],
      [
        "macOS",
        "shasum -a 384 file.iso"
      ],
      [
        "Windows PowerShell",
        "Get-FileHash file.iso -Algorithm SHA384"
      ]
    ],
    "empty": "38b060a751ac96384cd9327eb1b1e36a21fdb71114be07434c0cc7bf63f6e1da274edebfe76f65fbd51ad2f14898b95b",
    "variant": ""
  },
  {
    "name": "SHA3-256",
    "slug": "sha3-256",
    "bits": 256,
    "hexLen": 64,
    "family": "SHA-3",
    "year": "2015",
    "designer": "Bertoni, Daemen, Peeters, Van Assche (Keccak)",
    "standard": "FIPS 202",
    "tier": "strong",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "sha3-512",
      "sha256",
      "blake3"
    ],
    "cmds": [],
    "empty": "a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a",
    "variant": ""
  },
  {
    "name": "SHA-224",
    "slug": "sha224",
    "bits": 224,
    "hexLen": 56,
    "family": "SHA-2",
    "year": "2004",
    "designer": "NSA / NIST",
    "standard": "FIPS 180-4",
    "tier": "strong",
    "ext": ".sha224",
    "successor": "SHA-256",
    "related": [
      "sha256",
      "sha3-224",
      "sha512"
    ],
    "cmds": [
      [
        "Linux",
        "sha224sum file.iso"
      ],
      [
        "macOS",
        "shasum -a 224 file.iso"
      ]
    ],
    "empty": "d14a028c2a3a2bc9476102bb288234c415a2b01f828ea62ac5b3e42f",
    "variant": ""
  },
  {
    "name": "SHA3-512",
    "slug": "sha3-512",
    "bits": 512,
    "hexLen": 128,
    "family": "SHA-3",
    "year": "2015",
    "designer": "Bertoni, Daemen, Peeters, Van Assche (Keccak)",
    "standard": "FIPS 202",
    "tier": "strong",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "sha3-256",
      "sha512",
      "blake2b"
    ],
    "cmds": [],
    "empty": "a69f73cca23a9ac5c8b567dc185a756e97c982164fe25859e0d1dcc1475c80a615b2123af1f5f94c11e3e9402c3ac558f500199d95b6d3e301758586281dcd26",
    "variant": ""
  },
  {
    "name": "BLAKE2s",
    "slug": "blake2s",
    "bits": 256,
    "hexLen": 64,
    "family": "BLAKE",
    "year": "2012",
    "designer": "Aumasson, Neves, Wilcox-O’Hearn, Winnerlein",
    "standard": "RFC 7693",
    "tier": "strong",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "blake2b",
      "blake3",
      "sha256"
    ],
    "cmds": [],
    "empty": "69217a3079908094e11121d042354a7c1f55b6482ca1a51e1b250dfd1ed0eef9",
    "variant": ""
  },
  {
    "name": "SHA3-384",
    "slug": "sha3-384",
    "bits": 384,
    "hexLen": 96,
    "family": "SHA-3",
    "year": "2015",
    "designer": "Bertoni, Daemen, Peeters, Van Assche (Keccak)",
    "standard": "FIPS 202",
    "tier": "strong",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "sha3-256",
      "sha384",
      "sha512"
    ],
    "cmds": [],
    "empty": "0c63a75b845e4f7d01107d852e4c2485c51a50aaaa94fc61995e71bbee983a2ac3713831264adb47fb6bd1e058d5f004",
    "variant": ""
  },
  {
    "name": "SHA3-224",
    "slug": "sha3-224",
    "bits": 224,
    "hexLen": 56,
    "family": "SHA-3",
    "year": "2015",
    "designer": "Bertoni, Daemen, Peeters, Van Assche (Keccak)",
    "standard": "FIPS 202",
    "tier": "strong",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "sha3-256",
      "sha224",
      "sha256"
    ],
    "cmds": [],
    "empty": "6b4e03423667dbb73b6e15454f0eb1abd4597f9a1b078e3f5b5a6bc7",
    "variant": ""
  },
  {
    "name": "MD4",
    "slug": "md4",
    "bits": 128,
    "hexLen": 32,
    "family": "MD",
    "year": "1990",
    "designer": "Ronald Rivest",
    "standard": "RFC 1320",
    "tier": "weak",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "md5",
      "sha256",
      "sha1"
    ],
    "cmds": [
      [
        "Windows",
        "certutil -hashfile file.iso MD4"
      ]
    ],
    "empty": "31d6cfe0d16ae931b73c59d7e0c089c0",
    "variant": ""
  },
  {
    "name": "Adler-32",
    "slug": "adler32",
    "bits": 32,
    "hexLen": 8,
    "family": "Adler",
    "year": "1995",
    "designer": "Mark Adler",
    "standard": "RFC 1950",
    "tier": "weak",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "crc32",
      "fletcher32",
      "md5"
    ],
    "cmds": [],
    "empty": "00000001",
    "variant": ""
  },
  {
    "name": "CRC16",
    "slug": "crc16",
    "bits": 16,
    "hexLen": 4,
    "family": "CRC",
    "year": "",
    "designer": "",
    "standard": "",
    "tier": "weak",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "crc8",
      "crc32",
      "fletcher16"
    ],
    "cmds": [],
    "empty": "0000",
    "variant": "CRC-16/ARC"
  },
  {
    "name": "Fletcher-32",
    "slug": "fletcher32",
    "bits": 32,
    "hexLen": 8,
    "family": "Fletcher",
    "year": "1982",
    "designer": "John G. Fletcher",
    "standard": "",
    "tier": "weak",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "fletcher16",
      "adler32",
      "crc32"
    ],
    "cmds": [],
    "empty": "00000000",
    "variant": ""
  },
  {
    "name": "Fletcher-16",
    "slug": "fletcher16",
    "bits": 16,
    "hexLen": 4,
    "family": "Fletcher",
    "year": "1982",
    "designer": "John G. Fletcher",
    "standard": "",
    "tier": "weak",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "fletcher32",
      "crc16",
      "adler32"
    ],
    "cmds": [],
    "empty": "0000",
    "variant": ""
  },
  {
    "name": "CRC8",
    "slug": "crc8",
    "bits": 8,
    "hexLen": 2,
    "family": "CRC",
    "year": "",
    "designer": "",
    "standard": "",
    "tier": "weak",
    "ext": ".txt",
    "successor": "SHA-256",
    "related": [
      "crc16",
      "crc32",
      "fletcher16"
    ],
    "cmds": [],
    "empty": "00",
    "variant": "CRC-8 (polynomial 0x07)"
  }
];
