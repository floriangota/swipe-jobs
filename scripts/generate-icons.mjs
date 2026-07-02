// Generate PWA icons with zero dependencies (Node built-ins only).
// Draws the SwipeJobs mark: a diagonal indigo -> teal gradient with a white check.
//
//   node scripts/generate-icons.mjs
//
// Outputs: public/icon-192.png, public/icon-512.png, public/icon-maskable-512.png,
//          src/app/apple-icon.png
import { deflateSync } from "node:zlib";
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

// --- Brand colors (sRGB approximations of the design tokens) ----------------
const INDIGO = [79, 70, 229];
const TEAL = [15, 157, 168];
const WHITE = [255, 255, 255];

// --- Geometry (normalized tile coords, y-down) ------------------------------
const CHECK = [
  [0.26, 0.54],
  [0.44, 0.7],
  [0.76, 0.3],
];
const STROKE_HALF = 0.08;
const CORNER_RADIUS = 0.22;
const MASKABLE_CONTENT_SCALE = 0.66; // shrink art into the safe zone

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx;
  const cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

// Straight-alpha color [r,g,b,a] for a normalized point.
function sample(u, v, maskable) {
  // Background coverage.
  let bgA = 1;
  if (!maskable) {
    const r = CORNER_RADIUS;
    const dx = Math.max(Math.abs(u - 0.5) - (0.5 - r), 0);
    const dy = Math.max(Math.abs(v - 0.5) - (0.5 - r), 0);
    const dist = Math.hypot(dx, dy) - r;
    bgA = dist <= 0 ? 1 : 0;
  }
  if (bgA === 0) return [0, 0, 0, 0];

  const t = Math.max(0, Math.min(1, (u + v) / 2));
  let r = Math.round(lerp(INDIGO[0], TEAL[0], t));
  let g = Math.round(lerp(INDIGO[1], TEAL[1], t));
  let b = Math.round(lerp(INDIGO[2], TEAL[2], t));

  // Check mark (in content space; maskable shrinks toward center).
  const k = maskable ? MASKABLE_CONTENT_SCALE : 1;
  const cu = (u - 0.5) / k + 0.5;
  const cv = (v - 0.5) / k + 0.5;
  const hw = STROKE_HALF;
  const d = Math.min(
    distToSegment(cu, cv, CHECK[0][0], CHECK[0][1], CHECK[1][0], CHECK[1][1]),
    distToSegment(cu, cv, CHECK[1][0], CHECK[1][1], CHECK[2][0], CHECK[2][1]),
  );
  if (d <= hw) [r, g, b] = WHITE;

  return [r, g, b, 255];
}

// Render an RGBA buffer with 4x4 supersampling (premultiplied averaging for AA).
function render(size, maskable) {
  const buf = Buffer.alloc(size * size * 4);
  const ss = 4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let sr = 0;
      let sg = 0;
      let sb = 0;
      let sa = 0;
      for (let sy = 0; sy < ss; sy++) {
        for (let sx = 0; sx < ss; sx++) {
          const u = (x + (sx + 0.5) / ss) / size;
          const v = (y + (sy + 0.5) / ss) / size;
          const [r, g, b, a] = sample(u, v, maskable);
          const af = a / 255;
          sr += r * af;
          sg += g * af;
          sb += b * af;
          sa += af;
        }
      }
      const n = ss * ss;
      const o = (y * size + x) * 4;
      const alpha = sa / n;
      if (alpha > 0) {
        buf[o] = Math.round(sr / sa);
        buf[o + 1] = Math.round(sg / sa);
        buf[o + 2] = Math.round(sb / sa);
      }
      buf[o + 3] = Math.round(alpha * 255);
    }
  }
  return buf;
}

// --- Minimal PNG encoder ----------------------------------------------------
const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, "ascii");
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  // 10-12 default (0)

  // Add filter byte (0) at the start of each scanline.
  const stride = size * 4;
  const raw = Buffer.alloc((stride + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const idat = deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// --- Write outputs ----------------------------------------------------------
const targets = [
  { size: 192, maskable: false, path: join(root, "public", "icon-192.png") },
  { size: 512, maskable: false, path: join(root, "public", "icon-512.png") },
  { size: 512, maskable: true, path: join(root, "public", "icon-maskable-512.png") },
  { size: 180, maskable: false, path: join(root, "src", "app", "apple-icon.png") },
];

mkdirSync(join(root, "public"), { recursive: true });

for (const { size, maskable, path } of targets) {
  const png = encodePng(size, render(size, maskable));
  writeFileSync(path, png);
  console.log(`wrote ${path} (${size}x${size}${maskable ? ", maskable" : ""}) — ${png.length} bytes`);
}
