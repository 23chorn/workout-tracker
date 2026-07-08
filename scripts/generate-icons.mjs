import { createCanvas } from 'canvas';
import { writeFileSync } from 'fs';

function drawIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const s = size / 512; // scale factor

  // Background — rubber-floor black
  ctx.fillStyle = '#14120f';
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, 64 * s);
  ctx.fill();

  // Barbell — tempered steel
  const cy = 220 * s;
  const barY = cy - 8 * s;
  const barH = 16 * s;

  // Bar
  ctx.fillStyle = '#5b8a99';
  ctx.fillRect(74 * s, barY, 364 * s, barH);

  // Left plates — inner (big) then outer (small)
  // Inner plate (big, next to collar)
  ctx.fillStyle = '#5b8a99';
  ctx.beginPath();
  ctx.roundRect(108 * s, cy - 70 * s, 32 * s, 140 * s, 6 * s);
  ctx.fill();
  // Outer plate (small, near end)
  ctx.fillStyle = '#7fa8b5';
  ctx.beginPath();
  ctx.roundRect(74 * s, cy - 50 * s, 28 * s, 100 * s, 6 * s);
  ctx.fill();

  // Right plates — inner (big) then outer (small)
  // Inner plate (big, next to collar)
  ctx.fillStyle = '#5b8a99';
  ctx.beginPath();
  ctx.roundRect(372 * s, cy - 70 * s, 32 * s, 140 * s, 6 * s);
  ctx.fill();
  // Outer plate (small, near end)
  ctx.fillStyle = '#7fa8b5';
  ctx.beginPath();
  ctx.roundRect(410 * s, cy - 50 * s, 28 * s, 100 * s, 6 * s);
  ctx.fill();

  // Left collar
  ctx.fillStyle = '#3f6570';
  ctx.fillRect(148 * s, cy - 16 * s, 16 * s, 32 * s);

  // Right collar
  ctx.fillStyle = '#3f6570';
  ctx.fillRect(348 * s, cy - 16 * s, 16 * s, 32 * s);

  // Left end cap
  ctx.fillStyle = '#3f6570';
  ctx.beginPath();
  ctx.roundRect(44 * s, cy - 14 * s, 26 * s, 28 * s, 4 * s);
  ctx.fill();

  // Right end cap
  ctx.fillStyle = '#3f6570';
  ctx.beginPath();
  ctx.roundRect(442 * s, cy - 14 * s, 26 * s, 28 * s, 4 * s);
  ctx.fill();

  // "LIFT" text — draw with fill + stroke for bold effect since server fonts lack weights
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';

  const fontSize = 140 * s;
  ctx.font = `bold ${fontSize}px sans-serif`;
  ctx.letterSpacing = `${8 * s}px`;

  const textY = 310 * s;
  const textX = size / 2;

  // Stroke for extra weight
  ctx.strokeStyle = '#f3ede0';
  ctx.lineWidth = 6 * s;
  ctx.lineJoin = 'round';
  ctx.strokeText('LIFT', textX, textY);

  // Fill — chalk white
  ctx.fillStyle = '#f3ede0';
  ctx.fillText('LIFT', textX, textY);

  return canvas;
}

// Generate both sizes
for (const size of [192, 512]) {
  const canvas = drawIcon(size);
  const buffer = canvas.toBuffer('image/png');
  writeFileSync(`public/icon-${size}.png`, buffer);
  console.log(`Generated icon-${size}.png (${buffer.length} bytes)`);
}
