// Owned by the props agent. Extra buildable items + their procedural drawings.
import type { ItemDef } from './data';
import {
  type DrawObj,
  iso, box, faceQuad, poly, faceText, ellipse, circle, shade, hash,
} from './render';

export type Glow = (x: number, y: number, r: number, color: string, alpha: number) => void;
export type DrawFn = (ctx: CanvasRenderingContext2D, o: DrawObj, t: number, ghost: boolean, glow: Glow) => void;

const DIRS: readonly [number, number][] = [[1, 0], [0, 1], [-1, 0], [0, -1]];

interface Part { k: number; f: () => void; }
function drawSorted(parts: Part[]) {
  parts.sort((a, b) => a.k - b.k);
  for (const p of parts) p.f();
}

function hslHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s /= 100; l /= 100;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;
  if (h < 60) { r = c; g = x; }
  else if (h < 120) { r = x; g = c; }
  else if (h < 180) { g = c; b = x; }
  else if (h < 240) { g = x; b = c; }
  else if (h < 300) { r = x; b = c; }
  else { r = c; b = x; }
  const hex = (v: number) => Math.round((v + m) * 255).toString(16).padStart(2, '0');
  return `#${hex(r)}${hex(g)}${hex(b)}`;
}

function drawPlushBeanbag(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  dir: number,
  col: string,
  scale = 1,
) {
  const d = DIRS[dir], back = DIRS[(dir + 2) % 4];
  const perp: [number, number] = [-d[1], d[0]];
  const c = iso(cx, cy, 0);

  ellipse(ctx, c[0], c[1] + 1.2 * scale, 19 * scale, 9.5 * scale, 'rgba(0,0,0,0.32)');
  ellipse(ctx, c[0], c[1] - 4.5 * scale, 17.5 * scale, 9.2 * scale, shade(col, -0.25), 'rgba(0,0,0,0.35)');
  ellipse(ctx, c[0], c[1] - 8.5 * scale, 15.5 * scale, 8.2 * scale, col);

  const bx = cx + back[0] * 0.13 * scale, by = cy + back[1] * 0.13 * scale;
  const fx = cx + d[0] * 0.08 * scale, fy = cy + d[1] * 0.08 * scale;

  drawSorted([
    {
      k: bx + by,
      f: () => {
        const bp = iso(bx, by, 13 * scale);
        ellipse(ctx, bp[0], bp[1], 10.5 * scale, 8.2 * scale, shade(col, 0.08), 'rgba(0,0,0,0.22)');
        ellipse(ctx, bp[0] - 2 * scale, bp[1] - 3 * scale, 4.8 * scale, 2.8 * scale, shade(col, 0.34));
      },
    },
    {
      k: fx + fy,
      f: () => {
        const fp = iso(fx, fy, 9.5 * scale);
        ellipse(ctx, fp[0], fp[1], 8.2 * scale, 4.2 * scale, shade(col, -0.28));
      },
    },
  ]);

  // Sewn white fabric tag on side seam
  const tp = iso(cx + perp[0] * 0.32 * scale, cy + perp[1] * 0.32 * scale, 3 * scale);
  ctx.fillStyle = '#f8f9fa';
  ctx.fillRect(tp[0] - 1.5 * scale, tp[1] - 1.5 * scale, 3 * scale, 2.2 * scale);
}

export const EXTRA_ITEMS: ItemDef[] = [
  {
    id: 'crt_n64',
    name: 'CRT + N64 Corner',
    file: 'Smash64_CRT.exe',
    cat: 'Comfort',
    cost: 550,
    useTile: false,
    heat: 0.03,
    power: 0.08,
    decor: 1.1,
    desc: '27-inch Trinitron weighing 190 lbs, a charcoal N64, and one chewed-up Mad Catz controller. Oddjob is banned.',
  },
  {
    id: 'arcade',
    name: 'Street Brawler II Cabinet',
    file: 'MAME_cab_bootleg.exe',
    cat: 'Weird',
    cost: 1400,
    useTile: true,
    heat: 0.05,
    power: 0.25,
    decor: 1.4,
    desc: 'Quarter-eating 1994 cabinet rescued from a bowling alley. Button #4 sticks. "INSERT COIN" blinds passersby.',
  },
  {
    id: 'beanbag',
    name: 'Giant Beanbag',
    file: 'beanbag_XL.exe',
    cat: 'Comfort',
    cost: 180,
    useTile: false,
    heat: 0,
    power: 0,
    decor: 0.8,
    desc: 'Filled with 40,000 foam beads and three lost GameBoy cartridges. Once you sit down, you are legally trapped.',
  },
  {
    id: 'server_rack',
    name: '42U Blade Server Rack',
    file: 'pirate_ftp_rack.exe',
    cat: 'Network',
    cost: 1800,
    useTile: false,
    heat: 0.18,
    power: 0.7,
    decor: 0,
    routerRadius: 9,
    routerCap: 22,
    desc: 'Sounds like a jet engine inside a filing cabinet. Hosts 400GB of Counter-Strike maps and boils nearby sodas.',
  },
  {
    id: 'neon_sign',
    name: 'Neon "GAME OVER" Sign',
    file: 'neon_gameover.exe',
    cat: 'Decor',
    cost: 420,
    useTile: false,
    heat: 0.02,
    power: 0.12,
    decor: 1.5,
    desc: 'Buzzes at 60Hz and turns everyone\'s complexion radioactive magenta. Bought behind a laser tag arena.',
  },
  {
    id: 'throne',
    name: 'RGB Gaming Throne',
    file: 'DX_Racer_RGB_GOLD.exe',
    cat: 'Weird',
    cost: 2800,
    useTile: false,
    heat: 0.02,
    power: 0.15,
    decor: 2.2,
    desc: 'Faux-leather bucket seat with 4D armrests, built-in subwoofer, and enough RGB strips to signal low Earth orbit.',
  },
  {
    id: 'mtn_fountain',
    name: 'Mountain Goo™ Fountain',
    file: 'DEW_FOUNTAIN_9000.exe',
    cat: 'Weird',
    cost: 1650,
    useTile: false,
    heat: 0.03,
    power: 0.2,
    decor: 1.8,
    desc: 'A 4-tier wedding fondue fountain circulating 50 gallons of warm neon-green citrus soda. Flies vaporize on contact.',
  },
  {
    id: 'cardboard_cutout',
    name: 'John Halo™ Cutout',
    file: 'john_halo_standee.exe',
    cat: 'Decor',
    cost: 250,
    useTile: false,
    heat: 0,
    power: 0,
    decor: 1.2,
    desc: 'Life-size corrugated cardboard standee of John Halo himself. Eh kills aleins and doesnt afraid of anything.',
  },
];

export const EXTRA_DRAW: Record<string, DrawFn> = {
  crt_n64(ctx, o, t, ghost, glow) {
    const x = o.x, y = o.y, dir = o.dir;
    const d = DIRS[dir], back = DIRS[(dir + 2) % 4];
    const px = -d[1], py = d[0];
    const burnt = !!o.burnt;

    const tx = x + back[0] * 0.16, ty = y + back[1] * 0.16;
    const standHW = d[0] ? 0.17 : 0.30, standHD = d[1] ? 0.17 : 0.30;
    const rearX = tx + back[0] * 0.06, rearY = ty + back[1] * 0.06;
    const frontX = tx + d[0] * 0.05, frontY = ty + d[1] * 0.05;
    const frontFace = dir === 0 ? 'right' : dir === 1 ? 'left' : null;

    const nx = x + d[0] * 0.14 + px * 0.22, ny = y + d[1] * 0.14 + py * 0.22;
    const bx = x + d[0] * 0.22 - px * 0.12, by = y + d[1] * 0.22 - py * 0.12;

    const drawStandAndTV = () => {
      box(ctx, tx, ty, standHW, standHD, 0, 11, burnt ? '#222' : '#7f4f24');
      if (frontFace) {
        poly(ctx, faceQuad(tx, ty, standHW, standHD, 0, 11, frontFace, 0.1, 0.9, 0.22, 0.72), '#1a120b');
        const tapes = ['#e63946', '#3a86ff', '#ffd60a', '#80ed99'];
        for (let i = 0; i < 4; i++) {
          poly(
            ctx,
            faceQuad(tx, ty, standHW, standHD, 0, 11, frontFace, 0.14 + i * 0.18, 0.28 + i * 0.18, 0.28, 0.64),
            burnt ? '#333' : tapes[i],
          );
        }
      }

      const crtParts: Part[] = [
        {
          k: rearX + rearY,
          f: () => box(ctx, rearX, rearY, d[0] ? 0.10 : 0.17, d[1] ? 0.10 : 0.17, 13, 17, burnt ? '#191919' : '#495057'),
        },
        {
          k: frontX + frontY,
          f: () => {
            const fhw = d[0] ? 0.10 : 0.24, fhd = d[1] ? 0.10 : 0.24;
            box(ctx, frontX, frontY, fhw, fhd, 11, 22, burnt ? '#242424' : '#8d99ae');
            if (frontFace) {
              poly(ctx, faceQuad(frontX, frontY, fhw, fhd, 11, 22, frontFace, 0.09, 0.91, 0.18, 0.88), '#111');
              if (!burnt && !o.broken) {
                const flick = 0.82 + 0.18 * Math.sin(t * 29 + (o.id || 0));
                const tick = Math.floor(t * 4.5) + (o.id || 0);
                const quadColors = ['#38b000', '#3a86ff', '#ffbe0b', '#ff006e'];
                for (let q = 0; q < 4; q++) {
                  const u0 = q % 2 === 0 ? 0.12 : 0.51;
                  const u1 = q % 2 === 0 ? 0.49 : 0.88;
                  const v0 = q < 2 ? 0.54 : 0.21;
                  const v1 = q < 2 ? 0.85 : 0.52;
                  const ci = Math.floor(hash(tick * 13 + q * 7) * quadColors.length);
                  poly(ctx, faceQuad(frontX, frontY, fhw, fhd, 11, 22, frontFace, u0, u1, v0, v1), quadColors[ci]);
                  // Tiny moving game sprite block in each split-screen quad
                  const su = u0 + 0.08 + hash(tick + q * 31) * 0.16;
                  poly(
                    ctx,
                    faceQuad(frontX, frontY, fhw, fhd, 11, 22, frontFace, su, su + 0.1, v0 + 0.08, v0 + 0.18),
                    'rgba(255,255,255,0.85)',
                  );
                }
                // CRT glass scanline shimmer
                const scanV = 0.22 + ((t * 0.9) % 0.6);
                poly(ctx, faceQuad(frontX, frontY, fhw, fhd, 11, 22, frontFace, 0.12, 0.88, scanV, scanV + 0.04), 'rgba(255,255,255,0.35)');
                // Power LED
                poly(ctx, faceQuad(frontX, frontY, fhw, fhd, 11, 22, frontFace, 0.82, 0.88, 0.08, 0.13), '#ff2a2a');
                if (!ghost) {
                  const gp = iso(frontX + d[0] * 0.16, frontY + d[1] * 0.16, 22);
                  glow(gp[0], gp[1], 44, '#56cfe1', 0.42 * flick);
                }
              } else if (o.broken && !burnt) {
                poly(ctx, faceQuad(frontX, frontY, fhw, fhd, 11, 22, frontFace, 0.12, 0.88, 0.21, 0.85), '#444b54');
              }
            } else if (!ghost && !burnt && !o.broken) {
              const gp = iso(frontX + d[0] * 0.15, frontY + d[1] * 0.15, 22);
              glow(gp[0], gp[1], 34, '#56cfe1', 0.28);
            }
            // Rabbit-ear antenna on top of CRT
            const ant = iso(frontX, frontY, 33);
            ctx.strokeStyle = burnt ? '#333' : '#ced4da';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(ant[0] - 1, ant[1]); ctx.lineTo(ant[0] - 6, ant[1] - 9);
            ctx.moveTo(ant[0] + 1, ant[1]); ctx.lineTo(ant[0] + 6, ant[1] - 9);
            ctx.stroke();
          },
        },
      ];
      drawSorted(crtParts);
    };

    const drawN64 = () => {
      box(ctx, nx, ny, 0.10, 0.10, 0, 4, burnt ? '#1c1c1c' : '#2b2d42');
      box(ctx, nx, ny, 0.05, 0.03, 4, 3.5, burnt ? '#333' : '#ffd60a');
      const pN = iso(nx, ny, 2), pB = iso(bx, by, 3);
      ctx.strokeStyle = burnt ? '#333' : '#e63946';
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo(pN[0], pN[1]);
      ctx.quadraticCurveTo((pN[0] + pB[0]) / 2, Math.max(pN[1], pB[1]) + 4, pB[0] - 4, pB[1]);
      ctx.stroke();
      ctx.strokeStyle = burnt ? '#333' : '#3a86ff';
      ctx.beginPath();
      ctx.moveTo(pN[0] + 2, pN[1] + 1);
      ctx.quadraticCurveTo((pN[0] + pB[0]) / 2 + 2, Math.max(pN[1], pB[1]) + 6, pB[0] + 2, pB[1] + 2);
      ctx.stroke();
      if (!burnt) {
        const led = iso(nx + d[0] * 0.09, ny + d[1] * 0.09, 2.5);
        circle(ctx, led[0], led[1], 1.1, '#ff2a2a');
      }
    };

    const drawBeanbagCorner = () => {
      drawPlushBeanbag(ctx, bx, by, dir, burnt ? '#262626' : '#f77f00', 0.62);
    };

    drawSorted([
      { k: tx + ty, f: drawStandAndTV },
      { k: nx + ny, f: drawN64 },
      { k: bx + by, f: drawBeanbagCorner },
    ]);
  },

  arcade(ctx, o, t, ghost, glow) {
    const x = o.x, y = o.y, dir = o.dir;
    const d = DIRS[dir], back = DIRS[(dir + 2) % 4];
    const px = -d[1], py = d[0];
    const burnt = !!o.burnt;

    const bodyX = x + back[0] * 0.08, bodyY = y + back[1] * 0.08;
    const deckX = x + d[0] * 0.17, deckY = y + d[1] * 0.17;
    const marqX = x + back[0] * 0.02, marqY = y + back[1] * 0.02;

    const hwB = d[0] ? 0.19 : 0.27, hdB = d[1] ? 0.19 : 0.27;
    const hwD = d[0] ? 0.11 : 0.27, hdD = d[1] ? 0.11 : 0.27;
    const hwM = d[0] ? 0.22 : 0.28, hdM = d[1] ? 0.22 : 0.28;

    const frontFace = dir === 0 ? 'right' : dir === 1 ? 'left' : null;
    const sideFace: 'left' | 'right' = (dir === 0 || dir === 2) ? 'left' : 'right';

    const drawBody = () => {
      box(ctx, bodyX, bodyY, hwB, hdB, 0, 45, burnt ? '#1e1e1e' : '#1d3557');
      // Diagonal retro arcade stripe on cabinet side
      if (!burnt) {
        const s1 = faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, sideFace, 0.2, 0.4, 0.1, 0.9);
        const s2 = faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, sideFace, 0.45, 0.72, 0.2, 0.85);
        poly(ctx, [s1[0], s1[1], s2[2], s2[3]], '#ffb703');
        poly(ctx, [s2[0], s2[1], s1[2], s1[3]], '#e63946');
      }
      if (frontFace) {
        // Coin door + 25c coin slots
        poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.24, 0.76, 0.07, 0.36), '#2b2d42');
        poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.34, 0.44, 0.18, 0.27), burnt ? '#333' : '#ff4d6d');
        poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.56, 0.66, 0.18, 0.27), burnt ? '#333' : '#ff9f1c');

        // Recessed fighting-game CRT screen
        poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.1, 0.9, 0.57, 0.92), '#111');
        if (!burnt && !o.broken) {
          poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.14, 0.86, 0.60, 0.89), '#14213d');
          poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.14, 0.86, 0.60, 0.65), '#780000');
          // Health bars
          poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.17, 0.45, 0.84, 0.87), '#ffd60a');
          poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.55, 0.83, 0.84, 0.87), '#ffd60a');
          // Two bouncing fighters + energy blast
          const b1 = Math.abs(Math.sin(t * 7 + (o.id || 0))) * 0.03;
          const b2 = Math.abs(Math.cos(t * 6.3 + (o.id || 0))) * 0.03;
          poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.22, 0.32, 0.65 + b1, 0.78 + b1), '#f8f9fa');
          poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, 0.68, 0.78, 0.65 + b2, 0.78 + b2), '#38b000');
          const shot = ((t * 1.4 + (o.id || 0) * 0.3) % 1);
          const fu = 0.35 + shot * 0.28;
          poly(ctx, faceQuad(bodyX, bodyY, hwB, hdB, 0, 45, frontFace, fu, fu + 0.07, 0.70, 0.75), '#00e5ff');
          if (!ghost) {
            const sc = iso(bodyX + d[0] * 0.2, bodyY + d[1] * 0.2, 34);
            glow(sc[0], sc[1], 36, '#4cc9f0', 0.38);
          }
        }
      }
    };

    const drawMarquee = () => {
      box(ctx, marqX, marqY, hwM, hdM, 44, 8, burnt ? '#222' : '#e63946');
      if (frontFace && !burnt) {
        const pulse = Math.floor(t * 3 + (o.id || 0)) % 2 === 0 ? '#ffd60a' : '#ffbe0b';
        poly(ctx, faceQuad(marqX, marqY, hwM, hdM, 44, 8, frontFace, 0.08, 0.92, 0.14, 0.86), pulse);
        faceText(ctx, marqX, marqY, hwM, hdM, 44, 8, frontFace, 'BRAWL', 0.5, '#c1121f', 4.8);
        if (!ghost) {
          const mc = iso(marqX + d[0] * 0.2, marqY + d[1] * 0.2, 48);
          glow(mc[0], mc[1], 40, '#ffbe0b', 0.42);
        }
      }
    };

    const drawDeck = () => {
      box(ctx, deckX, deckY, hwD, hdD, 21, 5, burnt ? '#191919' : '#2b2d42', { top: burnt ? '#242424' : '#d90429' });
      // Twin joysticks + candy buttons on control deck
      const joyCols = ['#ff006e', '#3a86ff'];
      for (let i = 0; i < 2; i++) {
        const sgn = i === 0 ? -1 : 1;
        const jp = iso(deckX + px * 0.14 * sgn, deckY + py * 0.14 * sgn, 26);
        ctx.strokeStyle = '#111';
        ctx.lineWidth = 1.4;
        ctx.beginPath(); ctx.moveTo(jp[0], jp[1]); ctx.lineTo(jp[0], jp[1] - 4.5); ctx.stroke();
        circle(ctx, jp[0], jp[1] - 5, 2, burnt ? '#333' : joyCols[i]);
      }
      const btnCols = ['#ffbe0b', '#38b000', '#00e5ff', '#ff006e'];
      for (let i = 0; i < 4; i++) {
        const u = -0.05 + i * 0.065;
        const bp = iso(deckX + px * u + d[0] * 0.03, deckY + py * u + d[1] * 0.03, 26.5);
        circle(ctx, bp[0], bp[1], 1.2, burnt ? '#333' : btnCols[i]);
      }
    };

    drawSorted([
      { k: bodyX + bodyY, f: drawBody },
      { k: bodyX + bodyY + 0.001, f: drawMarquee },
      { k: deckX + deckY, f: drawDeck },
    ]);
  },

  beanbag(ctx, o) {
    const palette = ['#7209b7', '#ff6d00', '#2b9348', '#e63946'];
    const col = o.burnt ? '#262626' : palette[(o.id || 0) % palette.length];
    drawPlushBeanbag(ctx, o.x, o.y, o.dir, col, 1);
  },

  server_rack(ctx, o, t, ghost, glow) {
    const x = o.x, y = o.y, dir = o.dir;
    const burnt = !!o.burnt;
    const hw = 0.28, hd = 0.28, h = 54;

    box(ctx, x, y, hw, hd, 0, h, burnt ? '#171717' : '#1b1f26', {
      top: burnt ? '#222' : '#2d333d',
      left: burnt ? '#1d1d1d' : '#252a33',
      right: burnt ? '#141414' : '#15181e',
    });

    // Top exhaust fan blades
    for (const [ox, oy] of [[-0.09, -0.09], [0.09, 0.09]]) {
      const fp = iso(x + ox, y + oy, h);
      ellipse(ctx, fp[0], fp[1], 5.5, 2.8, '#0c0e12', '#495057');
      if (!burnt && !o.broken) {
        const ang = t * 14 + ox * 10;
        ctx.strokeStyle = '#6c757d';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(fp[0] + Math.cos(ang) * 4, fp[1] + Math.sin(ang) * 2);
        ctx.lineTo(fp[0] - Math.cos(ang) * 4, fp[1] - Math.sin(ang) * 2);
        ctx.stroke();
      }
    }

    if (dir === 0 || dir === 1) {
      const face: 'left' | 'right' = dir === 0 ? 'right' : 'left';
      const side: 'left' | 'right' = dir === 0 ? 'left' : 'right';

      // Side ventilation louvers
      for (let i = 0; i < 4; i++) {
        poly(ctx, faceQuad(x, y, hw, hd, 0, h, side, 0.2, 0.8, 0.15 + i * 0.2, 0.22 + i * 0.2), '#0d0f12');
      }

      // Front glass/mesh inner bay + rack rails
      poly(ctx, faceQuad(x, y, hw, hd, 0, h, face, 0.08, 0.92, 0.05, 0.94), '#0b0d11');
      poly(ctx, faceQuad(x, y, hw, hd, 0, h, face, 0.08, 0.13, 0.05, 0.94), '#495057');
      poly(ctx, faceQuad(x, y, hw, hd, 0, h, face, 0.87, 0.92, 0.05, 0.94), '#495057');

      const ledPalette = ['#38ff6a', '#00e5ff', '#ffb703', '#38ff6a', '#ff2a2a'];
      for (let r = 0; r < 7; r++) {
        const v0 = 0.08 + r * 0.12, v1 = v0 + 0.095;
        poly(ctx, faceQuad(x, y, hw, hd, 0, h, face, 0.14, 0.86, v0, v1), '#262b34');
        poly(ctx, faceQuad(x, y, hw, hd, 0, h, face, 0.17, 0.45, v0 + 0.025, v1 - 0.025), '#101216');

        if (!burnt) {
          for (let c = 0; c < 4; c++) {
            const speed = 6 + (r % 4) * 3;
            const on = o.broken
              ? c === 0 && Math.floor(t * 4) % 2 === 0
              : hash(r * 37 + c * 19 + Math.floor(t * speed) + (o.id || 0)) > 0.32;
            const ledCol = o.broken ? '#ff2a2a' : ledPalette[(r + c) % ledPalette.length];
            poly(
              ctx,
              faceQuad(x, y, hw, hd, 0, h, face, 0.50 + c * 0.085, 0.555 + c * 0.085, v0 + 0.03, v1 - 0.03),
              on ? ledCol : '#18241d',
            );
          }
        }
      }

      if (!ghost && !burnt && !o.broken) {
        const gp = iso(x + DIRS[dir][0] * 0.25, y + DIRS[dir][1] * 0.25, h * 0.55);
        glow(gp[0], gp[1], 36, '#38ff6a', 0.34);
      }
    } else {
      // Rear open rack view with tangled patch cables
      const rear: 'left' | 'right' = dir === 2 ? 'right' : 'left';
      poly(ctx, faceQuad(x, y, hw, hd, 0, h, rear, 0.1, 0.9, 0.06, 0.93), '#0a0c10');
      const cables = ['#3a86ff', '#ffb703', '#ff006e', '#38b000', '#00e5ff'];
      for (let i = 0; i < 5; i++) {
        const topP = faceQuad(x, y, hw, hd, 0, h, rear, 0.18 + i * 0.15, 0.18 + i * 0.15, 0.85, 0.85)[0];
        const botP = faceQuad(x, y, hw, hd, 0, h, rear, 0.25 + ((i * 2) % 5) * 0.13, 0.25, 0.15 + (i % 3) * 0.15, 0.15)[0];
        ctx.strokeStyle = burnt ? '#2a2a2a' : cables[i];
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(topP[0], topP[1]);
        ctx.quadraticCurveTo((topP[0] + botP[0]) / 2 + (i - 2) * 3, (topP[1] + botP[1]) / 2 + 4, botP[0], botP[1]);
        ctx.stroke();
      }
      if (!burnt && !o.broken && !ghost) {
        const gp = iso(x, y, h * 0.6);
        glow(gp[0], gp[1], 24, '#38ff6a', 0.22);
      }
    }
  },

  neon_sign(ctx, o, t, ghost, glow) {
    const x = o.x, y = o.y, dir = o.dir;
    const d = DIRS[dir], px = -d[1], py = d[0];
    const burnt = !!o.burnt;

    const hw = d[0] ? 0.06 : 0.39, hd = d[1] ? 0.06 : 0.39;
    const legHW = d[0] ? 0.09 : 0.05, legHD = d[1] ? 0.09 : 0.05;

    // Stand legs + transformer box (depth-sorted)
    const baseParts: Part[] = [
      { k: x + y, f: () => box(ctx, x, y, 0.10, 0.10, 0, 6, '#212529') },
    ];
    for (const sgn of [-1, 1]) {
      const lx = x + px * 0.28 * sgn, ly = y + py * 0.28 * sgn;
      baseParts.push({
        k: lx + ly,
        f: () => {
          box(ctx, lx, ly, legHW, legHD, 0, 3, '#343a40');
          box(ctx, lx, ly, 0.035, 0.035, 3, 12, '#495057');
        },
      });
    }
    drawSorted(baseParts);

    // Main sign frame
    box(ctx, x, y, hw, hd, 14, 34, burnt ? '#1c1c1c' : '#131024');
    if (burnt) return;

    const flick = o.broken
      ? (Math.floor(t * 9) % 3 === 0 ? 0.25 : 0.85)
      : (hash(Math.floor(t * 15) + (o.id || 0)) > 0.95 ? 0.6 : 1);
    const wideFace: 'left' | 'right' = (dir === 0 || dir === 2) ? 'right' : 'left';
    const isFront = dir === 0 || dir === 1;

    // Glowing outer neon tube border
    const borderPts = faceQuad(x, y, hw, hd, 14, 34, wideFace, 0.06, 0.94, 0.08, 0.92);
    ctx.save();
    if (!ghost) {
      ctx.shadowColor = isFront ? '#00f5d4' : '#ff2bd6';
      ctx.shadowBlur = 10 * flick;
    }
    ctx.globalAlpha *= flick;
    poly(ctx, borderPts, 'rgba(0,0,0,0)', isFront ? '#00f5d4' : '#ff2bd6', 2);

    if (isFront) {
      // Corner pink accents
      poly(ctx, faceQuad(x, y, hw, hd, 14, 34, wideFace, 0.11, 0.89, 0.14, 0.86), 'rgba(255,43,214,0.12)', '#ff2bd6', 0.9);
      const drawNeonLine = (txt: string, v: number, col: string) => {
        const pt = faceQuad(x, y, hw, hd, 14, 34, wideFace, 0.5, 0.5, v, v)[0];
        ctx.save();
        ctx.translate(pt[0], pt[1]);
        ctx.transform(1, wideFace === 'left' ? 0.5 : -0.5, 0, 1, 0, 0);
        ctx.font = 'bold 6.8px Impact, Tahoma, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if (!ghost) { ctx.shadowColor = col; ctx.shadowBlur = 10; }
        ctx.fillStyle = col;
        ctx.fillText(txt, 0, 0);
        ctx.fillStyle = '#ffffff';
        ctx.globalAlpha *= 0.55;
        ctx.fillText(txt, 0, 0);
        ctx.restore();
      };
      drawNeonLine('GAME', 0.66, '#00f5d4');
      drawNeonLine('OVER', 0.35, '#ff2bd6');
    } else {
      // Back plate: high-voltage warning + reversed neon glow bleeding through
      poly(ctx, faceQuad(x, y, hw, hd, 14, 34, wideFace, 0.35, 0.65, 0.35, 0.65), '#2b2d42');
      faceText(ctx, x, y, hw, hd, 14, 34, wideFace, '⚡10kV', 0.5, '#ffd60a', 5.5);
    }
    ctx.restore();

    if (!ghost) {
      const cTop = iso(x, y, 31);
      const cBot = iso(x, y, 6);
      glow(cTop[0], cTop[1], 76, '#ff2bd6', 0.55 * flick);
      glow(cTop[0], cTop[1] - 4, 54, '#00f5d4', 0.42 * flick);
      glow(cBot[0], cBot[1], 62, '#ff2bd6', 0.32 * flick);
    }
  },

  throne(ctx, o, t, ghost, glow) {
    const x = o.x, y = o.y, dir = o.dir;
    const d = DIRS[dir], back = DIRS[(dir + 2) % 4];
    const px = -d[1], py = d[0];
    const burnt = !!o.burnt;

    const hue = (t * 90 + (o.id || 0) * 35) % 360;
    const rgb1 = burnt ? '#222222' : hslHex(hue, 100, 56);
    const rgb2 = burnt ? '#222222' : hslHex(hue + 140, 100, 56);
    const baseC = iso(x, y, 0);

    // Shadow + 5-star caster base + hydraulic lift
    ellipse(ctx, baseC[0], baseC[1] + 1, 14, 7, 'rgba(0,0,0,0.34)');
    const hub = iso(x, y, 5);
    for (let i = 0; i < 5; i++) {
      const a = (i * Math.PI * 2) / 5 + dir * 0.6;
      const tip = iso(x + Math.cos(a) * 0.26, y + Math.sin(a) * 0.26, 2);
      ctx.strokeStyle = burnt ? '#222' : '#adb5bd';
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hub[0], hub[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
      circle(ctx, tip[0], tip[1] + 1.5, 2.1, '#111');
      if (!burnt) circle(ctx, tip[0], tip[1] + 1.2, 1.0, i % 2 ? rgb1 : rgb2);
    }
    ctx.strokeStyle = '#6c757d';
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.moveTo(hub[0], hub[1]); ctx.lineTo(hub[0], hub[1] - 7); ctx.stroke();

    const bx = x + back[0] * 0.19, by = y + back[1] * 0.19;
    const armLx = x + px * 0.23, armLy = y + py * 0.23;
    const armRx = x - px * 0.23, armRy = y - py * 0.23;

    const drawArm = (ax: number, ay: number) => {
      box(ctx, ax, ay, 0.035, 0.035, 13, 8, '#495057');
      box(ctx, ax, ay, d[0] ? 0.13 : 0.05, d[1] ? 0.13 : 0.05, 21, 3, burnt ? '#222' : '#1b1b24', { top: burnt ? '#222' : rgb2 });
    };

    const drawSeat = () => {
      box(ctx, x, y, 0.22, 0.22, 11, 5, burnt ? '#1d1d1d' : '#171720', { top: burnt ? '#262626' : '#242430' });
      if (!burnt) {
        for (const f of ['left', 'right'] as const) {
          poly(ctx, faceQuad(x, y, 0.22, 0.22, 11, 5, f, 0.08, 0.92, 0.65, 0.9), rgb1);
        }
      }
    };

    const drawBackrest = () => {
      const bhw = d[0] ? 0.055 : 0.24, bhd = d[1] ? 0.055 : 0.24;
      box(ctx, bx, by, bhw, bhd, 16, 28, burnt ? '#191919' : '#15151d', { top: burnt ? '#242424' : '#252532' });
      const face: 'left' | 'right' = (dir === 0 || dir === 2) ? 'right' : 'left';
      if (!burnt) {
        // Racing RGB side strips + inner crimson bolster
        poly(ctx, faceQuad(bx, by, bhw, bhd, 16, 28, face, 0.06, 0.15, 0.06, 0.94), rgb1);
        poly(ctx, faceQuad(bx, by, bhw, bhd, 16, 28, face, 0.85, 0.94, 0.06, 0.94), rgb2);
        poly(ctx, faceQuad(bx, by, bhw, bhd, 16, 28, face, 0.38, 0.62, 0.15, 0.88), dir < 2 ? '#c1121f' : '#2b2d42');
      }
      // Headrest pillow + gold crown
      const hhw = d[0] ? 0.05 : 0.14, hhd = d[1] ? 0.05 : 0.14;
      box(ctx, bx, by, hhw, hhd, 44, 6, burnt ? '#222' : '#242430');
      if (!burnt) {
        const top = iso(bx, by, 51);
        poly(ctx, [[top[0] - 4, top[1] + 1], [top[0] - 5, top[1] - 4], [top[0] - 2, top[1] - 1.5], [top[0], top[1] - 5], [top[0] + 2, top[1] - 1.5], [top[0] + 5, top[1] - 4], [top[0] + 4, top[1] + 1]], '#ffd60a');
      }
    };

    drawSorted([
      { k: armLx + armLy, f: () => drawArm(armLx, armLy) },
      { k: x + y, f: drawSeat },
      { k: armRx + armRy, f: () => drawArm(armRx, armRy) },
      { k: bx + by, f: drawBackrest },
    ]);

    if (!ghost && !burnt) {
      glow(baseC[0], baseC[1] - 4, 42, rgb1, 0.36);
      const topC = iso(bx, by, 38);
      glow(topC[0], topC[1], 36, rgb2, 0.32);
    }
  },

  mtn_fountain(ctx, o, t, ghost, glow) {
    const x = o.x, y = o.y;
    const burnt = !!o.burnt;
    const c = iso(x, y, 0);

    ellipse(ctx, c[0], c[1] + 1, 22, 11, 'rgba(0,0,0,0.32)');
    // Chrome pedestal foot
    poly(ctx, [
      [c[0] - 11, c[1]], [c[0] + 11, c[1]],
      [c[0] + 8, c[1] - 9], [c[0] - 8, c[1] - 9],
    ], burnt ? '#333' : '#adb5bd', '#495057', 0.8);

    // Catchment basin
    ellipse(ctx, c[0], c[1] - 5, 17, 7.2, burnt ? '#2c2c2c' : '#ced4da', '#495057');
    poly(ctx, [
      [c[0] - 21, c[1] - 10], [c[0] + 21, c[1] - 10],
      [c[0] + 17, c[1] - 5], [c[0] - 17, c[1] - 5],
    ], burnt ? '#2c2c2c' : '#ced4da');
    ellipse(ctx, c[0], c[1] - 10, 21, 9.8, burnt ? '#3a3a3a' : '#e9ecef', '#6c757d');
    const poolCol = burnt ? '#222b18' : '#52d600';
    const poolHi = burnt ? '#2c3820' : '#8cff00';
    ellipse(ctx, c[0], c[1] - 10, 18.5, 8.4, poolCol);
    ellipse(ctx, c[0], c[1] - 10.4, 13.5, 6.0, poolHi);

    // Basin surface ripple rings
    if (!burnt && !o.broken) {
      for (let i = 0; i < 2; i++) {
        const rp = (t * 0.9 + i * 0.5) % 1;
        ctx.strokeStyle = `rgba(215,255,120,${(1 - rp) * 0.7})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(c[0], c[1] - 10, 6 + rp * 11, 2.5 + rp * 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Stacked cascading tiers
    const tiers = [
      { zBot: 10, zTop: 20, rx: 14.5, ry: 6.6 },
      { zBot: 20, zTop: 31, rx: 10.5, ry: 4.8 },
      { zBot: 31, zTop: 41, rx: 6.5, ry: 3.1 },
    ];
    for (let i = 0; i < tiers.length; i++) {
      const tr = tiers[i];
      // Liquid cascade curtain
      const topY = c[1] - tr.zTop, botY = c[1] - tr.zBot;
      const wTop = tr.rx * 0.78, wBot = tr.rx * 0.92;
      poly(
        ctx,
        [[c[0] - wTop, topY], [c[0] + wTop, topY], [c[0] + wBot, botY], [c[0] - wBot, botY]],
        burnt ? '#222b18' : '#70e000',
      );
      if (!burnt && !o.broken) {
        // Falling bright citrus highlight streaks
        for (let s = -2; s <= 2; s++) {
          const ph = (t * 2.4 + i * 0.37 + (s + 2) * 0.21) % 1;
          const sy = topY + ph * (botY - topY - 3);
          ctx.fillStyle = '#d9ff80';
          ctx.fillRect(c[0] + s * (wTop * 0.35) - 0.7, sy, 1.4, 3);
        }
      }
      // Chrome tier dome + liquid top glaze
      ellipse(ctx, c[0], topY, tr.rx, tr.ry, burnt ? '#3a3a3a' : '#e9ecef', '#6c757d');
      ellipse(ctx, c[0], topY - 1, tr.rx * 0.85, tr.ry * 0.8, burnt ? '#2c3820' : '#9ef01a');
    }

    // Top crown nozzle + spurting arcs
    ctx.fillStyle = burnt ? '#333' : '#dee2e6';
    ctx.fillRect(c[0] - 2, c[1] - 48, 4, 8);
    if (!burnt && !o.broken) {
      const spur = Math.sin(t * 10) * 1.2;
      ctx.strokeStyle = '#ccff33';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(c[0], c[1] - 48); ctx.quadraticCurveTo(c[0] - 5, c[1] - 53 - spur, c[0] - 6, c[1] - 42);
      ctx.moveTo(c[0], c[1] - 48); ctx.quadraticCurveTo(c[0] + 5, c[1] - 53 + spur, c[0] + 6, c[1] - 42);
      ctx.stroke();

      // Bubbling animation
      const bubCount = ghost ? 3 : 7;
      for (let i = 0; i < bubCount; i++) {
        const bp = (t * 1.25 + hash(i * 23 + (o.id || 0))) % 1;
        const bx = c[0] + (hash(i * 41) - 0.5) * 26;
        const by = c[1] - 11 - bp * 34;
        const br = 1.2 + Math.sin(bp * Math.PI) * 1.8;
        circle(ctx, bx, by, br, '#d9ff80', '#70e000');
        circle(ctx, bx - 0.4, by - 0.4, br * 0.35, '#ffffff');
      }

      if (!ghost) {
        glow(c[0], c[1] - 22, 62, '#80ff00', 0.48);
      }
    }
  },

  cardboard_cutout(ctx, o, t, ghost, glow) {
    const x = o.x, y = o.y, dir = o.dir;
    const d = DIRS[dir], back = DIRS[(dir + 2) % 4];
    const px = -d[1], py = d[0];
    const rx = -px, ry = -py;
    const burnt = !!o.burnt;

    const pt = (u: number, z: number, depth = 0): [number, number] =>
      iso(x + rx * u + back[0] * depth, y + ry * u + back[1] * depth, z);

    const baseC = iso(x, y, 0);
    ellipse(ctx, baseC[0], baseC[1] + 1, 16, 7, 'rgba(0,0,0,0.26)');

    const silhouette: [number, number][] = [
      [-0.21, 0], [-0.18, 17], [-0.28, 28], [-0.28, 39], [-0.14, 41], [-0.12, 51],
      [0.12, 51], [0.14, 41], [0.29, 39], [0.34, 29], [0.22, 22], [0.18, 16], [0.21, 0],
    ];
    const mapSil = (depth: number) => silhouette.map(([u, z]) => pt(u, z, depth));

    const drawEasel = () => {
      const top = pt(0, 32, 0.02);
      const bl = pt(-0.07, 0, 0.02);
      const tip = pt(0, 0, 0.25);
      poly(ctx, [bl, tip, top], burnt ? '#222' : '#b08968', '#6c4f37', 0.8);
      // Duct tape holding easel to floor
      poly(ctx, [pt(-0.08, 0, 0.16), pt(0.08, 0, 0.16), pt(0.08, 0, 0.24), pt(-0.08, 0, 0.24)], burnt ? '#333' : '#adb5bd');
    };

    const drawFront = () => {
      // Cardboard corrugated thickness + white die-cut border
      poly(ctx, mapSil(0.025), burnt ? '#1b1b1b' : '#b08968');
      poly(ctx, mapSil(0), burnt ? '#2a2a2a' : '#f1f3f5', '#868e96', 0.8);

      const armor = burnt ? '#222' : '#4f772d';
      const armorDark = burnt ? '#181818' : '#31572c';
      const armorLight = burnt ? '#2d2d2d' : '#6a994e';
      const under = burnt ? '#141414' : '#1f2421';
      const rect = (u0: number, u1: number, z0: number, z1: number, fill: string) =>
        poly(ctx, [pt(u0, z0), pt(u1, z0), pt(u1, z1), pt(u0, z1)], fill);

      // Boots + greaves
      rect(-0.17, -0.05, 1, 18, armor);
      rect(0.05, 0.17, 1, 18, armor);
      rect(-0.18, -0.04, 1, 5, armorDark);
      rect(0.04, 0.18, 1, 5, armorDark);
      // Undersuit + belt
      rect(-0.15, 0.15, 17, 25, under);
      rect(-0.16, 0.16, 20, 24, armorDark);
      // Chest plate + shoulder pauldrons
      rect(-0.17, 0.17, 25, 39, armor);
      rect(-0.11, 0.11, 29, 37, armorLight);
      rect(-0.26, -0.14, 32, 39, armorDark);
      rect(0.14, 0.26, 32, 39, armorDark);
      // Right forearm + glowing energy sword (kept inside die-cut border)
      rect(0.16, 0.25, 25, 32, armor);
      if (!burnt) {
        const blade = [pt(0.21, 24), pt(0.30, 32), pt(0.26, 39), pt(0.19, 29)];
        poly(ctx, blade, '#00e5ff', '#caf0f8', 0.8);
        if (!ghost) {
          const gp = pt(0.25, 32);
          glow(gp[0], gp[1], 24, '#00e5ff', 0.25 + Math.sin(t * 5) * 0.04);
        }
      }
      // Helmet + gold visor
      rect(-0.10, 0.10, 39, 49, armor);
      rect(-0.08, 0.08, 48, 50, armorLight);
      rect(-0.08, 0.08, 42.5, 46.5, burnt ? '#333' : '#ffb703');
      if (!burnt) {
        poly(ctx, [pt(-0.06, 44.5), pt(0.02, 46.5), pt(0.05, 46.5), pt(-0.03, 44.5)], '#fff3b0');
      }

      // Horizontal cardboard fold crease + silver floor duct tape
      ctx.strokeStyle = 'rgba(0,0,0,0.22)';
      ctx.lineWidth = 0.9;
      const cl = pt(-0.22, 26), cr = pt(0.22, 26);
      ctx.beginPath(); ctx.moveTo(cl[0], cl[1]); ctx.lineTo(cr[0], cr[1]); ctx.stroke();
      rect(-0.20, -0.04, 0, 2.5, burnt ? '#333' : '#adb5bd');
      rect(0.04, 0.20, 0, 2.5, burnt ? '#333' : '#adb5bd');
    };

    const drawBack = () => {
      poly(ctx, mapSil(0.02), burnt ? '#222' : '#f1f3f5');
      poly(ctx, mapSil(0), burnt ? '#2a221b' : '#c69c6d', '#8d6e4e', 0.8);
      // Fold crease + duct tape X on back
      const cl = pt(-0.22, 26), cr = pt(0.22, 26);
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(cl[0], cl[1]); ctx.lineTo(cr[0], cr[1]); ctx.stroke();
      poly(ctx, [pt(-0.11, 29), pt(0.11, 24), pt(0.11, 26), pt(-0.11, 31)], burnt ? '#333' : '#adb5bd');
      poly(ctx, [pt(-0.11, 24), pt(0.11, 29), pt(0.11, 31), pt(-0.11, 26)], burnt ? '#333' : '#adb5bd');
    };

    if (dir === 0 || dir === 1) {
      drawEasel();
      drawFront();
    } else {
      drawBack();
      drawEasel();
    }
  },
};
