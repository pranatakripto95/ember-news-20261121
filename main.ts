// Ember News 21 November — a one-page front page drawn entirely in code.
// Saturday 21 November 2026 world news. No network, no external images:
// every pixel is plotted by the code below into a 1024x1024 PNG.
import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const W = 1024;
const H = 1024;

// ---- palette: newsprint on cream paper -------------------------------------
const PAPER = [247, 242, 231];
const INK = [26, 26, 26];
const RED = [179, 38, 30];
const BLUE = [31, 78, 121];
const TEAL = [14, 110, 105];
const GOLD = [196, 141, 26];
const GREEN = [46, 125, 50];
const ORANGE = [214, 92, 20];
const GREY = [110, 104, 92];
const LIGHT = [232, 224, 205];
const WHITE = [255, 255, 255];

// ---- pixel canvas -----------------------------------------------------------
const px = new Uint8Array(W * H * 3);
function fillAll(c: number[]) {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0]; px[i * 3 + 1] = c[1]; px[i * 3 + 2] = c[2];
  }
}
function setPix(x: number, y: number, c: number[]) {
  x = Math.round(x); y = Math.round(y);
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]) {
  const x0 = Math.max(0, x), y0 = Math.max(0, y);
  const x1 = Math.min(W, x + w), y1 = Math.min(H, y + h);
  for (let yy = y0; yy < y1; yy++)
    for (let xx = x0; xx < x1; xx++) setPix(xx, yy, c);
}
function hline(x: number, y: number, w: number, c: number[], t = 1) {
  rect(x, y, w, t, c);
}
function vline(x: number, y: number, h: number, c: number[], t = 1) {
  rect(x, y, t, h, c);
}
function disc(cx: number, cy: number, r: number, c: number[]) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++)
      if (x * x + y * y <= r * r) setPix(cx + x, cy + y, c);
}
function ring(cx: number, cy: number, r: number, t: number, c: number[]) {
  for (let y = -r; y <= r; y++)
    for (let x = -r; x <= r; x++) {
      const d = Math.sqrt(x * x + y * y);
      if (d <= r && d >= r - t) setPix(cx + x, cy + y, c);
    }
}
function tri(x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number[]) {
  const minX = Math.max(0, Math.min(x0, x1, x2)), maxX = Math.min(W - 1, Math.max(x0, x1, x2));
  const minY = Math.max(0, Math.min(y0, y1, y2)), maxY = Math.min(H - 1, Math.max(y0, y1, y2));
  const d = (y1 - y2) * (x0 - x2) + (x2 - x1) * (y0 - y2);
  if (d === 0) return;
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const a = ((y1 - y2) * (x - x2) + (x2 - x1) * (y - y2)) / d;
      const b = ((y2 - y0) * (x - x2) + (x0 - x2) * (y - y2)) / d;
      const g = 1 - a - b;
      if (a >= 0 && b >= 0 && g >= 0) setPix(x, y, c);
    }
}
// thick line between two points: parametric, always terminates
function line(x0: number, y0: number, x1: number, y1: number, c: number[], t = 1) {
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))));
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    rect(Math.round(x0 + (x1 - x0) * f) - Math.floor(t / 2),
      Math.round(y0 + (y1 - y0) * f) - Math.floor(t / 2), t, t, c);
  }
}

// ---- 5x7 bitmap font (capitals, digits, punctuation) -----------------------
// Each glyph is 7 rows; each row is a 5-bit number, bit 4 = leftmost pixel.
const FONT: Record<string, number[]> = {
  A: [0x0e, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  B: [0x1e, 0x11, 0x11, 0x1e, 0x11, 0x11, 0x1e],
  C: [0x0e, 0x11, 0x10, 0x10, 0x10, 0x11, 0x0e],
  D: [0x1e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x1e],
  E: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x1f],
  F: [0x1f, 0x10, 0x10, 0x1e, 0x10, 0x10, 0x10],
  G: [0x0e, 0x11, 0x10, 0x17, 0x11, 0x11, 0x0f],
  H: [0x11, 0x11, 0x11, 0x1f, 0x11, 0x11, 0x11],
  I: [0x0e, 0x04, 0x04, 0x04, 0x04, 0x04, 0x0e],
  J: [0x07, 0x02, 0x02, 0x02, 0x02, 0x12, 0x0c],
  K: [0x11, 0x12, 0x14, 0x18, 0x14, 0x12, 0x11],
  L: [0x10, 0x10, 0x10, 0x10, 0x10, 0x10, 0x1f],
  M: [0x11, 0x1b, 0x15, 0x15, 0x11, 0x11, 0x11],
  N: [0x11, 0x19, 0x15, 0x13, 0x11, 0x11, 0x11],
  O: [0x0e, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  P: [0x1e, 0x11, 0x11, 0x1e, 0x10, 0x10, 0x10],
  Q: [0x0e, 0x11, 0x11, 0x11, 0x15, 0x12, 0x0d],
  R: [0x1e, 0x11, 0x11, 0x1e, 0x14, 0x12, 0x11],
  S: [0x0f, 0x10, 0x10, 0x0e, 0x01, 0x01, 0x1e],
  T: [0x1f, 0x04, 0x04, 0x04, 0x04, 0x04, 0x04],
  U: [0x11, 0x11, 0x11, 0x11, 0x11, 0x11, 0x0e],
  V: [0x11, 0x11, 0x11, 0x11, 0x11, 0x0a, 0x04],
  W: [0x11, 0x11, 0x11, 0x15, 0x15, 0x15, 0x0a],
  X: [0x11, 0x11, 0x0a, 0x04, 0x0a, 0x11, 0x11],
  Y: [0x11, 0x11, 0x0a, 0x04, 0x04, 0x04, 0x04],
  Z: [0x1f, 0x01, 0x02, 0x04, 0x08, 0x10, 0x1f],
  "0": [0x0e, 0x11, 0x13, 0x15, 0x19, 0x11, 0x0e],
  "1": [0x04, 0x0c, 0x04, 0x04, 0x04, 0x04, 0x0e],
  "2": [0x0e, 0x11, 0x01, 0x06, 0x08, 0x10, 0x1f],
  "3": [0x1f, 0x02, 0x04, 0x02, 0x01, 0x11, 0x0e],
  "4": [0x02, 0x06, 0x0a, 0x12, 0x1f, 0x02, 0x02],
  "5": [0x1f, 0x10, 0x1e, 0x01, 0x01, 0x11, 0x0e],
  "6": [0x06, 0x08, 0x10, 0x1e, 0x11, 0x11, 0x0e],
  "7": [0x1f, 0x01, 0x02, 0x04, 0x08, 0x08, 0x08],
  "8": [0x0e, 0x11, 0x11, 0x0e, 0x11, 0x11, 0x0e],
  "9": [0x0e, 0x11, 0x11, 0x0f, 0x01, 0x02, 0x0c],
  " ": [0, 0, 0, 0, 0, 0, 0],
  ".": [0, 0, 0, 0, 0, 0x0c, 0x0c],
  ",": [0, 0, 0, 0, 0x0c, 0x04, 0x08],
  ":": [0, 0x0c, 0x0c, 0, 0x0c, 0x0c, 0],
  ";": [0, 0x0c, 0x0c, 0, 0x0c, 0x04, 0x08],
  "'": [0x04, 0x04, 0x08, 0, 0, 0, 0],
  "-": [0, 0, 0, 0x0e, 0, 0, 0],
  "!": [0x04, 0x04, 0x04, 0x04, 0x04, 0, 0x04],
  "?": [0x0e, 0x11, 0x01, 0x06, 0x04, 0, 0x04],
  "(": [0x02, 0x04, 0x08, 0x08, 0x08, 0x04, 0x02],
  ")": [0x08, 0x04, 0x02, 0x02, 0x02, 0x04, 0x08],
  "/": [0x01, 0x02, 0x02, 0x04, 0x08, 0x08, 0x10],
  "&": [0x0c, 0x12, 0x14, 0x08, 0x15, 0x12, 0x0d],
  "%": [0x19, 0x1a, 0x02, 0x04, 0x08, 0x0b, 0x13],
  "$": [0x04, 0x0f, 0x14, 0x0e, 0x05, 0x1e, 0x04],
  "+": [0, 0x04, 0x04, 0x1f, 0x04, 0x04, 0],
  "=": [0, 0, 0x1f, 0, 0x1f, 0, 0],
  '"': [0x0a, 0x0a, 0, 0, 0, 0, 0],
  "*": [0, 0x15, 0x0e, 0x15, 0, 0, 0],
  "#": [0x0a, 0x0a, 0x1f, 0x0a, 0x1f, 0x0a, 0x0a],
  _: [0, 0, 0, 0, 0, 0, 0x1f],
  "\u2022": [0, 0x04, 0x0e, 0x0e, 0x04, 0, 0],
};
const CHAR_W = 6; // 5 px glyph + 1 px gap, before scaling
function textWidth(s: string, sc: number): number {
  return s.length * CHAR_W * sc - sc;
}
function drawChar(ch: string, x: number, y: number, sc: number, c: number[]) {
  const g = FONT[ch];
  if (!g) return;
  for (let r = 0; r < 7; r++)
    for (let col = 0; col < 5; col++)
      if ((g[r] >> (4 - col)) & 1)
        rect(x + col * sc, y + r * sc, sc, sc, c);
}
function drawText(s: string, x: number, y: number, sc: number, c: number[]) {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    drawChar(ch, cx, y, sc, c);
    cx += CHAR_W * sc;
  }
}
function drawTextCentered(s: string, cx: number, y: number, sc: number, c: number[]) {
  drawText(s, cx - Math.floor(textWidth(s, sc) / 2), y, sc, c);
}
// Wrap plain words to lines that fit maxW px at scale sc. Returns lines.
function wrap(s: string, maxW: number, sc: number): string[] {
  const words = s.toUpperCase().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? cur + " " + w : w;
    if (textWidth(test, sc) <= maxW || !cur) cur = test;
    else { lines.push(cur); cur = w; }
  }
  if (cur) lines.push(cur);
  return lines;
}
// Draw wrapped paragraph; returns y just below the last line.
function para(s: string, x: number, y: number, maxW: number, sc: number, c: number[], lh?: number): number {
  const lines = wrap(s, maxW, sc);
  const step = lh ?? (8 * sc + 2);
  lines.forEach((ln, i) => drawText(ln, x, y + i * step, sc, c));
  return y + lines.length * step;
}

// ---- PNG encoder (8-bit RGB, filter 0, zlib via stdlib) ----------------------
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(Buffer.concat([Buffer.from(type, "ascii"), data])), 8 + data.length);
  return out;
}
function encodePNG(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  return Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
}

// ---- small drawn illustrations, one per story --------------------------------
// Globe with heat waves (COP31 climate talks, Antalya).
function iconGlobe(x: number, y: number, s: number) {
  disc(x + 52 * s, y + 46 * s, 44 * s, BLUE);
  ring(x + 52 * s, y + 46 * s, 44 * s, 3 * s, INK);
  // land masses: rough blobs in paper colour
  disc(x + 34 * s, y + 30 * s, 12 * s, PAPER);
  disc(x + 62 * s, y + 58 * s, 14 * s, PAPER);
  disc(x + 70 * s, y + 28 * s, 8 * s, PAPER);
  disc(x + 30 * s, y + 62 * s, 7 * s, PAPER);
  // equator + meridians
  hline(x + 10 * s, y + 46 * s, 84 * s, INK, 2 * s);
  vline(x + 52 * s, y + 4 * s, 84 * s, INK, 2 * s);
  // rising heat: three orange wavy columns above the globe
  for (let i = 0; i < 3; i++) {
    const hx = x + (26 + i * 26) * s;
    line(hx, y + 2 * s, hx + 4 * s, y - 8 * s, ORANGE, 3 * s);
    line(hx + 4 * s, y - 8 * s, hx, y - 16 * s, ORANGE, 3 * s);
  }
  // thermometer at the side
  rect(x + 96 * s, y + 30 * s, 6 * s, 34 * s, RED);
  disc(x + 99 * s, y + 66 * s, 7 * s, RED);
}
// Bridge over a river, struck (Kyiv bridges).
function iconBridge(x: number, y: number, s: number) {
  // sky + smoke
  disc(x + 20 * s, y + 16 * s, 7 * s, GREY);
  disc(x + 30 * s, y + 10 * s, 5 * s, GREY);
  disc(x + 82 * s, y + 14 * s, 6 * s, GREY);
  // deck
  rect(x + 4 * s, y + 44 * s, 96 * s, 6 * s, INK);
  // two arches under the deck
  for (const ax of [24, 68]) {
    line(x + ax * s, y + 50 * s, x + (ax + 10) * s, y + 66 * s, INK, 3 * s);
    line(x + (ax + 20) * s, y + 50 * s, x + (ax + 10) * s, y + 66 * s, INK, 3 * s);
  }
  // broken middle span: gap + tilted piece
  rect(x + 44 * s, y + 44 * s, 12 * s, 6 * s, PAPER);
  line(x + 46 * s, y + 46 * s, x + 54 * s, y + 58 * s, RED, 3 * s);
  // river
  rect(x + 4 * s, y + 70 * s, 96 * s, 10 * s, BLUE);
  hline(x + 10 * s, y + 74 * s, 30 * s, WHITE, 2 * s);
  hline(x + 60 * s, y + 77 * s, 26 * s, WHITE, 2 * s);
  // warning star
  tri(x + 52 * s, y + 22 * s, x + 44 * s, y + 38 * s, x + 60 * s, y + 38 * s, GOLD);
}
// Three marching figures with placards (Paris, Yellow Vests Act VI).
function iconMarch(x: number, y: number, s: number) {
  const cols = [GOLD, RED, BLUE];
  for (let i = 0; i < 3; i++) {
    const bx = x + (12 + i * 30) * s;
    // head
    disc(bx + 8 * s, y + 10 * s, 6 * s, INK);
    // high-vis vest body
    rect(bx, y + 18 * s, 16 * s, 26 * s, cols[i]);
    rect(bx, y + 18 * s, 16 * s, 4 * s, INK);
    // legs mid-stride
    line(bx + 4 * s, y + 44 * s, bx - 2 * s, y + 64 * s, INK, 3 * s);
    line(bx + 12 * s, y + 44 * s, bx + 18 * s, y + 64 * s, INK, 3 * s);
    // arm up holding a placard stick
    line(bx + 14 * s, y + 24 * s, bx + 22 * s, y + 6 * s, INK, 3 * s);
  }
  // one shared placard
  rect(x + 58 * s, y - 2 * s, 40 * s, 16 * s, PAPER);
  rect(x + 58 * s, y - 2 * s, 40 * s, 16 * s, INK); // outline via full rect then inner paper
  rect(x + 60 * s, y, 36 * s, 12 * s, PAPER);
  drawText("8 ANS", x + 62 * s, y + 2 * s, 1, RED);
}
// Rising bars with an arrow (NSE passes Nasdaq).
function iconChart(x: number, y: number, s: number) {
  const bars = [18, 30, 26, 42, 58];
  for (let i = 0; i < bars.length; i++) {
    const bh = bars[i] * s;
    rect(x + (6 + i * 18) * s, y + 66 * s - bh, 12 * s, bh, i === bars.length - 1 ? GREEN : BLUE);
  }
  hline(x + 2 * s, y + 66 * s, 96 * s, INK, 3 * s);
  // arrow climbing over the bars
  line(x + 6 * s, y + 52 * s, x + 50 * s, y + 22 * s, RED, 4 * s);
  line(x + 50 * s, y + 22 * s, x + 92 * s, y + 6 * s, RED, 4 * s);
  tri(x + 92 * s, y + 6 * s, x + 80 * s, y + 2 * s, x + 82 * s, y + 16 * s, RED);
  drawText("5TH", x + 6 * s, y + 4 * s, 2, RED);
}
// Cricket bat, ball and stumps (India fight back in Wellington).
function iconCricket(x: number, y: number, s: number) {
  // stumps
  for (let i = 0; i < 3; i++) rect(x + (16 + i * 8) * s, y + 34 * s, 3 * s, 34 * s, GOLD);
  rect(x + 16 * s, y + 32 * s, 22 * s, 3 * s, GOLD);
  // bat: ink-outlined blade leaning on the stumps
  line(x + 66 * s, y + 10 * s, x + 82 * s, y + 56 * s, INK, 13 * s);
  line(x + 66 * s, y + 10 * s, x + 82 * s, y + 56 * s, PAPER, 9 * s);
  // red ball with seam
  disc(x + 88 * s, y + 20 * s, 9 * s, RED);
  line(x + 82 * s, y + 14 * s, x + 94 * s, y + 26 * s, WHITE, 2 * s);
  // ground
  hline(x + 4 * s, y + 68 * s, 96 * s, GREEN, 4 * s);
}
// Flame over a tree line (Indonesia fires).
function iconFire(x: number, y: number, s: number) {
  // trees
  for (let i = 0; i < 4; i++) {
    const tx = x + (8 + i * 24) * s;
    tri(tx, y + 44 * s, tx - 10 * s, y + 68 * s, tx + 10 * s, y + 68 * s, GREEN);
    rect(tx - 2 * s, y + 68 * s, 4 * s, 8 * s, INK);
  }
  // big flame
  tri(x + 52 * s, y + 2 * s, x + 30 * s, y + 52 * s, x + 74 * s, y + 52 * s, ORANGE);
  tri(x + 52 * s, y + 22 * s, x + 40 * s, y + 52 * s, x + 64 * s, y + 52 * s, GOLD);
  // smoke
  disc(x + 22 * s, y + 12 * s, 6 * s, GREY);
  disc(x + 84 * s, y + 10 * s, 5 * s, GREY);
  disc(x + 76 * s, y + 2 * s, 4 * s, GREY);
}

// ---- page furniture ----------------------------------------------------------
const M = 28; // outer margin
function tag(x: number, y: number, label: string, c: number[]) {
  rect(x, y, 12, 12, c);
  drawText(label, x + 20, y - 1, 2, c);
}
function rule(y: number, c: number[], t = 2) {
  hline(M, y, W - 2 * M, c, t);
}

function main() {
  fillAll(PAPER);
  // faint paper texture: deterministic speckle on the margins only
  for (let i = 0; i < 260; i++) {
    const x = (i * 7919) % W, y = (i * 104729) % H;
    if (x < M || x > W - M) setPix(x, y, LIGHT);
  }

  // ---- masthead ----
  rect(0, 0, W, 8, RED);
  drawTextCentered("EMBER NEWS", W / 2, 22, 8, INK);
  drawTextCentered("SATURDAY 21 NOVEMBER 2026", W / 2, 92, 3, RED);
  hline(M, 116, W - 2 * M, INK, 3);
  hline(M, 121, W - 2 * M, INK, 1);
  drawTextCentered("THE WORLD IN ONE PAGE", W / 2, 128, 1, GREY);

  // ---- lead story: COP31 overtime, Antalya ----
  tag(M, 152, "LEAD STORY  -  ANTALYA, TURKEY", RED);
  para("CLIMATE TALKS RUN INTO OVERTIME", M, 176, 600, 4, INK, 34);
  drawText("FOSSIL FUELS CUT FROM DRAFT TEXT", M, 250, 2, RED);
  para(
    "COP31 IN ANTALYA HAS PASSED ITS FRIDAY DEADLINE WITH NO DEAL. THE LATEST DRAFT DROPS ALL MENTION OF FOSSIL FUELS AND A THIRD TEXT IS DUE ON SATURDAY. ACTIVISTS CALL IT THE WORST COP EVER.",
    M, 278, 600, 2, INK, 19,
  );
  // stat chips under the lead deck
  const chips = ["1.5C GOAL AT RISK", "200 NATIONS", "3RD DRAFT DUE SAT"];
  let chipX = M;
  for (const cp of chips) {
    const cw = textWidth(cp, 1) + 16;
    rect(chipX, 372, cw, 22, LIGHT);
    rect(chipX, 372, cw, 22, INK); // outline pass below re-covers centre
    rect(chipX + 1, 373, cw - 2, 20, LIGHT);
    drawText(cp, chipX + 8, 378, 1, INK);
    chipX += cw + 10;
  }
  iconGlobe(692, 168, 2);
  drawTextCentered("ANTALYA, TURKEY", 800, 372, 1, GREY);
  rule(412, INK, 2);

  // ---- middle row: Ukraine + Paris ----
  const midY = 428;
  const colW = 472;
  const col2X = M + colW + 24;
  vline(M + colW + 12, midY, 210, GREY, 1);

  // Ukraine
  tag(M, midY, "UKRAINE", RED);
  iconBridge(M, midY + 24, 1.2);
  para("FRANCE SEEKS UN TALKS AFTER KYIV BARRAGE", M + 140, midY + 26, 332, 3, INK, 25);
  para(
    "RUSSIA'S HUGE STRIKE HIT THREE KYIV BRIDGES AND CUT POWER AND HEAT. IN KRYVYI RIH, TWO WERE KILLED AND 42 HURT. FRANCE NOW WANTS THE UN COUNCIL TO MEET.",
    M, midY + 128, colW, 2, INK, 19,
  );
  // Paris
  tag(col2X, midY, "FRANCE", RED);
  iconMarch(col2X, midY + 24, 1.2);
  para("YELLOW VESTS MARCH ON PARIS", col2X + 140, midY + 26, 332, 3, INK, 25);
  para(
    "UNIONS AND YELLOW VESTS MARCH TOGETHER OVER LIVING COSTS ON THE MOVEMENT'S EIGHTH BIRTHDAY. 16 METRO STATIONS CLOSE ON THE ROUTE TO NATION.",
    col2X, midY + 128, colW, 2, INK, 19,
  );
  rule(652, INK, 2);

  // ---- bottom row: three stories ----
  const botY = 668;
  const bColW = 312;
  const b2X = M + bColW + 16, b3X = M + 2 * (bColW + 16);
  vline(M + bColW + 8, botY, 262, GREY, 1);
  vline(M + 2 * bColW + 24, botY, 262, GREY, 1);

  // Markets: NSE passes Nasdaq
  tag(M, botY, "MARKETS", GREEN);
  iconChart(M + 96, botY + 24, 1);
  para("NSE PASSES NASDAQ", M, botY + 116, bColW, 3, INK, 25);
  para(
    "INDIA'S NSE IS NOW THE WORLD'S 5TH-LARGEST LISTED EXCHANGE AT $59.7BN, AHEAD OF NASDAQ AND HKEX.",
    M, botY + 172, bColW, 2, INK, 19,
  );
  // Sport: India fight back in Wellington
  tag(b2X, botY, "SPORT", BLUE);
  iconCricket(b2X + 96, botY + 24, 1);
  para("INDIA FIGHT BACK IN WELLINGTON", b2X, botY + 116, bColW, 3, INK, 25);
  para(
    "JAISWAL 85, RAHUL 52 NOT OUT AS INDIA REACH 159 FOR 1 AFTER NEW ZEALAND'S 368. NICHOLLS 175 NOT OUT.",
    b2X, botY + 172, bColW, 2, INK, 19,
  );
  // Climate: Indonesia fires
  tag(b3X, botY, "CLIMATE", ORANGE);
  iconFire(b3X + 96, botY + 24, 1);
  para("INDONESIA FIRE BILL: $30BN", b3X, botY + 116, bColW, 3, INK, 25);
  para(
    "FIRES COULD COST UP TO $30.9BN. EMISSIONS ARE THE THIRD HIGHEST ON RECORD AT NEARLY 200M TONNES.",
    b3X, botY + 172, bColW, 2, INK, 19,
  );

  // ---- footer strip ----
  rect(0, 942, W, 62, INK);
  drawTextCentered(
    "ALSO: SENSEX UP 898 TO 83,919.71 - MALAYSIA TO RESETTLE 10,000 ROHINGYA",
    W / 2, 956, 2, WHITE,
  );
  drawTextCentered("EMBER NEWS - DRAWN IN CODE - SATURDAY 21 NOVEMBER 2026", W / 2, 982, 1, LIGHT);

  const outDir = process.env.MAKEFUN_OUTPUT_DIR || "/output";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/entry.png`, encodePNG());
  console.log("wrote entry.png");
}

main();
