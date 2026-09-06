// Regenerates the app-icon / adaptive-icon / notification-icon / splash PNGs
// directly from the authoritative shapes in docs/design_system/assets
// (app-icon.svg, logo-mark.svg) using pure-JS rounded-rect rasterization
// (pngjs) since no sharp/ImageMagick/rsvg is available in this environment.
// Re-run after any brand geometry or color change; do not hand-edit the PNGs.
const { PNG } = require('pngjs');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets', 'brand');

function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

// Signed-distance-based rounded-rect coverage, 1px feather for AA.
function rectCoverage(px, py, cx, cy, w, h, r) {
  const dx = Math.max(Math.abs(px - cx) - (w / 2 - r), 0);
  const dy = Math.max(Math.abs(py - cy) - (h / 2 - r), 0);
  const dist = Math.sqrt(dx * dx + dy * dy) - r;
  return Math.max(0, Math.min(1, 0.5 - dist));
}

function newCanvas(size) {
  const png = new PNG({ width: size, height: size });
  png.data.fill(0); // transparent
  return png;
}

function fillRoundedRect(png, size, x, y, w, h, r, [cr, cg, cb], opacity = 1) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const x0 = Math.max(0, Math.floor(x - 2));
  const x1 = Math.min(size, Math.ceil(x + w + 2));
  const y0 = Math.max(0, Math.floor(y - 2));
  const y1 = Math.min(size, Math.ceil(y + h + 2));
  for (let py = y0; py < y1; py++) {
    for (let px = x0; px < x1; px++) {
      const cov = rectCoverage(px + 0.5, py + 0.5, cx, cy, w, h, r) * opacity;
      if (cov <= 0) continue;
      const idx = (size * py + px) << 2;
      const srcA = cov;
      const dstA = png.data[idx + 3] / 255;
      const outA = srcA + dstA * (1 - srcA);
      if (outA <= 0) continue;
      for (let c = 0; c < 3; c++) {
        const srcC = [cr, cg, cb][c];
        const dstC = png.data[idx + c];
        png.data[idx + c] = Math.round((srcC * srcA + dstC * dstA * (1 - srcA)) / outA);
      }
      png.data[idx + 3] = Math.round(outA * 255);
    }
  }
}

function savePng(png, name) {
  const filePath = path.join(OUT, name);
  fs.writeFileSync(filePath, PNG.sync.write(png));
  console.log('wrote', filePath);
}

const BRAND = hexToRgb('#5B5FEF');
const WHITE = [255, 255, 255];

// --- app-icon.svg geometry (1024 viewBox, used verbatim) ---
function drawSquareIcon(size) {
  const png = newCanvas(size);
  const s = size / 1024;
  fillRoundedRect(png, size, 0, 0, size, size, 224 * s, BRAND, 1);
  fillRoundedRect(png, size, 224 * s, 330 * s, 576 * s, 106 * s, 53 * s, WHITE, 1);
  fillRoundedRect(png, size, 224 * s, 489 * s, 379 * s, 106 * s, 53 * s, WHITE, 1);
  fillRoundedRect(png, size, 224 * s, 648 * s, 212 * s, 106 * s, 53 * s, WHITE, 0.55);
  return png;
}

// Bars only, transparent background — shared by the adaptive-icon foreground
// and the notification icon (both need a silhouette, not the square tile).
function drawBarsOnly(size, color, thirdOpacity) {
  const png = newCanvas(size);
  const s = size / 1024;
  fillRoundedRect(png, size, 224 * s, 330 * s, 576 * s, 106 * s, 53 * s, color, 1);
  fillRoundedRect(png, size, 224 * s, 489 * s, 379 * s, 106 * s, 53 * s, color, 1);
  fillRoundedRect(png, size, 224 * s, 648 * s, 212 * s, 106 * s, 53 * s, color, thirdOpacity);
  return png;
}

savePng(drawSquareIcon(1024), 'icon-1024-light.png');
savePng(drawSquareIcon(1024), 'icon-1024-dark.png');
savePng(drawBarsOnly(1024, WHITE, 0.55), 'adaptive-foreground.png');
savePng(drawBarsOnly(432, WHITE, 1), 'notification-icon.png');
savePng(drawBarsOnly(512, hexToRgb('#5B5FEF'), 1), 'splash-mark.png');
