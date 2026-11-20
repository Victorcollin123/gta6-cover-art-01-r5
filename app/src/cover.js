// Leonida Nights — cover renderer.
// Draws a whole GTA-style loading-screen cover onto a canvas: a procedural
// Vice City scene (sunset sky, sun, skyline, palms), a hero photo frame, and
// bold caption lettering. Everything is drawn with the 2D canvas API, so the
// app works fully offline and the exported PNG is exactly what the preview
// shows. All randomness is seeded, so the same state always draws the same
// cover.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    sky: ['#1a0b2e', '#7b1e5b', '#ff7e3d', '#ff2e88'],
    sun: '#ffd166',
    sunGlow: 'rgba(255, 150, 60, 0.55)',
    far: 'rgba(64, 20, 80, 0.85)',
    near: '#160a24',
    window: '#ffd166',
    ground: '#0d0616',
    accent: '#ffb347',
    stars: false,
  },
  neon: {
    label: 'Neon Night',
    sky: ['#050510', '#2b0a4d', '#7b2ff7', '#00e5ff'],
    sun: '#ff2ea6',
    sunGlow: 'rgba(255, 46, 166, 0.5)',
    far: 'rgba(30, 10, 70, 0.9)',
    near: '#070418',
    window: '#00e5ff',
    ground: '#05030f',
    accent: '#00e5ff',
    stars: true,
  },
  pastel: {
    label: 'Pastel Vice',
    sky: ['#2b1b4a', '#8a5f9e', '#ffb3c7', '#ffe29a'],
    sun: '#fff3b0',
    sunGlow: 'rgba(255, 220, 150, 0.5)',
    far: 'rgba(90, 60, 120, 0.8)',
    near: '#241640',
    window: '#ffe29a',
    ground: '#1c1030',
    accent: '#ffb3c7',
    stars: false,
  },
  noir: {
    label: 'Noir',
    sky: ['#050505', '#1c1c1c', '#4a4a4a', '#9a9a9a'],
    sun: '#e8e8e8',
    sunGlow: 'rgba(220, 220, 220, 0.35)',
    far: 'rgba(30, 30, 30, 0.9)',
    near: '#0a0a0a',
    window: '#f5f5f5',
    ground: '#080808',
    accent: '#e8e8e8',
    stars: true,
  },
};

export const MODES = {
  loading: 'Loading Screen',
  magazine: 'Magazine',
  wanted: 'Wanted Poster',
};

/** Deterministic pseudo-random generator (mulberry32). Same seed, same scene. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function roundRectPath(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

/** Fits `text` to `maxWidth` by shrinking the font, returns the font size used. */
function fitFont(ctx, text, startSize, maxWidth, weight = 900) {
  let size = startSize;
  ctx.font = `${weight} ${size}px "Arial Black", Arial, sans-serif`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `${weight} ${size}px "Arial Black", Arial, sans-serif`;
  }
  return size;
}

function drawSky(ctx, w, h, grade, rng) {
  const sky = ctx.createLinearGradient(0, 0, 0, h * 0.72);
  grade.sky.forEach((colour, i) => sky.addColorStop(i / (grade.sky.length - 1), colour));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  if (grade.stars) {
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 90; i += 1) {
      const x = rng() * w;
      const y = rng() * h * 0.4;
      const r = rng() * 1.6 + 0.4;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSun(ctx, w, h, grade) {
  const cx = w * 0.27;
  const cy = h * 0.42;
  const r = Math.min(w, h) * 0.15;
  const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 2.4);
  glow.addColorStop(0, grade.sunGlow);
  glow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(cx - r * 2.4, cy - r * 2.4, r * 4.8, r * 4.8);
  ctx.fillStyle = grade.sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawSkyline(ctx, w, h, grade, rng, horizonY, far) {
  const base = far ? h * 0.06 : h * 0.1;
  const top = far ? h * 0.17 : h * 0.27;
  ctx.fillStyle = far ? grade.far : grade.near;
  let x = -w * 0.02;
  while (x < w) {
    const bw = w * (0.035 + rng() * 0.055);
    const bh = base + rng() * (top - base);
    const by = horizonY - bh;
    ctx.fillRect(x, by, bw, bh + 2);
    if (!far) {
      // A few lit windows, deterministic per building.
      const cols = Math.max(1, Math.floor(bw / (w * 0.016)));
      const rows = Math.max(1, Math.floor(bh / (h * 0.035)));
      ctx.fillStyle = grade.window;
      for (let c = 0; c < cols; c += 1) {
        for (let r2 = 0; r2 < rows; r2 += 1) {
          if (rng() < 0.32) {
            ctx.fillRect(x + w * 0.006 + c * (w * 0.016), by + h * 0.012 + r2 * (h * 0.035), w * 0.006, h * 0.014);
          }
        }
      }
      ctx.fillStyle = grade.near;
    }
    x += bw + w * 0.004;
  }
}

function drawPalm(ctx, x, baseY, height, lean, colour) {
  ctx.strokeStyle = colour;
  ctx.fillStyle = colour;
  ctx.lineWidth = Math.max(3, height * 0.045);
  ctx.lineCap = 'round';
  // Trunk: a gentle curve leaning away from the wind.
  const topX = x + lean * height * 0.35;
  const topY = baseY - height;
  ctx.beginPath();
  ctx.moveTo(x, baseY + 4);
  ctx.quadraticCurveTo(x + lean * height * 0.12, baseY - height * 0.55, topX, topY);
  ctx.stroke();
  // Fronds: seven arcs fanning from the crown.
  ctx.lineWidth = Math.max(2, height * 0.02);
  for (let i = 0; i < 7; i += 1) {
    const angle = Math.PI * (0.08 + (i / 6) * 0.84);
    const len = height * (0.32 + (i % 2) * 0.07);
    const fx = topX + Math.cos(angle - Math.PI / 2 + lean * 0.3) * len;
    const fy = topY + Math.sin(angle - Math.PI / 2 + lean * 0.3) * len * 0.7 + height * 0.1;
    ctx.beginPath();
    ctx.moveTo(topX, topY);
    ctx.quadraticCurveTo(topX + (fx - topX) * 0.5, topY - height * 0.08, fx, fy);
    ctx.stroke();
  }
  // Coconuts.
  ctx.beginPath();
  ctx.arc(topX - 3, topY + 4, Math.max(2, height * 0.015), 0, Math.PI * 2);
  ctx.arc(topX + 4, topY + 5, Math.max(2, height * 0.015), 0, Math.PI * 2);
  ctx.fill();
}

function drawScene(ctx, w, h, grade) {
  const rng = mulberry32(20261120);
  const horizonY = h * 0.68;
  drawSky(ctx, w, h, grade, rng);
  drawSun(ctx, w, h, grade);
  drawSkyline(ctx, w, h, grade, rng, horizonY, true);
  drawSkyline(ctx, w, h, grade, rng, horizonY, false);
  ctx.fillStyle = grade.ground;
  ctx.fillRect(0, horizonY, w, h - horizonY);
  // Palms along the bottom edge.
  const palmSpots = [
    [w * 0.05, h * 0.24, -0.4],
    [w * 0.95, h * 0.27, 0.4],
    [w * 0.16, h * 0.17, -0.3],
    [w * 0.86, h * 0.19, 0.3],
  ];
  palmSpots.forEach(([px, ph, lean]) => drawPalm(ctx, px, h * 0.985, ph, lean, grade.near));
}

function drawPhotoFrame(ctx, w, h, state, grade) {
  if (!state.photo) return;
  const frame = frameRect(w, h, state.mode);
  const { photo } = state;
  ctx.save();
  ctx.translate(frame.x + frame.w / 2, frame.y + frame.h / 2);
  ctx.rotate(((frame.rotate ?? 0) * Math.PI) / 180);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = Math.min(w, h) * 0.03;
  ctx.shadowOffsetY = Math.min(w, h) * 0.012;
  roundRectPath(ctx, -frame.w / 2, -frame.h / 2, frame.w, frame.h, Math.min(w, h) * 0.02);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // Inner photo, cover-fit with the user's pan / zoom / rotate.
  const inset = Math.min(w, h) * 0.012;
  ctx.save();
  roundRectPath(ctx, -frame.w / 2 + inset, -frame.h / 2 + inset, frame.w - inset * 2, frame.h - inset * 2, Math.min(w, h) * 0.014);
  ctx.clip();
  ctx.rotate(((state.photoRotate ?? 0) * Math.PI) / 180);
  const iw = frame.w - inset * 2;
  const ih = frame.h - inset * 2;
  const scale = Math.max(iw / photo.naturalWidth, ih / photo.naturalHeight) * (state.photoZoom ?? 1);
  const pw = photo.naturalWidth * scale;
  const ph = photo.naturalHeight * scale;
  const px = (state.photoX ?? 0) * iw * 0.25;
  const py = (state.photoY ?? 0) * ih * 0.25;
  ctx.drawImage(photo, -pw / 2 + px, -ph / 2 + py, pw, ph);
  if (state.mode === 'wanted') {
    ctx.fillStyle = 'rgba(214, 186, 130, 0.28)';
    ctx.fillRect(-frame.w / 2, -frame.h / 2, frame.w, frame.h);
  }
  ctx.restore();
  // Frame edge.
  ctx.lineWidth = state.mode === 'wanted' ? Math.min(w, h) * 0.008 : Math.min(w, h) * 0.006;
  ctx.strokeStyle = state.mode === 'wanted' ? '#3a2a12' : '#ffffff';
  roundRectPath(ctx, -frame.w / 2, -frame.h / 2, frame.w, frame.h, Math.min(w, h) * 0.02);
  ctx.stroke();
  ctx.restore();
}

function frameRect(w, h, mode) {
  if (mode === 'magazine') return { x: w * 0.06, y: h * 0.3, w: w * 0.88, h: h * 0.5, rotate: 0 };
  if (mode === 'wanted') return { x: w * 0.2, y: h * 0.27, w: w * 0.6, h: h * 0.42, rotate: 1 };
  return { x: w * 0.52, y: h * 0.09, w: w * 0.42, h: h * 0.52, rotate: -2 };
}

function outlineText(ctx, text, x, y, align = 'left') {
  ctx.textAlign = align;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = 'rgba(0,0,0,0.85)';
  ctx.lineWidth = ctx.font.match(/(\d+)px/) ? Number(ctx.font.match(/(\d+)px/)[1]) * 0.16 : 8;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
}

function drawLettering(ctx, w, h, state, grade) {
  const title = (state.title || 'LEONIDA NIGHTS').trim().toUpperCase();
  const tagline = (state.tagline || '').trim().toUpperCase();
  const u = Math.min(w, h);
  if (state.mode === 'magazine') {
    // Masthead across the top.
    ctx.save();
    ctx.textAlign = 'center';
    const mastSize = fitFont(ctx, 'LEONIDA NIGHTS', w * 0.062, w * 0.92, 900);
    ctx.letterSpacing = `${Math.max(2, w * 0.004)}px`;
    ctx.font = `900 ${mastSize}px "Arial Black", Arial, sans-serif`;
    ctx.fillStyle = grade.accent;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = u * 0.01;
    ctx.fillText('LEONIDA NIGHTS', w / 2, h * 0.1);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'left';
    const tSize = fitFont(ctx, title, u * 0.085, w * 0.86);
    ctx.font = `900 ${tSize}px "Arial Black", Arial, sans-serif`;
    outlineText(ctx, title, w * 0.06, h * 0.86);
    ctx.restore();
    if (tagline) {
      ctx.save();
      ctx.textAlign = 'left';
      const gSize = fitFont(ctx, tagline, u * 0.032, w * 0.8, 700);
      ctx.font = `700 ${gSize}px Arial, sans-serif`;
      ctx.letterSpacing = `${Math.max(2, w * 0.003)}px`;
      ctx.fillStyle = grade.accent;
      ctx.fillText(tagline, w * 0.06, h * 0.92);
      ctx.restore();
    }
    drawBarcode(ctx, w, h);
  } else if (state.mode === 'wanted') {
    ctx.save();
    ctx.textAlign = 'center';
    const wSize = fitFont(ctx, 'WANTED', u * 0.13, w * 0.9);
    ctx.font = `900 ${wSize}px "Arial Black", Arial, sans-serif`;
    ctx.fillStyle = '#2a1c08';
    ctx.fillText('WANTED', w / 2, h * 0.17);
    ctx.restore();
    ctx.save();
    ctx.textAlign = 'center';
    const tSize = fitFont(ctx, title, u * 0.075, w * 0.86);
    ctx.font = `900 ${tSize}px "Arial Black", Arial, sans-serif`;
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#2a1c08';
    ctx.lineWidth = tSize * 0.14;
    ctx.strokeText(title, w / 2, h * 0.76);
    ctx.fillStyle = '#f5e6c8';
    ctx.fillText(title, w / 2, h * 0.76);
    ctx.restore();
    if (tagline) {
      ctx.save();
      ctx.textAlign = 'center';
      const gSize = fitFont(ctx, tagline, u * 0.03, w * 0.8, 700);
      ctx.font = `700 ${gSize}px Arial, sans-serif`;
      ctx.fillStyle = '#f5e6c8';
      ctx.shadowColor = 'rgba(0,0,0,0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(tagline, w / 2, h * 0.815);
      ctx.restore();
    }
    drawStars(ctx, w, h);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.font = `700 ${Math.round(u * 0.028)}px Arial, sans-serif`;
    ctx.fillStyle = '#f5e6c8';
    ctx.shadowColor = 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = 4;
    ctx.fillText('REWARD  $250,000  •  DEAD OR ALIVE', w / 2, h * 0.93);
    ctx.restore();
  } else {
    // Loading screen: huge title bottom-left, tagline beneath it.
    ctx.save();
    ctx.translate(w * 0.05, h * 0.9);
    ctx.rotate((-2 * Math.PI) / 180);
    const tSize = fitFont(ctx, title, u * 0.115, w * 0.6);
    ctx.font = `900 ${tSize}px "Arial Black", Arial, sans-serif`;
    outlineText(ctx, title, 0, 0);
    ctx.restore();
    if (tagline) {
      ctx.save();
      const gSize = fitFont(ctx, tagline, u * 0.032, w * 0.55, 700);
      ctx.font = `700 ${gSize}px Arial, sans-serif`;
      ctx.letterSpacing = `${Math.max(2, w * 0.003)}px`;
      ctx.fillStyle = grade.accent;
      ctx.shadowColor = 'rgba(0,0,0,0.7)';
      ctx.shadowBlur = u * 0.008;
      ctx.fillText(tagline, w * 0.055, h * 0.955);
      ctx.restore();
    }
  }
}

function drawBadge(ctx, w, h, grade) {
  const r = Math.min(w, h) * 0.052;
  const cx = w - r - Math.min(w, h) * 0.03;
  const cy = r + Math.min(w, h) * 0.03;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(10, 5, 20, 0.72)';
  ctx.fill();
  ctx.lineWidth = Math.max(2, r * 0.1);
  ctx.strokeStyle = grade.accent;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `900 ${Math.round(r * 0.85)}px "Arial Black", Arial, sans-serif`;
  ctx.fillText('VI', cx, cy + r * 0.04);
  ctx.restore();
}

function drawStars(ctx, w, h) {
  const cy = h * 0.865;
  const starR = Math.min(w, h) * 0.028;
  const gap = starR * 2.6;
  const x0 = w / 2 - gap * 2;
  for (let i = 0; i < 5; i += 1) {
    const cx = x0 + i * gap;
    drawStar(ctx, cx, cy, starR, i < 4 ? '#b8860b' : 'rgba(42,28,8,0.25)', '#2a1c08');
  }
}

function drawStar(ctx, cx, cy, r, fill, stroke) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = (i * Math.PI) / 5 - Math.PI / 2;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = stroke;
  ctx.stroke();
}

function drawBarcode(ctx, w, h) {
  const rng = mulberry32(777);
  const bw = w * 0.11;
  const bh = h * 0.045;
  const x0 = w - bw - w * 0.05;
  const y0 = h - bh - h * 0.03;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x0 - w * 0.008, y0 - h * 0.008, bw + w * 0.016, bh + h * 0.016);
  ctx.fillStyle = '#111111';
  let x = x0;
  while (x < x0 + bw) {
    const bar = w * (0.002 + rng() * 0.006);
    if (rng() < 0.55) ctx.fillRect(x, y0, bar, bh);
    x += bar + w * 0.002;
  }
}

function drawDateStamp(ctx, w, h, grade) {
  if (grade === null) return;
  ctx.save();
  ctx.textAlign = 'right';
  ctx.font = `700 ${Math.round(Math.min(w, h) * 0.024)}px Arial, sans-serif`;
  ctx.letterSpacing = '2px';
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fillText('LEONIDA  •  2026', w * 0.96, h * 0.965);
  ctx.restore();
}

function drawVignetteAndGrain(ctx, w, h) {
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.max(w, h) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const rng = mulberry32(424242);
  ctx.fillStyle = 'rgba(255,255,255,0.05)';
  for (let i = 0; i < 900; i += 1) {
    ctx.fillRect(rng() * w, rng() * h, 1.4, 1.4);
  }
}

function drawEmptyPhotoHint(ctx, w, h, mode) {
  const frame = frameRect(w, h, mode);
  ctx.save();
  ctx.translate(frame.x + frame.w / 2, frame.y + frame.h / 2);
  ctx.rotate(((frame.rotate ?? 0) * Math.PI) / 180);
  roundRectPath(ctx, -frame.w / 2, -frame.h / 2, frame.w, frame.h, Math.min(w, h) * 0.02);
  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.65)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 8]);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `700 ${Math.round(Math.min(w, h) * 0.028)}px Arial, sans-serif`;
  ctx.fillText('ADD YOUR PHOTO', 0, 0);
  ctx.restore();
}

/** Draws the full cover for `state` onto `canvas` at its own pixel size. */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const grade = GRADES[state.grade] ?? GRADES.sunset;
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  drawScene(ctx, w, h, grade);
  if (state.photo) drawPhotoFrame(ctx, w, h, state, grade);
  else drawEmptyPhotoHint(ctx, w, h, state.mode);
  if (state.mode !== 'wanted') drawBadge(ctx, w, h, grade);
  drawLettering(ctx, w, h, state, grade);
  if (state.mode !== 'wanted' && state.mode !== 'magazine') drawDateStamp(ctx, w, h, grade);
  drawVignetteAndGrain(ctx, w, h);
  ctx.restore();
}
