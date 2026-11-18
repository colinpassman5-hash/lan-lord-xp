// ============ LAN LORD — isometric Canvas2D renderer ============
import { Sim, Obj, Agent, DIRS, Look, Litter } from './sim';
import { ITEM } from './data';
import { EXTRA_DRAW } from './items_extra';

const HW = 32, HH = 16;
type P = [number, number];
export function iso(x: number, y: number, z = 0): P { return [(x - y) * HW, (x + y) * HH - z]; }

function hex(c: string): [number, number, number] {
  if (c.startsWith('rgb')) { const m = c.match(/\d+/g)!; return [+m[0], +m[1], +m[2]]; }
  let h = c.slice(1);
  if (h.length === 3) h = h.split('').map(ch => ch + ch).join('');
  const n = parseInt(h, 16);
  return [n >> 16, (n >> 8) & 255, n & 255];
}
export function shade(c: string, f: number) {
  let [r, g, b] = hex(c);
  if (f >= 0) { r += (255 - r) * f; g += (255 - g) * f; b += (255 - b) * f; }
  else { r *= 1 + f; g *= 1 + f; b *= 1 + f; }
  return `rgb(${r | 0},${g | 0},${b | 0})`;
}
export function rgba(c: string, a: number) { const [r, g, b] = hex(c); return `rgba(${r},${g},${b},${a})`; }

type Ctx = CanvasRenderingContext2D;
export function poly(ctx: Ctx, pts: P[], fill: string | CanvasGradient, stroke?: string, lw = 1) {
  ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath(); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}
interface Faces { top?: string; left?: string; right?: string; }
export function box(ctx: Ctx, x: number, y: number, hw: number, hd: number, z: number, h: number, c: string, f: Faces = {}, edge = 'rgba(0,0,0,0.28)') {
  const top = f.top || shade(c, 0.15), left = f.left || c, right = f.right || shade(c, -0.28);
  poly(ctx, [iso(x - hw, y + hd, z), iso(x + hw, y + hd, z), iso(x + hw, y + hd, z + h), iso(x - hw, y + hd, z + h)], left, edge, 0.6);
  poly(ctx, [iso(x + hw, y - hd, z), iso(x + hw, y + hd, z), iso(x + hw, y + hd, z + h), iso(x + hw, y - hd, z + h)], right, edge, 0.6);
  poly(ctx, [iso(x - hw, y - hd, z + h), iso(x + hw, y - hd, z + h), iso(x + hw, y + hd, z + h), iso(x - hw, y + hd, z + h)], top, edge, 0.6);
}
// sub-rectangle of a visible face. u,v in 0..1
export function faceQuad(x: number, y: number, hw: number, hd: number, z: number, h: number, face: 'left' | 'right', u0: number, u1: number, v0: number, v1: number): P[] {
  if (face === 'left') {
    const xa = x - hw + 2 * hw * u0, xb = x - hw + 2 * hw * u1;
    return [iso(xa, y + hd, z + h * v0), iso(xb, y + hd, z + h * v0), iso(xb, y + hd, z + h * v1), iso(xa, y + hd, z + h * v1)];
  }
  const ya = y + hd - 2 * hd * u0, yb = y + hd - 2 * hd * u1;
  return [iso(x + hw, ya, z + h * v0), iso(x + hw, yb, z + h * v0), iso(x + hw, yb, z + h * v1), iso(x + hw, ya, z + h * v1)];
}
export function faceText(ctx: Ctx, x: number, y: number, hw: number, hd: number, z: number, h: number, face: 'left' | 'right', text: string, v: number, color: string, size: number) {
  const q = faceQuad(x, y, hw, hd, z, h, face, 0.5, 0.5, v, v)[0];
  ctx.save();
  ctx.translate(q[0], q[1]);
  ctx.transform(1, face === 'left' ? 0.5 : -0.5, 0, 1, 0, 0);
  ctx.font = `bold ${size}px Tahoma, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = color; ctx.fillText(text, 0, 0);
  ctx.restore();
}
export function ellipse(ctx: Ctx, x: number, y: number, rx: number, ry: number, fill: string, stroke?: string) {
  ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), 0, 0, Math.PI * 2); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
export function circle(ctx: Ctx, x: number, y: number, r: number, fill: string, stroke?: string) { ellipse(ctx, x, y, r, r, fill, stroke); }
export function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, r); ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 1; ctx.stroke(); }
}
export function hash(n: number) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }

export interface Glow { x: number; y: number; r: number; c: string; a: number; }
interface Particle { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; c: string; s: number; kind: string; }
interface Floater { x: number; y: number; text: string; color: string; t: number; }

// object-like input so the same drawing can render build-menu icons
export interface DrawObj { type: string; x: number; y: number; dir: number; user?: number; broken?: boolean; fire?: number; infected?: boolean; id?: number; burnt?: boolean; }

export class Renderer {
  ctx: Ctx;
  w = 800; h = 600; dpr = 1;
  cam = { x: 0, y: 0, zoom: 1.15 };
  overlay: 'none' | 'heat' | 'wifi' = 'none';
  hover: { x: number; y: number } | null = null;
  mouse = { x: 0, y: 0 };
  ghost: { type: string; dir: number } | null = null;
  sellMode = false;
  selectedAgent = -1;
  selectedObj = -1;
  particles: Particle[] = [];
  floats: Floater[] = [];
  glows: Glow[] = [];
  time = 0;
  shake = 0;
  ghostReason = '';

  constructor(public canvas: HTMLCanvasElement, public sim: Sim) {
    this.ctx = canvas.getContext('2d')!;
    this.fitCamera();
  }
  fitted = false;
  fitCamera() {
    const W = this.sim.W, H = this.sim.H;
    const c = iso((W - 1) / 2, (H - 1) / 2, 0);
    this.cam.x = c[0]; this.cam.y = c[1] - 30;
    const ww = (W + H) * HW + 40, wh = (W + H) * HH + 140;
    this.cam.zoom = Math.max(0.45, Math.min(2.2, Math.min(this.w / ww, this.h / wh) * 0.98));
  }
  resize(w: number, h: number) {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = w; this.h = h;
    this.canvas.width = Math.floor(w * this.dpr); this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = w + 'px'; this.canvas.style.height = h + 'px';
    if (!this.fitted && w > 200) { this.fitted = true; this.fitCamera(); }
  }
  worldToScreen(wx: number, wy: number): P { return [(wx - this.cam.x) * this.cam.zoom + this.w / 2, (wy - this.cam.y) * this.cam.zoom + this.h / 2]; }
  screenToWorld(sx: number, sy: number): P { return [(sx - this.w / 2) / this.cam.zoom + this.cam.x, (sy - this.h / 2) / this.cam.zoom + this.cam.y]; }
  screenToTile(sx: number, sy: number) {
    const [wx, wy] = this.screenToWorld(sx, sy);
    const tx = (wx / HW + wy / HH) / 2, ty = (wy / HH - wx / HW) / 2;
    return { x: Math.round(tx), y: Math.round(ty) };
  }
  agentAt(sx: number, sy: number): Agent | null {
    let best: Agent | null = null, bd = 22 * this.cam.zoom;
    for (const a of this.sim.agents) {
      const p = this.agentPos(a, 1);
      const [ax, ay] = this.worldToScreen(p[0], p[1] - 22 * a.look.scale);
      const d = Math.hypot(ax - sx, ay - sy);
      if (d < bd) { bd = d; best = a; }
    }
    return best;
  }
  agentPos(a: Agent, alpha: number): P {
    let x = a.px + (a.x - a.px) * alpha, y = a.py + (a.y - a.py) * alpha;
    if (a.kind === 'customer' && (a.state === 'play' || a.state === 'sleep' || a.state === 'dead') && a.seat !== undefined && a.seat >= 0) {
      const o = this.sim.obj(a.seat);
      if (o) { x -= DIRS[o.dir][0] * 0.12; y -= DIRS[o.dir][1] * 0.12; }
    }
    if (a.kind === 'customer' && a.state === 'useService') {
      const o = this.sim.obj(a.target);
      if (o && (o.type === 'toilet' || o.type === 'shower' || o.type === 'couch')) { x = o.x; y = o.y; }
    }
    const p = iso(x, y, 0);
    if (a.kind === 'ghost') p[1] -= 10 + Math.sin(this.time * 3 + a.id) * 4;
    return p;
  }
  addFloat(x: number, y: number, text: string, color: string) {
    const p = iso(x, y, 50);
    this.floats.push({ x: p[0] + (Math.random() - 0.5) * 10, y: p[1], text, color, t: 0 });
  }
  burst(x: number, y: number, kind: string, n: number, color: string, z = 10) {
    const p = iso(x, y, 0);
    for (let i = 0; i < n; i++) {
      const life = 0.6 + Math.random() * 0.8;
      this.particles.push({
        x: p[0] + (Math.random() - 0.5) * 20, y: p[1] + (Math.random() - 0.5) * 8, z,
        vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 30, vz: 30 + Math.random() * 60,
        life, max: life, c: color, s: 2 + Math.random() * 3, kind,
      });
    }
  }

  // ===================================================== main draw
  draw(alpha: number, dt: number) {
    this.time += dt;
    const ctx = this.ctx, sim = this.sim;
    this.glows = [];
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    const bg = ctx.createLinearGradient(0, 0, 0, this.h);
    bg.addColorStop(0, '#1d2a4d'); bg.addColorStop(1, '#0b1020');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, this.w, this.h);

    let sx = 0, sy = 0;
    if (this.shake > 0) { this.shake -= dt; sx = (Math.random() - 0.5) * 8; sy = (Math.random() - 0.5) * 8; }
    const z = this.cam.zoom;
    ctx.setTransform(this.dpr * z, 0, 0, this.dpr * z, this.dpr * (this.w / 2 - this.cam.x * z + sx), this.dpr * (this.h / 2 - this.cam.y * z + sy));

    this.drawOutside(ctx);
    this.drawWalls(ctx);
    this.drawFloor(ctx);
    this.drawFloorOverlay(ctx);
    for (const l of sim.litter) this.drawLitter(ctx, l);

    // depth-sorted drawables
    const items: { d: number; f: () => void }[] = [];
    for (const o of sim.objects) {
      items.push({ d: o.x + o.y, f: () => this.drawObject(ctx, o, false) });
      if (ITEM[o.type].useTile && ITEM[o.type].quality) {
        const u = sim.useTileOf(o);
        const saver = o.user === -1 && o.reserved !== -1 ? sim.agent(o.reserved) : undefined;
        items.push({ d: u.x + u.y - 0.02, f: () => { this.drawChair(ctx, u.x, u.y, o.dir, ITEM[o.type].quality!); if (saver && saver.state !== 'toPC') this.drawSavedSeat(ctx, o, u.x, u.y, saver.look.shirt); } });
      }
    }
    for (const a of sim.agents) {
      const p = a.px + (a.x - a.px) * alpha, q = a.py + (a.y - a.py) * alpha;
      let d = p + q + 0.01;
      if (a.kind === 'customer' && a.state === 'useService') { const o = sim.obj(a.target); if (o && (o.type === 'shower' || o.type === 'toilet' || o.type === 'couch')) d = o.x + o.y + 0.05; }
      if (a.kind === 'ghost') d += 3;
      items.push({ d, f: () => this.drawAgent(ctx, a, alpha) });
    }
    if (this.ghost && this.hover) {
      const g = this.ghost, hv = this.hover;
      items.push({ d: hv.x + hv.y + 0.5, f: () => { ctx.globalAlpha = 0.65; this.drawObject(ctx, { type: g.type, x: hv.x, y: hv.y, dir: g.dir, user: -1, id: 7 }, true); ctx.globalAlpha = 1; } });
    }
    items.sort((a, b) => a.d - b.d);
    for (const it of items) it.f();

    this.updateParticles(ctx, dt);
    this.drawLighting(ctx);
    this.drawStatusIcons(ctx);

    // ---------- screen space
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.drawBubbles(ctx);
    this.drawFloats(ctx, dt);
    if (this.ghost && this.hover && this.ghostReason) {
      ctx.font = 'bold 12px Tahoma'; const tw = ctx.measureText(this.ghostReason).width;
      rrect(ctx, this.mouse.x + 14, this.mouse.y + 14, tw + 12, 20, 3, 'rgba(255,255,225,0.95)', '#000');
      ctx.fillStyle = '#c00'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(this.ghostReason, this.mouse.x + 20, this.mouse.y + 24);
    }
    if (this.overlay === 'heat') {
      const lx = 12, ly = this.h - 34;
      rrect(ctx, lx - 6, ly - 18, 232, 42, 6, 'rgba(0,0,0,0.65)');
      for (let i = 0; i < 200; i++) { const c = this.heatColor(16 + i / 200 * 38); ctx.fillStyle = `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`; ctx.fillRect(lx + i, ly, 1, 10); }
      ctx.font = 'bold 10px Tahoma'; ctx.fillStyle = '#fff'; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
      ctx.fillText('HEAT  16\u00B0C', lx, ly - 5); ctx.textAlign = 'right'; ctx.fillText('\u{1F525} 46\u00B0C+ = FIRE RISK', lx + 200, ly - 5);
    }
    if (sim.outage) {
      ctx.font = 'bold 22px Tahoma'; ctx.textAlign = 'center'; ctx.fillStyle = `rgba(255,80,60,${0.6 + 0.4 * Math.sin(this.time * 6)})`;
      ctx.fillText('⚡ POWER OUTAGE ⚡', this.w / 2, 40);
    }
    if (sim.rickroll) {
      ctx.font = 'bold 18px Comic Sans MS'; ctx.textAlign = 'center'; ctx.fillStyle = '#ff7fbf';
      ctx.fillText('♪ never gonna give you up ♪', this.w / 2, 70 + Math.sin(this.time * 4) * 5);
    }
    if (sim.tourney > 0) {
      ctx.font = 'bold 16px Impact, Tahoma'; ctx.textAlign = 'center';
      ctx.fillStyle = '#ffc23c'; ctx.strokeStyle = '#000'; ctx.lineWidth = 3;
      const t = `🏆 LAN TOURNAMENT LIVE — ${Math.floor(sim.tourney / 60)}h ${sim.tourney % 60}m left 🏆`;
      ctx.strokeText(t, this.w / 2, this.h - 20); ctx.fillText(t, this.w / 2, this.h - 20);
    }
  }

  // ===================================================== environment
  drawOutside(ctx: Ctx) {
    const T = this.sim.L.theme, dy = this.sim.doorY;
    if (T.outside === 'stairs') {
      // basement stairs going up and out of view
      for (let i = 0; i < 6; i++) {
        const x = -1 - i * 0.5, z = i * 12;
        poly(ctx, [iso(x - .25, dy - .5, z), iso(x + .25, dy - .5, z), iso(x + .25, dy + .5, z), iso(x - .25, dy + .5, z)], i % 2 ? '#8b6b4a' : '#9c7a55', 'rgba(0,0,0,0.3)');
        poly(ctx, [iso(x + .25, dy - .5, z - 12), iso(x + .25, dy + .5, z - 12), iso(x + .25, dy + .5, z), iso(x + .25, dy - .5, z)], '#6e5236', 'rgba(0,0,0,0.3)');
      }
      const p = iso(-2.5, dy, 80); ctx.font = 'bold 8px Comic Sans MS'; ctx.fillStyle = '#ffd6a5'; ctx.textAlign = 'center'; ctx.fillText('↑ upstairs (MOM)', p[0], p[1]);
      return;
    }
    const carpet = T.outside === 'carpet';
    for (let y = dy - 1; y <= dy + 1; y++) for (let x = -3; x <= -1; x++) {
      poly(ctx, [iso(x - .5, y - .5), iso(x + .5, y - .5), iso(x + .5, y + .5), iso(x - .5, y + .5)], carpet ? '#5a0f2e' : ((x + y) % 2 ? '#8a8f99' : '#9aa0aa'), 'rgba(0,0,0,0.15)');
    }
    poly(ctx, [iso(-1.45, dy - .4), iso(-0.55, dy - .4), iso(-0.55, dy + .4), iso(-1.45, dy + .4)], carpet ? '#c9a227' : '#7a2d2d');
    const p = iso(-1, dy, 0);
    ctx.save(); ctx.translate(p[0], p[1]); ctx.transform(1, -0.5, 0, 1, 0, 0);
    ctx.font = 'bold 6px Tahoma'; ctx.fillStyle = carpet ? '#2b0a17' : '#e9c46a'; ctx.textAlign = 'center'; ctx.fillText(carpet ? 'VIP' : 'WELCOME', 0, 2);
    ctx.restore();
  }
  skyColor(): [string, string] {
    const h = this.sim.hour() + (this.sim.tick % 60) / 60;
    if (h >= 7 && h < 17) return ['#6ec6ff', '#bde8ff'];
    if (h >= 17 && h < 20) return ['#ff8c42', '#ffd17a'];
    if (h >= 5 && h < 7) return ['#9b7fd1', '#ffb3a7'];
    return ['#0b1033', '#25306b'];
  }
  drawWalls(ctx: Ctx) {
    const sim = this.sim, T = sim.L.theme, W = sim.W, H = sim.H, dy = sim.doorY;
    const basement = sim.L.id === 'basement';
    const WH = basement ? 74 : sim.L.id === 'warehouse' || sim.L.id === 'tower' ? 110 : 92;
    poly(ctx, [iso(-0.5, -0.5, 0), iso(W - 0.5, -0.5, 0), iso(W - 0.5, -0.5, WH), iso(-0.5, -0.5, WH)], T.wallR, 'rgba(0,0,0,0.3)');
    const seg = (y0: number, y1: number) => poly(ctx, [iso(-0.5, y0, 0), iso(-0.5, y1, 0), iso(-0.5, y1, WH), iso(-0.5, y0, WH)], T.wall, 'rgba(0,0,0,0.3)');
    seg(-0.5, dy - 0.5); seg(dy + 0.5, H - 0.5);
    poly(ctx, [iso(-0.5, dy - 0.5, 62), iso(-0.5, dy + 0.5, 62), iso(-0.5, dy + 0.5, WH), iso(-0.5, dy - 0.5, WH)], T.wall, 'rgba(0,0,0,0.3)');
    // wall texture per location
    if (basement) {
      ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 0.8;
      for (let z = 12; z < WH; z += 12) { const a = iso(-0.5, -0.5, z), b = iso(W - 0.5, -0.5, z), c = iso(-0.5, H - 0.5, z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
      // exposed pipe
      const p1 = iso(-0.5, -0.5, WH - 8), p2 = iso(W - 0.5, -0.5, WH - 8); ctx.strokeStyle = '#b87333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.stroke();
    } else if (sim.L.id === 'warehouse') {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
      for (let x = 0; x < W; x += 0.5) { const a = iso(x, -0.5, 0), b = iso(x, -0.5, WH); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
      for (let y = 0; y < H; y += 0.5) { if (Math.abs(y - dy) < 0.6) continue; const a = iso(-0.5, y, 0), b = iso(-0.5, y, WH); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    } else if (sim.L.id === 'tower') {
      const t = this.time;
      for (const z of [20, WH - 14]) { const a = iso(-0.5, -0.5, z), b = iso(W - 0.5, -0.5, z), c = iso(-0.5, H - 0.5, z); ctx.strokeStyle = `hsl(${(t * 40) % 360},90%,60%)`; ctx.lineWidth = 2; ctx.shadowColor = ctx.strokeStyle as string; ctx.shadowBlur = 8; ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.shadowBlur = 0; }
    }
    poly(ctx, [iso(-0.5, -0.5, 0), iso(W - 0.5, -0.5, 0), iso(W - 0.5, -0.5, 6), iso(-0.5, -0.5, 6)], shade(T.trim, -0.1));
    poly(ctx, [iso(-0.5, -0.5, WH), iso(W - 0.5, -0.5, WH), iso(W - 0.5, -0.6, WH + 4), iso(-0.6, -0.6, WH + 4)], T.trim);
    poly(ctx, [iso(-0.5, -0.5, WH), iso(-0.5, H - 0.5, WH), iso(-0.6, H - 0.5, WH + 4), iso(-0.6, -0.6, WH + 4)], T.trim);
    // windows on left wall (basement gets tiny high windows)
    const [s1, s2] = this.skyColor();
    const winYs: number[] = []; for (let y = 1.5; y < H - 1; y += 5) if (Math.abs(y - dy) > 2) winYs.push(y);
    for (const wy of winYs) {
      const z0 = basement ? 52 : 30, z1 = basement ? 68 : WH - 18, hw = basement ? 0.7 : 1;
      const q = [iso(-0.5, wy - hw, z0), iso(-0.5, wy + hw, z0), iso(-0.5, wy + hw, z1), iso(-0.5, wy - hw, z1)] as P[];
      const g = ctx.createLinearGradient(0, q[3][1], 0, q[0][1]); g.addColorStop(0, s1); g.addColorStop(1, basement ? '#5a7d3a' : s2);
      poly(ctx, q, g, '#ffffff', 2.5);
      if (basement) { for (let i = 0; i < 5; i++) { const gp = iso(-0.5, wy - 0.6 + i * 0.3, z0 + 2); ctx.fillStyle = '#3a5a1a'; ctx.fillRect(gp[0] - 1, gp[1] - 5, 2, 5); } }
      else { const m1 = iso(-0.5, wy, z0), m2 = iso(-0.5, wy, z1); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(m1[0], m1[1]); ctx.lineTo(m2[0], m2[1]); ctx.stroke(); }
      poly(ctx, [iso(-0.5, wy - hw * 0.8, z0 + 8), iso(-0.5, wy - hw * 0.4, z0 + 8), iso(-0.5, wy - hw * 0.7, z1 - 4), iso(-0.5, wy - hw * 0.95, z1 - 4)], 'rgba(255,255,255,0.25)');
    }
    // door frame
    poly(ctx, [iso(-0.5, dy - 0.55, 0), iso(-0.5, dy - 0.45, 0), iso(-0.5, dy - 0.45, 62), iso(-0.5, dy - 0.55, 62)], '#5b4636');
    poly(ctx, [iso(-0.5, dy + 0.45, 0), iso(-0.5, dy + 0.55, 0), iso(-0.5, dy + 0.55, 62), iso(-0.5, dy + 0.45, 62)], '#5b4636');
    if (!basement) this.wallText(ctx, 'left', -0.5, Math.max(0.5, dy - 2), 70, 'OPEN 24/7', '#ff3b6b', 9, true);
    // layout: neon sign + clock first, posters fill the gaps without overlapping
    const shop = (sim.meta.profile?.shop || '').toUpperCase();
    const signText = shop ? (sim.L.id === 'warehouse' ? shop + ' ARENA' : sim.L.id === 'tower' ? shop + ' TOWER' : shop) : T.sign;
    const baseSize = basement ? 11 : sim.L.id === 'tower' ? 20 : 16;
    const signSize = Math.max(7, Math.min(baseSize, baseSize * Math.max(6, W * 0.75) / Math.max(1, signText.length)));
    const signX = Math.min(W - 2, Math.max(2, W * 0.45));
    const signHalf = (signText.length * signSize * 0.62) / 64 + 0.5;
    const clockX = Math.min(W - 1.2, signX + signHalf + 0.9);
    const slots: number[] = [];
    for (let px = 1.1; px <= W - 1.1; px += 0.1) {
      if (Math.abs(px - signX) < signHalf + 0.75) continue;
      if (Math.abs(px - clockX) < 1.0) continue;
      if (slots.length && px - slots[slots.length - 1] < 1.75) continue;
      slots.push(px);
    }
    const posters = T.posters.slice(0, slots.length);
    const pick = posters.map((_, i) => slots[Math.round((i + 0.5) * slots.length / posters.length - 0.5)]);
    posters.forEach(([bgc, txt, fg], i) => {
      const px = pick[i];
      const pz = basement ? 26 : 36, ph = basement ? 34 : 40;
      poly(ctx, [iso(px - 0.6, -0.5, pz), iso(px + 0.6, -0.5, pz), iso(px + 0.6, -0.5, pz + ph), iso(px - 0.6, -0.5, pz + ph)], bgc, '#fff', 1.5);
      this.wallText(ctx, 'right', px, -0.5, pz + ph * 0.65, txt, fg, txt.length > 10 ? 5 : 7, false);
      if (txt === 'CHORES:') { this.wallText(ctx, 'right', px, -0.5, pz + ph * 0.42, '☐ laundry', '#fff', 5, false); this.wallText(ctx, 'right', px, -0.5, pz + ph * 0.25, '☐ get a job', '#fff', 5, false); }
      if (txt === 'NO GIRLS') this.wallText(ctx, 'right', px, -0.5, pz + ph * 0.4, '(not by choice)', '#ffd6ff', 4, false);
      if (txt === 'WORLD OF') this.wallText(ctx, 'right', px, -0.5, pz + ph * 0.4, 'WARCRAP', fg, 7, false);
      if (txt === 'COUNTER') this.wallText(ctx, 'right', px, -0.5, pz + ph * 0.4, 'STRIKE 1.6', fg, 6, false);
      if (txt === 'LEEROY') this.wallText(ctx, 'right', px, -0.5, pz + ph * 0.4, 'JENKINS', '#ffb703', 6, false);
      if (txt === 'BE KIND') this.wallText(ctx, 'right', px, -0.5, pz + ph * 0.4, 'REBOOT', fg, 6, false);
    });
    // neon sign
    this.wallText(ctx, 'right', signX, -0.5, WH - 26, signText, T.signColor, signSize, true);
    // clock
    const c = iso(clockX, -0.5, WH - 26);
    ellipse(ctx, c[0], c[1], 7, 8, '#fff', '#333');
    const hr = this.sim.hour(), mn = this.sim.tick % 60;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.sin(hr / 12 * 6.28) * 4, c[1] - Math.cos(hr / 12 * 6.28) * 4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(c[0] + Math.sin(mn / 60 * 6.28) * 6, c[1] - Math.cos(mn / 60 * 6.28) * 6); ctx.stroke();
  }
  wallText(ctx: Ctx, face: 'left' | 'right', x: number, y: number, z: number, text: string, color: string, size: number, neon: boolean) {
    const p = iso(x, y, z);
    ctx.save(); ctx.translate(p[0], p[1]);
    ctx.transform(1, face === 'right' ? 0.5 : -0.5, 0, 1, 0, 0);
    const basementSign = neon && this.sim.L.id === 'basement';
    ctx.font = `bold ${size}px ${basementSign ? 'Comic Sans MS' : neon ? 'Impact, Arial Black' : 'Tahoma'}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    if (neon && !this.sim.outage) { ctx.shadowColor = color; ctx.shadowBlur = 10 + Math.sin(this.time * 8) * 2; }
    ctx.fillStyle = neon && this.sim.outage ? '#555' : color; ctx.fillText(text, 0, 0);
    ctx.restore();
    if (neon && !this.sim.outage) this.glows.push({ x: p[0], y: p[1], r: size * 3, c: color, a: 0.35 });
  }
  isNight() { const h = this.sim.hour(); return h >= 20 || h < 6; }
  drawFloor(ctx: Ctx) {
    const T = this.sim.L.theme, W = this.sim.W, H = this.sim.H;
    const conf = ['#ff4d6d', '#ffd60a', '#4cc9f0', '#80ed99', '#c77dff'];
    const lid = this.sim.L.id;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const base = (x + y) % 2 ? T.floorA : T.floorB;
      poly(ctx, [iso(x - .5, y - .5), iso(x + .5, y - .5), iso(x + .5, y + .5), iso(x - .5, y + .5)], base, 'rgba(0,0,0,0.18)', 0.5);
      const s = x * 131 + y * 977;
      if (T.confetti) {
        for (let k = 0; k < 3; k++) {
          const fx = x + (hash(s + k * 7) - 0.5) * 0.8, fy = y + (hash(s + k * 13) - 0.5) * 0.8;
          const p = iso(fx, fy);
          ctx.fillStyle = lid === 'tower' ? ['#b14aed', '#4cc9f0', '#7209b7'][Math.floor(hash(s + k) * 3)] : conf[Math.floor(hash(s + k) * 5)];
          const kind = Math.floor(hash(s + k * 3) * 3);
          if (kind === 0) { ctx.fillRect(p[0] - 2, p[1] - 0.7, 4, 1.4); }
          else if (kind === 1) { ctx.beginPath(); ctx.arc(p[0], p[1], 1.3, 0, 6.28); ctx.fill(); }
          else { ctx.beginPath(); ctx.moveTo(p[0], p[1] - 1.6); ctx.lineTo(p[0] + 1.8, p[1] + 1); ctx.lineTo(p[0] - 1.8, p[1] + 1); ctx.fill(); }
        }
      } else if (lid === 'basement') {
        // shag carpet speckles + mystery stains
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        for (let k = 0; k < 6; k++) { const p = iso(x + (hash(s + k) - 0.5) * 0.9, y + (hash(s + k * 5) - 0.5) * 0.9); ctx.fillRect(p[0], p[1], 1.5, 1.5); }

      } else if (lid === 'warehouse') {
        if (hash(s) > 0.85) { const p = iso(x, y); ellipse(ctx, p[0], p[1], 12, 5, 'rgba(0,0,0,0.08)'); }
        if (y === 0 || x === 0) { const p = iso(x, y); ctx.fillStyle = 'rgba(255,183,3,0.5)'; ctx.fillRect(p[0] - 6, p[1] - 1, 12, 2); }
      }
    }
  }
  heatColor(t: number) {
    const stops: [number, number[]][] = [[16, [40, 90, 255]], [24, [60, 200, 120]], [34, [255, 220, 40]], [42, [255, 120, 20]], [52, [255, 20, 20]]];
    if (t <= stops[0][0]) return stops[0][1];
    for (let i = 1; i < stops.length; i++) if (t <= stops[i][0]) {
      const [a, ca] = stops[i - 1], [b, cb] = stops[i]; const f = (t - a) / (b - a);
      return ca.map((v, j) => v + (cb[j] - v) * f);
    }
    return stops[stops.length - 1][1];
  }
  drawFloorOverlay(ctx: Ctx) {
    const sim = this.sim;
    this.ghostReason = '';
    const tile = (x: number, y: number, c: string) => poly(ctx, [iso(x - .5, y - .5), iso(x + .5, y - .5), iso(x + .5, y + .5), iso(x - .5, y + .5)], c);
    if (this.overlay === 'heat') {
      for (let y = 0; y < this.sim.H; y++) for (let x = 0; x < this.sim.W; x++) {
        const c = this.heatColor(sim.heat[y * this.sim.W + x]);
        tile(x, y, `rgba(${c[0] | 0},${c[1] | 0},${c[2] | 0},0.55)`);
      }
    } else if (this.overlay === 'wifi') {
      const routers = sim.objects.filter(o => ITEM[o.type].routerRadius && !o.broken);
      for (let y = 0; y < this.sim.H; y++) for (let x = 0; x < this.sim.W; x++) {
        let best = 0;
        for (const r of routers) { const d = Math.hypot(r.x - x, r.y - y), R = ITEM[r.type].routerRadius!; if (d <= R) best = Math.max(best, 1 - d / (R + 1)); }
        tile(x, y, best > 0 ? `rgba(60,255,140,${0.12 + best * 0.45})` : 'rgba(255,40,40,0.28)');
      }
    }
    if (this.hover && sim.inB(this.hover.x, this.hover.y)) {
      const { x, y } = this.hover;
      let col = 'rgba(255,255,255,0.25)';
      if (this.ghost) {
        const c = sim.canPlace(this.ghost.type, x, y, this.ghost.dir);
        this.ghostReason = c.ok ? '' : c.reason || '';
        col = c.ok ? 'rgba(60,255,90,0.45)' : 'rgba(255,50,50,0.5)';
        if (ITEM[this.ghost.type].useTile) {
          const ux = x + DIRS[this.ghost.dir][0], uy = y + DIRS[this.ghost.dir][1];
          tile(ux, uy, c.ok ? 'rgba(80,180,255,0.4)' : 'rgba(255,120,50,0.35)');
          const p = iso(ux, uy); ctx.font = '10px Tahoma'; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.fillText('seat', p[0], p[1] + 3);
        }
      } else if (this.sellMode) {
        col = sim.objAt(x, y) ? 'rgba(255,60,60,0.55)' : 'rgba(255,255,255,0.15)';
      }
      tile(x, y, col);
      const pts = [iso(x - .5, y - .5), iso(x + .5, y - .5), iso(x + .5, y + .5), iso(x - .5, y + .5)];
      poly(ctx, pts, 'rgba(0,0,0,0)', 'rgba(255,255,255,0.9)', 1.2);
    }
    // selected object highlight
    if (this.selectedObj >= 0) {
      const o = sim.obj(this.selectedObj);
      if (o) poly(ctx, [iso(o.x - .5, o.y - .5), iso(o.x + .5, o.y - .5), iso(o.x + .5, o.y + .5), iso(o.x - .5, o.y + .5)], 'rgba(255,230,0,0.2)', '#ffe600', 2);
    }
  }
  drawLitter(ctx: Ctx, l: Litter) {
    const ox = Math.cos(l.rot) * 0.2, oy = Math.sin(l.rot) * 0.2;
    const p = iso(l.x + ox, l.y + oy);
    if (l.kind !== 'scorch') {
      // pulsing "clean me" ring + sparkle so players can find messes
      const ph = (this.time * 1.2 + l.id * 0.37) % 1;
      ctx.strokeStyle = `rgba(255,255,140,${0.75 * (1 - ph)})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.ellipse(p[0], p[1], 10 + ph * 10, 5 + ph * 5, 0, 0, Math.PI * 2); ctx.stroke();
      if (Math.sin(this.time * 4 + l.id) > 0.6) { ctx.fillStyle = '#fff8a0'; ctx.font = 'bold 9px Tahoma'; ctx.textAlign = 'center'; ctx.fillText(l.kind === 'puddle' ? '🪰' : '✦', p[0] + 8, p[1] - 10); }
    }
    if (l.kind === 'puddle') { ellipse(ctx, p[0], p[1], 14, 6, 'rgba(240,220,40,0.75)', 'rgba(180,160,0,0.6)'); ellipse(ctx, p[0] - 4, p[1] - 1, 4, 1.5, 'rgba(255,255,200,0.7)'); }
    else if (l.kind === 'scorch') { ellipse(ctx, p[0], p[1], 22, 10, 'rgba(10,10,10,0.6)'); ellipse(ctx, p[0] + 5, p[1] + 2, 10, 4, 'rgba(40,20,10,0.5)'); }
    else if (l.kind === 'can') { box(ctx, l.x + ox, l.y + oy, 0.05, 0.12, 0, 4, '#7fff00'); }
    else { box(ctx, l.x + ox, l.y + oy, 0.18, 0.18, 0, 2, '#c8a165', { top: '#e0b878' }); const q = iso(l.x + ox, l.y + oy, 2); ellipse(ctx, q[0], q[1], 3, 1.5, '#c0392b'); }
  }

  // ===================================================== objects
  screenColor(o: DrawObj): string {
    const sim = this.sim;
    if (o.burnt) return '#111';
    if (o.broken) return '#556';
    if (sim.outage && !sim.researched.r_ups) return '#050505';
    if (o.infected) return Math.floor(this.time * 4) % 2 ? '#8e44ad' : '#d35400';
    if (sim.rickroll && (o.user ?? -1) !== -1) return Math.floor(this.time * 3) % 2 ? '#ff7fbf' : '#ffd1e8';
    if ((o.user ?? -1) !== -1) {
      const pal = ['#4cc9f0', '#80ed99', '#f72585', '#ffd60a', '#ff6d00', '#7209b7', '#06d6a0'];
      return pal[Math.floor(hash((o.id || 1) * 31 + Math.floor(this.time * 1.5)) * pal.length)];
    }
    return '#3a6ea5';
  }
  drawObject(ctx: Ctx, o: DrawObj, ghost: boolean) {
    const d = ITEM[o.type]; const x = o.x, y = o.y;
    if (d.quality) return this.drawPC(ctx, o, d.quality, ghost);
    const t = this.time;
    switch (o.type) {
      case 'router':
      case 'router_pro': {
        const pro = o.type === 'router_pro';
        box(ctx, x, y, 0.16, 0.16, 0, 26, '#6b4f3a');
        box(ctx, x, y, pro ? 0.24 : 0.2, 0.14, 26, 6, pro ? '#1d3557' : '#2b2d42');
        const n = pro ? 9 : 2;
        for (let i = 0; i < n; i++) {
          const ax = x - 0.15 + (0.3 * i) / Math.max(1, n - 1); const b = iso(ax, y - 0.1, 32);
          ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(b[0], b[1]); ctx.lineTo(b[0] + (i - n / 2) * 0.8, b[1] - 14 - (i % 3) * 3); ctx.stroke();
        }
        for (let i = 0; i < 4; i++) {
          const on = !this.sim.outage && hash(i * 17 + Math.floor(t * 6) + (o.id || 0)) > 0.3;
          const q = faceQuad(x, y, pro ? 0.24 : 0.2, 0.14, 26, 6, 'left', 0.2 + i * 0.17, 0.3 + i * 0.17, 0.35, 0.65);
          poly(ctx, q, on ? (i === 3 ? '#ffb703' : '#38ff6a') : '#203020');
        }
        if (!ghost && !o.broken && !this.sim.outage) { const c = iso(x, y, 34); this.glows.push({ x: c[0], y: c[1], r: 18, c: '#38ff6a', a: 0.25 }); }
        if (this.overlay === 'wifi' && !ghost) {
          const R = d.routerRadius!; const c = iso(x, y);
          ctx.strokeStyle = 'rgba(120,255,170,0.9)'; ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.ellipse(c[0], c[1], R * HW * Math.SQRT2, R * HH * Math.SQRT2, 0, 0, 6.28); ctx.stroke(); ctx.setLineDash([]);
          const ph = (t * 1.2) % 1; ctx.strokeStyle = `rgba(120,255,170,${1 - ph})`;
          ctx.beginPath(); ctx.ellipse(c[0], c[1], R * HW * Math.SQRT2 * ph, R * HH * Math.SQRT2 * ph, 0, 0, 6.28); ctx.stroke();
        }
        break;
      }
      case 'ac': {
        box(ctx, x, y, 0.36, 0.3, 0, 40, '#e9eef2');
        for (let i = 0; i < 6; i++) { const q = faceQuad(x, y, 0.36, 0.3, 0, 40, 'left', 0.1, 0.9, 0.15 + i * 0.1, 0.19 + i * 0.1); poly(ctx, q, '#9aa7b0'); }
        const q = faceQuad(x, y, 0.36, 0.3, 0, 40, 'right', 0.15, 0.85, 0.75, 0.9); poly(ctx, q, '#4ea8de');
        if (!ghost && (!this.sim.outage || this.sim.researched.r_ups) && Math.random() < 0.15) this.burst(x + 0.2, y + 0.3, 'cold', 1, '#bde0fe', 20);
        // drip puddle
        if (!ghost) { const p = iso(x + 0.1, y + 0.45); ellipse(ctx, p[0], p[1], 5, 2, 'rgba(120,180,255,0.5)'); }
        break;
      }
      case 'fridge': {
        const face = o.dir === 0 ? 'right' : 'left';
        box(ctx, x, y, 0.34, 0.34, 0, 58, '#1b1b1b');
        if (o.dir === 0 || o.dir === 1) {
          poly(ctx, faceQuad(x, y, 0.34, 0.34, 0, 58, face, 0.08, 0.92, 0.06, 0.82), this.sim.outage ? '#222' : '#c6ff3d');
          for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) poly(ctx, faceQuad(x, y, 0.34, 0.34, 0, 58, face, 0.14 + c * 0.2, 0.26 + c * 0.2, 0.12 + r * 0.17, 0.24 + r * 0.17), ['#3a86ff', '#ff006e', '#38b000', '#ffbe0b'][(r + c) % 4]);
          faceText(ctx, x, y, 0.34, 0.34, 0, 58, face, 'LIQUID', 0.93, '#c6ff3d', 5);
          if (!ghost && !this.sim.outage) { const c = faceQuad(x, y, 0.34, 0.34, 0, 58, face, 0.5, 0.5, 0.45, 0.45)[0]; this.glows.push({ x: c[0], y: c[1], r: 40, c: '#c6ff3d', a: 0.35 }); }
        }
        break;
      }
      case 'vending': {
        const face = o.dir === 0 ? 'right' : 'left';
        box(ctx, x, y, 0.34, 0.32, 0, 54, '#d62828');
        if (o.dir === 0 || o.dir === 1) {
          poly(ctx, faceQuad(x, y, 0.34, 0.32, 0, 54, face, 0.08, 0.62, 0.3, 0.85), '#ffe8a3');
          for (let r = 0; r < 3; r++) poly(ctx, faceQuad(x, y, 0.34, 0.32, 0, 54, face, 0.12, 0.58, 0.36 + r * 0.17, 0.44 + r * 0.17), '#f77f00');
          poly(ctx, faceQuad(x, y, 0.34, 0.32, 0, 54, face, 0.7, 0.92, 0.45, 0.75), '#333');
          faceText(ctx, x, y, 0.34, 0.32, 0, 54, face, 'HOT POCKET', 0.93, '#fff', 4.5);
          if (!ghost && !this.sim.outage) { const c = faceQuad(x, y, 0.34, 0.32, 0, 54, face, 0.35, 0.35, 0.6, 0.6)[0]; this.glows.push({ x: c[0], y: c[1], r: 30, c: '#ffb703', a: 0.3 }); }
        }
        break;
      }
      case 'toilet': {
        // little stall walls
        box(ctx, x - 0.42, y, 0.04, 0.45, 0, 46, '#9db4c0');
        box(ctx, x, y - 0.42, 0.45, 0.04, 0, 46, '#8ea5b2');
        const back = DIRS[(o.dir + 2) % 4];
        box(ctx, x + back[0] * 0.25, y + back[1] * 0.25, 0.14, 0.14, 0, 26, '#f4f4f4');
        const c = iso(x, y, 12); box(ctx, x, y, 0.12, 0.12, 0, 12, '#eaeaea'); ellipse(ctx, c[0], c[1], 9, 5, '#fff', '#bbb'); ellipse(ctx, c[0], c[1], 5, 2.5, '#9fd3ff');
        break;
      }
      case 'trash': {
        const c = iso(x, y, 0);
        ctx.fillStyle = '#5c677d'; ctx.fillRect(c[0] - 8, c[1] - 20, 16, 20); ellipse(ctx, c[0], c[1], 8, 4, '#5c677d'); ellipse(ctx, c[0], c[1] - 20, 8, 4, '#7d8597', '#333');
        ellipse(ctx, c[0], c[1] - 20, 5.5, 2.5, '#222');
        if (!ghost) { ellipse(ctx, c[0] - 2, c[1] - 22, 3, 2, '#7fff00'); }
        break;
      }
      case 'couch': {
        const back = DIRS[(o.dir + 2) % 4];
        box(ctx, x, y, 0.42, 0.42, 0, 10, '#7b2cbf');
        box(ctx, x + back[0] * 0.33, y + back[1] * 0.33, back[0] ? 0.09 : 0.42, back[1] ? 0.09 : 0.42, 10, 16, '#6a1fb0');
        box(ctx, x, y, 0.36, 0.36, 10, 4, '#9d4edd');
        break;
      }
      case 'shower': {
        box(ctx, x, y, 0.4, 0.4, 0, 3, '#dfe7ec');
        const c = iso(x, y, 64);
        ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.beginPath(); const b = iso(x - 0.35, y - 0.35, 0); ctx.moveTo(b[0], b[1]); const tp = iso(x - 0.35, y - 0.35, 66); ctx.lineTo(tp[0], tp[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
        ellipse(ctx, c[0], c[1] + 2, 5, 2, '#bbb');
        if (!ghost && (o.user ?? -1) !== -1) for (let i = 0; i < 6; i++) { const yy = ((t * 80 + i * 13) % 55); ctx.fillStyle = 'rgba(150,200,255,0.8)'; ctx.fillRect(c[0] - 6 + i * 2.4, c[1] + 4 + yy, 1, 4); }
        box(ctx, x, y, 0.4, 0.4, 3, 60, 'rgba(160,210,255,0.25)', { top: 'rgba(200,230,255,0.15)', left: 'rgba(160,210,255,0.28)', right: 'rgba(120,180,240,0.3)' }, 'rgba(255,255,255,0.7)');
        break;
      }
      case 'plant': {
        box(ctx, x, y, 0.14, 0.14, 0, 12, '#bc6c25');
        const c = iso(x, y, 12);
        for (let i = 0; i < 7; i++) { const a = i / 7 * 6.28; circle(ctx, c[0] + Math.cos(a) * 7, c[1] - 10 - Math.sin(a) * 6 - i, 6, i % 2 ? '#2d6a4f' : '#40916c'); }
        circle(ctx, c[0], c[1] - 22, 6, '#52b788');
        break;
      }
      case 'lavalamp': {
        box(ctx, x, y, 0.1, 0.1, 0, 8, '#c0c0c0');
        const c = iso(x, y, 8);
        ctx.fillStyle = this.sim.outage ? '#422' : 'rgba(255,90,140,0.85)';
        ctx.beginPath(); ctx.moveTo(c[0] - 4, c[1]); ctx.lineTo(c[0] - 6, c[1] - 22); ctx.quadraticCurveTo(c[0], c[1] - 30, c[0] + 6, c[1] - 22); ctx.lineTo(c[0] + 4, c[1]); ctx.fill();
        circle(ctx, c[0], c[1] - 8 - (Math.sin(t * 1.3 + x) + 1) * 6, 2.6, '#ffd60a');
        circle(ctx, c[0] + 1, c[1] - 14 - (Math.cos(t * 0.9 + y) + 1) * 4, 2, '#ffd60a');
        if (!ghost && !this.sim.outage) this.glows.push({ x: c[0], y: c[1] - 14, r: 38, c: '#ff5a8c', a: 0.45 });
        break;
      }
      case 'ddr': {
        const back = DIRS[(o.dir + 2) % 4];
        box(ctx, x, y, 0.42, 0.42, 0, 5, '#333');
        const arrows = ['#ff006e', '#3a86ff', '#ffbe0b', '#38b000'];
        for (let i = 0; i < 4; i++) { const ox = [-0.18, 0.18, 0, 0][i], oy = [0, 0, -0.18, 0.18][i]; const lit = hash(i + Math.floor(t * 5)) > 0.5; box(ctx, x + ox, y + oy, 0.08, 0.08, 5, 1, lit ? arrows[i] : shade(arrows[i], -0.6)); }
        const cx = x + back[0] * 0.32, cy = y + back[1] * 0.32;
        box(ctx, cx, cy, back[0] ? 0.1 : 0.4, back[1] ? 0.1 : 0.4, 0, 62, '#2b2d42');
        const s = iso(cx, cy, 50); circle(ctx, s[0], s[1], 7, arrows[Math.floor(t * 4) % 4]);
        if (!ghost && !this.sim.outage) { this.glows.push({ x: s[0], y: s[1], r: 40, c: arrows[Math.floor(t * 4) % 4], a: 0.4 }); if (Math.random() < 0.04) this.burst(x, y, 'note', 1, arrows[Math.floor(Math.random() * 4)], 50); }
        break;
      }
      case 'ballpit': {
        box(ctx, x, y, 0.44, 0.44, 0, 12, '#00b4d8');
        const cols = ['#ff006e', '#ffbe0b', '#3a86ff', '#38b000', '#fb5607', '#8338ec'];
        for (let i = 0; i < 26; i++) { const p = iso(x + (hash(i * 3) - 0.5) * 0.8, y + (hash(i * 7) - 0.5) * 0.8, 11 + hash(i * 11) * 3); circle(ctx, p[0], p[1], 2.6, cols[i % 6]); }
        if (!ghost && Math.floor(t * 0.5 + x) % 7 === 0) { const p = iso(x, y, 14); ctx.fillStyle = '#fff'; circle(ctx, p[0] - 3, p[1], 2, '#fff'); circle(ctx, p[0] + 3, p[1], 2, '#fff'); circle(ctx, p[0] - 3, p[1], 1, '#000'); circle(ctx, p[0] + 3, p[1], 1, '#000'); }
        break;
      }
      default: {
        const fn = EXTRA_DRAW[o.type];
        if (fn) fn(ctx, o, t, ghost, (gx: number, gy: number, r: number, c: string, a: number) => { if (!ghost) this.glows.push({ x: gx, y: gy, r, c, a }); });
        break;
      }
      case 'washer':
      case 'dryer': {
        box(ctx, x, y, 0.36, 0.36, 0, 38, '#f1f3f5');
        const face = 'left';
        const c = faceQuad(x, y, 0.36, 0.36, 0, 38, face, 0.5, 0.5, 0.45, 0.45)[0];
        ellipse(ctx, c[0], c[1], 9, 9, '#adb5bd', '#495057'); ellipse(ctx, c[0], c[1], 6, 6, o.type === 'washer' ? '#74c0fc' : '#343a40');
        if (o.type === 'washer' && !ghost) { const sh = Math.sin(t * 30) * 0.6; ctx.translate(sh, 0); ctx.translate(-sh, 0); }
        poly(ctx, faceQuad(x, y, 0.36, 0.36, 0, 38, 'left', 0.1, 0.9, 0.85, 0.95), '#ced4da');
        if (o.type === 'dryer' && !ghost && Math.floor(t * 0.3) % 4 === 0) { const p = iso(x, y, 40); ctx.font = '10px Segoe UI Emoji'; ctx.textAlign = 'center'; ctx.fillText('🍕', p[0], p[1] - 4); }
        break;
      }
      case 'heater': {
        const c = iso(x, y, 0);
        ctx.fillStyle = '#ced4da'; ctx.fillRect(c[0] - 10, c[1] - 52, 20, 52); ellipse(ctx, c[0], c[1], 10, 5, '#adb5bd'); ellipse(ctx, c[0], c[1] - 52, 10, 5, '#e9ecef', '#868e96');
        ctx.strokeStyle = '#b87333'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(c[0] - 3, c[1] - 54); ctx.lineTo(c[0] - 3, c[1] - 74); ctx.moveTo(c[0] + 3, c[1] - 54); ctx.lineTo(c[0] + 3, c[1] - 74); ctx.stroke();
        if (!ghost) { const p = iso(x, y, 10); this.glows.push({ x: p[0], y: p[1], r: 14, c: '#4dabf7', a: 0.4 }); }
        break;
      }
      case 'boxes': {
        box(ctx, x - 0.12, y + 0.05, 0.25, 0.25, 0, 18, '#c08552'); box(ctx, x + 0.15, y - 0.1, 0.2, 0.2, 0, 14, '#b07040'); box(ctx, x - 0.05, y, 0.18, 0.18, 18, 14, '#d4a373');
        faceText(ctx, x - 0.12, y + 0.05, 0.25, 0.25, 0, 18, 'left', 'XMAS', 0.5, '#9d0208', 5);
        break;
      }
      case 'stage': {
        box(ctx, x, y, 0.5, 0.5, 0, 14, '#212529', { top: '#343a40' });
        const p = iso(x, y, 14);
        if (!ghost) { const c = ['#ff2bd6', '#4cc9f0', '#ffd60a'][Math.floor(t * 2 + x) % 3]; this.glows.push({ x: p[0], y: p[1], r: 50, c, a: 0.35 }); }
        ctx.fillStyle = '#495057'; ctx.fillRect(p[0] - 1, p[1] - 30, 2, 30); ellipse(ctx, p[0], p[1] - 31, 3, 3, '#adb5bd');
        break;
      }
      case 'trophy': {
        box(ctx, x, y, 0.38, 0.2, 0, 50, 'rgba(180,220,255,0.35)', { left: 'rgba(180,220,255,0.3)', right: 'rgba(140,190,240,0.35)', top: 'rgba(220,240,255,0.3)' }, 'rgba(255,255,255,0.7)');
        for (let i = 0; i < 3; i++) { const p = iso(x - 0.2 + i * 0.2, y, 10 + (i % 2) * 18); ctx.font = '11px Segoe UI Emoji'; ctx.textAlign = 'center'; ctx.fillText('🏆', p[0], p[1]); }
        break;
      }
      case 'shrine': {
        box(ctx, x, y, 0.3, 0.3, 0, 24, '#5a189a');
        box(ctx, x, y, 0.22, 0.22, 24, 6, '#ffd60a');
        const c = iso(x, y, 30);
        ctx.font = 'bold 9px Impact'; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd60a'; ctx.shadowColor = '#ffd60a'; ctx.shadowBlur = 8; ctx.fillText('LEEROY', c[0], c[1] - 14); ctx.shadowBlur = 0;
        ctx.font = '12px Segoe UI Emoji'; ctx.fillText('🍗', c[0], c[1] - 1);
        for (let i = 0; i < 3; i++) { const p = iso(x - 0.2 + i * 0.2, y + 0.25, 24); ctx.fillStyle = '#fff'; ctx.fillRect(p[0] - 1, p[1] - 6, 2, 6); ellipse(ctx, p[0], p[1] - 8, 1.5, 2.5 + Math.sin(t * 10 + i) * 0.5, '#ffb703'); }
        if (!ghost) this.glows.push({ x: c[0], y: c[1] - 10, r: 40, c: '#ffd60a', a: 0.3 });
        break;
      }
    }
    if (o.fire && o.fire > 0) this.drawFire(ctx, x, y);
  }
  drawPC(ctx: Ctx, o: DrawObj, q: number, ghost: boolean) {
    const x = o.x, y = o.y, dir = o.dir, d = DIRS[dir];
    const deskC = o.burnt ? '#2a2a2a' : q === 1 ? '#b5895b' : q === 2 ? '#2f2f3a' : '#1a1a1a';
    // desk: top slab + legs
    box(ctx, x, y, 0.44, 0.44, 13, 4, deskC, q === 3 ? { top: '#2a2a2a' } : {});
    for (const [lx, ly] of [[-0.38, 0.38], [0.38, 0.38], [0.38, -0.38]]) box(ctx, x + lx, y + ly, 0.04, 0.04, 0, 13, shade(deskC, -0.2));
    if (q === 3) { const e = [iso(x - 0.44, y + 0.44, 13), iso(x + 0.44, y + 0.44, 13)]; ctx.strokeStyle = '#ff1e1e'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(e[0][0], e[0][1]); ctx.lineTo(e[1][0], e[1][1]); ctx.stroke(); }
    const scr = this.screenColor(o);
    const mx = x - d[0] * 0.14, my = y - d[1] * 0.14;
    const px = -d[1], py = d[0];
    // tower
    const tx = x + px * 0.3 - d[0] * 0.1, ty = y + py * 0.3 - d[1] * 0.1;
    const parts: { k: number; f: () => void }[] = [];
    const towerC = o.burnt ? '#222' : q === 1 ? '#e8dcc0' : q === 2 ? '#111' : '#0a0a0a';
    parts.push({
      k: tx + ty, f: () => {
        const th = q === 3 ? 34 : 24;
        box(ctx, tx, ty, d[0] ? 0.16 : 0.08, d[1] ? 0.16 : 0.08, 17, th, towerC);
        if (q >= 2 && !o.burnt) {
          const face = dir === 0 ? 'right' : dir === 1 ? 'left' : null;
          const f2 = face || (px > 0 ? 'right' : 'left');
          const led = q === 2 ? `hsl(${(this.time * 90 + (o.id || 0) * 40) % 360},100%,60%)` : '#ff1e1e';
          poly(ctx, faceQuad(tx, ty, d[0] ? 0.16 : 0.08, d[1] ? 0.16 : 0.08, 17, th, f2 as any, 0.15, 0.85, 0.1, 0.9), this.sim.outage ? '#111' : led);
          if (!ghost && !this.sim.outage) { const c = iso(tx, ty, 17 + th / 2); this.glows.push({ x: c[0], y: c[1], r: q === 3 ? 34 : 22, c: q === 3 ? '#ff1e1e' : led, a: 0.4 }); }
          if (q === 3) { const c = iso(tx, ty, 17 + th); ctx.font = '9px Segoe UI Emoji'; ctx.textAlign = 'center'; ctx.fillText('💀', c[0], c[1] - 1); }
        } else if (!o.burnt) {
          const f2 = dir === 0 ? 'right' : 'left';
          poly(ctx, faceQuad(tx, ty, d[0] ? 0.16 : 0.08, d[1] ? 0.16 : 0.08, 17, th, f2, 0.3, 0.7, 0.75, 0.82), '#555');
        }
      }
    });
    // monitor
    parts.push({
      k: mx + my, f: () => {
        const crt = q === 1;
        const hw = crt ? 0.2 : (d[0] ? 0.04 : 0.26), hd = crt ? 0.2 : (d[1] ? 0.04 : 0.26);
        const mz = crt ? 17 : 22, mh = crt ? 20 : 20;
        if (!crt) box(ctx, mx, my, 0.06, 0.06, 17, 5, '#222');
        const mc = o.burnt ? '#1a1a1a' : crt ? '#e3d7bd' : '#1c1c1c';
        box(ctx, mx, my, hw, hd, mz, mh, mc);
        if (dir === 0 || dir === 1) {
          const face = dir === 0 ? 'right' : 'left';
          const quad = faceQuad(mx, my, hw, hd, mz, mh, face, 0.1, 0.9, 0.14, 0.88);
          poly(ctx, quad, scr);
          if ((o.user ?? -1) !== -1 && !o.broken && !this.sim.outage) {
            // tiny "game" scribbles
            const qq = faceQuad(mx, my, hw, hd, mz, mh, face, 0.2 + hash(Math.floor(this.time * 3) + (o.id || 0)) * 0.5, 0.35 + hash(Math.floor(this.time * 3) + (o.id || 0)) * 0.5, 0.3, 0.5);
            poly(ctx, qq, 'rgba(255,255,255,0.6)');
          }
          if (o.broken && !o.burnt) { const a = quad[0], b = quad[2], c = quad[1], e = quad[3]; ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo((a[0] + b[0]) / 2 + 2, (a[1] + b[1]) / 2); ctx.lineTo(b[0], b[1]); ctx.moveTo(c[0], c[1]); ctx.lineTo((c[0] + e[0]) / 2 - 1, (c[1] + e[1]) / 2 + 1); ctx.stroke(); }
          if (o.infected) { const c = faceQuad(mx, my, hw, hd, mz, mh, face, 0.5, 0.5, 0.5, 0.5)[0]; ctx.font = '8px Segoe UI Emoji'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('🦍', c[0], c[1]); }
        } else {
          // back of the monitor faces camera: show the glow spill on the wall/floor instead
        }
        if (!ghost && !o.broken && !(this.sim.outage && !this.sim.researched.r_ups)) {
          const c = iso(mx + d[0] * 0.3, my + d[1] * 0.3, mz + mh / 2);
          this.glows.push({ x: c[0], y: c[1], r: (o.user ?? -1) !== -1 ? 30 : 18, c: scr, a: (o.user ?? -1) !== -1 ? 0.45 : 0.2 });
        }
      }
    });
    // keyboard
    parts.push({ k: x + y + 0.05, f: () => { const kx = x + d[0] * 0.2, ky = y + d[1] * 0.2; box(ctx, kx, ky, d[0] ? 0.07 : 0.2, d[1] ? 0.07 : 0.2, 17, 1.5, o.broken ? '#844' : '#333'); if (o.broken && !o.burnt) { const c = iso(kx, ky, 19); ctx.fillStyle = '#ddd'; for (let i = 0; i < 4; i++) ctx.fillRect(c[0] - 8 + hash(i + (o.id || 0)) * 16, c[1] - 3 + hash(i * 3) * 6, 2, 2); } } });
    // energy drink can on desk for flavour
    if (!ghost && (o.id || 0) % 3 === 0) parts.push({ k: x + y, f: () => box(ctx, x - px * 0.25 + d[0] * 0.15, y - py * 0.25 + d[1] * 0.15, 0.04, 0.04, 17, 5, '#7fff00') });
    parts.sort((a, b) => a.k - b.k);
    for (const p of parts) p.f();
    if (o.fire && o.fire > 0) this.drawFire(ctx, x, y);
    if (!ghost && o.broken && !o.fire && Math.random() < 0.03) this.burst(x, y, 'spark', 3, '#ffe066', 20);
  }
  drawChair(ctx: Ctx, x: number, y: number, dir: number, q: number) {
    const c = q === 1 ? '#3d5a80' : q === 2 ? '#222' : '#8b0000';
    const p = iso(x, y, 0);
    ctx.strokeStyle = '#222'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p[0], p[1]); ctx.lineTo(p[0], p[1] - 8); ctx.stroke();
    ellipse(ctx, p[0], p[1], 8, 3, 'rgba(0,0,0,0.3)');
    box(ctx, x, y, 0.18, 0.18, 8, 3, c);
    const d = DIRS[dir];
    const bx = x + d[0] * 0.16, by = y + d[1] * 0.16;
    const tall = dir === 2 || dir === 3 ? 22 : 9;
    box(ctx, bx, by, d[0] ? 0.03 : 0.18, d[1] ? 0.03 : 0.18, 11, tall, c);
    if (q === 3 && tall > 10) { const s = iso(bx, by, 26); ctx.fillStyle = '#ff1e1e'; ctx.fillRect(s[0] - 3, s[1] - 2, 6, 2); }
  }
  drawSavedSeat(ctx: Ctx, o: Obj, ux: number, uy: number, color: string) {
    // jacket draped over the chair
    const p = iso(ux, uy, 13);
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(p[0] - 7, p[1] - 4); ctx.lineTo(p[0] + 7, p[1] - 6); ctx.lineTo(p[0] + 6, p[1] + 3); ctx.lineTo(p[0] - 6, p[1] + 5); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.8; ctx.stroke();
    // yellow BRB sticky note on the monitor
    const m = iso(o.x - DIRS[o.dir][0] * 0.14, o.y - DIRS[o.dir][1] * 0.14, 40);
    ctx.save(); ctx.translate(m[0] + 6, m[1]); ctx.rotate(-0.15);
    ctx.fillStyle = '#ffe66d'; ctx.fillRect(-6, -5, 12, 9); ctx.fillStyle = '#9d0208'; ctx.font = 'bold 5px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('BRB', 0, -0.5);
    ctx.restore();
  }
  drawFire(ctx: Ctx, x: number, y: number) {
    const t = this.time; const c = iso(x, y, 16);
    for (let i = 0; i < 5; i++) {
      const ox = (i - 2) * 6, h = 18 + Math.sin(t * 12 + i * 2) * 6 + (i === 2 ? 10 : 0);
      ctx.fillStyle = i % 2 ? 'rgba(255,90,0,0.9)' : 'rgba(255,200,0,0.9)';
      ctx.beginPath(); ctx.moveTo(c[0] + ox - 6, c[1]); ctx.quadraticCurveTo(c[0] + ox + Math.sin(t * 9 + i) * 3, c[1] - h * 1.4, c[0] + ox + 6, c[1]); ctx.fill();
    }
    this.glows.push({ x: c[0], y: c[1] - 10, r: 70, c: '#ff7b00', a: 0.7 });
    if (Math.random() < 0.4) this.burst(x, y, 'smoke', 1, '#444', 40);
  }

  // ===================================================== agents
  drawAgent(ctx: Ctx, a: Agent, alpha: number) {
    const p = this.agentPos(a, alpha);
    const walking = a.path.length > 0 || Math.abs(a.x - a.px) + Math.abs(a.y - a.py) > 0.001;
    const sitting = a.kind === 'customer' && (a.state === 'play' || a.state === 'sleep' || (a.state === 'useService' && this.sim.obj(a.target)?.type === 'toilet'));
    const lying = a.kind === 'customer' && (a.dead || (a.state === 'useService' && this.sim.obj(a.target)?.type === 'couch'));
    if (a.id === this.selectedAgent) { ellipse(ctx, p[0], p[1], 14, 6, 'rgba(255,230,0,0.35)', '#ffe600'); }
    if (a.kind === 'llama') return this.drawLlama(ctx, p[0], p[1], walking, a);
    if (a.kind === 'ghost') return this.drawGhost(ctx, p[0], p[1], a);
    const mood = a.kind === 'customer' ? ((a.rage || 0) > 70 ? -2 : (a.happy || 50) > 65 ? 1 : (a.happy || 50) < 35 ? -1 : 0) : a.kind === 'owner' ? (this.sim.money < 0 ? -1 : 1) : 0;
    if (a.kind === 'owner') { ellipse(ctx, p[0], p[1], 16, 7, 'rgba(255,211,77,0.25)', 'rgba(255,211,77,0.8)'); }
    let face = a.face;
    if (sitting && a.seat !== undefined && a.seat >= 0) { const o = this.sim.obj(a.seat); if (o && a.state !== 'useService') face = (o.dir + 2) % 4; }
    drawPerson(ctx, p[0], p[1], a.look, {
      face, walk: walking ? this.time * 12 + a.id : 0, walking, sitting, lying, sleep: a.state === 'sleep' || lying && !a.dead, dead: !!a.dead,
      mood, rage: a.rage || 0, kind: a.kind, t: this.time, typing: a.state === 'play',
    });
    if (a.kind === 'customer' && a.state === 'waitPC') {
      const qp = this.sim.queuePos(a);
      if (qp >= 0) {
        const pulse = qp === 0 ? 1 + Math.sin(this.time * 6) * 0.08 : 1;
        ctx.save(); ctx.translate(p[0] + 11, p[1] - 44 * a.look.scale); ctx.scale(pulse, pulse);
        circle(ctx, 0, 0, 6.5, qp === 0 ? '#2f9e44' : '#f08c00', '#fff');
        ctx.fillStyle = '#fff'; ctx.font = 'bold 7px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('#' + (qp + 1), 0, 0.5);
        ctx.restore();
        // patience bar
        const pr = Math.max(0, 1 - (a.wait || 0) / (a.patience || 50));
        rrect(ctx, p[0] - 8, p[1] + 4, 16, 3, 1.5, 'rgba(0,0,0,0.5)');
        rrect(ctx, p[0] - 8, p[1] + 4, 16 * pr, 3, 1.5, pr > 0.5 ? '#40c057' : pr > 0.25 ? '#fab005' : '#fa5252');
      }
    }
    if (a.kind === 'customer' && a.group && (a.state === 'arrive' || a.state === 'waitPC' || a.state === 'toPC')) {
      const hue = (a.group * 67) % 360;
      ctx.strokeStyle = `hsla(${hue},90%,60%,0.9)`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(p[0], p[1], 10, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    }
    if (a.kind === 'owner') {
      ctx.font = 'bold 9px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const label = '👑 ' + a.name; const tw = ctx.measureText(label).width + 10;
      rrect(ctx, p[0] - tw / 2, p[1] + 6, tw, 13, 6, 'rgba(40,20,0,0.8)', '#ffd34d');
      ctx.fillStyle = '#ffd34d'; ctx.fillText(label, p[0], p[1] + 12.5);
    }
    // auras
    if (a.kind === 'customer') {
      if ((a.hygiene || 100) < 25) for (let i = 0; i < 3; i++) {
        const ox = (i - 1) * 7, ph = (this.time * 1.5 + i * 0.33) % 1;
        ctx.strokeStyle = `rgba(120,200,40,${0.8 - ph * 0.8})`; ctx.lineWidth = 1.5; ctx.beginPath();
        for (let k = 0; k < 6; k++) { const yy = p[1] - 30 - ph * 20 - k * 2.5; const xx = p[0] + ox + Math.sin(k + this.time * 5 + i) * 2; k ? ctx.lineTo(xx, yy) : ctx.moveTo(xx, yy); }
        ctx.stroke();
      }
      if ((a.rage || 0) > 75 && Math.random() < 0.2) { this.particles.push({ x: p[0] + (Math.random() - 0.5) * 10, y: p[1], z: 44, vx: (Math.random() - 0.5) * 20, vy: 0, vz: 30, life: 0.6, max: 0.6, c: '#fff', s: 3, kind: 'steam' }); }
      if (a.state === 'sleep' && Math.random() < 0.03) this.particles.push({ x: p[0] + 6, y: p[1], z: 40, vx: 10, vy: 0, vz: 15, life: 1.6, max: 1.6, c: '#fff', s: 8, kind: 'zz' });
    }
  }
  drawLlama(ctx: Ctx, x: number, y: number, walking: boolean, a: Agent) {
    const b = walking ? Math.abs(Math.sin(this.time * 8)) * 1.5 : 0;
    ellipse(ctx, x, y, 14, 5, 'rgba(0,0,0,0.25)');
    const legs = [-8, -3, 4, 9];
    ctx.fillStyle = '#d9c7a7'; legs.forEach((lx, i) => ctx.fillRect(x + lx, y - 12 + (walking ? Math.sin(this.time * 10 + i) * 1.5 : 0), 2.5, 12));
    ellipse(ctx, x, y - 16 - b, 14, 8, '#f1e3c8', '#b8a07a');
    const dir = a.face === 0 || a.face === 3 ? 1 : -1;
    ctx.fillStyle = '#f1e3c8'; ctx.fillRect(x + dir * 7 - 3, y - 38 - b, 6, 20);
    ellipse(ctx, x + dir * 9, y - 40 - b, 6, 4.5, '#f1e3c8', '#b8a07a');
    ctx.fillStyle = '#f1e3c8'; ctx.fillRect(x + dir * 5, y - 49 - b, 2, 6); ctx.fillRect(x + dir * 9, y - 49 - b, 2, 6);
    circle(ctx, x + dir * 11, y - 41 - b, 1.2, '#000');
    ellipse(ctx, x, y - 22 - b, 8, 3, '#e63946');
  }
  drawGhost(ctx: Ctx, x: number, y: number, a: Agent) {
    ctx.globalAlpha = 0.6 + Math.sin(this.time * 2) * 0.15;
    ctx.fillStyle = '#f0f8ff';
    ctx.beginPath(); ctx.moveTo(x - 10, y);
    ctx.lineTo(x - 10, y - 26); ctx.arc(x, y - 26, 10, Math.PI, 0); ctx.lineTo(x + 10, y);
    for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(x + 10 - i * 5 - 2.5, y + (i % 2 ? -4 : 4) + Math.sin(this.time * 6) * 2, x + 10 - (i + 1) * 5, y);
    ctx.fill();
    circle(ctx, x - 3.5, y - 27, 2.2, '#222'); circle(ctx, x + 3.5, y - 27, 2.2, '#222'); ellipse(ctx, x, y - 20, 2.5, 3.5, '#222');
    ctx.font = 'bold 6px Tahoma'; ctx.fillStyle = '#334'; ctx.textAlign = 'center'; ctx.fillText('gg', x, y - 8);
    ctx.globalAlpha = 1;
  }

  // ===================================================== effects / lighting
  updateParticles(ctx: Ctx, dt: number) {
    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt; if (p.life <= 0) { ps.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.kind === 'spark' || p.kind === 'dust' || p.kind === 'foam') { p.vz -= 160 * dt; if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.6; } }
      const a = p.life / p.max;
      const sx = p.x, sy = p.y - p.z;
      switch (p.kind) {
        case 'smoke': circle(ctx, sx, sy, p.s * (2.5 - a * 1.5), `rgba(60,60,60,${a * 0.5})`); p.vx *= 0.98; break;
        case 'cold': circle(ctx, sx, sy, p.s * (2 - a), `rgba(190,225,255,${a * 0.5})`); break;
        case 'dust': circle(ctx, sx, sy, p.s * (1.8 - a), `rgba(220,210,190,${a * 0.8})`); break;
        case 'foam': circle(ctx, sx, sy, p.s, `rgba(255,255,255,${a})`); break;
        case 'steam': circle(ctx, sx, sy, p.s * (2 - a), `rgba(255,255,255,${a * 0.7})`); break;
        case 'spark': ctx.fillStyle = `rgba(255,230,90,${a})`; ctx.fillRect(sx, sy, 2, 2); break;
        case 'note': ctx.font = 'bold 12px Tahoma'; ctx.fillStyle = rgba(p.c, a); ctx.textAlign = 'center'; ctx.fillText('♪', sx, sy); break;
        case 'zz': ctx.font = `bold ${p.s + (1 - a) * 6}px Comic Sans MS`; ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.textAlign = 'center'; ctx.fillText('Z', sx, sy); break;
        case 'money': ctx.font = 'bold 12px Segoe UI Emoji'; ctx.globalAlpha = a; ctx.textAlign = 'center'; ctx.fillText('💵', sx, sy); ctx.globalAlpha = 1; break;
        default: circle(ctx, sx, sy, p.s, rgba(p.c, a));
      }
    }
  }
  darkness() {
    const h = this.sim.hour() + (this.sim.tick % 60) / 60;
    let d = 0;
    if (h >= 18 && h < 21) d = (h - 18) / 3 * 0.5;
    else if (h >= 21 || h < 5) d = 0.5;
    else if (h >= 5 && h < 7.5) d = 0.5 - (h - 5) / 2.5 * 0.5;
    if (this.sim.outage) d = Math.max(d, 0.72);
    return d;
  }
  drawLighting(ctx: Ctx) {
    const d = this.darkness();
    if (d > 0.01) {
      ctx.save(); ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.fillStyle = `rgba(8,10,40,${d})`; ctx.fillRect(0, 0, this.w, this.h);
      ctx.restore();
    }
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const boost = 0.35 + d * 1.1;
    for (const g of this.glows) {
      const grad = ctx.createRadialGradient(g.x, g.y, 0, g.x, g.y, g.r);
      grad.addColorStop(0, rgba(g.c, Math.min(1, g.a * boost)));
      grad.addColorStop(1, rgba(g.c, 0));
      ctx.fillStyle = grad; ctx.fillRect(g.x - g.r, g.y - g.r, g.r * 2, g.r * 2);
    }
    ctx.restore();
  }
  drawStatusIcons(ctx: Ctx) {
    const sim = this.sim;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const o of sim.objects) {
      let icon = '';
      if (o.fire > 0) icon = '🔥';
      else if (o.burnt) icon = '⚫';
      else if (o.broken) icon = '🔧';
      else if (o.infected) icon = '☠️';
      const c = iso(o.x, o.y, 64 + Math.sin(this.time * 4 + o.id) * 3);
      if (icon) {
        circle(ctx, c[0], c[1], 9, 'rgba(255,255,255,0.9)', o.fire > 0 ? '#ff4b3e' : '#333');
        ctx.font = '11px Segoe UI Emoji'; ctx.fillStyle = '#000'; ctx.fillText(icon, c[0], c[1] + 1);
      }
      if (this.overlay === 'wifi' && ITEM[o.type].quality) {
        const t = o.ping >= 999 ? 'NO NET' : o.ping + 'ms';
        const col = o.ping >= 999 ? '#ff3b3b' : o.ping > 200 ? '#ff9f1c' : o.ping > 100 ? '#ffe066' : '#5dff8f';
        ctx.font = 'bold 9px Tahoma'; const w = ctx.measureText(t).width + 6; const q = iso(o.x, o.y, 50);
        rrect(ctx, q[0] - w / 2, q[1] - 6, w, 12, 3, 'rgba(0,0,0,0.75)'); ctx.fillStyle = col; ctx.fillText(t, q[0], q[1]);
      }
      if (this.overlay === 'heat' && ITEM[o.type].quality) {
        const h = sim.heat[o.y * this.sim.W + o.x]; const t = h.toFixed(0) + '°C'; ctx.font = 'bold 9px Tahoma'; const q = iso(o.x, o.y, 50);
        rrect(ctx, q[0] - 14, q[1] - 6, 28, 12, 3, 'rgba(0,0,0,0.75)'); ctx.fillStyle = h > 46 ? '#ff3b3b' : h > 38 ? '#ffb703' : '#fff'; ctx.fillText(t, q[0], q[1]);
      }
    }
  }
  drawBubbles(ctx: Ctx) {
    const list = this.sim.agents.filter(a => a.thought).sort((a, b) => (b.thought!.ttl) - (a.thought!.ttl));
    const shown = list.slice(0, 7);
    const sel = this.sim.agent(this.selectedAgent);
    if (sel && sel.thought && !shown.includes(sel)) shown.push(sel);
    const placed: [number, number][] = [];
    shown.sort((p, q) => this.agentPos(q, 1)[1] - this.agentPos(p, 1)[1]); // front-most first keeps its spot
    for (const a of shown) {
      const p = this.agentPos(a, 1);
      let [sx, sy] = this.worldToScreen(p[0], p[1] - 52 * a.look.scale);
      // nudge upward until it no longer overlaps an already-drawn bubble
      for (let k = 0; k < 6 && placed.some(([x, y]) => Math.abs(x - sx) < 120 && Math.abs(y - sy) < 30); k++) sy -= 30;
      placed.push([sx, sy]);
      const th = a.thought!;
      const alpha = Math.min(1, th.ttl / 15);
      ctx.globalAlpha = alpha;
      drawBubble(ctx, sx, sy, th.text, th.mood, a.kind === 'customer' ? 'think' : 'say', this.w);
      ctx.globalAlpha = 1;
    }
  }
  drawFloats(ctx: Ctx, dt: number) {
    for (let i = this.floats.length - 1; i >= 0; i--) {
      const f = this.floats[i]; f.t += dt;
      if (f.t > 1.6) { this.floats.splice(i, 1); continue; }
      const [sx, sy] = this.worldToScreen(f.x, f.y - f.t * 30);
      const a = 1 - f.t / 1.6;
      ctx.font = 'bold 15px Tahoma'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.lineWidth = 3; ctx.strokeStyle = `rgba(0,0,0,${a})`; ctx.strokeText(f.text, sx, sy);
      ctx.fillStyle = rgba(f.color, a); ctx.fillText(f.text, sx, sy);
    }
  }
}

// ===================================================== shared drawing helpers
export function drawBubble(ctx: Ctx, x: number, y: number, text: string, mood: number, kind: 'think' | 'say', maxW = 99999) {
  ctx.font = 'bold 11px "Comic Sans MS", "Comic Neue", cursive';
  const words = text.split(' '); const lines: string[] = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > 140 && cur) { lines.push(cur); cur = w; } else cur = t; }
  if (cur) lines.push(cur);
  const lw = Math.max(...lines.map(l => ctx.measureText(l).width));
  const bw = lw + 14, bh = lines.length * 13 + 8;
  const bx = Math.max(4, Math.min(maxW - bw - 4, x - bw / 2)), by = Math.max(4, y - bh - 10);
  const fill = mood < 0 ? '#ffe3e0' : mood > 0 ? '#e6ffe0' : '#ffffff';
  const stroke = mood < 0 ? '#d62828' : mood > 0 ? '#2d9a3a' : '#333';
  ctx.shadowColor = 'rgba(0,0,0,0.35)'; ctx.shadowBlur = 4; ctx.shadowOffsetY = 2;
  rrect(ctx, bx, by, bw, bh, 8, fill, stroke);
  ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
  if (kind === 'think') { circle(ctx, x - 2, y - 6, 3.5, fill, stroke); circle(ctx, x - 5, y - 1, 2, fill, stroke); }
  else { ctx.beginPath(); ctx.moveTo(x - 5, by + bh - 0.5); ctx.lineTo(x, y); ctx.lineTo(x + 4, by + bh - 0.5); ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = stroke; ctx.stroke(); ctx.fillRect(x - 4, by + bh - 2, 8, 2.5); }
  ctx.fillStyle = mood < 0 ? '#9d0208' : '#111'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  lines.forEach((l, i) => ctx.fillText(l, bx + bw / 2, by + 5 + i * 13));
}

export interface PersonOpts { face: number; walk: number; walking: boolean; sitting: boolean; lying: boolean; sleep: boolean; dead: boolean; mood: number; rage: number; kind: string; t: number; typing: boolean; }
// hair styles: 0 bowl · 1 spiky · 2 long · 3 balding · 4 frosted tips · 5 emo swoop · 6 skater shag · 7 faux hawk · 8 cornrows · 9 buzz
//              10 scene hair · 11 side bangs · 12 straight center part · 13 chunky highlights · 14 space buns · 15 ponytail · 16 pixie · 17 headband
const LONG_HAIR = new Set([2, 10, 11, 12, 13, 17]);
export function drawPerson(ctx: Ctx, x: number, y: number, L: Look, o: PersonOpts) {
  const A = L as any;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(L.scale, L.scale);
  ellipse(ctx, 0, 0, 9 * L.wide, 4, 'rgba(0,0,0,0.28)');
  if (o.lying) { ctx.rotate(o.dead ? -1.25 : -1.45); ctx.translate(8, -6); }
  const front = o.face === 0 || o.face === 1;
  const side = o.face === 0 || o.face === 3 ? 1 : -1;
  const bob = o.walking ? Math.abs(Math.sin(o.walk)) * 2 : 0;
  const sit = o.sitting ? 7 : 0;
  const W = L.wide;
  const fem = A.sex === 'f';
  const bottom: string = A.bottom || 'pants';
  const top: string = A.top || 'tee';
  const acc: string = A.acc || '';
  // ---------------- legs / bottoms
  if (o.kind === 'mom') {
    ctx.fillStyle = L.shirt; ctx.beginPath(); ctx.moveTo(-7 * W, -22 - bob); ctx.lineTo(7 * W, -22 - bob); ctx.lineTo(9 * W, -2); ctx.lineTo(-9 * W, -2); ctx.fill();
    ctx.fillStyle = '#333'; ctx.fillRect(-5, -3, 3, 3); ctx.fillRect(2, -3, 3, 3);
  } else if (!o.sitting) {
    const sw = o.walking ? Math.sin(o.walk) * 2.5 : 0;
    const legC = bottom === 'skirt' ? '#2b2b2b' : bottom === 'shorts' ? L.skin : L.pants;
    if (bottom === 'flare' || bottom === 'jnco') {
      const wide = bottom === 'jnco' ? 2.2 : 1.2;
      ctx.fillStyle = L.pants;
      for (const [lx, d] of [[-5 * W + sw, -1], [1 * W - sw, 1]] as [number, number][]) {
        ctx.beginPath(); ctx.moveTo(lx, -12 - bob); ctx.lineTo(lx + 4 * W, -12 - bob); ctx.lineTo(lx + 4 * W + wide * (d > 0 ? 1 : 0.4), 0); ctx.lineTo(lx - wide * (d < 0 ? 1 : 0.4), 0); ctx.fill();
      }
    } else {
      ctx.fillStyle = legC;
      ctx.fillRect(-5 * W + sw, -12 - bob, 4 * W, 12); ctx.fillRect(1 * W - sw, -12 - bob, 4 * W, 12);
      if (bottom === 'shorts' || bottom === 'skirt' || bottom === 'track') {
        ctx.fillStyle = L.pants;
        if (bottom === 'skirt') { ctx.beginPath(); ctx.moveTo(-6 * W, -13 - bob); ctx.lineTo(6 * W, -13 - bob); ctx.lineTo(7.5 * W, -6 - bob); ctx.lineTo(-7.5 * W, -6 - bob); ctx.fill(); }
        else if (bottom === 'shorts') { ctx.fillRect(-5.5 * W + sw, -13 - bob, 5 * W, 7); ctx.fillRect(0.5 * W - sw, -13 - bob, 5 * W, 7); }
        else { ctx.fillStyle = '#fff'; ctx.fillRect(-5 * W + sw, -12 - bob, 0.8, 12); ctx.fillRect(5 * W - sw - 0.8, -12 - bob, 0.8, 12); }
      }
    }
    ctx.fillStyle = bottom === 'skirt' ? '#c9a27e' : '#222'; ctx.fillRect(-5.5 * W + sw, -2, 5 * W, 2.5); ctx.fillRect(0.5 * W - sw, -2, 5 * W, 2.5);
    if (bottom !== 'skirt') { ctx.fillStyle = '#fff'; ctx.fillRect(-5.5 * W + sw, -0.5, 5 * W, 1); ctx.fillRect(0.5 * W - sw, -0.5, 5 * W, 1); }
  } else {
    ctx.fillStyle = L.pants;
    ctx.fillRect(-5 * W, -12, 10 * W, 5);
    ctx.fillStyle = bottom === 'shorts' || bottom === 'skirt' ? L.skin : L.pants;
    ctx.fillRect(side > 0 ? 2 * W : -6 * W, -12, 4 * W, 10);
  }
  // ---------------- torso / tops
  const ty = -26 - bob + sit;
  const tw = (fem ? 12.5 : 14) * W;
  if (top === 'hoodie' && front) { ctx.fillStyle = shade(L.shirt, -0.2); ctx.beginPath(); ctx.ellipse(0, ty - 1, 9, 4, 0, 0, Math.PI * 2); ctx.fill(); }
  rrect(ctx, -tw / 2, ty, tw, 15, fem ? 5 : 4, L.shirt, 'rgba(0,0,0,0.3)');
  if (front) {
    if (top === 'band') { circle(ctx, side * 1.5, ty + 6, 3, '#f1f1f1'); ctx.fillStyle = L.shirt; ctx.fillRect(side * 1.5 - 1.5, ty + 5, 1, 1); ctx.fillRect(side * 1.5 + 0.5, ty + 5, 1, 1); ctx.fillStyle = '#ddd'; ctx.fillRect(side * 1.5 - 2, ty + 9.5, 4, 1); }
    if (top === 'polo') { ctx.fillStyle = shade(L.shirt, 0.35); ctx.beginPath(); ctx.moveTo(-4, ty); ctx.lineTo(-1, ty); ctx.lineTo(-3, ty - 4); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, ty); ctx.lineTo(1, ty); ctx.lineTo(3, ty - 4); ctx.fill(); ctx.fillStyle = shade(L.shirt, -0.3); ctx.fillRect(-0.5, ty + 1, 1, 4); }
    if (top === 'hoodie') { ctx.fillStyle = shade(L.shirt, -0.3); ctx.fillRect(-0.5, ty + 1, 1, 13); ctx.fillRect(-4, ty + 10, 8, 3); ctx.strokeStyle = '#eee'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(-2, ty + 1); ctx.lineTo(-2.5, ty + 5); ctx.moveTo(2, ty + 1); ctx.lineTo(2.5, ty + 5); ctx.stroke(); }
    if (top === 'track') { ctx.fillStyle = '#fff'; ctx.fillRect(-tw / 2 + 1, ty + 2, 1, 12); ctx.fillRect(tw / 2 - 2, ty + 2, 1, 12); ctx.fillStyle = shade(L.shirt, -0.35); ctx.fillRect(-0.4, ty + 1, 0.8, 13); }
  }
  if (acc === 'belt') { ctx.fillStyle = '#111'; ctx.fillRect(-tw / 2, ty + 13, tw, 2); ctx.fillStyle = '#ddd'; for (let i = -tw / 2 + 1; i < tw / 2; i += 2) ctx.fillRect(i, ty + 13.5, 0.9, 0.9); }
  if (acc === 'chain' && !o.sitting) { ctx.strokeStyle = '#ccc'; ctx.lineWidth = 0.7; ctx.beginPath(); ctx.moveTo(side * 4, ty + 14); ctx.quadraticCurveTo(side * 7, ty + 21, side * 5, ty + 15); ctx.stroke(); }
  if (o.kind === 'tech') { ctx.fillStyle = '#fff'; ctx.fillRect(2, ty + 4, 4, 3); ctx.fillStyle = '#1e5fb4'; ctx.font = 'bold 3px Tahoma'; ctx.fillText('IT', 3, ty + 6.5); }
  if (o.kind === 'janitor') { ctx.strokeStyle = '#8d6e63'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(8, ty - 6); ctx.lineTo(10, 0); ctx.stroke(); ellipse(ctx, 10, 0, 4, 2, '#ddd'); }
  if (o.kind === 'inspector') { rrect(ctx, side * 6 - 3, ty + 2, 7, 9, 1, '#a0522d'); ctx.fillStyle = '#fff'; ctx.fillRect(side * 6 - 2, ty + 3, 5, 7); }
  if (o.kind === 'bouncer') { ctx.fillStyle = '#fff'; ctx.font = 'bold 4px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('STAFF', 0, ty + 9); }
  // ---------------- arms
  ctx.fillStyle = top === 'tee' || top === 'band' || top === 'polo' ? L.skin : shade(L.shirt, -0.15);
  const sleeve = shade(L.shirt, -0.15);
  let wristA: [number, number] = [0, 0];
  if (o.typing && o.sitting) {
    const tap = Math.sin(o.t * 20) * 1;
    ctx.fillRect(side > 0 ? 3 : -9, ty + 4 + tap, 6, 3.5); ctx.fillRect(side > 0 ? 1 : -7, ty + 7 - tap, 6, 3.5);
    ctx.fillStyle = sleeve; ctx.fillRect(side > 0 ? 3 : -5, ty + 4 + tap, 2, 3.5);
    wristA = [side > 0 ? 8 : -9, ty + 4 + tap];
  } else if (o.rage > 85 && !o.sleep) {
    const wv = Math.sin(o.t * 25) * 3; ctx.fillRect(-10 * W, ty - 6 + wv, 3, 10); ctx.fillRect(7 * W, ty - 6 - wv, 3, 10);
    wristA = [7 * W, ty - 6 - wv];
  } else {
    const sw = o.walking ? Math.sin(o.walk) * 2 : 0;
    const ax = (fem ? 8 : 9) * W;
    ctx.fillRect(-ax, ty + 2 - sw, 3, 10); ctx.fillRect(ax - 3, ty + 2 + sw, 3, 10);
    ctx.fillStyle = sleeve; ctx.fillRect(-ax, ty + 2 - sw, 3, 4); ctx.fillRect(ax - 3, ty + 2 + sw, 3, 4);
    wristA = [ax - 3, ty + 9 + sw];
  }
  if (acc === 'livestrong') { ctx.fillStyle = '#ffd60a'; ctx.fillRect(wristA[0], wristA[1], 3, 1.6); }
  if (acc === 'sweatband') { ctx.fillStyle = '#fff'; ctx.fillRect(wristA[0], wristA[1], 3, 2); }
  // ---------------- head
  const hy = ty - 9;
  const skin = o.dead ? '#b8c4c9' : L.skin;
  if (L.hat === 'pumpkin') {
    ellipse(ctx, 0, hy, 11, 10, '#ff8c1a', '#a64d00');
    ctx.fillStyle = '#2b1100'; ctx.beginPath(); ctx.moveTo(-6, hy - 2); ctx.lineTo(-3, hy - 5); ctx.lineTo(-1, hy - 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(6, hy - 2); ctx.lineTo(3, hy - 5); ctx.lineTo(1, hy - 2); ctx.fill();
    ctx.fillRect(-5, hy + 3, 10, 2); ctx.fillStyle = '#2d6a4f'; ctx.fillRect(-1, hy - 13, 2, 4);
    ctx.restore(); return;
  }
  const hs = L.hairStyle;
  ctx.fillStyle = L.hair;
  // back hair layer
  if (LONG_HAIR.has(hs) || (!front && (hs === 15 || hs === 14))) {
    if (LONG_HAIR.has(hs)) { ctx.beginPath(); ctx.roundRect(-11, hy - 4, 22, hs === 10 ? 14 : 17, 4); ctx.fill(); }
    if (hs === 13) { ctx.fillStyle = '#f2d98d'; ctx.fillRect(-9, hy + 2, 2, 10); ctx.fillRect(7, hy + 2, 2, 10); ctx.fillStyle = L.hair; }
  }
  if (hs === 15) { ctx.beginPath(); ctx.ellipse(-side * 10, hy + 4, 3.5, 8, -side * 0.3, 0, Math.PI * 2); ctx.fill(); circle(ctx, -side * 9, hy - 3, 1.8, '#ff4fa3'); ctx.fillStyle = L.hair; }
  circle(ctx, 0, hy, 10, skin, 'rgba(0,0,0,0.35)');
  if (o.rage > 60 && !o.dead) circle(ctx, 0, hy, 10, `rgba(255,0,0,${Math.min(0.55, (o.rage - 60) / 70)})`);
  ctx.fillStyle = L.hair;
  const hatOn = !!L.hat && L.hat !== 'headset';
  const capArc = (r = 10.3, dy = -1) => { ctx.beginPath(); ctx.arc(0, hy + dy, r, Math.PI, 0); ctx.fill(); };
  if (!front) {
    if (hs === 9) { ctx.globalAlpha = 0.55; ctx.beginPath(); ctx.arc(0, hy, 10.2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
    else if (hs === 3) { ctx.beginPath(); ctx.arc(0, hy + 2, 10.2, 0.1 * Math.PI, 0.9 * Math.PI); ctx.fill(); }
    else { ctx.beginPath(); ctx.arc(0, hy, 10.3, 0, Math.PI * 2); ctx.fill(); }
    if (hs === 14) { circle(ctx, -7, hy - 9, 4, L.hair); circle(ctx, 7, hy - 9, 4, L.hair); }
    if (hs === 8) { ctx.strokeStyle = shade(L.hair, 0.25); ctx.lineWidth = 0.6; for (let i = -6; i <= 6; i += 3) { ctx.beginPath(); ctx.moveTo(i, hy - 9); ctx.lineTo(i, hy + 8); ctx.stroke(); } }
  } else if (hatOn && hs !== 3 && hs !== 9) {
    capArc(10.3, -1.5);
    if (LONG_HAIR.has(hs) || hs === 6) { ctx.fillRect(-11, hy - 3, 4, 10); ctx.fillRect(7, hy - 3, 4, 10); }
  } else {
    switch (hs) {
      case 0: capArc(); ctx.fillRect(-10, hy - 4, 20, 3); break;
      case 1: case 4: {
        for (let i = -2; i <= 2; i++) { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.moveTo(i * 4 - 3, hy - 6); ctx.lineTo(i * 4, hy - 16); ctx.lineTo(i * 4 + 3, hy - 6); ctx.fill();
          if (hs === 4) { ctx.fillStyle = '#f7e7a1'; ctx.beginPath(); ctx.moveTo(i * 4 - 1.2, hy - 12.5); ctx.lineTo(i * 4, hy - 16); ctx.lineTo(i * 4 + 1.2, hy - 12.5); ctx.fill(); } }
        ctx.fillStyle = L.hair; capArc(10, -2); break;
      }
      case 2: case 12: case 13: case 17:
        capArc(10.5, -1); ctx.fillRect(-11, hy - 2, 4, 12); ctx.fillRect(7, hy - 2, 4, 12);
        if (hs === 12) { ctx.fillStyle = skin; ctx.fillRect(-0.5, hy - 10, 1, 4); }
        if (hs === 13) { ctx.fillStyle = '#f2d98d'; ctx.fillRect(-5, hy - 10, 2, 5); ctx.fillRect(3, hy - 10, 2, 5); ctx.fillRect(-10, hy, 2, 8); }
        if (hs === 17) { ctx.fillStyle = shade(L.shirt, 0.1); ctx.fillRect(-10, hy - 7, 20, 2.2); }
        break;
      case 3: ctx.beginPath(); ctx.arc(0, hy - 2, 10, Math.PI * 1.1, Math.PI * 1.9); ctx.fill(); ctx.fillRect(-10.5, hy - 3, 2.5, 5); ctx.fillRect(8, hy - 3, 2.5, 5); break;
      case 5: case 11: {
        capArc(10.4, -1.5);
        if (hs === 11) { ctx.fillRect(-11, hy - 2, 4, 12); ctx.fillRect(7, hy - 2, 4, 12); }
        // the swoop: big diagonal bang covering one eye
        const s2 = -side;
        ctx.beginPath(); ctx.moveTo(-9 * s2, hy - 8); ctx.quadraticCurveTo(2 * s2, hy - 10, 9 * s2, hy - 4); ctx.lineTo(7 * s2, hy + 3); ctx.quadraticCurveTo(2 * s2, hy - 3, -6 * s2, hy - 4); ctx.fill();
        break;
      }
      case 6: capArc(10.8, -1); ctx.fillRect(-11, hy - 4, 4.5, 9); ctx.fillRect(6.5, hy - 4, 4.5, 9); ctx.fillRect(-9, hy - 6, 18, 3.5);
        ctx.beginPath(); ctx.moveTo(-9, hy - 3); for (let i = -9; i <= 9; i += 3) ctx.lineTo(i + 1.5, hy - 1 - (i % 2 ? 1 : 0)); ctx.lineTo(9, hy - 3); ctx.fill(); break;
      case 7: ctx.globalAlpha = 0.5; capArc(10.1, -1); ctx.globalAlpha = 1; ctx.beginPath(); ctx.moveTo(-3, hy - 7); ctx.lineTo(0, hy - 15); ctx.lineTo(3, hy - 7); ctx.fill(); ctx.fillRect(-2.5, hy - 10, 5, 4); break;
      case 8: capArc(10.2, -1.5); ctx.strokeStyle = shade(L.hair, 0.3); ctx.lineWidth = 0.6; for (let i = -6; i <= 6; i += 3) { ctx.beginPath(); ctx.moveTo(i * 0.6, hy - 11); ctx.lineTo(i, hy - 3); ctx.stroke(); } break;
      case 9: ctx.globalAlpha = 0.55; capArc(10.1, -1.5); ctx.globalAlpha = 1; break;
      case 10: {
        ctx.beginPath(); ctx.ellipse(0, hy - 10, 11, 6, 0, 0, Math.PI * 2); ctx.fill(); capArc(10.5, -1);
        const s2 = -side; ctx.beginPath(); ctx.moveTo(-9 * s2, hy - 8); ctx.quadraticCurveTo(2 * s2, hy - 9, 9 * s2, hy - 3); ctx.lineTo(6 * s2, hy + 3); ctx.quadraticCurveTo(1 * s2, hy - 3, -6 * s2, hy - 4); ctx.fill();
        ctx.fillStyle = '#ff4fd8'; ctx.fillRect(3 * s2 - 1, hy - 15, 2.5, 6); ctx.fillRect(-10.5 * s2 - (s2 > 0 ? 0 : 2), hy + 1, 2, 6);
        break;
      }
      case 14: capArc(10.3, -1.5); circle(ctx, -7, hy - 9, 4.2, L.hair); circle(ctx, 7, hy - 9, 4.2, L.hair); break;
      case 15: capArc(10.3, -1.5); ctx.fillRect(-9, hy - 6, 18, 2); break;
      case 16: capArc(10.3, -1.5); ctx.beginPath(); ctx.moveTo(-9 * side, hy - 7); ctx.quadraticCurveTo(0, hy - 9, 8 * side, hy - 3); ctx.lineTo(6 * side, hy - 1); ctx.quadraticCurveTo(0, hy - 5, -8 * side, hy - 4); ctx.fill(); break;
      default: capArc();
    }
  }
  // ---------------- face
  if (front) {
    const fx = side * 3;
    const swoopCovers = (hs === 5 || hs === 10 || hs === 11) && !hatOn;
    if (o.dead) {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.2;
      for (const ex of [fx - 3.5, fx + 3.5]) { ctx.beginPath(); ctx.moveTo(ex - 1.5, hy - 1.5); ctx.lineTo(ex + 1.5, hy + 1.5); ctx.moveTo(ex + 1.5, hy - 1.5); ctx.lineTo(ex - 1.5, hy + 1.5); ctx.stroke(); }
      ctx.fillStyle = '#000'; ctx.fillRect(fx - 2, hy + 5, 4, 1);
    } else if (o.sleep) {
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1; for (const ex of [fx - 3.5, fx + 3.5]) { ctx.beginPath(); ctx.arc(ex, hy, 1.6, 0, Math.PI); ctx.stroke(); }
      ellipse(ctx, fx + 1, hy + 5, 1.5, 1.2, '#000');
    } else {
      const eyes = swoopCovers ? [fx + 3.5 * side] : [fx - 3.5, fx + 3.5];
      for (const ex of eyes) { circle(ctx, ex, hy, 2.1, '#fff'); circle(ctx, ex + side * 0.6, hy + 0.2, 1.1, '#000'); }
      if (fem) { ctx.strokeStyle = '#000'; ctx.lineWidth = 0.7; for (const ex of eyes) { ctx.beginPath(); ctx.moveTo(ex - 2.2, hy - 1.6); ctx.lineTo(ex - 2.9, hy - 2.6); ctx.moveTo(ex + 2.2, hy - 1.6); ctx.lineTo(ex + 2.9, hy - 2.6); ctx.stroke(); } }
      ctx.strokeStyle = fem ? '#c2185b' : '#000'; ctx.lineWidth = 1.1;
      if (o.mood <= -2) { ctx.strokeStyle = '#000'; ctx.beginPath(); ctx.moveTo(fx - 6, hy - 4); ctx.lineTo(fx - 1.5, hy - 2.5); ctx.moveTo(fx + 6, hy - 4); ctx.lineTo(fx + 1.5, hy - 2.5); ctx.stroke(); ellipse(ctx, fx, hy + 5.5, 2.5, 2, '#5a0000'); }
      else if (o.mood === 1) { ctx.beginPath(); ctx.arc(fx, hy + 3, 3.2, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
      else if (o.mood === -1) { ctx.beginPath(); ctx.arc(fx, hy + 7, 3, 1.2 * Math.PI, 1.8 * Math.PI); ctx.stroke(); }
      else { ctx.beginPath(); ctx.moveTo(fx - 2, hy + 5); ctx.lineTo(fx + 2, hy + 5); ctx.stroke(); }
    }
    if (acc === 'shutter') { ctx.fillStyle = '#ff2bd6'; ctx.fillRect(fx - 7, hy - 2.5, 14, 5); ctx.fillStyle = skin; for (let i = 0; i < 3; i++) ctx.fillRect(fx - 6, hy - 1.6 + i * 1.5, 12, 0.6); }
    else if (L.glasses) { ctx.strokeStyle = o.kind === 'bouncer' ? '#000' : '#222'; ctx.lineWidth = 1; if (o.kind === 'bouncer') { ctx.fillStyle = '#000'; ctx.fillRect(fx - 7, hy - 2, 14, 4); } else { ctx.strokeRect(fx - 6, hy - 2, 5, 4); ctx.strokeRect(fx + 1, hy - 2, 5, 4); ctx.beginPath(); ctx.moveTo(fx - 1, hy); ctx.lineTo(fx + 1, hy); ctx.stroke(); } }
    if (L.beard) { ctx.fillStyle = L.hair; ctx.beginPath(); ctx.arc(fx * 0.5, hy + 4, 8, 0.05 * Math.PI, 0.95 * Math.PI); ctx.fill(); }
    if (acc === 'puka') { for (let i = -4; i <= 4; i += 1.6) circle(ctx, i, ty + 1 + Math.abs(i) * -0.2 + 1.2, 0.8, '#fffbe6'); }
  }
  if (acc === 'bandana') { ctx.fillStyle = '#c1121f'; ctx.fillRect(-10.2, hy - 6, 20.4, 3); ctx.fillStyle = '#fff'; ctx.fillRect(-6, hy - 5, 1, 1); ctx.fillRect(2, hy - 5, 1, 1); if (!front || side) { ctx.fillStyle = '#c1121f'; ctx.fillRect(-side * 10, hy - 5, -side * 4, 1.5); ctx.fillRect(-side * 10, hy - 4, -side * 3, 2); } }
  // ---------------- hats
  if (L.hat === 'cap') { ctx.fillStyle = shade(L.shirt, -0.2); ctx.beginPath(); ctx.arc(0, hy - 2, 10.5, Math.PI, 0); ctx.fill(); if (front) ctx.fillRect(side > 0 ? 2 : -14, hy - 4, 12, 3); }
  if ((L.hat as string) === 'trucker') {
    ctx.fillStyle = '#f1f1f1'; ctx.beginPath(); ctx.arc(0, hy - 2, 10.8, Math.PI, 0); ctx.fill();
    ctx.fillStyle = '#1d3557'; ctx.beginPath(); ctx.arc(0, hy - 2, 10.8, Math.PI * 1.55, 0); ctx.lineTo(0, hy - 2); ctx.fill();
    ctx.fillStyle = '#1d3557'; if (front) ctx.fillRect(side > 0 ? -1 : -13, hy - 4, 14, 2.5);
    if (front) { ctx.fillStyle = '#c1121f'; ctx.font = 'bold 3.2px Tahoma'; ctx.textAlign = 'center'; ctx.fillText('VON', -3, hy - 7); }
  }
  if (L.hat === 'santa') { ctx.fillStyle = '#d62828'; ctx.beginPath(); ctx.moveTo(-10, hy - 4); ctx.lineTo(10, hy - 4); ctx.lineTo(side * 12, hy - 20); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-11, hy - 6, 22, 4); circle(ctx, side * 12, hy - 20, 3, '#fff'); }
  if (L.hat === 'beanie') { ctx.fillStyle = shade(L.shirt, -0.25); ctx.beginPath(); ctx.arc(0, hy - 2, 10.8, Math.PI, 0); ctx.fill(); ctx.fillRect(-11, hy - 4, 22, 3.5); circle(ctx, 0, hy - 13, 3, shade(L.shirt, 0.3)); }
  if (L.hat === 'fedora') { ellipse(ctx, 0, hy - 6, 15, 3.5, '#3b2f2f'); ctx.fillStyle = '#4a3b3b'; ctx.beginPath(); ctx.moveTo(-8, hy - 6); ctx.lineTo(-7, hy - 15); ctx.quadraticCurveTo(0, hy - 18, 7, hy - 15); ctx.lineTo(8, hy - 6); ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(-8, hy - 9, 16, 2.5); }
  if (L.hat === 'headset') { ctx.strokeStyle = '#222'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, hy, 11, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke(); ellipse(ctx, -10, hy + 1, 3, 4, '#111'); ellipse(ctx, 10, hy + 1, 3, 4, '#111'); }
  ctx.restore();
}
