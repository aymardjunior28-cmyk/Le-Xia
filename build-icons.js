/**
 * build-icons.js — Génère les icônes launcher + splash de l'app Android,
 * SANS dépendance externe (encodeur PNG pur via zlib).
 *
 * Design : fond bleu Douala (#0E5AA7 dégradé) + épingle blanche (discovery).
 * On lit les dimensions de chaque PNG existant puis on régénère à l'identique.
 *
 * Usage : node build-icons.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RES = path.join(__dirname, 'android', 'app', 'src', 'main', 'res');

// ---- Couleurs (RGBA) ----
const BG_TOP = [14, 90, 167, 255]; // #0E5AA7
const BG_BOT = [8, 44, 92, 255]; // #082C5C
const PIN = [255, 255, 255, 255];
const HOLE = [14, 90, 167, 255];

// ---- CRC32 ----
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

/** Encode un buffer RGBA (width*height*4) en PNG. */
function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  // Chaque scanline préfixée par un filter byte (0 = None)
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy ? rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride)
              : Buffer.from(rgba.subarray(y * stride, y * stride + stride)).copy(raw, y * (stride + 1) + 1);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

/** Lit les dimensions d'un PNG existant via IHDR. */
function pngSize(buf) {
  return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) };
}

// ---- Rendu ----
function makeCanvas(w, h) {
  return { w, h, data: Buffer.alloc(w * h * 4) };
}

function setPx(cv, x, y, [r, g, b, a]) {
  if (x < 0 || y < 0 || x >= cv.w || y >= cv.h) return;
  const i = (y * cv.w + x) * 4;
  cv.data[i] = r;
  cv.data[i + 1] = g;
  cv.data[i + 2] = b;
  cv.data[i + 3] = a;
}

function fillGradient(cv) {
  for (let y = 0; y < cv.h; y++) {
    const t = cv.h === 1 ? 0 : y / (cv.h - 1);
    const r = Math.round(BG_TOP[0] + (BG_BOT[0] - BG_TOP[0]) * t);
    const g = Math.round(BG_TOP[1] + (BG_BOT[1] - BG_TOP[1]) * t);
    const b = Math.round(BG_TOP[2] + (BG_BOT[2] - BG_TOP[2]) * t);
    for (let x = 0; x < cv.w; x++) setPx(cv, x, y, [r, g, b, 255]);
  }
}

function fillCircle(cv, cx, cy, r, color) {
  const r2 = r * r;
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) {
    for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= r2) setPx(cv, x, y, color);
    }
  }
}

// Triangle vers le bas (pointe de l'épingle).
function fillTriDown(cv, x0, x1, yTop, yTip, color) {
  for (let y = Math.floor(yTop); y <= Math.ceil(yTip); y++) {
    const t = (y - yTop) / (yTip - yTop);
    const half = ((x1 - x0) / 2) * (1 - t);
    const cx = (x0 + x1) / 2;
    for (let x = Math.floor(cx - half); x <= Math.ceil(cx + half); x++) {
      setPx(cv, x, y, color);
    }
  }
}

/** Dessine l'épingle (cercle + pointe + trou) centrée dans cv. */
function drawPin(cv, color, holeColor) {
  const cx = cv.w / 2;
  const cy = cv.h * 0.42;
  const r = Math.min(cv.w, cv.h) * 0.2;
  // Tête
  fillCircle(cv, cx, cy, r, color);
  // Pointe (triangle)
  fillTriDown(cv, cx - r * 0.82, cx + r * 0.82, cy, cy + r * 2.05, color);
  // Trou
  fillCircle(cv, cx, cy, r * 0.42, holeColor);
}

/** Masque en cercle (coins transparents) — pour ic_launcher_round. */
function maskCircle(cv) {
  const cx = cv.w / 2;
  const cy = cv.h / 2;
  const r = Math.min(cv.w, cv.h) / 2;
  const r2 = r * r;
  for (let y = 0; y < cv.h; y++) {
    for (let x = 0; x < cv.w; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy > r2) {
        const i = (y * cv.w + x) * 4;
        cv.data[i + 3] = 0;
      }
    }
  }
}

function render(w, h, { background, round, pin }) {
  const cv = makeCanvas(w, h);
  if (background) fillGradient(cv);
  else {
    // transparent
    for (let i = 3; i < cv.data.length; i += 4) cv.data[i] = 0;
  }
  if (pin) drawPin(cv, PIN, background ? HOLE : [0, 0, 0, 0]);
  if (round) maskCircle(cv);
  return encodePNG(w, h, cv.data);
}

module.exports = { encodePNG, pngSize, render, makeCanvas, fillGradient, drawPin, maskCircle };

// ---------------------------------------------------------------------------
// MAIN : régénère chaque PNG d'icône/splash à ses dimensions exactes.
// ---------------------------------------------------------------------------
function walkPngs(dir) {
  const out = [];
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkPngs(full));
    else if (entry.name.toLowerCase().endsWith('.png')) out.push(full);
  }
  return out;
}

function main() {
  const targets = walkPngs(RES);
  let count = 0;
  for (const file of targets) {
    const name = path.basename(file).toLowerCase();
    const rel = path.relative(RES, file).replace(/\\/g, '/');
    let opts;
    if (name === 'ic_launcher.png') {
      opts = { background: true, round: false, pin: true };
    } else if (name === 'ic_launcher_round.png') {
      opts = { background: true, round: true, pin: true };
    } else if (name === 'ic_launcher_foreground.png') {
      // Plan de premier-plan de l'icône adaptive : transparent + épingle.
      opts = { background: false, round: false, pin: true };
    } else if (name === 'splash.png') {
      opts = { background: true, round: false, pin: true };
    } else {
      continue;
    }
    let size;
    try {
      size = pngSize(fs.readFileSync(file));
    } catch (e) {
      console.warn('[build-icons] PNG illisible, ignoré :', rel, e.message);
      continue;
    }
    const png = render(size.w, size.h, opts);
    fs.writeFileSync(file, png);
    count++;
    console.log(`[build-icons] ${rel} (${size.w}x${size.h}) régénéré`);
  }
  console.log(`[build-icons] Terminé — ${count} PNG régénérés.`);
}

if (require.main === module) main();

