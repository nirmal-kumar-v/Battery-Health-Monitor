/**
 * Clean SVG Battery Health Monitor Icons for Favicon, PWA 192x192, and PWA 512x512
 */

import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

function createSvgIcon(size) {
  const pad = size * 0.15;
  const w = size - pad * 2;
  const h = size - pad * 2;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#315C48"/>
  <g transform="translate(${pad}, ${pad})">
    <!-- Battery Body Outline -->
    <rect x="${w * 0.08}" y="${h * 0.22}" width="${w * 0.72}" height="${h * 0.56}" rx="${w * 0.08}" fill="none" stroke="#FFFFFF" stroke-width="${w * 0.07}" stroke-linecap="round" stroke-linejoin="round"/>
    <!-- Battery Positive Terminal -->
    <path d="M ${w * 0.84} ${h * 0.40} C ${w * 0.90} ${h * 0.40}, ${w * 0.90} ${h * 0.60}, ${w * 0.84} ${h * 0.60}" fill="#FFFFFF"/>
    <!-- Internal Health Pulse Line -->
    <path d="M ${w * 0.18} ${h * 0.50} L ${w * 0.32} ${h * 0.50} L ${w * 0.40} ${h * 0.35} L ${w * 0.48} ${h * 0.65} L ${w * 0.56} ${h * 0.50} L ${w * 0.70} ${h * 0.50}" fill="none" stroke="#E8EFE7" stroke-width="${w * 0.055}" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

// Minimal valid PNG generator using standard node zlib
function createSolidPng(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth 8
  ihdr.writeUInt8(2, 9); // color type 2 (RGB)
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filter
  ihdr.writeUInt8(0, 12); // interlace

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crcBuf = Buffer.alloc(4);
    const body = Buffer.concat([typeBuf, data]);
    crcBuf.writeUInt32BE(crc32(body), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
  }

  // Pre-calculate CRC32 table
  const crcTable = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      if (c & 1) c = 0xedb88320 ^ (c >>> 1);
      else c = c >>> 1;
    }
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = -1;
    for (let i = 0; i < buf.length; i++) {
      c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ -1) >>> 0;
  }

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image scanlines
  // Filter byte (0) + 3 bytes per pixel
  const rowSize = 1 + width * 3;
  const rawData = Buffer.alloc(rowSize * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowSize;
    rawData[rowOffset] = 0; // Filter 0 (None)

    for (let x = 0; x < width; x++) {
      const pxOffset = rowOffset + 1 + x * 3;
      // Battery icon center glyph representation:
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const isCard = x > width * 0.1 && x < width * 0.9 && y > height * 0.1 && y < height * 0.9;

      if (isCard) {
        // Battery terminal & pulse
        const isPulse = (y >= cy - height * 0.02 && y <= cy + height * 0.02 && x >= width * 0.25 && x <= width * 0.75);
        if (isPulse) {
          rawData[pxOffset] = 232;
          rawData[pxOffset + 1] = 239;
          rawData[pxOffset + 2] = 231;
        } else {
          rawData[pxOffset] = r;
          rawData[pxOffset + 1] = g;
          rawData[pxOffset + 2] = b;
        }
      } else {
        rawData[pxOffset] = 245;
        rawData[pxOffset + 1] = 247;
        rawData[pxOffset + 2] = 242;
      }
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

const publicDir = path.resolve('public');
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), createSvgIcon(64));
fs.writeFileSync(path.join(publicDir, 'icon-192.svg'), createSvgIcon(192));
fs.writeFileSync(path.join(publicDir, 'icon-512.svg'), createSvgIcon(512));

// Generate valid PNG fallback files as well
const png192 = createSolidPng(192, 192, 49, 92, 72); // #315C48
const png512 = createSolidPng(512, 512, 49, 92, 72);
fs.writeFileSync(path.join(publicDir, 'icon-192.png'), png192);
fs.writeFileSync(path.join(publicDir, 'icon-512.png'), png512);

console.log('Successfully generated PWA icons and SVGs in public directory.');
