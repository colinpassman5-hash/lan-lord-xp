// ============ LAN LORD — interactive tutorial (spotlight coach) ============
import type { GameCtx, UIApi } from './ui';
import { iso } from './render';
import * as audio from './audio';

interface Step {
  title: string;
  text: string;
  target?: () => DOMRect | null;   // what to spotlight
  done?: () => boolean;             // auto-advance when true
  next?: string;                    // manual "Next" button label
  enter?: () => void;
  side?: 'below' | 'above' | 'left' | 'right' | 'center';
}

const CSS = `
.tut-ring { position: fixed; z-index: 250000; pointer-events: none; border-radius: 10px; border: 3px solid #ffd34d; box-shadow: 0 0 0 9999px rgba(5,8,25,0.58), 0 0 18px 4px rgba(255,211,77,0.9); transition: left 0.18s, top 0.18s, width 0.18s, height 0.18s; animation: tutpulse 1.2s ease-in-out infinite; }
.tut-ring.none { left: 50% !important; top: 50% !important; width: 0 !important; height: 0 !important; border: 0; animation: none; }
@keyframes tutpulse { 50% { box-shadow: 0 0 0 9999px rgba(5,8,25,0.58), 0 0 30px 10px rgba(255,211,77,1); } }
.tut-arrow { position: fixed; z-index: 250002; pointer-events: none; font-size: 34px; color: #ffd34d; text-shadow: 0 0 8px #000, 2px 2px 0 #7a4a00; animation: tutbob 0.7s ease-in-out infinite; }
@keyframes tutbob { 50% { transform: translateY(10px); } }
.tut-arrow.up { animation-name: tutbobu; } @keyframes tutbobu { 50% { transform: translateY(-10px); } }
.tut-card { position: fixed; z-index: 250003; width: 340px; background: linear-gradient(#fdfeff, #dbe8fb); border: 2px solid #3b6fc7; border-radius: 8px; box-shadow: 4px 6px 20px rgba(0,0,0,0.6); font-family: Tahoma, sans-serif; overflow: hidden; animation: tutin 0.25s ease-out; }
@keyframes tutin { from { transform: scale(0.9); opacity: 0; } }
.tut-card .hd { display: flex; align-items: center; gap: 8px; padding: 6px 10px; color: #fff; font-weight: bold; background: linear-gradient(#6f9de0, #3b6fc7); font-size: 12px; }
.tut-card .hd .av { font-size: 18px; } .tut-card .hd .n { margin-left: auto; font-weight: normal; opacity: 0.85; font-size: 11px; }
.tut-card .bd { padding: 10px 12px; }
.tut-card .tt { font: bold 15px 'Trebuchet MS', Tahoma; color: #1b3f8b; margin-bottom: 5px; }
.tut-card .tx { font: 13px 'Comic Sans MS', Tahoma; color: #c2185b; line-height: 1.4; }
.tut-card .tx b { color: #1b3f8b; }
.tut-card .todo { margin-top: 8px; font-size: 11px; color: #555; background: #fff8d6; border: 1px dashed #c9a227; border-radius: 4px; padding: 4px 8px; }
.tut-card .ft { display: flex; justify-content: space-between; align-items: center; padding: 0 12px 10px; }
.tut-card .skip { font-size: 11px; color: #777; cursor: pointer; text-decoration: underline; }
.tut-card .prog { height: 4px; background: #c9d6ef; } .tut-card .prog i { display: block; height: 100%; background: linear-gradient(90deg, #ffd34d, #f08c00); transition: width 0.3s; }
`;

export function runTutorial(g: GameCtx, ui: UIApi, onFinish: () => void) {
  if (!document.getElementById('tut-css')) { const s = document.createElement('style'); s.id = 'tut-css'; s.textContent = CSS; document.head.append(s); }
  const ring = document.createElement('div'); ring.className = 'tut-ring none';
  const arrow = document.createElement('div'); arrow.className = 'tut-arrow';
  const card = document.createElement('div'); card.className = 'tut-card';
  document.body.append(ring, arrow, card);

  const ren = g.ren;
  const q = (sel: string) => (document.querySelector(sel) as HTMLElement | null)?.getBoundingClientRect() || null;
  const canvasRect = () => g.canvas.getBoundingClientRect();
  const tileRect = (x: number, y: number, up = 40): DOMRect => {
    const c = canvasRect(); const p = iso(x, y, 0); const [sx, sy] = ren.worldToScreen(p[0], p[1]); const z = ren.cam.zoom;
    return new DOMRect(c.left + sx - 36 * z, c.top + sy - up * z, 72 * z, (up + 20) * z);
  };
  const inset = (r: DOMRect | null, f = 0.25) => r ? new DOMRect(r.left + r.width * f, r.top + r.height * f, r.width * (1 - 2 * f), r.height * (1 - 2 * f)) : null;
  const pcs = () => g.sim.objects.filter(o => g.sim.isPC(o)).length;
  const count = (t: string) => g.sim.objects.filter(o => o.type === t).length;
  const win = (id: string) => !!ui.wm.wins.get(id) && !ui.wm.wins.get(id)!.minimized;
  let mark: any = {};
  let spot: { x: number; y: number } | null = null;
  const name = g.meta.profile?.name || 'dude';
  const shop = g.meta.profile?.shop || 'ur LAN';

  const steps: Step[] = [
    { title: 'Welcome to the basement!', text: `yo <b>${name}</b>!!! its me, ur MSN buddy. welcome to <b>${shop}</b> lol. lemme show u how to run this place. takes like 2 min. time is <b>PAUSED</b> til we're ready`, next: "let's go", side: 'center' },
    { title: 'Move the camera', text: 'first: <b>click + drag the floor</b> to move the camera around. (WASD / arrow keys work too)', target: () => inset(canvasRect(), 0.3), enter: () => { mark.cx = ren.cam.x; mark.cy = ren.cam.y; }, done: () => Math.hypot(ren.cam.x - mark.cx, ren.cam.y - mark.cy) > 50, side: 'center' },
    { title: 'Zoom in & out', text: 'now <b>scroll the mouse wheel</b> over the café to zoom. zoom in close to see ppl\'s faces lol', target: () => inset(canvasRect(), 0.3), enter: () => { mark.z = ren.cam.zoom; }, done: () => Math.abs(ren.cam.zoom - mark.z) / mark.z > 0.12, side: 'center' },
    { title: 'Your stats', text: 'up here: ur <b>money</b>, the <b>date</b>, ur <b>rating</b>, how many <b>customers</b> are inside, and ur <b>Buzz</b> (word of mouth). more buzz = more ppl show up', target: () => q('.hud'), next: 'got it', side: 'below' },
    { title: 'Open the Build menu', text: 'u need more PCs. click <b>🔨 Build</b> in the top bar', target: () => q('[data-tool="build"]'), done: () => win('build'), side: 'below' },
    { title: 'Pick a PC', text: 'click the <b>BeigeBox3000</b>. its cheap, its beige, its perfect', target: () => q('.bitem[data-id="pc_beige"]'), done: () => g.tool === 'pc_beige', side: 'left' },
    { title: 'Place it', text: 'now click the <b>glowing tile</b> on the floor to place it. the <b>blue tile</b> is the seat (ppl need to reach it). press <b>R</b> to rotate', enter: () => { mark.pcs = pcs(); spot = g.sim.findSpot('pc_beige', g.ren.ghost?.dir ?? 1); }, target: () => spot ? tileRect(spot.x, spot.y) : inset(canvasRect(), 0.3), done: () => pcs() > mark.pcs, side: 'right' },
    { title: 'Stop building', text: 'nice!! ur still in build mode. <b>right-click</b> (or press Esc) to stop placing stuff', done: () => !g.tool, target: () => inset(canvasRect(), 0.3), side: 'center' },
    { title: 'Check the WiFi', text: 'every PC needs a <b>router</b> in range or gamers RIOT. click <b>📶 WiFi</b> to see coverage + ping', target: () => q('[data-tool="wifi"]'), done: () => ren.overlay === 'wifi', side: 'below' },
    { title: 'Green = good', text: '<b>green tiles</b> have internet, <b>red</b> = no signal. ping shows over each PC. if a PC says NO NET, move it closer or buy another router', target: () => inset(canvasRect(), 0.2), next: 'makes sense', side: 'center' },
    { title: 'Watch the heat', text: 'PCs packed together get HOT. click <b>🌡️ Heat</b>', target: () => q('[data-tool="heat"]'), done: () => ren.overlay === 'heat', side: 'below' },
    { title: 'Fire = bad (mostly)', text: 'over <b>46°C</b> PCs can catch FIRE lol. spread PCs out or buy an <b>AC unit</b>. click a burning PC to put it out', target: () => inset(canvasRect(), 0.2), next: 'noted', enter: () => {}, side: 'center' },
    { title: 'Gamers have needs', text: 'gamers pee. a LOT. click the <b>Toilet</b>, then place it on the glowing tile. no toilet = "accidents" 💀', enter: () => { ren.overlay = 'none'; mark.t = count('toilet'); g.selectTool(null); ui.buildCategory('Comfort'); mark.ts = null; },
      target: () => { if (g.tool === 'toilet') { if (!mark.ts) mark.ts = g.sim.findSpot('toilet', g.ren.ghost?.dir ?? 1); return mark.ts ? tileRect(mark.ts.x, mark.ts.y) : inset(canvasRect(), 0.3); } return win('build') ? (q('.bitem[data-id="toilet"]') || q('[data-tool="build"]')) : q('[data-tool="build"]'); },
      done: () => count('toilet') > mark.t, side: 'left' },
    { title: 'Start the clock!', text: 'ok ur ready. hit <b>▶</b> to start time. <b>⏸ / Space</b> pauses anytime, <b>▶▶</b> goes faster', enter: () => { g.selectTool(null); }, target: () => q('.speedbox'), done: () => g.speed > 0, side: 'below' },
    { title: 'Your first customer!', text: 'a gamer just walked in!! <b>click them</b> to see what they\'re thinking + their needs', enter: () => { const a = g.sim.spawnCustomer('kid'); mark.id = a.id; a.thought = { text: 'is this the LAN??', ttl: 400, mood: 1 }; }, target: () => { const a = g.sim.agent(mark.id); if (!a) return null; const p = ren.agentPos(a, 1); const [sx, sy] = ren.worldToScreen(p[0], p[1] - 22); const c = canvasRect(); const z = ren.cam.zoom; return new DOMRect(c.left + sx - 22 * z, c.top + sy - 30 * z, 44 * z, 60 * z); }, done: () => ren.selectedAgent >= 0, side: 'right' },
    { title: 'Read their mind', text: 'this window shows their <b>needs</b>, <b>rage</b>, wallet + thoughts. thought bubbles in the café tell u whats wrong. LISTEN to them', target: () => q('.win:has(.props)') || null, next: 'cool', side: 'left' },
    { title: 'Your goals', text: 'last thing! click <b>📝 Goals</b>. hit <b>2 of 3</b> goals and u can <b>🚚 Move Up</b> to a bigger place', enter: () => { ui.wm.close('props'); }, target: () => q('[data-tool="goals"]'), done: () => win('goals'), side: 'below' },
    { title: "You're a LAN owner now", text: `thats it!! keep ppl happy, grow ur <b>Buzz</b>, dont burn the house down. Mom is upstairs. <b>GL HF ${name}</b> 🎮`, next: 'GG! 🎮', side: 'center' },
  ];

  let i = -1; let raf = 0; let doneFlag = false;
  const prevSpeed = g.speed;
  g.setSpeed(0);
  const owner = g.sim.agents.find(a => a.kind === 'owner'); if (owner) owner.thought = undefined;

  function finish(skipped: boolean) {
    if (doneFlag) return; doneFlag = true;
    cancelAnimationFrame(raf);
    ring.remove(); arrow.remove(); card.remove();
    if (g.speed === 0) g.setSpeed(prevSpeed || 1);
    audio.sfx(skipped ? 'close' : 'win');
    if (!skipped) ui.toast('Tutorial complete!', 'Replay it anytime: click the green shop-name button (top-left of the top bar) → 🎓 Tutorial.', '🎓');
    onFinish();
  }
  function show(n: number) {
    i = n;
    if (i >= steps.length) return finish(false);
    const s = steps[i];
    s.enter?.();
    card.innerHTML = '';
    const hd = document.createElement('div'); hd.className = 'hd';
    hd.innerHTML = `<span class="av">😈</span><span>~*DaRk_AdViSoR*~</span><span class="n">step ${i + 1}/${steps.length}</span>`;
    const prog = document.createElement('div'); prog.className = 'prog'; prog.innerHTML = `<i style="width:${(i / (steps.length - 1)) * 100}%"></i>`;
    const bd = document.createElement('div'); bd.className = 'bd';
    bd.innerHTML = `<div class="tt">${s.title}</div><div class="tx">${s.text}</div>${s.done ? '<div class="todo">👉 do it to continue</div>' : ''}`;
    const ft = document.createElement('div'); ft.className = 'ft';
    const sk = document.createElement('span'); sk.className = 'skip'; sk.textContent = 'skip tutorial'; sk.onclick = () => finish(true);
    ft.append(sk);
    if (s.next) { const b = document.createElement('button'); b.className = 'xpbtn'; b.textContent = s.next + ' ▸'; b.onclick = () => { audio.sfx('click'); show(i + 1); }; ft.append(b); }
    card.append(hd, prog, bd, ft);
    audio.sfx('msn');
  }
  function place() {
    if (doneFlag) return;
    const s = steps[i];
    if (s?.done && s.done()) { audio.sfx('fix'); show(i + 1); if (doneFlag) return; }
    const st = steps[i];
    const r = st?.target?.() || null;
    const W = window.innerWidth, H = window.innerHeight;
    const cw = card.offsetWidth || 340, ch = card.offsetHeight || 180;
    if (r && r.width > 0) {
      const pad = 6;
      ring.classList.remove('none');
      Object.assign(ring.style, { left: r.left - pad + 'px', top: r.top - pad + 'px', width: r.width + pad * 2 + 'px', height: r.height + pad * 2 + 'px' });
      let side = st.side || 'below';
      if (side === 'center') side = r.bottom + ch + 30 < H ? 'below' : 'above';
      let cx = r.left + r.width / 2 - cw / 2, cy = r.bottom + 46;
      let ax = r.left + r.width / 2 - 14, ay = r.bottom + 4, up = true;
      if (side === 'above' || cy + ch > H - 10) { cy = r.top - ch - 46; ay = r.top - 44; up = false; }
      if (side === 'left') { cx = r.left - cw - 50; cy = r.top + r.height / 2 - ch / 2; ax = r.left - 44; ay = r.top + r.height / 2 - 20; }
      if (side === 'right') { cx = r.right + 50; cy = r.top + r.height / 2 - ch / 2; ax = r.right + 8; ay = r.top + r.height / 2 - 20; }
      if (cx < 8) { if (side === 'left') { cx = r.right + 50; ax = r.right + 8; side = 'right'; } else cx = 8; }
      if (cx + cw > W - 8) { if (side === 'right') { cx = r.left - cw - 50; ax = r.left - 44; side = 'left'; } else cx = W - cw - 8; }
      if (cx < 8 && (side === 'left' || side === 'right')) { cx = Math.max(8, r.left + r.width / 2 - cw / 2); cy = r.bottom + 46 + ch > H ? r.top - ch - 46 : r.bottom + 46; ax = r.left + r.width / 2 - 14; up = cy > r.top; ay = up ? r.bottom + 4 : r.top - 44; side = up ? 'below' : 'above'; }
      cy = Math.max(8, Math.min(H - ch - 8, cy));
      card.style.left = cx + 'px'; card.style.top = cy + 'px';
      arrow.style.display = 'block';
      arrow.textContent = side === 'left' ? '▶' : side === 'right' ? '◀' : up ? '▲' : '▼';
      arrow.className = 'tut-arrow' + (up && side !== 'left' && side !== 'right' ? ' up' : '');
      arrow.style.left = ax + 'px'; arrow.style.top = ay + 'px';
    } else {
      ring.classList.add('none'); arrow.style.display = 'none';
      card.style.left = (W - cw) / 2 + 'px'; card.style.top = (H - ch) / 2 + 'px';
    }
    raf = requestAnimationFrame(place);
  }
  show(0);
  raf = requestAnimationFrame(place);
  return { stop: () => finish(true) };
}
