// ============ LAN LORD — main loop, input, event wiring ============
import './style.css';
import { Sim } from './sim';
import { Renderer } from './render';
import { createUI, bootSequence, GameCtx, UIApi, itemIcon } from './ui';
import { runPrologue } from './prologue';
import { runTutorial } from './tutorial';
import { openLimeWire, restoreDownloads } from './limewire';
import * as audio from './audio';
import { CLAN_TAGS, ITEM, ITEMS, RESEARCH, THOUGHTS, REVIEWS, REVIEW_SPECIAL, ADVISOR, MOM_LAUNDRY, LOCATIONS, Meta, newMeta } from './data';
import { EXTRA_THOUGHTS, EXTRA_REVIEWS, EXTRA_REVIEW_SPECIAL, EXTRA_ADVISOR_CHAT, EXTRA_MOM_LAUNDRY, CHAPTER_ADVISOR } from './content_extra';
import { EXTRA_ITEMS } from './items_extra';
import * as SocialMod from './social_extra';

// ---------------------------------------------------------------- merge crew-made content
for (const k in EXTRA_THOUGHTS) THOUGHTS[k] = [...(THOUGHTS[k] || []), ...EXTRA_THOUGHTS[k]];
for (const k in EXTRA_REVIEWS) REVIEWS[+k] = [...(REVIEWS[+k] || []), ...EXTRA_REVIEWS[+k]];
for (const k in EXTRA_REVIEW_SPECIAL) REVIEW_SPECIAL[k] = [...(REVIEW_SPECIAL[k] || []), ...EXTRA_REVIEW_SPECIAL[k]];
ADVISOR.chat.push(...EXTRA_ADVISOR_CHAT);
MOM_LAUNDRY.push(...EXTRA_MOM_LAUNDRY);
for (const it of EXTRA_ITEMS) if (!ITEM[it.id]) { ITEMS.push(it); ITEM[it.id] = it; }
{ const SOC = (SocialMod as any).SOCIAL || {}; for (const k in SOC) THOUGHTS[k] = [...(THOUGHTS[k] || []), ...SOC[k]]; const tags = (SocialMod as any).CLAN_TAGS; if (Array.isArray(tags)) CLAN_TAGS.push(...tags); }
const DEFAULT_WELCOME = [...ADVISOR.welcome];

// ---------------------------------------------------------------- prestige meta (persists across runs)
function loadMeta(): Meta {
  try { const m = JSON.parse(localStorage.getItem('lanlord_meta') || ''); return { ...newMeta(), ...m, lifetime: { ...newMeta().lifetime, ...(m.lifetime || {}) } }; } catch { return newMeta(); }
}
const meta = loadMeta();
const chaos = location.search.includes('chaos');
function setWelcome(locId: string) { ADVISOR.welcome = CHAPTER_ADVISOR[locId]?.length ? CHAPTER_ADVISOR[locId] : DEFAULT_WELCOME; }
const startLoc = chaos ? 2 : meta.loc;
setWelcome(LOCATIONS[startLoc].id);

const canvas = document.createElement('canvas');
const sim0 = new Sim((Date.now() % 1000000) | 0, startLoc, meta);
sim0.newGame();
const ren = new Renderer(canvas, sim0);
const TPS = [0, 7, 20, 50]; // game-minutes per real second
let ui: UIApi;
const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

function bankRun(s: Sim) {
  const c = s.cloutEarned();
  meta.clout += c; meta.totalClout += c;
  meta.lifetime.served += s.served; meta.lifetime.fires += s.stats.fires; meta.lifetime.deaths += s.deaths;
  if (s.perk('savant')) meta.research = { ...meta.research, ...s.researched };
  return c;
}
let tutorialRunning = false;
function startTutorial() {
  if (tutorialRunning) return;
  tutorialRunning = true;
  for (const id of ['build', 'goals', 'props', 'story']) ui.wm.close(id);
  g.selectTool(null); g.setSell(false); ren.overlay = 'none';
  runTutorial(g, ui, () => { tutorialRunning = false; meta.tutorialDone = true; g.saveMeta(); });
}
function startLocation(story = true, afterStory?: () => void) {
  setWelcome(LOCATIONS[meta.loc].id);
  const s = new Sim((Date.now() % 1000000) | 0, meta.loc, meta);
  s.newGame();
  g.sim = s; ren.sim = s; ren.fitCamera();
  ren.selectedAgent = -1; ren.selectedObj = -1; ren.particles = []; ren.floats = []; ren.ghost = null; ren.sellMode = false; g.tool = null;
  for (const id of ['props', 'ctl', 'fin', 'cs', 'craigs', 'upd', 'tm', 'goals', 'build']) ui.wm.close(id);
  ui.reviewsChanged(); ui.toolHint('');
  processEvents();
  if (story) ui.showStory(afterStory);
  g.speed = afterStory ? 0 : 1;
  playEraTrack();
}
function playEraTrack() { const i = 4 + g.sim.loc; audio.playTrack(i < audio.TRACKS.length ? i : 1); }

const g: GameCtx = {
  sim: sim0, ren, canvas, speed: 0, tool: null, meta,
  newCharacter() {
    g.speed = 0;
    runPrologue((t) => itemIcon(ren, t, 64)).then((p) => { meta.profile = p; g.saveMeta(); meta.loc = 0; startLocation(true, () => startTutorial()); });
  },
  tutorial() { startTutorial(); },
  limewire() { openLimeWire(ui.wm, g, ui); },
  saveMeta() { if (chaos) return; try { localStorage.setItem('lanlord_meta', JSON.stringify(meta)); } catch { } },
  moveUp() {
    const s = g.sim;
    if (s.starsDone() < 2 || s.loc >= LOCATIONS.length - 1) return;
    const c = bankRun(s);
    meta.loc = s.loc + 1;
    g.saveMeta();
    audio.sfx('win');
    startLocation();
    setTimeout(() => ui.balloon(`+${c} Clout!`, 'Spend it in the Hall of Fame (😎 in the top bar) on permanent perks.', '😎'), 1500);
  },
  retire() {
    const c = bankRun(g.sim);
    meta.loc = 0; meta.runs++;
    g.saveMeta();
    audio.sfx('win');
    startLocation();
    setTimeout(() => ui.balloon(`Legacy run #${meta.runs} — +${c} Clout`, 'Back to the basement. But this time, you have PERKS.', '👑'), 1500);
  },
  setSpeed(n) { g.speed = n; audio.sfx('click'); },
  selectTool(t) {
    g.tool = t; ren.sellMode = false;
    ren.ghost = t ? { type: t, dir: ren.ghost?.dir ?? 1 } : null;
    ui.toolHint(t ? `🔨 Placing ${ITEM[t].name} (${money(ITEM[t].cost)}) — click floor to place · R rotate · right-click / Esc to stop` : '');
    audio.sfx('click');
  },
  setSell(on) {
    ren.sellMode = on;
    if (on) { g.tool = null; ren.ghost = null; ui.refreshBuild(); }
    ui.toolHint(on ? '♻️ SELL MODE — click objects to sell for 50% · right-click / Esc to stop' : '');
  },
  selectAgent(id) { ren.selectedAgent = id; ren.selectedObj = -1; ui.openProps(); audio.sfx('click'); },
  selectObj(id) { ren.selectedObj = id; ren.selectedAgent = -1; ui.openProps(); audio.sfx('click'); },
  newGame() { startLocation(); },
  saveGame() {
    try { localStorage.setItem('lanlord_save', g.sim.save()); ui.balloon('Game saved', 'Saved to C:\\My Documents\\lanlord_FINAL_final2.sav', '💾'); }
    catch { ui.balloon('Save failed', 'Your hard drive is full of LimeWire downloads.', '⚠️'); }
  },
  loadGame() {
    const s = localStorage.getItem('lanlord_save');
    if (!s) return false;
    let loc = 0; try { loc = JSON.parse(s).loc || 0; } catch { }
    const n = new Sim(1, loc, meta); n.load(s);
    g.sim = n; ren.sim = n; ren.fitCamera(); ren.selectedAgent = -1; ren.selectedObj = -1;
    ui.reviewsChanged(); ui.refreshBuild();
    ui.balloon('Game loaded', 'Welcome back, LAN LORD.', '📂');
    return true;
  },
};

// ---------------------------------------------------------------- sim events → juice
let lastBump = 0;
function processEvents() {
  const sim = g.sim;
  for (const e of sim.events) {
    switch (e.t) {
      case 'float':
        ren.addFloat(e.x, e.y, e.text, e.color);
        if (e.color === '#39e639' && performance.now() - lastBump > 300) { lastBump = performance.now(); ui.bumpMoney(); ren.burst(e.x, e.y, 'money', 1, '#0f0', 40); }
        break;
      case 'placed': ren.burst(e.x, e.y, 'dust', 14, '#ddd', 2); audio.sfx('place'); ren.shake = Math.max(ren.shake, 0.06); break;
      case 'smash': ren.burst(e.x, e.y, 'spark', 26, '#ffe066', 20); ren.shake = 0.3; break;
      case 'foam': ren.burst(e.x, e.y, 'foam', 10, '#fff', 30); break;
      case 'sfx': audio.sfx(e.name); break;
      case 'advisor': ui.advisor(e.key); break;
      case 'balloon': ui.balloon(e.title, e.text, '⚠️'); break;
      case 'review': ui.reviewsChanged(); break;
      case 'research': {
        const r = RESEARCH.find(x => x.id === e.id)!;
        ui.balloon('Updates installed!', `${r.name} (${r.kb}) is ready. Restart now? [Later] — new stuff may be in the Build folder.`, '🛡️');
        audio.sfx('research'); ui.refreshBuild();
        break;
      }
      case 'death': {
        const id = e.id;
        ui.dialog(`${e.name}.exe`, '❌', `<b>${e.name}.exe has stopped responding.</b><br><br>(he died?)<br><br>He gamed for 48 hours straight without sleeping. Legends say his K/D ratio was incredible.<br><br>If you choose OK, his ghost will haunt your café for 2 days.`,
          [{ label: 'OK', fn: () => { const a = g.sim.agent(id); if (a && a.dead) g.sim.ghostify(a); } }, { label: '⚡ Revive ($50)', fn: () => { const a = g.sim.agent(id); if (a && a.dead) g.sim.revive(a); } }], 'death' + id);
        break;
      }
      case 'goal': {
        const gl = sim.goals()[e.i];
        ui.balloon(`Goal complete! ${'★'.repeat(e.i + 1)}`, gl.label + ' — check goals.txt', '⭐');
        audio.sfx('fanfare');
        break;
      }
      case 'canMoveUp':
        audio.sfx('fanfare');
        ui.toast('YOU CAN MOVE UP!', `★★ earned at ${sim.L.name}. Hit 🚚 Move Up in the top bar — or push for ★★★ and more Clout.`, '🚚', () => ui.openMoveUp());
        break;
      case 'win':
        audio.sfx('win');
        ui.dialog('★★★ LOCATION CONQUERED', '🏆', `<b>${sim.L.name}: all three goals complete!</b><br><br>Bob\'s Internet & Bait Shop weeps. Your legend grows.<br><br>Moving up now earns <b>${sim.cloutEarned()} Clout</b>.`, [{ label: sim.loc >= LOCATIONS.length - 1 ? '👑 Retire as LAN LORD' : '🚚 Move Up!', fn: () => ui.openMoveUp() }, { label: 'Keep Playing' }], 'win');
        break;
      case 'gameover':
        ui.dialog('Bankrupt', '💸', '<b>The repo man is here.</b><br><br>You are $8,000+ in debt. He took the PCs, the fridge, and somehow the llama.<br><br>Game over.', [{ label: 'New Game', fn: () => g.newGame() }], 'gameover');
        break;
      case 'inspection':
        if (e.pass) ui.balloon('Inspection PASSED', 'Health Inspector Dolores awarded you a "Certificate of Not Disgusting". Rating +0.2', '📋');
        else ui.dialog('Health Inspection FAILED', '📋', `Health Inspector Dolores found <b>${e.dirt}</b> gross things on the floor and <b>${e.stink}</b> customers who smelled "like a hot dumpster".<br><br>Fine: <b>$500</b>. Rating -0.2.<br><br>Hire a janitor. Research showers.`, [{ label: 'OK (cries)' }], 'insp');
        break;
      case 'buzz':
        if (e.up) { ui.toast(`Buzz up: ${e.tier}!`, e.tier === 'LEGENDARY' ? 'Everyone in the tri-county area is talking about you. Brace yourself.' : 'Word is spreading. More gamers will start showing up. Better have seats ready.', e.icon); audio.sfx('research'); }
        break;
      case 'tourneyEnd': ui.balloon('Tournament over!', `Winner: ${e.winner}. Hype was had. Rating +0.15`, '🏆'); audio.sfx('fanfare'); break;
      case 'newday': try { localStorage.setItem('lanlord_autosave', sim.save()); } catch { } g.saveMeta(); break;
    }
  }
  sim.events.length = 0;
}

// ---------------------------------------------------------------- input
const keys = new Set<string>();
let drag: { x: number; y: number; btn: number; moved: boolean; camx: number; camy: number } | null = null;
canvas.addEventListener('contextmenu', e => e.preventDefault());
canvas.addEventListener('pointerdown', (e) => {
  canvas.setPointerCapture(e.pointerId);
  drag = { x: e.clientX, y: e.clientY, btn: e.button, moved: false, camx: ren.cam.x, camy: ren.cam.y };
  if (e.button === 2 && (g.tool || ren.sellMode)) { g.selectTool(null); g.setSell(false); ui.refreshBuild(); drag = null; }
});
canvas.addEventListener('pointermove', (e) => {
  const r = canvas.getBoundingClientRect();
  ren.mouse = { x: e.clientX - r.left, y: e.clientY - r.top };
  ren.hover = ren.screenToTile(ren.mouse.x, ren.mouse.y);
  if (drag) {
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 6) drag.moved = true;
    const canPan = drag.btn === 1 || drag.btn === 2 || (drag.btn === 0 && !g.tool && !ren.sellMode);
    if (drag.moved && canPan) { ren.cam.x = drag.camx - dx / ren.cam.zoom; ren.cam.y = drag.camy - dy / ren.cam.zoom; canvas.style.cursor = 'grabbing'; }
  }
  updateHover();
});
canvas.addEventListener('pointerleave', () => { ren.hover = null; });
canvas.addEventListener('pointerup', (e) => {
  canvas.style.cursor = '';
  if (drag && drag.btn === 0 && !drag.moved) click(e.shiftKey);
  drag = null;
});
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const before = ren.screenToWorld(ren.mouse.x, ren.mouse.y);
  ren.cam.zoom = Math.max(0.5, Math.min(2.6, ren.cam.zoom * (e.deltaY < 0 ? 1.12 : 1 / 1.12)));
  const after = ren.screenToWorld(ren.mouse.x, ren.mouse.y);
  ren.cam.x += before[0] - after[0]; ren.cam.y += before[1] - after[1];
}, { passive: false });

function click(shift: boolean) {
  const sim = g.sim, hv = ren.hover;
  if (g.tool) {
    if (!hv) return;
    const c = sim.canPlace(g.tool, hv.x, hv.y, ren.ghost!.dir);
    if (c.ok) { sim.place(g.tool, hv.x, hv.y, ren.ghost!.dir); }
    else { audio.sfx('error'); ren.addFloat(hv.x, hv.y, '✖ ' + (c.reason || "Can't place"), '#ff4b3e'); ren.shake = Math.max(ren.shake, 0.08); }
    return;
  }
  if (ren.sellMode) {
    if (!hv) return;
    const o = sim.objAt(hv.x, hv.y);
    if (o) { sim.removeObj(o, true); audio.sfx('sell'); ren.burst(o.x, o.y, 'dust', 10, '#ddd', 2); }
    return;
  }
  // a PC with a problem (fire / broken / virus) takes priority over the gamer sitting at it
  if (hv) {
    const near = [sim.objAt(hv.x, hv.y), ...[[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => sim.objAt(hv.x + dx, hv.y + dy))].find(q => q && (q.fire > 0 || q.broken || q.infected) && (q.x === hv.x && q.y === hv.y || sim.useTileOf(q).x === hv.x && sim.useTileOf(q).y === hv.y));
    if (near) { if (near.fire > 0) sim.extinguish(near); else g.selectObj(near.id); return; }
  }
  const a = ren.agentAt(ren.mouse.x, ren.mouse.y);
  if (a) { g.selectAgent(a.id); return; }
  if (!hv) return;
  const o = sim.objAt(hv.x, hv.y);
  if (o) {
    if (o.fire > 0) { sim.extinguish(o); return; }
    g.selectObj(o.id); return;
  }
  const l = sim.litter.find(q => q.x === hv.x && q.y === hv.y);
  if (l) { sim.cleanLitter(l); ren.burst(l.x, l.y, 'foam', 6, '#fff', 2); return; }
}
function updateHover() {
  const sim = g.sim, hv = ren.hover;
  if (!hv || !sim.inB(hv.x, hv.y)) { ui.hover('Outside (the scary place)'); return; }
  const t = sim.heat[hv.y * sim.W + hv.x];
  const o = sim.objAt(hv.x, hv.y);
  let s = `Tile ${hv.x},${hv.y} • ${t.toFixed(0)}°C`;
  if (o) { s += ` • ${ITEM[o.type].name}`; if (ITEM[o.type].quality) s += ` • ${o.ping >= 999 ? 'no net' : o.ping + 'ms'}`; }
  const l = sim.litter.find(q => q.x === hv.x && q.y === hv.y);
  if (l && !o) s += l.kind === 'puddle' ? ' • a puddle (click: clean $5)' : l.kind === 'scorch' ? ' • scorch mark' : ' • litter (click: clean $5)';
  ui.hover(s);
}
window.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT') return;
  const k = e.key.toLowerCase();
  keys.add(k);
  if (k === ' ') { e.preventDefault(); g.setSpeed(g.speed === 0 ? 1 : 0); }
  else if (k === '1' || k === '2' || k === '3') g.setSpeed(+k);
  else if (k === 'r' && ren.ghost) { ren.ghost.dir = (ren.ghost.dir + 1) % 4; audio.sfx('click'); }
  else if (k === 'h') ui.setOverlay(ren.overlay === 'heat' ? 'none' : 'heat');
  else if (k === 'n') ui.setOverlay(ren.overlay === 'wifi' ? 'none' : 'wifi');
  else if (k === 'b') ui.openBuild();
  else if (k === 'delete') g.setSell(!ren.sellMode);
  else if (k === 'escape') { g.selectTool(null); g.setSell(false); ui.refreshBuild(); }
  else if (k === '+' || k === '=') ren.cam.zoom = Math.min(2.6, ren.cam.zoom * 1.15);
  else if (k === '-') ren.cam.zoom = Math.max(0.5, ren.cam.zoom / 1.15);
});
window.addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
window.addEventListener('blur', () => keys.clear());

// ---------------------------------------------------------------- main loop
let acc = 0, last = performance.now();
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  const pan = 520 * dt / ren.cam.zoom;
  if (keys.has('w') || keys.has('arrowup')) ren.cam.y -= pan;
  if (keys.has('s') || keys.has('arrowdown')) ren.cam.y += pan;
  if (keys.has('a') || keys.has('arrowleft')) ren.cam.x -= pan;
  if (keys.has('d') || keys.has('arrowright')) ren.cam.x += pan;
  const tps = TPS[g.speed];
  if (tps > 0) {
    acc += dt * tps;
    let n = 0;
    while (acc >= 1 && n < 80) { g.sim.step(); acc -= 1; n++; }
    if (n >= 80) acc = 0;
  }
  processEvents();
  ren.draw(tps > 0 ? Math.min(1, acc) : 1, dt);
  requestAnimationFrame(frame);
}

ui = createUI(g);
restoreDownloads(meta.downloads);
// music vibe: bangers make customers happier, cursed LimeWire files... do not
setInterval(() => { const t = audio.musicPlaying() ? (audio.TRACKS[audio.currentTrack] as any) : null; g.sim.musicVibe = !t ? 'none' : t.cursed ? 'cursed' : 'banger'; }, 1000);
processEvents();
requestAnimationFrame(frame);
// ?chaos — instant late-game sandbox at the Blockbuster (also a cheat code, shhh)
if (chaos) {
  const s = g.sim;
  s.money = 60000;
  Object.assign(s.researched, { r_gamer: true, r_xtreme: true, r_router: true, r_bouncer: true, r_shower: true, r_couch: true, r_ddr: true, r_ballpit: true, r_shrine: true });
  for (let x = 3; x < 11; x++) s.place('pc_xtreme', x, 6, 1);
  for (let x = 3; x < 11; x++) s.place('pc_gamer', x, 9, 3);
  s.place('router_pro', 12, 8, 0); s.place('ddr', 15, 9, 1); s.place('ballpit', 16, 6, 0); s.place('shrine', 13, 4, 0);
  s.place('vending', 17, 3, 1); s.place('lavalamp', 2, 4, 0); s.place('couch', 16, 12, 3);
  s.hire('janitor'); s.hire('tech'); s.hire('bouncer');
  s.rating = 4;
  s.served = s.L.goals.serve; s.money = Math.max(s.money, s.L.goals.cash + 5000); // 2 stars: Move Up ready
  for (let i = 0; i < 14; i++) s.spawnCustomer();
  processEvents();
}
bootSequence(() => {
  if (!meta.profile?.shop && !chaos) {
    g.speed = 0;
    setTimeout(() => runPrologue((t) => itemIcon(ren, t, 64)).then((p) => {
      meta.profile = p; g.saveMeta();
      startLocation(true, meta.tutorialDone ? undefined : () => startTutorial());
    }), 700);
    return;
  }
  g.speed = chaos ? 3 : 1;
  if (!chaos) setTimeout(() => ui.showStory(meta.tutorialDone ? undefined : () => startTutorial()), 900);
  setTimeout(() => playEraTrack(), 3200);
}, meta.profile?.name || 'LAN LORD', !meta.profile?.shop && !chaos);
(window as any).lanlord = g; // debug handle
