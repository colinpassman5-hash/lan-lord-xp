// ============ LAN LORD — PROLOGUE: "THE DROPOUT" ============
// Split screen: top = animated pixel cutscene (reacts live to your choices), bottom = interaction console.
import { drawPerson } from './render';
import * as audio from './audio';
import type { Profile } from './data';

type Look = any;
type Ctx = CanvasRenderingContext2D;
const CW = 320, CH = 180;

// ---------------------------------------------------------------- era-accurate wardrobe (Fall 2004)
const SKINS = [['#ffe9d6', 'Fluorescent Pale'], ['#ffdbac', 'Peach'], ['#f1c27d', 'Light Tan'], ['#e0ac69', 'Golden'], ['#c68642', 'Caramel'], ['#a0662f', 'Bronze'], ['#8d5524', 'Brown'], ['#5c3317', 'Deep']];
const HAIR_M = [[4, 'Frosted Tips (*NSYNC)'], [5, 'Emo Swoop'], [6, 'Skater Shag'], [7, 'Faux Hawk (Beckham)'], [1, 'Spiky Gel (1 tub)'], [0, 'Bowl Cut (Mom Did It)'], [8, 'Cornrows'], [9, 'Buzz Cut'], [3, 'Balding @ 19']];
const HAIR_F = [[10, 'Scene Hair (teased)'], [11, 'Emo Side Bangs'], [12, 'Avril Straight'], [13, 'Chunky Highlights'], [14, 'Gwen Space Buns'], [15, 'Ponytail + Scrunchie'], [16, 'Pixie Cut'], [17, 'Hilary Duff Headband']];
const HAIR_COLORS = [['#1a120b', 'Natural Black'], ['#4a2f1b', 'Brown'], ['#8a6a3a', 'Dirty Blonde'], ['#f0d98a', 'Sun-In Bleach'], ['#a5432a', 'Ginger'], ['#0b0b0b', 'Hot Topic Jet Black'], ['#e0409a', 'Manic Panic Pink'], ['#2b6fd6', 'Kool-Aid Blue'], ['#6b6b6b', 'Stress Gray']];
const TOPS_M = [['tee', 'Plain Tee'], ['band', 'Band Tee (Hot Topic)'], ['polo', 'Popped-Collar Polo x2'], ['hoodie', 'Zip Hoodie'], ['track', 'Tracksuit']];
const TOPS_F = [['tee', 'Baby Tee'], ['band', 'Band Tee (Hot Topic)'], ['polo', 'Popped-Collar Polo'], ['hoodie', 'Zip Hoodie'], ['track', 'Juicy Velour Tracksuit']];
const SHIRT_COLORS = [['#111111', 'Emo Black'], ['#e8483b', 'Ketchup Red'], ['#1e7fd8', 'Dorito Blue'], ['#3cb44b', 'Mtn Dew Green'], ['#ff7fbf', 'Paris Pink'], ['#8e44ad', 'Purple Drank'], ['#f5f5f5', 'Abercrombie White'], ['#f58231', 'Livestrong... Orange?'], ['#7a5230', 'Cargo Brown'], ['#29b6c4', 'Aeropostale Teal']];
const BOTTOMS_M = [['pants', 'Baggy Jeans'], ['jnco', 'JNCOs (Enormous)'], ['shorts', 'Cargo Shorts (all year)'], ['track', 'Track Pants']];
const BOTTOMS_F = [['flare', 'Low-Rise Flares'], ['skirt', 'Denim Mini + Leggings'], ['track', 'Juicy Pants'], ['pants', 'Bootcut Jeans'], ['shorts', 'Capris']];
const PANTS_COLORS = [['#2b3a67', 'Dark Wash'], ['#4a6fa5', 'Acid Wash'], ['#3b3b3b', 'Black'], ['#8b7355', 'Khaki'], ['#ff7fbf', 'Pink Velour'], ['#5a4632', 'Brown Corduroy']];
const ACCS = [['', 'None'], ['puka', 'Puka Shell Necklace'], ['livestrong', 'LIVESTRONG Band'], ['belt', 'Studded Belt'], ['chain', 'Wallet Chain'], ['sweatband', 'Sweatband'], ['bandana', 'Bandana'], ['shutter', 'Shutter Shades (from 2007)']];
const HATS = [['', 'None'], ['trucker', 'Von Dutch Trucker'], ['cap', 'Backwards Cap'], ['beanie', 'Beanie'], ['headset', 'Headset (always on)'], ['fedora', 'Fedora (too early)']];
const BUILDS = [[0.9, 'Twig'], [1, 'Average'], [1.3, 'Hot Pocket Enjoyer']];
export const FAV_GAMES = [
  { id: 'halo', name: 'HALO 2', blurb: 'Fans pay 5% more (it\'s "for the Arbiter")' },
  { id: 'wow', name: 'WORLD OF WARCRAFT', blurb: 'Gamers stay 15% longer (one more dungeon)' },
  { id: 'cs', name: 'COUNTER-STRIKE 1.6', blurb: 'Gamers rage 15% less (they\'re used to it)' },
  { id: 'rs', name: 'RUNESCAPE', blurb: '+10% customers (12-year-olds with allowance)' },
  { id: 'ddr', name: 'DANCE DANCE REVOLUTION', blurb: 'Free Lava Lamp at every location (vibes)' },
];
export const STARTERS = [
  { id: 'beige', name: 'BEIGE BOX', type: 'GRASS', color: '#3a9d3a', icon: 'pc_beige', desc: 'Reliable. Boring. Smells like your dad\'s office.', bonus: '+1 free PC every location' },
  { id: 'gateway', name: 'GATEWAY COW BOX', type: 'FIRE', color: '#e0532f', icon: 'pc_beige', desc: 'Ships in a cow-print box. Runs HOT. Moo.', bonus: '+$750 cash every location' },
  { id: 'emachine', name: 'eMACHINE', type: 'WATER', color: '#2e86de', icon: 'pc_gamer', desc: 'Always leaking something. Includes mini fridge.', bonus: 'Free fridge every location' },
];

const CSS = `
#pro { position: fixed; inset: 0; z-index: 300000; background: #05050a; display: flex; align-items: center; justify-content: center; font-family: 'Lucida Console', 'Courier New', monospace; user-select: none; color: #303030; }
#pro .frame { width: min(98vw, 1180px); height: min(97vh, 860px); display: flex; flex-direction: column; gap: 8px; }
#pro .cinema { position: relative; flex: 0 0 58%; background: #000; border-radius: 8px; overflow: hidden; box-shadow: 0 0 0 4px #222, 0 0 0 7px #444, 0 10px 40px rgba(0,0,0,0.8); }
#pro .cinema canvas { width: 100%; height: 100%; object-fit: contain; image-rendering: pixelated; display: block; background: #000; }
#pro .cap { position: absolute; left: 0; right: 0; top: 0; height: 34px; background: rgba(0,0,0,0.85); color: #f5e6a8; font-size: 14px; letter-spacing: 2px; display: flex; align-items: center; justify-content: center; text-shadow: 2px 2px 0 #5a3a00; }
#pro .cap:empty { display: none; }
#pro .bars::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 18px; background: #000; }
#pro .scan { position: absolute; inset: 0; pointer-events: none; background: repeating-linear-gradient(to bottom, rgba(0,0,0,0.12) 0 2px, transparent 2px 4px); }
#pro .console { position: relative; flex: 1; border-radius: 10px; background: #fff; border: 4px solid #4a5a8a; box-shadow: inset 0 0 0 3px #fff, inset 0 0 0 6px #e08a3a; padding: 14px 18px; overflow: hidden; display: flex; flex-direction: column; }
#pro .who { position: absolute; top: 10px; left: 18px; background: #4a5a8a; color: #fff; padding: 3px 12px; border-radius: 6px; font-size: 12px; letter-spacing: 1px; }
#pro .who:empty { display: none; }
#pro .txt { font-size: 18px; line-height: 1.65; white-space: pre-wrap; flex: 1; cursor: pointer; padding-top: 26px; }
#pro .arrow { position: absolute; right: 22px; bottom: 14px; color: #e04a3a; animation: prbob 0.6s steps(2) infinite; display: none; font-size: 16px; }
@keyframes prbob { 50% { transform: translateY(4px); } }
#pro .choices { position: absolute; right: 16px; bottom: 14px; background: #fff; border: 4px solid #4a5a8a; border-radius: 10px; box-shadow: inset 0 0 0 3px #fff, inset 0 0 0 6px #e08a3a; padding: 12px 20px 12px 12px; font-size: 15px; z-index: 5; }
#pro .choices div { padding: 6px 4px 6px 26px; position: relative; cursor: pointer; white-space: nowrap; }
#pro .choices div.on::before { content: '▶'; position: absolute; left: 2px; }
#pro .skip { position: absolute; top: 44px; right: 10px; z-index: 10; font-size: 11px; color: #ccc; cursor: pointer; padding: 5px 10px; border: 2px solid #666; border-radius: 6px; background: rgba(0,0,0,0.6); }
#pro .skip:hover { color: #fff; border-color: #fff; }
#pro .pane { position: absolute; inset: 0; background: #fff; padding: 12px 16px; display: flex; flex-direction: column; z-index: 6; border-radius: 6px; }
#pro .pane h3 { margin: 0 0 8px; font-size: 15px; color: #1d3a80; letter-spacing: 1px; display: flex; align-items: center; gap: 10px; }
#pro .pane h3 small { color: #888; font-size: 10px; letter-spacing: 0; }
#pro .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 18px; flex: 1; overflow-y: auto; align-content: start; }
#pro .row { display: flex; align-items: center; gap: 6px; padding: 5px 6px; font-size: 12px; border-radius: 6px; cursor: pointer; }
#pro .row.on { background: #ffe08a; }
#pro .row .k { width: 92px; color: #555; }
#pro .row .a { color: #e04a3a; padding: 0 5px; cursor: pointer; font-size: 13px; }
#pro .row .v { flex: 1; text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
#pro .row .sw { width: 12px; height: 12px; border-radius: 3px; border: 1px solid #333; display: inline-block; vertical-align: -2px; margin-right: 5px; }
#pro .btns { display: flex; gap: 10px; justify-content: flex-end; margin-top: 6px; }
#pro .pbtn { background: #fff; border: 3px solid #1d3a80; border-radius: 8px; padding: 8px 16px; font-family: inherit; font-size: 13px; cursor: pointer; color: #1d3a80; }
#pro .pbtn:hover { background: #ffe08a; }
#pro .pbtn.go { background: #2f9e44; color: #fff; border-color: #1b6b2b; }
#pro .pbtn.go:hover { background: #37b24d; }
#pro .sex { display: flex; gap: 8px; }
#pro .sex button { font-family: inherit; font-size: 13px; padding: 4px 14px; border-radius: 14px; border: 3px solid #1d3a80; background: #fff; cursor: pointer; }
#pro .sex button.on { background: #1d3a80; color: #fff; }
#pro .aim { display: flex; gap: 16px; align-items: stretch; flex: 1; }
#pro .aimwin { width: 320px; border: 2px solid #0a246a; border-radius: 4px; background: #ece9d8; display: flex; flex-direction: column; font-family: Tahoma, sans-serif; font-size: 12px; }
#pro .aimwin .t { background: linear-gradient(#0a246a, #3a6ea5); color: #fff; padding: 4px 8px; font-weight: bold; }
#pro .aimwin .b { padding: 10px; display: flex; flex-direction: column; gap: 6px; flex: 1; }
#pro .aimwin .logo { text-align: center; font-size: 34px; }
#pro .aimwin input { font-family: Tahoma; font-size: 15px; padding: 5px; border: 2px inset #ccc; }
#pro .presets { display: flex; flex-wrap: wrap; gap: 6px; align-content: flex-start; flex: 1; }
#pro .presets div { padding: 7px 10px; border: 2px solid #1d3a80; border-radius: 6px; cursor: pointer; font-size: 12px; height: fit-content; }
#pro .presets div:hover { background: #ffe08a; }
#pro .cards { display: flex; gap: 12px; flex: 1; }
#pro .card { flex: 1; border: 3px solid #1d3a80; border-radius: 10px; padding: 8px; text-align: center; cursor: pointer; font-size: 11px; display: flex; flex-direction: column; align-items: center; gap: 4px; transition: transform 0.15s; }
#pro .card:hover, #pro .card.on { background: #fffbe6; transform: translateY(-4px); outline: 3px solid #ffd34d; }
#pro .card canvas { image-rendering: pixelated; }
#pro .card .ty { color: #fff; padding: 2px 8px; border-radius: 10px; font-size: 10px; }
#pro .card .bn { color: #2f7d32; }
#pro .flash { position: fixed; inset: 0; background: #fff; opacity: 0; pointer-events: none; transition: opacity 0.5s; z-index: 300001; }
`;

// ---------------------------------------------------------------- tiny pixel drawing kit
const R = (ctx: Ctx, x: number, y: number, w: number, h: number, c: string) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const T = (ctx: Ctx, s: string, x: number, y: number, c: string, size = 8, align: CanvasTextAlign = 'center', font = '"Lucida Console", monospace') => { ctx.font = `bold ${size}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = c; ctx.fillText(s, x, y); };
function hash(n: number) { n = (n ^ 61) ^ (n >>> 16); n = n + (n << 3); n = n ^ (n >>> 4); n = Math.imul(n, 0x27d4eb2d); n = n ^ (n >>> 15); return (n >>> 0) / 4294967296; }
function person(ctx: Ctx, look: Look, x: number, y: number, s: number, o: Partial<{ face: number; walking: boolean; walk: number; sitting: boolean; typing: boolean; mood: number; kind: string; t: number }> = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  drawPerson(ctx, 0, 0, look, { face: o.face ?? 1, walk: o.walk ?? 0, walking: !!o.walking, sitting: !!o.sitting, lying: false, sleep: false, dead: false, mood: o.mood ?? 1, rage: 0, kind: o.kind || 'customer', t: o.t ?? 0, typing: !!o.typing });
  ctx.restore();
}
function crt(ctx: Ctx, x: number, y: number, w: number, glow: string) {
  R(ctx, x, y, w, w * 0.8, '#d8ccb0'); R(ctx, x + 3, y + 3, w - 6, w * 0.8 - 8, glow); R(ctx, x + w * 0.3, y + w * 0.8, w * 0.4, 4, '#b8ac90');
}
function sign(ctx: Ctx, text: string, x: number, y: number, lit: number, t: number) {
  const s = (text || '???').toUpperCase();
  const size = Math.max(7, Math.min(13, 150 / Math.max(6, s.length)));
  R(ctx, x - 64, y - 13, 128, 26, '#8b5e34'); R(ctx, x - 62, y - 11, 124, 22, '#c08a52');
  for (let i = 0; i < 4; i++) R(ctx, x - 62, y - 11 + i * 6, 124, 1, 'rgba(0,0,0,0.12)');
  if (lit > 0) {
    const fl = lit >= 1 ? 1 : (hash(Math.floor(t * 20)) < lit ? 1 : 0.2);
    ctx.save(); ctx.shadowColor = '#ff3b6b'; ctx.shadowBlur = 10 * fl; T(ctx, s, x, y + 1, `rgba(255,${80 + 100 * (1 - fl)},120,${0.4 + 0.6 * fl})`, size, 'center', 'Impact, "Arial Black", sans-serif'); ctx.restore();
  } else T(ctx, s, x, y + 1, '#2b1a0a', size, 'center', '"Comic Sans MS", cursive');
}

// ---------------------------------------------------------------- the prologue
export function runPrologue(icon: (type: string) => HTMLCanvasElement): Promise<Profile> {
  return new Promise((resolve) => {
    if (!document.getElementById('pro-css')) { const st = document.createElement('style'); st.id = 'pro-css'; st.textContent = CSS; document.head.append(st); }
    const el = (tag: string, cls = '', txt = '') => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt) e.textContent = txt; return e; };
    const root = el('div'); root.id = 'pro';
    const frame = el('div', 'frame');
    const cinema = el('div', 'cinema bars');
    const canvas = document.createElement('canvas'); canvas.width = CW; canvas.height = CH;
    const cap = el('div', 'cap');
    const skip = el('div', 'skip', 'SKIP PROLOGUE ▸▸');
    cinema.append(canvas, cap, el('div', 'scan'), skip);
    const con = el('div', 'console');
    const who = el('div', 'who');
    const txt = el('div', 'txt');
    const arrow = el('div', 'arrow', '▼');
    con.append(who, txt, arrow);
    frame.append(cinema, con);
    const flash = el('div', 'flash');
    root.append(frame, flash);
    document.body.append(root);
    const ctx = canvas.getContext('2d')!;

    // ---------- player profile being built
    const P: Profile = {
      name: 'LAN LORD', shop: 'DUNGEON LAN', rival: 'BOB', sex: 'm', starter: 'beige', degen: 'CERTIFIED', fav: 'halo', away: 'brb mom needs the phone line',
      look: { sex: 'm', skin: '#ffdbac', hairStyle: 4, hair: '#4a2f1b', top: 'band', shirt: '#111111', bottom: 'jnco', pants: '#2b3a67', acc: 'puka', hat: '', glasses: false, beard: false, scale: 1, wide: 1 },
    };
    const MOM: Look = { shirt: '#b05fc4', pants: '#b05fc4', skin: '#f1c27d', hair: '#c9a35f', hairStyle: 2, glasses: false, beard: false, hat: '', scale: 1, wide: 1.1 };
    const sub = (s: string) => s.replace(/\{NAME\}/g, P.name).replace(/\{SHOP\}/g, P.shop).replace(/\{RIVAL\}/g, P.rival);

    // ---------- cinema engine
    type SceneFn = (ctx: Ctx, t: number, S: any) => void;
    let scene: SceneFn = () => { }; let st = 0; let S: any = {};
    let last = performance.now(); let running = true;
    const loop = (now: number) => {
      if (!running) return;
      const dt = Math.min(0.05, (now - last) / 1000); last = now; st += dt;
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, CW, CH);
      try { scene(ctx, st, S); } catch (e) { console.error(e); }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
    function setScene(fn: SceneFn, state: any = {}) { scene = fn; st = 0; S = state; }
    function caption(s: string) { cap.textContent = sub(s); }
    const wait = (sec: number) => new Promise<void>(res => { const target = st + sec; const iv = setInterval(() => { if (st >= target || skipping) { clearInterval(iv); res(); } }, 30); });

    // ---------- console: text, choices, panes
    let onConfirm: (() => void) | null = null;
    let onKey: ((e: KeyboardEvent) => boolean) | null = null;
    let skipping = false;
    const keyh = (e: KeyboardEvent) => {
      const tgt = e.target as HTMLElement;
      if (tgt && tgt.tagName === 'INPUT') { if (e.key === 'Enter') { e.preventDefault(); onConfirm?.(); } e.stopPropagation(); return; }
      e.stopPropagation();
      if (onKey && onKey(e)) { e.preventDefault(); return; }
      if (['Enter', ' ', 'z', 'Z'].includes(e.key)) { e.preventDefault(); onConfirm?.(); }
    };
    window.addEventListener('keydown', keyh, true);
    txt.addEventListener('click', () => onConfirm?.());
    const ac = () => (audio.getMusicBus() as any)?.context;
    const blip = () => { const c = ac(); if (c) audio.tone('square', 1050, 1050, c.currentTime, 0.022, 0.025); };
    const sel = () => audio.sfx('click');

    function type(speaker: string, text: string): Promise<void> {
      text = sub(text); who.textContent = speaker; arrow.style.display = 'none';
      return new Promise(res => {
        let i = 0; let timer = 0;
        const done = () => { clearTimeout(timer); txt.textContent = text; onConfirm = null; res(); };
        if (skipping) return done();
        const tick = () => {
          if (i >= text.length) return done();
          i++; txt.textContent = text.slice(0, i);
          if (i % 2 === 0 && text[i - 1] !== ' ') blip();
          const ch = text[i - 1];
          timer = window.setTimeout(tick, ch === '.' || ch === '!' || ch === '?' ? 130 : 22);
        };
        onConfirm = done;
        tick();
      });
    }
    async function say(speaker: string, text: string) {
      await type(speaker, text);
      if (skipping) return;
      arrow.style.display = 'block';
      await new Promise<void>(res => { onConfirm = () => { onConfirm = null; arrow.style.display = 'none'; sel(); res(); }; });
    }
    function choose(options: string[]): Promise<number> {
      if (skipping) return Promise.resolve(0);
      return new Promise(res => {
        let cur = 0;
        const box = el('div', 'choices');
        const render = () => { box.innerHTML = ''; options.forEach((o, i) => { const d = el('div', i === cur ? 'on' : '', sub(o)); d.onclick = (e) => { e.stopPropagation(); cur = i; finish(); }; d.onmouseenter = () => { if (cur !== i) { cur = i; render(); } }; box.append(d); }); };
        const finish = () => { onKey = null; onConfirm = null; box.remove(); sel(); res(cur); };
        onKey = (e) => {
          if (e.key === 'ArrowDown') { cur = (cur + 1) % options.length; render(); sel(); return true; }
          if (e.key === 'ArrowUp') { cur = (cur + options.length - 1) % options.length; render(); sel(); return true; }
          return false;
        };
        onConfirm = null; setTimeout(() => { if (box.isConnected) onConfirm = finish; }, 280);
        render(); con.append(box);
      });
    }
    async function ask(speaker: string, text: string, options: string[]) { await type(speaker, text); return choose(options); }
    function pane(): HTMLElement { const p = el('div', 'pane'); con.append(p); return p; }

    // ---------- CHARACTER CREATOR (live in the mirror scene)
    function creator(): Promise<void> {
      if (skipping) return Promise.resolve();
      return new Promise(res => {
        const p = pane();
        const L = P.look;
        type Opt = { key: string; label: string; list: () => any[][]; get: () => any; set: (v: any) => void; swatch?: boolean };
        const opts: Opt[] = [
          { key: 'skin', label: 'Skin', list: () => SKINS, get: () => L.skin, set: v => L.skin = v, swatch: true },
          { key: 'hair', label: 'Hairstyle', list: () => P.sex === 'f' ? HAIR_F : HAIR_M, get: () => L.hairStyle, set: v => L.hairStyle = v },
          { key: 'hairc', label: 'Hair Color', list: () => HAIR_COLORS, get: () => L.hair, set: v => L.hair = v, swatch: true },
          { key: 'top', label: 'Top', list: () => P.sex === 'f' ? TOPS_F : TOPS_M, get: () => L.top, set: v => L.top = v },
          { key: 'shirt', label: 'Top Color', list: () => SHIRT_COLORS, get: () => L.shirt, set: v => L.shirt = v, swatch: true },
          { key: 'bottom', label: 'Bottoms', list: () => P.sex === 'f' ? BOTTOMS_F : BOTTOMS_M, get: () => L.bottom, set: v => L.bottom = v },
          { key: 'pants', label: 'Bottom Color', list: () => PANTS_COLORS, get: () => L.pants, set: v => L.pants = v, swatch: true },
          { key: 'hat', label: 'Hat', list: () => HATS, get: () => L.hat, set: v => L.hat = v },
          { key: 'acc', label: 'Bling', list: () => ACCS, get: () => L.acc, set: v => L.acc = v },
          { key: 'glasses', label: 'Glasses', list: () => [[false, 'None'], [true, 'Emo Rectangle Frames']], get: () => L.glasses, set: v => L.glasses = v },
          { key: 'beard', label: 'Face Fuzz', list: () => P.sex === 'f' ? [[false, 'None']] : [[false, 'None'], [true, 'Neckbeard']], get: () => L.beard, set: v => L.beard = v },
          { key: 'wide', label: 'Build', list: () => BUILDS, get: () => L.wide, set: v => L.wide = v },
        ];
        let cur = 0;
        const head = el('h3', '', 'WHO ARE YOU?');
        const sexBox = el('div', 'sex');
        const mBtn = el('button', '', '♂ MALE'), fBtn = el('button', '', '♀ FEMALE');
        sexBox.append(mBtn, fBtn);
        head.append(sexBox, el('small', '', '↑↓ select · ←→ change · watch the mirror'));
        const grid = el('div', 'grid');
        const idx = (o: Opt) => Math.max(0, o.list().findIndex(v => v[0] === o.get()));
        const change = (o: Opt, d: number) => { const l = o.list(); o.set(l[(idx(o) + d + l.length) % l.length][0]); S.pose = (S.pose || 0) + 1; sel(); render(); };
        const setSex = (s: 'm' | 'f') => {
          P.sex = s; L.sex = s;
          if (s === 'f') { L.hairStyle = 10; L.top = 'track'; L.shirt = '#ff7fbf'; L.bottom = 'track'; L.pants = '#ff7fbf'; L.beard = false; L.acc = 'livestrong'; L.hat = ''; }
          else { L.hairStyle = 4; L.top = 'band'; L.shirt = '#111111'; L.bottom = 'jnco'; L.pants = '#2b3a67'; L.acc = 'puka'; }
          sel(); render();
        };
        mBtn.onclick = () => setSex('m'); fBtn.onclick = () => setSex('f');
        const render = () => {
          mBtn.className = P.sex === 'm' ? 'on' : ''; fBtn.className = P.sex === 'f' ? 'on' : '';
          grid.innerHTML = '';
          opts.forEach((o, i) => {
            const r = el('div', 'row' + (i === cur ? ' on' : ''));
            const v = el('span', 'v');
            const item = o.list()[idx(o)];
            if (o.swatch) { const sw = el('span', 'sw'); sw.style.background = item[0]; v.append(sw); }
            v.append(item[1]);
            const l = el('span', 'a', '◀'); l.onclick = (e) => { e.stopPropagation(); cur = i; change(o, -1); };
            const rr = el('span', 'a', '▶'); rr.onclick = (e) => { e.stopPropagation(); cur = i; change(o, 1); };
            r.onclick = () => { cur = i; render(); };
            r.append(el('span', 'k', o.label), l, v, rr); grid.append(r);
          });
        };
        const btns = el('div', 'btns');
        const rnd = el('button', 'pbtn', '🎲 RANDOM'); rnd.onclick = () => { for (const o of opts) { const l = o.list(); o.set(l[Math.floor(Math.random() * l.length)][0]); } audio.sfx('fix'); render(); };
        const turn = el('button', 'pbtn', '↻ TURN'); turn.onclick = () => { S.face = ((S.face ?? 1) + 1) % 4; sel(); };
        const done = el('button', 'pbtn go', '✔ THAT\'S ME'); const finish = () => { onKey = null; onConfirm = null; p.remove(); audio.sfx('kaching'); res(); }; done.onclick = finish;
        btns.append(rnd, turn, done);
        p.append(head, grid, btns);
        render();
        onKey = (e) => {
          if (e.key === 'ArrowDown') { cur = (cur + 1) % opts.length; render(); return true; }
          if (e.key === 'ArrowUp') { cur = (cur + opts.length - 1) % opts.length; render(); return true; }
          if (e.key === 'ArrowLeft') { change(opts[cur], -1); return true; }
          if (e.key === 'ArrowRight') { change(opts[cur], 1); return true; }
          if (e.key === 'Enter') { finish(); return true; }
          return true;
        };
      });
    }

    // ---------- text entry (AIM sign-on style), live-updates the scene
    function entry(title: string, label: string, presets: string[], max: number, initial: string, live: (v: string) => void, logo = '🏃'): Promise<string> {
      if (skipping) return Promise.resolve(initial);
      return new Promise(res => {
        const p = pane();
        p.append(el('h3', '', title));
        const wrap = el('div', 'aim');
        const win = el('div', 'aimwin');
        const tb = el('div', 't', 'Sign On'); const b = el('div', 'b');
        const lg = el('div', 'logo', logo);
        const inp = document.createElement('input'); inp.maxLength = max; inp.value = initial; inp.spellcheck = false;
        inp.addEventListener('input', () => { live(inp.value); blip(); });
        b.append(lg, el('div', '', label), inp, el('div', '', `max ${max} chars · ENTER to confirm`));
        win.append(tb, b);
        const pre = el('div', 'presets');
        for (const x of presets) { const d = el('div', '', x); d.onclick = () => { inp.value = x.slice(0, max); live(inp.value); sel(); inp.focus(); }; pre.append(d); }
        wrap.append(win, pre);
        const btns = el('div', 'btns');
        const go = el('button', 'pbtn go', '✔ SIGN ON');
        const finish = () => { const v = inp.value.trim(); if (!v) { audio.sfx('close'); inp.focus(); return; } onConfirm = null; p.remove(); audio.sfx('kaching'); res(v); };
        go.onclick = finish;
        btns.append(go);
        p.append(wrap, btns);
        onConfirm = finish; onKey = null;
        live(initial);
        setTimeout(() => { inp.focus(); inp.select(); }, 50);
      });
    }

    // ---------- starter cards
    function starters(): Promise<number> {
      if (skipping) return Promise.resolve(0);
      return new Promise(res => {
        const p = pane();
        p.append(el('h3', '', 'CHOOSE YOUR STARTER PC'));
        const row = el('div', 'cards');
        STARTERS.forEach((s, i) => {
          const c = el('div', 'card');
          const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48; cv.style.width = '96px'; cv.style.height = '96px';
          const cx = cv.getContext('2d')!; cx.drawImage(icon(s.icon), 0, 0, 48, 48);
          if (s.id === 'gateway') { cx.fillStyle = '#111'; for (const [x, y, r] of [[30, 20, 2.5], [33, 26, 2], [29, 29, 1.6]] as [number, number, number][]) { cx.beginPath(); cx.arc(x, y, r, 0, 6.28); cx.fill(); } }
          const ty = el('div', 'ty', 'TYPE: ' + s.type); ty.style.background = s.color;
          c.append(cv, el('b', '', s.name), ty, el('div', '', s.desc), el('div', 'bn', '★ ' + s.bonus));
          c.onmouseenter = () => { S.hover = i; };
          c.onclick = () => { p.remove(); audio.sfx('kaching'); res(i); };
          row.append(c);
        });
        p.append(row);
        onConfirm = null; onKey = null;
      });
    }

    // ================================================================ SCENES
    const title: SceneFn = (c, t) => {
      R(c, 0, 0, CW, CH, '#0a0718');
      for (let i = 0; i < 90; i++) { const x = hash(i) * CW, y = hash(i * 7) * CH; const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i)); R(c, x, y, 1, 1, `rgba(255,255,255,${tw})`); }
      const k = Math.min(1, t / 1.2);
      c.save(); c.shadowColor = '#00e5ff'; c.shadowBlur = 12;
      T(c, 'LAN LORD', CW / 2, 66 - (1 - k) * 40, `rgba(0,229,255,${k})`, 34, 'center', 'Impact, "Arial Black", sans-serif');
      c.restore();
      T(c, 'PROLOGUE: THE DROPOUT', CW / 2, 98, `rgba(245,230,168,${Math.max(0, Math.min(1, (t - 1) / 0.8))})`, 9);
      T(c, '— FALL 2004 —', CW / 2, 112, `rgba(255,120,120,${Math.max(0, Math.min(1, (t - 1.6) / 0.8))})`, 8);
      crt(c, CW / 2 - 14, 128, 28, `hsl(${(t * 80) % 360},70%,55%)`);
      if (t > 2.2 && Math.floor(t * 2) % 2 === 0) T(c, 'PRESS START', CW / 2, 168, '#fff', 8);
    };
    const mirror: SceneFn = (c, t, s) => {
      // dorm room, character in the spotlight (live preview)
      R(c, 0, 0, CW, CH, '#2d2547'); R(c, 0, 130, CW, 50, '#4a3b2a');
      for (let x = 0; x < CW; x += 16) R(c, x, 130, 1, 50, 'rgba(0,0,0,0.15)');
      R(c, 20, 30, 40, 54, '#1b4332'); T(c, 'HALO 2', 40, 50, '#95d5b2', 7); T(c, 'FINISH', 40, 62, '#95d5b2', 6); T(c, 'THE FIGHT', 40, 70, '#95d5b2', 6);
      R(c, 260, 26, 44, 34, '#5a189a'); T(c, 'GREEN DAY', 282, 43, '#ffd60a', 6);
      R(c, 230, 96, 70, 6, '#7a5230'); crt(c, 248, 72, 30, `hsl(${(t * 50) % 360},60%,50%)`);
      R(c, 14, 100, 60, 30, '#3a2f5c'); R(c, 14, 96, 60, 6, '#eee');
      const g = c.createRadialGradient(CW / 2, 120, 5, CW / 2, 120, 90); g.addColorStop(0, 'rgba(255,240,200,0.35)'); g.addColorStop(1, 'rgba(255,240,200,0)'); c.fillStyle = g; c.fillRect(0, 0, CW, CH);
      c.fillStyle = 'rgba(120,200,90,0.5)'; c.beginPath(); c.ellipse(CW / 2, 160, 40, 8, 0, 0, 6.28); c.fill();
      const pop = s.pose ? Math.max(0, 1 - (t % 1000 - (s.popT || 0))) : 0; void pop;
      person(c, P.look, CW / 2, 160 + Math.sin(t * 2) * 0.6, 2.1, { face: s.face ?? 1, mood: 1, t });
      T(c, sub('{NAME}'), CW / 2, 172, 'rgba(255,255,255,0.0)', 7);
    };
    const dorm: SceneFn = (c, t, s) => {
      R(c, 0, 0, CW, CH, '#141029'); R(c, 0, 128, CW, 52, '#2a2118');
      R(c, 200, 22, 46, 34, '#0b1033'); c.fillStyle = '#f5f3ce'; c.beginPath(); c.arc(234, 32, 6, 0, 6.28); c.fill(); R(c, 222, 22, 2, 34, '#555'); R(c, 200, 38, 46, 2, '#555');
      R(c, 20, 40, 28, 88, '#3a2a1a'); R(c, 42, 82, 3, 3, '#c9a227');
      R(c, 120, 96, 110, 6, '#6b4f3a'); R(c, 126, 102, 4, 26, '#4a3626'); R(c, 220, 102, 4, 26, '#4a3626');
      const glow = s.paused ? '#3a6ea5' : `hsl(${(t * 120) % 360},70%,${45 + Math.sin(t * 13) * 8}%)`;
      crt(c, 168, 66, 36, glow);
      const gg = c.createRadialGradient(186, 80, 2, 186, 80, 70); gg.addColorStop(0, 'rgba(120,180,255,0.35)'); gg.addColorStop(1, 'rgba(120,180,255,0)'); c.fillStyle = gg; c.fillRect(0, 0, CW, CH);
      R(c, 132, 88, 22, 8, '#111'); T(c, s.clock || '3:00', 143, 92, '#ff3030', 6);
      const turned = t > 3.9 && s.letter;
      person(c, P.look, 160, 132, 1.25, { face: turned ? 1 : 3, sitting: !turned, typing: !turned, t, mood: turned ? -1 : 1 });
      if (s.letter) {
        const lx = Math.min(130, 48 + Math.max(0, t - 2.4) * 90);
        if (t > 2.4 && t < 4.2) R(c, lx, 124, 14, 4, '#f5f5f5');
        if (t > 4.2) {
          const k = Math.min(1, (t - 4.2) / 0.4);
          c.save(); c.translate(CW / 2, 70); c.scale(k, k);
          R(c, -70, -38, 140, 76, '#fffdf5'); R(c, -70, -38, 140, 10, '#9d0208');
          T(c, 'TRI-COUNTY COMMUNITY COLLEGE', 0, -33, '#fff', 6);
          T(c, 'NOTICE OF ACADEMIC PROBATION', 0, -18, '#222', 7);
          T(c, `STUDENT: ${P.name.toUpperCase()}`.slice(0, 30), 0, -6, '#222', 6);
          T(c, 'CLASSES ATTENDED: 0', 0, 4, '#222', 6);
          T(c, 'HALO 2 MATCHES: 1,437', 0, 13, '#222', 6);
          T(c, 'GPA: 0.4', 0, 26, '#c00', 10);
          c.restore();
        }
      }
    };
    const drive: SceneFn = (c, t) => {
      const sky = c.createLinearGradient(0, 0, 0, 120); sky.addColorStop(0, '#ff8c42'); sky.addColorStop(1, '#ffd17a'); c.fillStyle = sky; c.fillRect(0, 0, CW, 120);
      c.fillStyle = '#fff3c4'; c.beginPath(); c.arc(250, 70, 18, 0, 6.28); c.fill();
      for (let i = 0; i < 6; i++) { const x = ((i * 90 - t * 15) % 540 + 540) % 540 - 90; c.fillStyle = '#c96f53'; c.beginPath(); c.ellipse(x, 120, 70, 30, 0, Math.PI, 0); c.fill(); }
      R(c, 0, 118, CW, 62, '#4f7a35'); R(c, 0, 134, CW, 34, '#3a3a3a');
      for (let i = 0; i < 12; i++) { const x = ((i * 40 - t * 140) % 480 + 480) % 480 - 40; R(c, x, 150, 18, 2, '#f5e6a8'); }
      for (let i = 0; i < 7; i++) { const x = ((i * 70 - t * 90) % 490 + 490) % 490 - 70; R(c, x + 6, 98, 4, 22, '#5a3825'); c.fillStyle = '#2d6a4f'; c.beginPath(); c.arc(x + 8, 94, 10, 0, 6.28); c.fill(); }
      const by = Math.sin(t * 18) * 0.7;
      const cx = 120;
      // PC strapped to the roof
      R(c, cx + 22, 112 + by, 16, 14, '#e8dcc0'); R(c, cx + 40, 114 + by, 14, 12, '#e8dcc0'); R(c, cx + 42, 116 + by, 10, 7, '#3a6ea5');
      R(c, cx + 20, 118 + by, 36, 1, '#8b5e34'); R(c, cx + 20, 122 + by, 36, 1, '#8b5e34');
      R(c, cx, 132 + by, 80, 14, '#8d99ae'); R(c, cx + 12, 124 + by, 52, 10, '#8d99ae'); R(c, cx + 16, 126 + by, 20, 7, '#cfe9ff'); R(c, cx + 40, 126 + by, 20, 7, '#cfe9ff');
      c.fillStyle = P.look.skin; c.beginPath(); c.arc(cx + 50, 130 + by, 3, 0, 6.28); c.fill(); R(c, cx + 47, 126 + by, 6, 2, P.look.hair);
      R(c, cx + 76, 134 + by, 4, 3, '#ffd60a'); R(c, cx, 135 + by, 3, 3, '#e8483b');
      for (const wx of [cx + 16, cx + 62]) { c.fillStyle = '#111'; c.beginPath(); c.arc(wx, 147, 6, 0, 6.28); c.fill(); c.strokeStyle = '#aaa'; c.lineWidth = 1; c.beginPath(); c.moveTo(wx, 147); c.lineTo(wx + Math.cos(t * 20) * 4, 147 + Math.sin(t * 20) * 4); c.stroke(); }
      for (let i = 0; i < 3; i++) { const a = (t * 2 + i * 0.33) % 1; c.fillStyle = `rgba(200,200,200,${0.5 - a * 0.5})`; c.beginPath(); c.arc(cx - 4 - a * 30, 140 - a * 6, 2 + a * 5, 0, 6.28); c.fill(); }
      T(c, '1994 COROLLA (215,000 mi)', 40, 30, 'rgba(60,30,0,0.6)', 6, 'left');
    };
    const house: SceneFn = (c, t, s) => {
      const sky = c.createLinearGradient(0, 0, 0, 120); sky.addColorStop(0, '#6a5acd'); sky.addColorStop(1, '#ffb3a7'); c.fillStyle = sky; c.fillRect(0, 0, CW, 120);
      R(c, 0, 120, CW, 60, '#5a9a3a');
      R(c, 120, 60, 130, 70, '#e9dcc0'); for (let y = 64; y < 130; y += 5) R(c, 120, y, 130, 1, 'rgba(0,0,0,0.08)');
      c.fillStyle = '#7a2d2d'; c.beginPath(); c.moveTo(110, 62); c.lineTo(185, 24); c.lineTo(260, 62); c.fill();
      R(c, 140, 76, 24, 18, '#cfe9ff'); R(c, 151, 76, 2, 18, '#fff'); R(c, 210, 76, 24, 18, '#cfe9ff'); R(c, 221, 76, 2, 18, '#fff');
      R(c, 176, 96, 20, 34, '#5b4636'); R(c, 192, 112, 2, 2, '#c9a227');
      R(c, 254, 116, 4, 14, '#555'); R(c, 250, 110, 12, 7, '#2b6fd6');
      R(c, 120, 130, 130, 4, '#888');
      R(c, 20, 138, 70, 12, '#8d99ae'); R(c, 32, 130, 44, 9, '#8d99ae'); c.fillStyle = '#111'; c.beginPath(); c.arc(34, 151, 5, 0, 6.28); c.arc(76, 151, 5, 0, 6.28); c.fill();
      person(c, MOM, 186, 134, 1.2, { face: 1, mood: s.momMood ?? -1, kind: 'mom', t });
      const px = Math.min(160, 70 + t * 30);
      const walking = px < 160;
      person(c, P.look, px, 150, 1.2, { face: 0, walking, walk: t * 10, mood: 0, t });
      R(c, px + 4, 128 - (walking ? Math.abs(Math.sin(t * 10)) : 0), 14, 12, '#c08552'); T(c, 'PC', px + 11, 134, '#5a3a00', 5);
      if (s.bubble) { R(c, 196, 70, 100, 18, '#fff'); R(c, 196, 86, 6, 6, '#fff'); T(c, s.bubble, 246, 79, '#9d0208', 6); }
    };
    const basement: SceneFn = (c, t, s) => {
      const lit = t > 1.8 || s.lit ? 1 : (t > 0.9 && hash(Math.floor(t * 18)) > 0.55 ? 0.6 : 0);
      R(c, 0, 0, CW, CH, '#9a958a'); R(c, 0, 128, CW, 52, '#6b4f3a');
      for (let y = 10; y < 128; y += 12) R(c, 0, y, CW, 1, 'rgba(0,0,0,0.12)');
      R(c, 0, 18, CW, 3, '#b87333');
      R(c, 40, 30, 36, 14, '#5a7d3a'); R(c, 40, 30, 36, 2, '#fff');
      R(c, 236, 92, 26, 36, '#f1f3f5'); c.fillStyle = '#74c0fc'; c.beginPath(); c.arc(249, 108, 6, 0, 6.28); c.fill();
      R(c, 266, 92, 26, 36, '#f1f3f5'); c.fillStyle = '#343a40'; c.beginPath(); c.arc(279, 108, 6, 0, 6.28); c.fill();
      R(c, 210, 76, 16, 52, '#ced4da'); R(c, 214, 66, 2, 10, '#b87333'); R(c, 220, 66, 2, 10, '#b87333');
      R(c, 14, 104, 26, 24, '#c08552'); R(c, 20, 90, 22, 16, '#d4a373'); T(c, 'XMAS', 27, 116, '#9d0208', 6);
      for (let i = 0; i < 7; i++) { R(c, 296 - i * 2, 128 - i * 14, 30, 4, '#9c7a55'); }
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(16, 14); c.moveTo(0, 8); c.lineTo(12, 4); c.moveTo(0, 0); c.lineTo(6, 16); c.stroke();
      // folding table + starter PCs appear once chosen
      if (s.table) {
        R(c, 108, 104, 80, 4, '#bbb'); R(c, 112, 108, 2, 20, '#888'); R(c, 182, 108, 2, 20, '#888');
        crt(c, 116, 84, 24, `hsl(${(t * 90) % 360},65%,55%)`); crt(c, 152, 84, 24, `hsl(${(t * 90 + 120) % 360},65%,55%)`);
      }
      sign(c, s.shop ?? P.shop, CW / 2, 52, s.neon ? Math.min(1, s.neon(t)) : 0, t);
      // character walks down the stairs
      const px = Math.max(150, 290 - Math.max(0, t - 1.9) * 70);
      const walking = t > 1.9 && px > 150;
      person(c, P.look, px, 150, 1.25, { face: walking ? 2 : 1, walking, walk: t * 10, mood: 1, t });
      if (t > 4.6 && !s.noBulb) { const b = Math.min(1, (t - 4.6) * 3); c.save(); c.translate(px, 92); c.scale(b, b); c.fillStyle = '#ffd60a'; c.beginPath(); c.arc(0, 0, 6, 0, 6.28); c.fill(); R(c, -3, 5, 6, 4, '#999'); c.restore(); }
      if (s.confetti) for (let i = 0; i < 60; i++) { const x = hash(i) * CW, y = ((hash(i * 3) * CH + t * (30 + hash(i * 5) * 40)) % CH); R(c, x, y, 2, 2, `hsl(${hash(i * 9) * 360},90%,60%)`); }
      if (lit < 1) { c.fillStyle = `rgba(0,0,0,${0.92 - lit * 0.6})`; c.fillRect(0, 0, CW, CH); }
      if (s.finale) { const k = Math.min(1, Math.max(0, (t - 1.2) / 0.6)); c.save(); c.globalAlpha = k; R(c, 0, 150, CW, 30, 'rgba(0,0,0,0.6)'); T(c, `EST. 2004`, CW / 2, 165, '#f5e6a8', 9); c.restore(); }
    };
    const aim: SceneFn = (c, t, s) => {
      R(c, 0, 0, CW, CH, '#1a1a1a'); R(c, 30, 6, 260, 168, '#d8ccb0'); R(c, 40, 14, 240, 146, '#3a6ea5');
      R(c, 70, 24, 180, 128, '#ece9d8'); R(c, 70, 24, 180, 12, '#0a246a'); T(c, `${P.rival.toUpperCase()}_BAIT_N_LAN - Instant Message`, 160, 30, '#fff', 5);
      R(c, 74, 40, 172, 86, '#fff');
      (s.msgs as [string, string][] || []).forEach(([who, m], i) => { if (t > i * 1.1) { const line = sub(m); const room = Math.floor((164 - (who.length + 1) * 3.6) / 3.1); T(c, who + ':', 78, 48 + i * 12, who === 'you' ? '#1d3a80' : '#c00', 5, 'left'); T(c, line.length > room ? line.slice(0, room - 1) + '…' : line, 78 + (who.length + 1) * 3.6, 48 + i * 12, '#222', 5, 'left'); } });
      R(c, 74, 130, 172, 18, '#fff'); if (Math.floor(t * 2) % 2) R(c, 78, 134, 1, 10, '#000');
    };

    // ================================================================ THE SCRIPT
    let ended = false;
    function end() {
      if (ended) return; ended = true;
      window.removeEventListener('keydown', keyh, true);
      flash.style.opacity = '1';
      setTimeout(() => { running = false; root.remove(); setTimeout(() => flash.remove(), 600); flash.style.opacity = '0'; resolve(P); }, 550);
    }
    skip.onclick = () => { skipping = true; audio.sfx('click'); onConfirm?.(); setTimeout(end, 120); };
    const prologueTrack = () => {
      const idx = audio.TRACKS.findIndex(t => t.title.startsWith('Prologue'));
      if (idx >= 0) return idx;
      audio.TRACKS.push({
        title: 'Prologue - The Dropout (8-bit).mp3', bpm: 112, length: '2:04', steps: 32,
        play(s, t, spb) {
          const bus = audio.getMusicBus(); const st = s % 16, bar = Math.floor(s / 16) % 8;
          const mel = [[69, 0, 72, 76, 0, 74, 72, 69], [67, 0, 71, 74, 0, 72, 71, 67], [65, 0, 69, 72, 0, 76, 74, 72], [64, 0, 67, 71, 74, 0, 72, 71]];
          const m = mel[bar % 4];
          if (st % 2 === 0) { const n = m[st / 2]; if (n) audio.tone('square', audio.N(n), audio.N(n), t, spb * 1.7, 0.045, bus); }
          const bass = [45, 43, 41, 40][bar % 4];
          if (st % 4 === 0) audio.tone('triangle', audio.N(bass), audio.N(bass), t, spb * 3, 0.16, bus);
          if (st % 4 === 2) audio.tone('triangle', audio.N(bass + 12), audio.N(bass + 12), t, spb * 1.2, 0.08, bus);
          if (bar >= 4) { if (st % 4 === 0) audio.kick(t); if (st % 2 === 1) audio.hat(t, 0.06); }
        },
      });
      return audio.TRACKS.length - 1;
    };

    (async () => {
      audio.playTrack(prologueTrack());
      // ---- TITLE
      setScene(title); caption('');
      await wait(2.4);
      await say('', '▶ PRESS START');
      // ---- WHO ARE YOU
      setScene(mirror, { face: 1 }); caption('TRI-COUNTY COMMUNITY COLLEGE · DORM 4B');
      await say('NARRATOR', 'Every legend starts somewhere.');
      await say('NARRATOR', 'Yours starts in a dorm room that smells like Axe Body Spray and broken dreams.');
      await say('NARRATOR', 'But first... look in the mirror. Who ARE you?');
      await creator();
      await say('NARRATOR', P.look.hat === 'fedora' ? 'A fedora. In 2004. Bold. Visionary, even.' : P.look.bottom === 'jnco' ? 'Those JNCOs could fit a second person. Iconic.' : P.look.top === 'track' ? 'Velour tracksuit. You are the moment.' : 'Yes. That is the face of someone about to make bad decisions.');
      // ---- NAME
      const presetsM = ['xX_SLAYER_Xx', 'DoritoDan', 'N00bLord', 'Sir_Lagsalot', 'MasterChief69', 'FragDaddy'];
      const presetsF = ['~*PwnPrincess*~', 'xXGurlGamerXx', 'LadyLag', 'NoobSlayerette', 'HeadshotHolly', 'Frag_Queen'];
      P.name = await entry('PICK YOUR SCREEN NAME', 'Screen Name:', P.sex === 'f' ? presetsF : presetsM, 16, P.sex === 'f' ? '~*PwnPrincess*~' : 'xX_SLAYER_Xx', (v) => { P.name = v || '???'; }, '🏃');
      await say('NARRATOR', '"{NAME}." The forums will fear this name. Or at least tolerate it.');
      // ---- DORM: the letter
      setScene(dorm, { letter: true, clock: '3:00' }); caption('FALL 2004 · 3:00 AM');
      await say('NARRATOR', 'Midterms: 0 attended. Halo 2 matches: 1,437. Sleep: optional.');
      await wait(Math.max(0, 4.8 - st));
      await say('NARRATOR', 'Then, at 3 AM, a letter slides under the door.');
      const drop = await ask('NARRATOR', 'GPA: 0.4. What do you do?', ['Drop out (obviously)', 'Drop out (dramatically)', 'Call Mom (then drop out)', 'Play one more match']);
      P.degen = ['CERTIFIED', 'DRAMATIC', 'MAMA\'S BOY', 'MAXIMUM'][drop];
      await say(P.name.toUpperCase(), ['"Welp. Guess I\'m an entrepreneur now."', '"I DIDN\'T NEED COLLEGE. COLLEGE NEEDED ME!" *slams door*', '"...Mom? Can I come home? ...Forever?"', '"...gg. one more." (You played until sunrise. Then dropped out.)'][drop]);
      // ---- DRIVE
      setScene(drive); caption('THE NEXT MORNING');
      await say('NARRATOR', 'You pack your entire life into a 1994 Corolla: one PC, three Halo 2 discs, and zero regrets.');
      await say('NARRATOR', 'The check engine light has been on since 2001. It is fine.');
      // ---- HOUSE: Mom
      setScene(house, { momMood: -1 }); caption("MOM'S HOUSE · TRI-COUNTY SUBURBS");
      await wait(3);
      S.bubble = 'WHAT HAPPENED?!';
      await say('MOM', '{NAME}?! Why is your whole computer in the car?!');
      const r = await ask('MOM', 'Tell me you did NOT drop out.', ['"I\'m starting a BUSINESS!"', '"It\'s only temporary."', '*silently walk past her*']);
      S.bubble = ['A BUSINESS??', 'TEMPORARY...', 'HELLO??'][r];
      await say('MOM', ['A business. Okay. Sure. What kind of business, sweetie?', 'Temporary. Like your cousin Kevin. Who has lived here since 1998.', 'Don\'t you walk past me! ...Fine. The basement is open. Dinner is at 6.'][r]);
      await say('MOM', 'You can stay in the basement. But you do the laundry. EVERY week.');
      await say('NARRATOR', '(You will not do the laundry.)');
      // ---- BASEMENT
      setScene(basement, { shop: '' }); caption("MOM'S BASEMENT · DAY 1");
      await wait(2.4);
      await say('NARRATOR', 'The basement. Concrete walls. Shag carpet. A water heater that sounds like a dying robot.');
      await wait(Math.max(0, 5 - st));
      await say(P.name.toUpperCase(), '"...Wait. What if... everyone came HERE to play?"');
      await say('NARRATOR', 'A LAN PARTY. Every night. For money. The greatest idea anyone has ever had in a basement.');
      const fav = await ask('NARRATOR', 'What game will your LAN be famous for?', FAV_GAMES.map(g => g.name));
      P.fav = FAV_GAMES[fav].id as Profile['fav'];
      await say('NARRATOR', `${FAV_GAMES[fav].name}. Bonus: ${FAV_GAMES[fav].blurb}.`);
      S.noBulb = true;
      await say('NARRATOR', 'Every legendary LAN needs a name. You grab a Sharpie and a piece of plywood...');
      P.shop = await entry('NAME YOUR LAN', 'LAN Name:', ['DUNGEON LAN', 'FRAG BASEMENT', 'THE LAG CAVE', "MOM'S HOUSE OF PWN", 'LAN BEFORE TIME', 'NOOB TUBE', 'CTRL ALT DEFEAT'], 18, 'DUNGEON LAN', (v) => { S.shop = v; P.shop = v || '???'; }, '🪧');
      S.shop = P.shop;
      await say('NARRATOR', '"{SHOP}." Mom says it sounds "like a drug thing." Perfect.');
      // ---- STARTER
      await say('NARRATOR', "Now you need gear. Luckily, there's a pile of PCs behind the Best Buy.");
      const sIdx = await starters();
      P.starter = STARTERS[sIdx].id as Profile['starter'];
      S.table = true;
      audio.sfx('fanfare');
      await say('NARRATOR', `You obtained the ${STARTERS[sIdx].name}! It makes a noise like a jet engine. Perfect.`);
      // ---- RIVAL
      setScene(aim, { msgs: [] }); caption('THAT NIGHT · AOL INSTANT MESSENGER');
      audio.sfx('msn');
      S.msgs = [['?', 'lol i heard u DROPPED OUT'], ['?', 'and ur opening a LAN?? in ur MOMS basement??'], ['?', 'my bait shop has 4 computers now. its OVER for u']];
      await say('NARRATOR', 'Your AIM dings. You know exactly who it is. Your rival since 3rd grade...');
      const rv = await ask('NARRATOR', '...the one who runs an internet cafe AND a bait shop. His name is:', ['BOB', 'BOBBY', 'ROBERT', 'BOB (it is always Bob)']);
      P.rival = ['BOB', 'BOBBY', 'ROBERT', 'BOB'][rv];
      S.msgs = S.msgs.map((m: [string, string]) => [P.rival.toLowerCase(), m[1]]);
      const reply = await ask(P.name.toUpperCase(), 'Reply to {RIVAL}:', ['"u r going DOWN, {RIVAL}"', '"who is this"', '"ur shop smells like worms"']);
      S.msgs = [...S.msgs, ['you', ['u r going DOWN', 'who is this', 'ur shop smells like worms'][reply]]];
      st = 0;
      await wait(3.6);
      S.msgs = [...S.msgs, [P.rival.toLowerCase(), ['bring it', 'ITS BOB. U KNOW ITS BOB', 'ur LAN will smell like FAILURE'][reply]]];
      st = 0;
      await wait(4.6);
      const away = await ask('NARRATOR', 'Before logging off, set your AIM away message:', ['brb mom needs the phone line', '~*gaming*~ dont IM me unless ur bringing pizza', 'AFK. forever.', 'if ur reading this ur a noob']);
      P.away = ['brb mom needs the phone line', '~*gaming*~ dont IM me unless ur bringing pizza', 'AFK. forever.', 'if ur reading this ur a noob'][away];
      // ---- FINALE
      setScene(basement, { shop: P.shop, lit: true, table: true, noBulb: true, neon: (t: number) => Math.max(0, (t - 0.4) / 1.2), confetti: true, finale: true });
      caption('');
      audio.sfx('win');
      await wait(1.8);
      await say('NARRATOR', 'And so, in the fall of 2004, {SHOP} was born.');
      await say('NARRATOR', 'From this basement, a legend will rise: Strip mall. Blockbuster. Warehouse. TOWER.');
      await say('NARRATOR', 'But first... you need customers. And a toilet. Mostly a toilet.');
      const go = await ask('', 'Your LAN legend begins now.', ['▶ OPEN {SHOP}']);
      void go;
      end();
    })();
  });
}
