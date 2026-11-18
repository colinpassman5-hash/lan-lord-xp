// ============ LAN LORD — Windows XP desktop UI ============
import { Sim, Agent, Obj } from './sim';
import { Renderer, drawPerson } from './render';
import { ITEMS, ITEM, Category, RESEARCH, ADVISOR, ADVISOR_NAME, NEWS_TICKER, MONTHS, DAYS, ARCHES, LOCATIONS, PERKS, Meta, GAME_VERSION, REPO_URL, PLAY_URL } from './data';
import * as audio from './audio';
import { NEWS_BY_LOC } from './content_extra';

export interface GameCtx {
  sim: Sim; ren: Renderer; canvas: HTMLCanvasElement;
  speed: number; setSpeed(n: number): void;
  tool: string | null; selectTool(t: string | null): void; setSell(on: boolean): void;
  selectAgent(id: number): void; selectObj(id: number): void;
  newGame(): void; saveGame(): void; loadGame(): boolean;
  meta: Meta; moveUp(): void; retire(): void; saveMeta(): void; newCharacter(): void; tutorial(): void; limewire(): void;
}

// ---------------------------------------------------------------- tiny DOM helper
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Record<string, any> = {}, ...kids: any[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const k in props) {
    const v = props[k];
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'html') el.innerHTML = v;
    else (el as any).setAttribute(k, v);
  }
  for (const c of kids.flat(3)) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : String(c));
  return el;
}
const fmt = (n: number) => (n < 0 ? '-' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
const stars = (r: number) => '★★★★★'.slice(0, Math.round(r)) + '☆☆☆☆☆'.slice(0, 5 - Math.round(r));

// ---------------------------------------------------------------- window manager
interface WinOpts {
  id: string; title: string; icon: string; x: number; y: number; w: number; h?: number;
  cls?: string; resizable?: boolean; noTask?: boolean; noMax?: boolean;
  build: (body: HTMLElement, win: Win) => void; update?: () => void; onClose?: () => void;
}
export class Win {
  el: HTMLDivElement; body: HTMLDivElement; titleEl: HTMLSpanElement; task?: HTMLDivElement;
  minimized = false; maxed = false; prev = { x: 0, y: 0, w: 0, h: 0 };
  constructor(public opts: WinOpts, public wm: WM) {
    this.titleEl = h('span', { class: 'ttext' }, opts.title);
    const tb = h('div', { class: 'titlebar' },
      h('span', { class: 'ticon' }, opts.icon), this.titleEl,
      h('div', { class: 'tbtn', title: 'Minimize', onclick: (e: Event) => { e.stopPropagation(); this.minimize(); } }, '_'),
      opts.noMax ? null : h('div', { class: 'tbtn', title: 'Maximize', onclick: (e: Event) => { e.stopPropagation(); this.toggleMax(); } }, '□'),
      h('div', { class: 'tbtn close', title: 'Close', onclick: (e: Event) => { e.stopPropagation(); wm.close(opts.id); } }, '✕'),
    );
    this.body = h('div', { class: 'wbody' });
    this.el = h('div', { class: 'win pop ' + (opts.cls || '') + (opts.resizable ? ' resizable' : '') }, tb, this.body);
    Object.assign(this.el.style, { left: opts.x + 'px', top: opts.y + 'px', width: opts.w + 'px', height: opts.h ? opts.h + 'px' : 'auto' });
    this.el.addEventListener('pointerdown', () => wm.focus(opts.id), true);
    tb.addEventListener('dblclick', () => { if (!opts.noMax) this.toggleMax(); });
    // dragging
    tb.addEventListener('pointerdown', (e: PointerEvent) => {
      if ((e.target as HTMLElement).classList.contains('tbtn') || this.maxed) return;
      const sx = e.clientX - this.el.offsetLeft, sy = e.clientY - this.el.offsetTop;
      const mv = (ev: PointerEvent) => {
        const x = Math.max(-this.el.offsetWidth + 80, Math.min(window.innerWidth - 80, ev.clientX - sx));
        const y = Math.max(0, Math.min(window.innerHeight - 60, ev.clientY - sy));
        this.el.style.left = x + 'px'; this.el.style.top = y + 'px';
      };
      const up = () => { window.removeEventListener('pointermove', mv); window.removeEventListener('pointerup', up); };
      window.addEventListener('pointermove', mv); window.addEventListener('pointerup', up);
    });
    opts.build(this.body, this);
    setTimeout(() => this.el.classList.remove('pop'), 250);
  }
  minimize() { this.minimized = true; this.el.style.display = 'none'; this.wm.refreshTasks(); }
  restore() { this.minimized = false; this.el.style.display = 'flex'; this.wm.focus(this.opts.id); }
  toggleMax() {
    if (!this.maxed) {
      this.prev = { x: this.el.offsetLeft, y: this.el.offsetTop, w: this.el.offsetWidth, h: this.el.offsetHeight };
      Object.assign(this.el.style, { left: '0px', top: '0px', width: window.innerWidth + 'px', height: (window.innerHeight - 30) + 'px' });
    } else Object.assign(this.el.style, { left: this.prev.x + 'px', top: this.prev.y + 'px', width: this.prev.w + 'px', height: this.prev.h + 'px' });
    this.maxed = !this.maxed;
  }
  setTitle(t: string) { this.titleEl.textContent = t; if (this.task) this.task.lastChild!.textContent = t; }
  shake() { this.el.classList.remove('shake'); void this.el.offsetWidth; this.el.classList.add('shake'); if (this.task) { this.task.classList.remove('flash'); void this.task.offsetWidth; this.task.classList.add('flash'); } }
}
export class WM {
  wins = new Map<string, Win>(); z = 100; active = '';
  constructor(public desk: HTMLElement, public tasks: HTMLElement) { }
  open(o: WinOpts): Win {
    const ex = this.wins.get(o.id);
    if (ex) { if (ex.minimized) ex.restore(); this.focus(o.id); return ex; }
    const x = Math.max(0, Math.min(o.x, window.innerWidth - o.w - 10));
    const minY = document.getElementById('gamearea') ? 108 : 0; // never cover the top bar + HUD pills
    const y = Math.max(minY, Math.min(o.y, window.innerHeight - (o.h || 200) - 40));
    if (o.h && y + o.h > window.innerHeight - 36) o = { ...o, h: Math.max(220, window.innerHeight - 36 - y) };
    const w = new Win({ ...o, x, y }, this);
    this.wins.set(o.id, w);
    this.desk.append(w.el);
    this.focus(o.id);
    audio.sfx('open');
    return w;
  }
  close(id: string) {
    const w = this.wins.get(id); if (!w) return;
    w.el.remove(); this.wins.delete(id); w.opts.onClose?.(); this.refreshTasks(); audio.sfx('close');
  }
  toggle(id: string, opener: () => void) { const w = this.wins.get(id); if (w && !w.minimized) this.close(id); else opener(); }
  focus(id: string) {
    const w = this.wins.get(id); if (!w) return;
    w.el.style.zIndex = String(++this.z);
    this.active = id;
    for (const [k, v] of this.wins) v.el.classList.toggle('inactive', k !== id);
    this.refreshTasks();
  }
  refreshTasks() {
    this.tasks.innerHTML = '';
    for (const [id, w] of this.wins) {
      if (w.opts.noTask) continue;
      const b = h('div', { class: 'taskbtn' + (id === this.active && !w.minimized ? ' active' : ''), onclick: () => {
        if (w.minimized) w.restore(); else if (this.active === id) w.minimize(); else this.focus(id);
      } }, h('span', {}, w.opts.icon), h('span', {}, w.titleEl.textContent || ''));
      w.task = b;
      this.tasks.append(b);
    }
  }
  updateAll() { for (const w of this.wins.values()) if (!w.minimized) { try { w.opts.update?.(); } catch (e) { console.error('window update failed:', w.opts.id, e); } } }
  refresh(id: string) { const w = this.wins.get(id); if (w) { (w as any).force = true; try { (w.opts as any).forceUpdate?.(); w.opts.update?.(); } catch (e) { console.error(e); } } }
}

// ---------------------------------------------------------------- icon rendering
const iconCache = new Map<string, HTMLCanvasElement>();
export function itemIcon(ren: Renderer, type: string, size = 64): HTMLCanvasElement {
  const key = type + size;
  const c = h('canvas', { width: size * 2, height: size * 2, style: { width: size + 'px', height: size + 'px' } });
  if (iconCache.has(key)) { c.getContext('2d')!.drawImage(iconCache.get(key)!, 0, 0); return c; }
  const ctx = c.getContext('2d')!;
  ctx.scale(2, 2);
  const tall = ['fridge', 'vending', 'ddr', 'shower', 'ac', 'pc_xtreme'].includes(type);
  ctx.translate(size / 2, size * (tall ? 0.8 : 0.7));
  ctx.scale(size / 80, size / 80);
  ren.drawObject(ctx, { type, x: 0, y: 0, dir: 1, user: 1, id: 3 }, true);
  const copy = h('canvas', { width: size * 2, height: size * 2 }); copy.getContext('2d')!.drawImage(c, 0, 0); iconCache.set(key, copy);
  return c;
}
function avatar(look: any, size = 48, kind = 'customer'): HTMLCanvasElement {
  const c = h('canvas', { width: size * 2, height: size * 2, style: { width: size + 'px', height: size + 'px' } });
  const ctx = c.getContext('2d')!; ctx.scale(2, 2);
  ctx.translate(size / 2, size * 1.25); ctx.scale(size / 34, size / 34);
  drawPerson(ctx, 0, 0, look, { face: 1, walk: 0, walking: false, sitting: false, lying: false, sleep: false, dead: false, mood: 1, rage: 0, kind, t: 0, typing: false });
  return c;
}

// ---------------------------------------------------------------- UI root
export interface UIApi {
  wm: WM; msn(text: string, who?: 'them' | 'me' | 'sys'): void; advisor(key: string): void;
  balloon(title: string, text: string, icon?: string): void;
  dialog(title: string, icon: string, msg: string, buttons: { label: string; fn?: () => void }[], id?: string): Win;
  openProps(): void; reviewsChanged(): void; hover(text: string): void; toolHint(text: string): void;
  bumpMoney(): void; refreshBuild(): void; openBuild(): void; setOverlay(o: 'none' | 'heat' | 'wifi'): void;
  toast(title: string, text: string, icon?: string, onclick?: () => void): void; showStory(onDone?: () => void): void; openMoveUp(): void; openHallOfFame(): void;
  buildCategory(cat: string): void;
}

export function createUI(g: GameCtx): UIApi {
  const desk = h('div', { id: 'desktop' });
  const tasks = h('div', { id: 'tasks' });
  const trayMoney = h('span', { class: 'money' });
  const trayClock = h('span', {});
  const startMenu = h('div', { id: 'startmenu' });
  const taskbar = h('div', { id: 'taskbar' },
    h('div', { id: 'startbtn', onclick: (e: Event) => { e.stopPropagation(); startMenu.classList.toggle('open'); audio.sfx('click'); } }, h('span', { class: 'flag' }, '🪟'), 'start'),
    tasks,
    h('div', { id: 'tray' },
      h('span', { class: 'ti', title: 'Volume', onclick: () => openWinamp() }, '🔊'),
      h('span', { class: 'ti', title: 'Network', onclick: () => setOverlay(g.ren.overlay === 'wifi' ? 'none' : 'wifi') }, '📶'),
      h('span', { class: 'ti', title: 'Windows Update', onclick: () => openUpdate() }, '🛡️'),
      trayMoney, trayClock),
  );
  document.body.append(desk, taskbar, startMenu);
  document.addEventListener('pointerdown', (e) => { if (!startMenu.contains(e.target as Node) && (e.target as HTMLElement).id !== 'startbtn') startMenu.classList.remove('open'); });
  const wm = new WM(desk, tasks);
  const W = () => window.innerWidth, H = () => window.innerHeight - 30;

  // ---------------- fullscreen layout: no desktop icons, game fills the desktop
  const leftX = () => 24;
  const rightW = W() < 1150 ? 300 : 340;

  // ---------------- start menu
  const smItem = (e: string, title: string, sub: string | null, fn: () => void) => h('div', { class: 'sm-item', onclick: () => { startMenu.classList.remove('open'); fn(); } }, h('span', { class: 'e' }, e), h('div', {}, sub ? h('b', {}, title) : title, sub ? h('small', {}, sub) : null));
  startMenu.append(
    h('div', { class: 'sm-head' }, h('div', { class: 'av' }, '🎮'), h('span', { class: 'sm-name' }, g.meta.profile?.name || 'LAN LORD')),
    h('div', { class: 'sm-cols' },
      h('div', { class: 'sm-left' },
        smItem('🌐', 'Internet', 'CaféSpace', openCafeSpace), smItem('🦋', 'E-mail', 'MSN Messenger', openMSN), h('div', { class: 'sm-sep' }),
        smItem('🎮', 'LANLORD.EXE', null, openGame), smItem('📁', 'Build Stuff', null, openBuild), smItem('📊', 'Finances.xls', null, openFinance),
        smItem('📰', 'craigzlist (Hire Staff)', null, openCraigs), smItem('🏆', 'Host LAN Tournament', null, openTourney), smItem('⚡', 'Winamp', null, openWinamp),
      ),
      h('div', { class: 'sm-right' },
        smItem('🖥️', 'My Computer', null, openMyComputer), smItem('📝', 'goals.txt', null, openGoals), smItem('🛡️', 'Windows Update', null, openUpdate),
        smItem('⚙️', 'Control Panel (Prices)', null, openControl), smItem('📈', 'Task Manager', null, openTaskMgr), h('div', { class: 'sm-sep' }),
        smItem('💾', 'Save Game', null, () => g.saveGame()), smItem('📂', 'Load Game', null, () => { if (!g.loadGame()) dialog('Load Game', '⚠️', 'No saved game found on C:\\. Did your little brother delete it?', [{ label: 'OK' }]); }),
        smItem('📮', 'Submit notes for Dev!', null, () => openFeedback()),
        smItem('🐦', 'Share on X', null, () => shareOnX()),
        smItem('💻', 'Source code (GitHub)', null, () => window.open(REPO_URL, '_blank')),
        smItem('🎓', 'Tutorial', null, () => g.tutorial()),
        smItem('❓', 'Help and Support', null, openHelp),
        smItem('🧑', 'New Character...', null, () => dialog('New Character', '🧑', 'Go back to Professor Gary and create a brand new degen?<br><br>Your Clout, perks and progress are kept.', [{ label: 'Yes', fn: () => g.newCharacter() }, { label: 'Cancel' }])),
      ),
    ),
    h('div', { class: 'sm-foot' },
      h('span', { onclick: () => { startMenu.classList.remove('open'); dialog('Log Off LAN LORD', '🔑', 'Log off and start a brand new café? Your current café will be lost (like tears in rain).', [{ label: 'New Game', fn: () => g.newGame() }, { label: 'Cancel' }]); } }, '🔑 Log Off'),
      h('span', { onclick: () => { startMenu.classList.remove('open'); dialog('Turn off computer', '⏻', 'You cannot turn off the LAN.<br>The LAN is eternal.<br>The LAN is love.', [{ label: 'I understand' }]); } }, '⏻ Turn Off Computer'),
    ),
  );

  // ---------------- generic dialog / balloon
  let dlgN = 0;
  function dialog(title: string, icon: string, msg: string, buttons: { label: string; fn?: () => void }[], id?: string): Win {
    const wid = id || 'dlg' + (dlgN++);
    const w = wm.open({
      id: wid, title, icon: '⚠️', x: W() / 2 - 190, y: H() / 2 - 90, w: 380, noMax: true,
      build: (b) => {
        b.append(h('div', { class: 'dlg' }, h('div', { class: 'ic' }, icon), h('div', { class: 'msg', html: msg })),
          h('div', { class: 'dlg-btns' }, buttons.map(bt => h('button', { class: 'xpbtn', onclick: () => { wm.close(wid); bt.fn?.(); } }, bt.label))));
      },
    });
    audio.sfx('error');
    return w;
  }
  let balloonEl: HTMLElement | null = null; let balloonT = 0;
  function balloon(title: string, text: string, icon = 'ℹ️') {
    balloonEl?.remove();
    balloonEl = h('div', { class: 'balloon', onclick: () => { balloonEl?.remove(); balloonEl = null; } }, h('span', { class: 'x' }, '✕'), h('b', {}, icon + ' ' + title), text);
    document.body.append(balloonEl);
    clearTimeout(balloonT);
    balloonT = window.setTimeout(() => { balloonEl?.remove(); balloonEl = null; }, 6500);
    audio.sfx('balloon');
  }

  // ================================================================ GAME (fullscreen panel)
  const moneyPill = h('div', { class: 'pill money' });
  const datePill = h('div', { class: 'pill' });
  const ratePill = h('div', { class: 'pill', title: 'CaféSpace rating', style: { cursor: 'pointer' }, onclick: () => openCafeSpace() });
  const custPill = h('div', { class: 'pill' });
  const buzzPill = h('div', { class: 'pill buzz', title: 'Buzz = word of mouth. Happy customers leave reviews → more people show up.' });
  const locPill = h('div', { class: 'pill loc', title: 'Current location — click for goals', style: { cursor: 'pointer' }, onclick: () => openGoals() });
  const speedBtns: HTMLButtonElement[] = [];
  const hoverSpan = h('span', {}, 'Ready');
  const toolHintEl = h('div', { class: 'tool-hint' });
  const toolBtns: Record<string, HTMLElement> = {};
  const toastBox = h('div', { class: 'toasts' });
  const brandName = h('span', {}, 'LAN LORD');
  let gameBuilt = false;
  let gameUpdate = () => { };
  function openGame() {
    if (gameBuilt) return;
    gameBuilt = true;
    const panel = h('div', { id: 'gamearea' });
    const bar = h('div', { class: 'topbar' });
    const tool = (key: string, e: string, label: string, fn: () => void, title = '') => { const el = h('button', { class: 'tool', 'data-tool': key, title: title || label, onclick: () => { audio.sfx('click'); fn(); } }, h('span', { class: 'e' }, e), h('span', { class: 'tl' }, label)); toolBtns[key] = el; return el; };
    const sep = () => h('div', { class: 'tsep' });
    bar.append(
      h('div', { class: 'brand', onclick: (e: Event) => { e.stopPropagation(); startMenu.classList.toggle('open'); } }, h('span', { class: 'e' }, '🎮'), brandName),
      tool('build', '🔨', 'Build', () => wm.toggle('build', openBuild), 'Build menu (B)'),
      tool('sell', '♻️', 'Sell', () => g.setSell(!g.ren.sellMode), 'Sell tool (Del)'),
      tool('heat', '🌡️', 'Heat', () => setOverlay(g.ren.overlay === 'heat' ? 'none' : 'heat'), 'Heat overlay (H)'),
      tool('wifi', '📶', 'WiFi', () => setOverlay(g.ren.overlay === 'wifi' ? 'none' : 'wifi'), 'WiFi / ping overlay (N)'),
      sep(),
      tool('staff', '👷', 'Staff', () => wm.toggle('craigs', openCraigs)),
      tool('money', '📊', 'Money', () => wm.toggle('fin', openFinance)),
      tool('prices', '💲', 'Prices', () => wm.toggle('ctl', openControl)),
      tool('upd', '🛡️', 'Research', () => wm.toggle('upd', openUpdate)),
      tool('tour', '🏆', 'Tourney', openTourney),
      sep(),
      tool('cs', '🌐', 'Reviews', () => wm.toggle('cs', openCafeSpace), 'CaféSpace reviews'),
      tool('goals', '📝', 'Goals', () => wm.toggle('goals', openGoals)),
      tool('tm', '📈', 'Stats', () => wm.toggle('tm', openTaskMgr), 'Task Manager — complaints & stats'),
      tool('msn', '🦋', 'MSN', () => wm.toggle('msn', openMSN)),
      tool('amp', '⚡', 'Music', () => wm.toggle('winamp', openWinamp), 'Winamp'),
      tool('lw', '🍋', 'LimeWire', () => g.limewire(), 'LimeWire — free music! (viruses not included) (they are included)'),
      h('div', { style: { flex: '1' } }),
      tool('fb', '📮', 'Dev Notes', () => wm.toggle('feedback', openFeedback), 'Submit notes for the dev! (bugs, ideas, love letters)'),
      tool('clout', '😎', 'Clout', () => wm.toggle('hof', openHallOfFame), 'Hall of Fame — spend Clout on permanent perks'),
      tool('move', '🚚', 'Move Up', openMoveUp, 'Move to a bigger, badder location (needs 2★)'),
    );
    const holder = h('div', { class: 'game-holder' });
    holder.append(g.canvas);
    const sb = h('div', { class: 'speedbox' });
    ['⏸', '▶', '▶▶', '▶▶▶'].forEach((l, i) => { const bt = h('button', { title: ['Pause (Space)', 'Normal (1)', 'Fast (2)', 'LUDICROUS (3)'][i], onclick: () => g.setSpeed(i) }, l); speedBtns.push(bt); sb.append(bt); });
    holder.append(h('div', { class: 'hud' }, locPill, moneyPill, datePill, ratePill, custPill, buzzPill), sb, toolHintEl, toastBox);
    const news = h('span', {}, NEWS_TICKER.join('   ✦   '));
    let newsLoc = '';
    panel.append(bar, holder, h('div', { class: 'statusbar' }, h('div', { class: 'sp', style: { width: '300px' } }, hoverSpan), h('div', { class: 'sp marquee' }, news)));
    desk.append(panel);
    new ResizeObserver(() => g.ren.resize(holder.clientWidth, holder.clientHeight)).observe(holder);
    gameUpdate = () => {
      const s = g.sim;
      const d = s.date();
      locPill.textContent = `📍 ${s.L.short}`;
      const bn = g.meta.profile?.shop || 'LAN LORD'; if (brandName.textContent !== bn) brandName.textContent = bn;
      const sn = document.querySelector('.sm-name'); if (sn && g.meta.profile) sn.textContent = g.meta.profile.name;
      if (newsLoc !== s.L.id) { newsLoc = s.L.id; news.textContent = (NEWS_BY_LOC[s.L.id]?.length ? NEWS_BY_LOC[s.L.id] : NEWS_TICKER).join('   ✦   '); }
      moneyPill.textContent = '💰 ' + fmt(s.money);
      moneyPill.classList.toggle('neg', s.money < 0);
      datePill.textContent = `📅 ${DAYS[d.getDay()]} ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}  ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      ratePill.textContent = `${stars(s.rating)} ${s.rating.toFixed(1)}`;
      custPill.textContent = `👥 ${s.customers().length}`;
      const bt = s.buzzTier(); const pct = Math.round(Math.min(1, s.buzz / 1.1) * 100);
      buzzPill.innerHTML = `${bt[2]} ${bt[1]} <span class="bar"><i style="width:${pct}%"></i></span>`;
      speedBtns.forEach((bt, i) => bt.classList.toggle('on', g.speed === i));
      toolBtns.sell?.classList.toggle('on', g.ren.sellMode);
      toolBtns.heat?.classList.toggle('on', g.ren.overlay === 'heat');
      toolBtns.wifi?.classList.toggle('on', g.ren.overlay === 'wifi');
      toolBtns.build?.classList.toggle('on', !!wm.wins.get('build'));
      toolBtns.move?.classList.toggle('ready', s.starsDone() >= 2);
      (toolBtns.clout?.lastChild as HTMLElement).textContent = `${g.meta.clout} Clout`;
    };
  }
  function setOverlay(o: 'none' | 'heat' | 'wifi') { g.ren.overlay = o; audio.sfx('click'); }
  function bumpMoney() { moneyPill.classList.remove('bump'); void moneyPill.offsetWidth; moneyPill.classList.add('bump'); }
  function toast(title: string, text: string, icon = '🦋', onclick?: () => void) {
    const t = h('div', { class: 'toast', onclick: () => { t.remove(); (onclick || (() => openMSN()))(); } }, h('div', { class: 'th' }, h('span', {}, icon + ' ' + title), h('span', { class: 'x', onclick: (e: Event) => { e.stopPropagation(); t.remove(); } }, '✕')), h('div', { class: 'tb' }, text));
    toastBox.append(t);
    while (toastBox.childElementCount > 4) toastBox.firstElementChild!.remove();
    setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 400); }, 7000);
  }

  // ================================================================ COMMUNITY: dev notes + share
  function gameInfo() {
    const s = g.sim; const d = s.date();
    return `v${GAME_VERSION} · ${s.L.name} · ${MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()} · ${fmt(s.money)} · ${s.rating.toFixed(1)}★ · ${s.customers().length} customers · buzz ${s.buzzTier()[1]} · ${s.objects.filter(o => s.isPC(o)).length} PCs · ${navigator.userAgent.split(') ')[0].split('(')[1] || 'unknown browser'}`;
  }
  function shareOnX(extra = '') {
    const p = g.meta.profile;
    const brag = p ? `I'm running "${p.shop}" out of my mom's basement in 2004 and it's going ${g.sim.rating >= 3.5 ? 'GREAT' : 'about as well as you think'} 💀` : 'I just started a LAN café in my mom\'s basement (2004) 💀';
    const text = `${extra || brag}\n\nLAN LORD XP — a free, fully absurd 2004 LAN café tycoon 🎮🔥\n${PLAY_URL}\n#LANLORDXP`;
    window.open('https://x.com/intent/post?text=' + encodeURIComponent(text), '_blank');
  }
  function openFeedback() {
    return wm.open({
      id: 'feedback', title: 'Outlook Express — New Message to the Dev', icon: '📮', x: W() / 2 - 260, y: 120, w: 520, h: 470, noMax: true,
      build: (b) => {
        const kinds: [string, string, string][] = [['bug', '🐛 Bug', 'bug'], ['idea', '💡 Idea', 'idea'], ['balance', '⚖️ Balance', 'balance'], ['love', '💌 Love letter', 'feedback']];
        let kind = 'idea';
        const subj = h('input', { class: 'fb-in', placeholder: 'Subject (e.g. "fires are too op lol")', maxlength: 90 }) as HTMLInputElement;
        const msg = h('textarea', { class: 'fb-ta', placeholder: 'Tell the dev anything! What happened, what you expected, what would make it funnier...' }) as HTMLTextAreaElement;
        for (const el of [subj, msg]) el.addEventListener('keydown', (e) => e.stopPropagation());
        const info = h('div', { class: 'fb-info' });
        const chips = h('div', { class: 'fb-chips' });
        const renderChips = () => { chips.innerHTML = ''; for (const [k, label] of kinds) chips.append(h('span', { class: 'fb-chip' + (kind === k ? ' on' : ''), onclick: () => { kind = k; renderChips(); audio.sfx('click'); } }, label)); };
        renderChips();
        const body = () => `${msg.value.trim() || '(no message)'}\n\n---\n**Type:** ${kinds.find(x => x[0] === kind)![1]}\n**Game state:** ${gameInfo()}\n\n_Sent from the in-game "Submit notes for Dev!" button_`;
        const title = () => `[${kinds.find(x => x[0] === kind)![1]}] ${subj.value.trim() || 'Note from a player'}`;
        const viaGitHub = () => {
          const label = kinds.find(x => x[0] === kind)![2];
          const url = `${REPO_URL}/issues/new?title=${encodeURIComponent(title())}&body=${encodeURIComponent(body())}&labels=${encodeURIComponent(label + ',from-game')}`;
          window.open(url, '_blank'); audio.sfx('kaching');
          balloon('Opening GitHub...', 'Hit "Submit new issue" on GitHub and it lands in the dev\'s inbox. Thank you!! 💜', '📮');
        };
        const viaX = () => { shareOnX(`@ the LAN LORD dev: ${subj.value.trim() || msg.value.trim().slice(0, 140) || 'I have notes'} ${kind === 'bug' ? '🐛' : kind === 'idea' ? '💡' : kind === 'love' ? '💌' : '⚖️'}`); };
        const copy = async () => { try { await navigator.clipboard.writeText(title() + '\n\n' + body()); balloon('Copied!', 'Paste it anywhere: GitHub, X, Discord, a carrier pigeon.', '📋'); } catch { balloon('Copy failed', 'Your browser said no. Select the text manually.', '⚠️'); } };
        b.append(
          h('div', { class: 'toolbar' }, h('button', { class: 'tbb', onclick: viaGitHub }, h('span', { class: 'e' }, '📨'), 'Send (GitHub)'), h('button', { class: 'tbb', onclick: viaX }, h('span', { class: 'e' }, '🐦'), 'Post on X'), h('button', { class: 'tbb', onclick: copy }, h('span', { class: 'e' }, '📋'), 'Copy')),
          h('div', { class: 'fb-form' },
            h('div', { class: 'fb-row' }, h('span', { class: 'fb-k' }, 'To:'), h('span', { class: 'fb-to' }, 'the dev (via GitHub Issues) 💜')),
            h('div', { class: 'fb-row' }, h('span', { class: 'fb-k' }, 'Type:'), chips),
            h('div', { class: 'fb-row' }, h('span', { class: 'fb-k' }, 'Subject:'), subj),
            msg, info,
            h('div', { class: 'fb-foot' }, 'LAN LORD XP is an open-source community build. Want to fix it yourself? ', h('a', { href: REPO_URL, target: '_blank' }, 'Grab the code on GitHub →'))),
        );
        info.textContent = '📎 Attached automatically: ' + gameInfo();
        setTimeout(() => subj.focus(), 60);
      },
    });
  }

  // ================================================================ PRESTIGE: Move Up / Hall of Fame / Story
  function openMoveUp() {
    const s = g.sim; const L = s.L; const last = s.loc >= LOCATIONS.length - 1; const next = LOCATIONS[s.loc + 1];
    const st = s.starsDone(); const clout = s.cloutEarned();
    if (st < 2) {
      dialog('Not yet, champ', '🚚', `You need at least <b>★★ (2 of 3 goals)</b> at <b>${L.name}</b> before you can move up.<br><br>Current: ${'★'.repeat(st)}${'☆'.repeat(3 - st)}<br><br>Check <b>Goals</b> in the top bar.`, [{ label: '📝 Show goals', fn: openGoals }, { label: 'OK' }], 'moveup');
      return;
    }
    if (last) {
      dialog('Retire as the LAN LORD?', '👑', `You conquered <b>${L.name}</b>. There is nowhere bigger to go.<br><br>Retire, cash out <b>+${clout} Clout</b>, and start a brand-new legacy back in Mom's basement — keeping all your Clout and perks.<br><br><i>(Legends say every LAN LORD returns to the basement eventually.)</i>`, [{ label: '👑 RETIRE & RESTART LEGACY', fn: () => g.retire() }, { label: 'Keep playing' }], 'moveup');
      return;
    }
    dialog('Move up?', '🚚', `<b>You've outgrown ${L.name}.</b><br><br>Stars earned: ${'★'.repeat(st)}${'☆'.repeat(3 - st)}${st < 3 ? ' <i>(get ★★★ for more Clout)</i>' : ''}<br>Clout earned: <b style="color:#b8860b">+${clout} 😎</b><br><br>Next: <b>${next.name}</b> (${next.year})<br>${next.w}×${next.h} floor • start cash ${fmt(next.startCash + g.meta.perks.fund * 1500 || next.startCash)}<br><br>Everything here stays behind. Spend Clout in the Hall of Fame on perks that last forever.`,
      [{ label: '🚚 MOVE UP!', fn: () => g.moveUp() }, { label: 'Not yet' }], 'moveup');
  }
  function openHallOfFame() {
    return wm.open({
      id: 'hof', title: 'Hall of Fame.exe — Clout & Legacy', icon: '😎', x: W() / 2 - 280, y: 60, w: 560, h: Math.min(640, H() - 80), resizable: true,
      build: (b, win) => {
        const page = h('div', { class: 'hof' });
        b.append(page);
        let sig = '';
        const render = () => {
          const m = g.meta; const s = g.sim;
          const ns = JSON.stringify([m.clout, m.perks, s.loc]);
          if (ns === sig) return; sig = ns;
          page.innerHTML = '';
          page.append(
            h('div', { class: 'hof-top' }, h('div', { class: 'big' }, '😎 ', h('b', {}, String(m.clout)), ' Clout'), h('div', {}, `Lifetime Clout: ${m.totalClout} • Legacy run #${m.runs}`),
              h('div', { class: 'sub' }, `Lifetime: ${m.lifetime.served} gamers served • ${fmt(m.lifetime.earned)} earned • ${m.lifetime.fires} fires • ${m.lifetime.deaths} deaths`)),
            h('div', { class: 'timeline' }, LOCATIONS.map((L, i) => h('div', { class: 'tl-step' + (i < s.loc ? ' done' : i === s.loc ? ' cur' : '') }, h('div', { class: 'dot' }, i < s.loc ? '✔' : String(i + 1)), h('div', { class: 'nm' }, L.short), h('div', { class: 'yr' }, String(L.year))))),
            h('div', { class: 'perks' }, PERKS.map(p => {
              const lvl = m.perks[p.id] || 0; const maxed = lvl >= p.max; const cost = p.cost(lvl);
              return h('div', { class: 'perk' + (maxed ? ' maxed' : '') },
                h('div', { class: 'pi' }, p.icon),
                h('div', { class: 'pt' }, h('b', {}, p.name), h('div', {}, p.desc), h('div', { class: 'pips' }, Array.from({ length: p.max }, (_, i) => h('span', { class: i < lvl ? 'on' : '' })))),
                maxed ? h('span', { class: 'mx' }, 'MAXED') : h('button', { class: 'xpbtn', disabled: m.clout < cost ? 'disabled' : undefined, onclick: () => {
                  if (m.clout < cost) return; m.clout -= cost; m.perks[p.id] = lvl + 1; g.saveMeta(); audio.sfx('research');
                  if (p.id === 'fund') g.sim.money += 1500;
                  balloon('Perk unlocked!', `${p.icon} ${p.name} → level ${lvl + 1}`, '😎'); render();
                } }, `Buy (${cost} 😎)`));
            })),
            h('div', { class: 'hof-foot' }, 'Earn Clout by moving up to bigger locations (more ★ = more Clout). Perks apply instantly and last forever, even after you retire.'),
          );
        };
        win.opts.update = throttle(render, 500);
        render();
      },
    });
  }
  function showStory(onDone?: () => void) {
    const L = g.sim.L;
    const prevSpeed = g.speed; g.setSpeed(0);
    wm.close('story');
    wm.open({
      id: 'story', title: `${L.chapter}`, icon: '📖', x: W() / 2 - 290, y: Math.max(40, H() / 2 - 260), w: 580, noMax: true, cls: 'storywin',
      build: (b) => {
        const lines = h('div', { class: 'story-lines' });
        const btn = h('button', { class: 'xpbtn big', onclick: () => { wm.close('story'); g.setSpeed(prevSpeed || 1); onDone?.(); } }, `▶ Open ${L.name}`) as HTMLButtonElement;
        b.append(h('div', { class: 'story-head' }, h('div', { class: 'ch' }, L.chapter), h('div', { class: 'loc' }, `📍 ${L.name} — ${L.year}`)), h('img', { class: 'story-art', src: `chapters/${L.id}.jpg`, alt: '' }), lines,
          h('div', { class: 'story-goals' }, h('b', {}, 'Goals here: '), `serve ${L.goals.serve} • ${fmt(L.goals.cash)} in the bank • ${L.goals.rating}★ with ${L.goals.crowd} at once`, h('br'), h('i', {}, 'Get ★★ to unlock MOVE UP. ★★★ = max Clout.')),
          h('div', { class: 'dlg-btns' }, btn));
        const rival = g.meta.profile?.rival || 'Bob';
        const rv = rival.charAt(0) + rival.slice(1).toLowerCase();
        L.story.forEach((t, i) => setTimeout(() => { lines.append(h('p', { class: i === 0 ? 'yr' : '' }, t.replace(/Bob/g, rv).replace('$1,500', fmt(g.sim.money)))); audio.sfx('review'); }, 250 + i * 650));
      },
    });
  }

  // ================================================================ BUILD (Explorer)
  let buildCat: Category | 'All' = 'All';
  let buildRefresh: () => void = () => { };
  function openBuild() {
    return wm.open({
      id: 'build', title: 'C:\\My Café\\Build Stuff', icon: '📁', x: W() - rightW - 10, y: 92, w: rightW, h: Math.min(620, H() - 130), resizable: true,
      build: (b) => {
        const addr = h('div', { class: 'addr' }, 'Address', h('div', { class: 'box' }, '📁 C:\\My Café\\Build Stuff\\' + buildCat));
        const cats = h('div', { class: 'cats' });
        const grid = h('div', { class: 'icongrid' });
        const det = h('div', { class: 'details' }, h('b', {}, 'Select an item'), h('div', {}, 'Click an icon, then click the café floor to place it. R = rotate, right-click = cancel. Hold Shift to place many.'));
        const render = () => {
          cats.innerHTML = ''; grid.innerHTML = '';
          (addr.lastChild as HTMLElement).textContent = '📁 C:\\My Café\\Build Stuff\\' + buildCat;
          (['All', 'PCs', 'Network', 'Food & Drink', 'Comfort', 'Decor', 'Weird'] as const).forEach(c => cats.append(h('span', { class: 'cat' + (buildCat === c ? ' on' : ''), onclick: () => { buildCat = c; render(); audio.sfx('click'); } }, c === 'All' ? '📂 All' : c)));
          cats.append(h('span', { class: 'cat', onclick: () => g.setSell(true), title: 'Sell tool' }, '🗑️ Recycle'));
          for (const it of ITEMS) {
            if (it.scenery) continue;
            if (buildCat !== 'All' && it.cat !== buildCat) continue;
            const unlocked = g.sim.isUnlocked(it.id);
            const el = h('div', { class: 'bitem' + (g.tool === it.id ? ' sel' : '') + (unlocked ? '' : ' locked'), title: it.desc, 'data-id': it.id },
              itemIcon(g.ren, it.id, 56), h('div', { class: 'nm' }, it.file.replace(/_/g, '_\u200b').replace('.exe', '\u200b.exe')), h('div', { class: 'pr' }, fmt(g.sim.costOf(it.id))), unlocked ? null : h('span', { class: 'lock' }, '🔒'));
            el.addEventListener('mouseenter', () => showDet(it.id));
            el.addEventListener('click', () => {
              if (!unlocked) { const r = RESEARCH.find(r => r.id === it.unlockedBy)!; balloon('Locked', `${it.name} needs Windows Update ${r.kb}: "${r.name}".`, '🔒'); openUpdate(); return; }
              g.selectTool(g.tool === it.id ? null : it.id); render();
            });
            grid.append(el);
          }
        };
        const showDet = (id: string) => {
          const it = ITEM[id]; det.innerHTML = '';
          const stats: string[] = [];
          if (it.quality) stats.push(`Tier ${it.quality} PC`, `Heat ${'🔥'.repeat(it.quality)}`);
          if (it.routerCap) stats.push(`${it.routerCap} gamers, range ${it.routerRadius}`);
          if (it.cool) stats.push(`Cooling radius ${it.coolRadius}`);
          if (it.decor) stats.push(`Vibes +${it.decor}`);
          if (it.power) stats.push(`Power ${fmt(it.power)}/hr`);
          det.append(h('b', {}, `${it.name} — ${fmt(it.cost)}`), h('div', { style: { margin: '2px 0', color: '#333' } }, it.desc), h('div', { style: { color: '#215dc6' } }, stats.join(' • ')));
        };
        buildRefresh = render;
        render();
        b.append(addr, cats, grid, det);
      },
      onClose: () => { buildRefresh = () => { }; },
    });
  }

  // ================================================================ MSN
  const msnLog = h('div', { class: 'msn-log' });
  const msnQueue: string[] = [];
  let msnTimer = 0;
  function msn(text: string, who: 'them' | 'me' | 'sys' = 'them') {
    const last = msnLog.lastElementChild as HTMLElement | null;
    const name = who === 'me' ? 'LAN LORD says:' : who === 'them' ? ADVISOR_NAME + ' says:' : '';
    if (who !== 'sys' && (!last || last.dataset.who !== who)) { const wh = h('div', { class: 'who' }, name); wh.dataset.who = who; msnLog.append(wh); }
    const l = h('div', { class: 'line' + (who === 'me' ? ' me' : who === 'sys' ? ' sys' : '') }, text); l.dataset.who = who;
    msnLog.append(l);
    while (msnLog.childElementCount > 120) msnLog.firstElementChild!.remove();
    msnLog.scrollTop = msnLog.scrollHeight;
  }
  function advisor(key: string) {
    const lines = ADVISOR[key]; if (!lines) return;
    const w = wm.wins.get('msn');
    const urgent = ['fire', 'death', 'outage', 'virus', 'broke', 'wotlk', 'inspector'].includes(key);
    if (urgent) { msn(`${ADVISOR_NAME} has just sent you a nudge!`, 'sys'); if (w) w.shake(); else { document.getElementById('gamearea')?.classList.remove('shake'); void document.getElementById('gamearea')?.offsetWidth; document.getElementById('gamearea')?.classList.add('shake'); } audio.sfx('nudge'); }
    else audio.sfx('msn');
    if (!w || w.minimized) toast(ADVISOR_NAME + ' says:', key === 'welcome' ? lines[0] + ' ' + (lines[1] || '') : lines.join(' '), urgent ? '📳' : '🦋');
    const send = key === 'welcome' ? lines : [lines[0], ...(lines.length > 1 && key !== 'chat' ? lines.slice(1) : [])];
    send.forEach(l => msnQueue.push(l));
    pumpMsn();
  }
  function pumpMsn() {
    if (msnTimer || !msnQueue.length) return;
    msnTimer = window.setTimeout(() => { msnTimer = 0; const t = msnQueue.shift(); if (t) msn(t); pumpMsn(); }, 650);
  }
  function openMSN() {
    return wm.open({
      id: 'msn', title: 'MSN Messenger — ' + ADVISOR_NAME, icon: '🦋', x: W() - rightW - 10, y: 92, w: rightW, h: 380, resizable: true,
      build: (b, win) => {
        const inp = h('input', { placeholder: 'type a message... (u can say anything, they won\'t help)' }) as HTMLInputElement;
        const send = () => {
          const v = inp.value.trim(); if (!v) return; inp.value = ''; msn(v, 'me'); audio.sfx('click');
          setTimeout(() => {
            const low = v.toLowerCase();
            let r = ADVISOR.chat[Math.floor(Math.random() * ADVISOR.chat.length)];
            if (low.includes('help')) r = 'protip: routers near PCs, AC near XTREME towers, toilets EVERYWHERE. ur welcome';
            else if (low.includes('money') || low.includes('$')) r = 'raise prices in Control Panel lol. or host a tournament. or sell a kidney';
            else if (low.includes('fire')) r = 'fire = heat. heat = too many PCs in a clump. AC fixes. or Dave the IT guy';
            else if (low.includes('lol')) r = 'lol';
            else if (low.includes('asl')) r = '14/m/ur moms house lol';
            msn(r); audio.sfx('msn');
          }, 900 + Math.random() * 1200);
        };
        inp.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') send(); });
        b.append(
          h('div', { class: 'msn-head' }, h('div', { class: 'av' }, '😈'), h('div', {}, h('div', { class: 'nm' }, ADVISOR_NAME + ' (Online)'), h('div', { class: 'ps' }, '♫ ur cafe is my life ♫ — listening to: DORUDE - DUNESTORM'))),
          msnLog,
          h('div', { class: 'msn-in' }, inp, h('button', { class: 'xpbtn', onclick: send }, 'Send'), h('button', { class: 'xpbtn', style: { minWidth: '40px' }, onclick: () => { msn('You have just sent a nudge!', 'sys'); win.shake(); audio.sfx('nudge'); setTimeout(() => { msn('WHAT. im busy lol'); audio.sfx('msn'); }, 1200); } }, '📳')),
        );
        msnLog.scrollTop = msnLog.scrollHeight;
      },
    });
  }

  // ================================================================ FINANCE (Excel)
  function openFinance() {
    return wm.open({
      id: 'fin', title: 'Microsoft Excel — Finances.xls', icon: '📊', x: leftX() + 60, y: 40, w: 560, h: 560, resizable: true,
      build: (b, win) => {
        const wrap = h('div', { class: 'xl-wrap' });
        const chart = h('canvas', { width: 1040, height: 300, style: { width: '520px', height: '150px', display: 'block', margin: '6px auto' } }) as HTMLCanvasElement;
        const loanTxt = h('span', { style: { marginLeft: '6px' } });
        b.append(
          h('div', { class: 'xl-fx' }, h('div', { class: 'cell' }, 'B2'), 'fx', h('div', { class: 'f' }, '=SUM(MONEY)-SUM(REGRET)')),
          wrap,
          h('div', { class: 'toolbar' }, h('button', { class: 'xpbtn', onclick: () => { g.sim.borrow(); upd(); balloon('Mom wired $5,000', 'She says "this is the LAST time" (it is not).', '👩'); } }, '👩 Borrow $5,000 from Mom'), h('button', { class: 'xpbtn', onclick: () => { g.sim.repay(); upd(); } }, 'Repay $1,000'), loanTxt),
          h('div', { class: 'xl-tabs' }, h('span', { class: 'on' }, 'Money'), h('span', {}, 'Sheet2'), h('span', {}, 'secret_plans')),
        );
        const upd = () => {
          const s = g.sim;
          const cats = ['PC Time', 'Drinks', 'Food', 'Events', 'Sales', 'Loans', 'Construction', 'Electricity', 'Rent', 'Wages', 'Research', 'Repairs', 'Fines', 'Interest'];
          let row = 1;
          const rows: HTMLElement[] = [];
          const tr = (cls: string, cells: (string | [string, string])[]) => h('tr', { class: cls }, h('td', { class: 'rn' }, String(row++)), cells.map(c => Array.isArray(c) ? h('td', { class: c[1] }, c[0]) : h('td', {}, c)));
          rows.push(tr('hd', ['Category', 'Today', 'Yesterday']));
          let tt = 0, ty = 0;
          for (const c of cats) {
            const a = s.ledgerToday[c] || 0, y = s.ledgerYesterday[c] || 0; tt += a; ty += y;
            if (!a && !y) continue;
            rows.push(tr('', [c, [fmt(a), 'num ' + (a >= 0 ? 'pos' : 'neg')], [fmt(y), 'num ' + (y >= 0 ? 'pos' : 'neg')]]));
          }
          rows.push(tr('tot', ['NET PROFIT', [fmt(tt), 'num ' + (tt >= 0 ? 'pos' : 'neg')], [fmt(ty), 'num ' + (ty >= 0 ? 'pos' : 'neg')]]));
          rows.push(tr('', ['Cash on hand', [fmt(s.money), 'num'], '']));
          rows.push(tr('', ['Owed to Mom', [fmt(s.debt), 'num neg'], '']));
          rows.push(tr('', ['Staff wages/day', [fmt(s.wages()), 'num'], '']));
          const tbl = h('table', { class: 'xl' }, h('tr', {}, h('th', {}, ''), h('th', {}, 'A'), h('th', {}, 'B'), h('th', {}, 'C')), rows);
          wrap.innerHTML = ''; wrap.append(tbl, h('div', { style: { padding: '4px 8px', fontFamily: 'Arial', fontWeight: 'bold', color: '#333' } }, 'Cash over time (last 7 days, hourly)'), chart);
          loanTxt.textContent = s.debt ? `Debt: ${fmt(s.debt)} (0.1%/hr interest)` : 'Debt free!';
          drawChart(chart, s.cashHistory);
        };
        win.opts.update = throttle(upd, 1000);
        upd();
      },
    });
  }
  function drawChart(c: HTMLCanvasElement, data: number[]) {
    const ctx = c.getContext('2d')!; const w = c.width, hh = c.height;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, hh);
    if (data.length < 2) return;
    const min = Math.min(0, ...data), max = Math.max(...data) * 1.1 + 1;
    ctx.strokeStyle = '#ddd'; ctx.lineWidth = 1; ctx.font = '18px Arial'; ctx.fillStyle = '#555';
    for (let i = 0; i <= 4; i++) { const y = 20 + (hh - 40) * i / 4; ctx.beginPath(); ctx.moveTo(90, y); ctx.lineTo(w - 10, y); ctx.stroke(); ctx.fillText(fmt(max - (max - min) * i / 4), 2, y + 6); }
    const zy = 20 + (hh - 40) * (max - 0) / (max - min);
    ctx.strokeStyle = '#c00'; ctx.beginPath(); ctx.moveTo(90, zy); ctx.lineTo(w - 10, zy); ctx.stroke();
    ctx.beginPath();
    data.forEach((v, i) => { const x = 90 + (w - 100) * i / (data.length - 1); const y = 20 + (hh - 40) * (max - v) / (max - min); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = '#1f3fbf'; ctx.lineWidth = 4; ctx.stroke();
    ctx.lineTo(w - 10, zy); ctx.lineTo(90, zy); ctx.closePath(); ctx.fillStyle = 'rgba(80,120,255,0.15)'; ctx.fill();
  }

  // ================================================================ CONTROL PANEL (prices + volume)
  function openControl() {
    return wm.open({
      id: 'ctl', title: 'Control Panel — Prices & Settings', icon: '⚙️', x: leftX() + 100, y: 90, w: 430, noMax: true,
      build: (b, win) => {
        const s = g.sim;
        const op: Record<string, HTMLElement> = {};
        const slider = (label: string, key: 'rate' | 'drinkPrice' | 'foodPrice', min: number, max: number, suffix: string) => {
          const v = h('span', { class: 'v' }, '$' + s[key] + suffix);
          const inp = h('input', { type: 'range', min, max, step: 1, value: s[key] }) as HTMLInputElement;
          inp.addEventListener('input', () => { s[key] = +inp.value; v.textContent = '$' + inp.value + suffix; upd(); });
          op[key] = h('div', { class: 'opinion' });
          return [h('div', { class: 'cp-row' }, h('label', {}, label), inp, v), op[key]];
        };
        const vol = (label: string, fn: (v: number) => void, init: number) => {
          const inp = h('input', { type: 'range', min: 0, max: 100, value: init }) as HTMLInputElement;
          inp.addEventListener('input', () => fn(+inp.value / 100));
          return h('div', { class: 'cp-row' }, h('label', {}, label), inp);
        };
        const upd = () => {
          const parts = ARCHES.map(a => {
            const will = a.will * (0.7 + s.rating * 0.1);
            const r = s.rate / will;
            return `${a.label.split(' ')[0]}: ${r > 1.6 ? '🤬 NOPE' : r > 1 ? '😒 pricey' : r > 0.6 ? '🙂 fair' : '🤑 steal'}`;
          });
          op.rate.textContent = parts.join(' · ');
          op.drinkPrice.textContent = s.drinkPrice > 6 ? 'Gamers will pay anything for caffeine. Anything.' : 'Cheap caffeine = happy hearts (racing at 200bpm)';
          op.foodPrice.textContent = s.foodPrice > 7 ? 'That\'s a lot for a frozen-lava pocket' : 'Delicious, affordable, nuclear';
        };
        b.append(h('div', { style: { padding: '8px 12px' } },
          h('fieldset', { class: 'xp' }, h('legend', {}, '💲 Pricing'), slider('PC rate (per hour)', 'rate', 1, 15, '/hr'), slider('LIQUID DIABETES™', 'drinkPrice', 1, 10, ''), slider('Hot Pocket', 'foodPrice', 1, 10, '')),
          h('fieldset', { class: 'xp' }, h('legend', {}, '🔊 Sounds and Audio Devices'), vol('Music volume', audio.setMusicVolume, 32), vol('Sound effects', audio.setSfxVolume, 55)),
          h('div', { style: { color: '#666', marginTop: '6px' } }, 'Tip: higher PC tiers + better rating = gamers accept higher prices.'),
        ), h('div', { class: 'dlg-btns' }, h('button', { class: 'xpbtn', onclick: () => wm.close('ctl') }, 'OK')));
        upd();
      },
    });
  }

  // ================================================================ WINAMP
  function openWinamp() {
    return wm.open({
      id: 'winamp', title: 'WINAMP', icon: '⚡', x: leftX() + 30, y: H() - 330, w: 300, h: 300, cls: 'winamp', noMax: true,
      build: (b, win) => {
        const time = h('div', { class: 'wa-lcd wa-time' }, '0:00');
        const title = h('div', { class: 'wa-title' }, h('span', {}, '*** LAN LORD RADIO ***'));
        const viz = h('canvas', { width: 150, height: 32, style: { width: '150px', height: '32px', background: '#000' } }) as HTMLCanvasElement;
        const pl = h('div', { class: 'wa-pl' });
        const renderPl = () => { pl.innerHTML = ''; audio.TRACKS.forEach((t, i) => (t.title.startsWith('Prologue') || t.title.startsWith("Professor")) ? null : pl.append(h('div', { class: (audio.currentTrack === i ? 'on' : '') + ((t as any).downloaded ? ' dl' : ''), title: (t as any).downloaded ? 'downloaded from LimeWire' : '', ondblclick: () => { audio.playTrack(i); renderPl(); }, onclick: () => { audio.playTrack(i); renderPl(); } }, `${i + 1}. ${t.title.replace(/\.(mp3|wma)$/, '')}  (${t.length})`))); };
        const play = (i: number) => { audio.initAudio(); audio.playTrack((i + audio.TRACKS.length) % audio.TRACKS.length); renderPl(); };
        const vol = h('input', { type: 'range', class: 'wa-vol', min: 0, max: 100, value: 32, oninput: (e: any) => audio.setMusicVolume(+e.target.value / 100) });
        b.append(h('div', { class: 'wa-main' },
          h('div', { class: 'wa-row' }, time, h('div', { class: 'wa-lcd wa-info' }, title, h('div', { class: 'wa-kbps' }, h('b', {}, '128'), 'kbps ', h('b', {}, '44'), 'kHz ', 'stereo'), viz)),
          h('div', { class: 'wa-row', style: { alignItems: 'center' } }, h('div', { class: 'wa-btns' },
            h('button', { title: 'Prev', onclick: () => play((audio.currentTrack < 0 ? 0 : audio.currentTrack) - 1) }, '⏮'),
            h('button', { title: 'Play', onclick: () => play(audio.currentTrack < 0 ? 0 : audio.currentTrack) }, '▶'),
            h('button', { title: 'Stop', onclick: () => { audio.stopMusic(); renderPl(); } }, '⏹'),
            h('button', { title: 'Next', onclick: () => play(audio.currentTrack + 1) }, '⏭')), h('span', { style: { color: '#ccc', fontSize: '9px', margin: '0 4px' } }, 'VOL'), vol),
        ), pl);
        renderPl();
        window.addEventListener('lanlord-playlist', () => { if (wm.wins.get('winamp')) renderPl(); });
        const vctx = viz.getContext('2d')!;
        const data = new Uint8Array(32);
        win.opts.update = () => {
          const tr = audio.currentTrack >= 0 ? audio.TRACKS[audio.currentTrack] : null;
          const sp = title.firstChild as HTMLElement;
          const want = tr ? `${audio.currentTrack + 1}. ${tr.title} (${tr.length}) *** ` : '*** LAN LORD RADIO — press ▶ *** ';
          if (sp.textContent !== want) sp.textContent = want;
          const el = audio.musicElapsed(); time.textContent = `${Math.floor(el / 60)}:${String(Math.floor(el % 60)).padStart(2, '0')}`;
        };
        const loop = () => {
          if (!wm.wins.get('winamp')) return;
          vctx.fillStyle = '#000'; vctx.fillRect(0, 0, 150, 32);
          if (audio.analyser && audio.musicPlaying()) audio.analyser.getByteFrequencyData(data); else data.fill(0);
          for (let i = 0; i < 19; i++) {
            const v = data[i] / 255 * 32;
            const gr = vctx.createLinearGradient(0, 32, 0, 0); gr.addColorStop(0, '#00c000'); gr.addColorStop(0.6, '#e0e000'); gr.addColorStop(1, '#ff2000');
            vctx.fillStyle = gr; vctx.fillRect(i * 8, 32 - v, 6, v);
          }
          requestAnimationFrame(loop);
        };
        loop();
      },
    });
  }

  // ================================================================ CAFÉSPACE (MySpace in IE)
  let csDirty = true; let csLastCount = -1;
  function ieChrome(b: HTMLElement, url: string) {
    b.append(h('div', { class: 'toolbar' }, h('button', { class: 'tbb' }, '⬅️ Back'), h('button', { class: 'tbb' }, '➡️'), h('button', { class: 'tbb' }, '🔄'), h('button', { class: 'tbb' }, '🏠'), h('div', { class: 'sep' }), h('button', { class: 'tbb' }, '⭐ Favorites')),
      h('div', { class: 'addr' }, 'Address', h('div', { class: 'box' }, '🌐 ' + url), h('button', { class: 'xpbtn', style: { minWidth: '30px' } }, 'Go')));
  }
  function openCafeSpace() {
    return wm.open({
      id: 'cs', title: 'CaféSpace.com | LAN LORD\'s Profile — Microsoft Internet Explorer', icon: '🌐', x: leftX() + 40, y: 20, w: 680, h: H() - 60, resizable: true,
      build: (b, win) => {
        ieChrome(b, 'http://www.cafespace.com/lanlord');
        const page = h('div', { class: 'ie-page' });
        b.append(page);
        const render = () => {
          const s = g.sim;
          page.innerHTML = '';
          const top8 = Object.entries(s.regulars).sort((a, b) => b[1].spent - a[1].spent).slice(0, 8);
          page.append(h('div', { class: 'ms-page' },
            h('div', { class: 'ms-top' }, h('span', { class: 'logo' }, 'Café', h('i', {}, 'Space'), '.com'), h('span', { class: 'beta' }, 'BETA'), h('span', { style: { flex: 1, fontSize: '10px' } }, 'a place for friends... and gamers'), h('span', { class: 'blink', style: { color: '#ff0' } }, '★ NEW! ★')),
            h('div', { class: 'ms-nav' }, ['Home', 'Browse', 'Search', 'Invite', 'Rank', 'Mail', 'Blog', 'Favorites', 'Forum', 'Groups', 'Events', 'Videos', 'Music'].map(n => h('span', {}, n))),
            h('div', { class: 'ms-body' },
              h('div', { class: 'ms-left' },
                h('div', { class: 'glitter' }, `~*${g.meta.profile?.shop || 'LAN LORD'}*~`),
                h('div', { style: { display: 'flex', gap: '8px', margin: '6px 0' } }, h('div', { style: { fontSize: '60px', background: '#000', border: '2px solid #6699cc', width: '90px', textAlign: 'center' } }, '🖥️'),
                  h('div', {}, '"rawr XD"', h('br'), 'Café', h('br'), 'Tri-County, USA', h('br'), h('br'), h('span', { style: { color: '#090', fontWeight: 'bold' } }, '● Online Now!'))),
                h('div', { class: 'ms-box' }, h('div', { class: 'h' }, 'Café Rating'), h('div', { class: 'c', style: { fontSize: '20px', color: '#f90' } }, stars(s.rating), h('span', { style: { fontSize: '13px', color: '#036' } }, ` ${s.rating.toFixed(2)}/5`))),
                h('div', { class: 'ms-box' }, h('div', { class: 'h' }, 'LAN LORD\'s Details'), h('div', { class: 'c' },
                  h('div', {}, h('b', {}, 'Status: '), 'Open 24/7'), h('div', {}, h('b', {}, 'Here for: '), 'Networking, Fragging'), h('div', {}, h('b', {}, 'Mood: '), s.rating > 4 ? '😎 legendary' : s.rating > 3 ? '😈 chaotic' : s.rating > 2 ? '😬 crispy' : '💀 on fire (literally)'),
                  h('div', {}, h('b', {}, 'Served: '), String(s.served), ' gamers'), h('div', {}, h('b', {}, 'Turned away: '), String(s.turnedAway)), h('div', {}, h('b', {}, 'Deaths: '), String(s.deaths), ' (oops)'))),
                h('div', { class: 'ms-box' }, h('div', { class: 'h or' }, 'Now Playing ♫'), h('div', { class: 'c' }, audio.currentTrack >= 0 ? audio.TRACKS[audio.currentTrack].title : 'nothing :( open Winamp')),
                h('div', { style: { textAlign: 'center' } }, h('img', { alt: '', src: 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="200" height="30"><rect width="200" height="30" fill="#ffcc00" stroke="#000"/><text x="100" y="20" text-anchor="middle" font-family="Arial" font-weight="bold" font-size="13">🚧 UNDER CONSTRUCTION 🚧</text></svg>') })),
              ),
              h('div', { class: 'ms-right' },
                h('div', { class: 'ms-box' }, h('div', { class: 'h or' }, 'LAN LORD is in your extended network'), h('div', { class: 'c' }, 'Latest blog entry: ', h('span', { style: { color: '#036', textDecoration: 'underline' } }, 'why is there a llama in my cafe (view more)'))),
                h('div', { class: 'ms-box' }, h('div', { class: 'h' }, `LAN LORD's Friend Space — Top 8`), h('div', { class: 'c' },
                  h('div', { style: { marginBottom: '6px' } }, h('b', {}, 'LAN LORD has '), h('span', { style: { color: '#c00', fontWeight: 'bold' } }, String(Object.keys(s.regulars).length)), h('b', {}, ' friends.')),
                  top8.length ? h('div', { class: 'top8' }, top8.map(([n, r]) => h('div', { class: 'f' }, avatar(r.look, 52), n, h('br'), h('span', { style: { color: '#090' } }, fmt(r.spent))))) : h('div', {}, 'no friends yet. :( (customers who leave become friends)'),
                )),
                h('div', { class: 'ms-box' }, h('div', { class: 'h' }, `LAN LORD's Friends Comments`), h('div', { class: 'c' },
                  h('div', { style: { marginBottom: '4px' } }, `Displaying ${Math.min(25, s.reviews.length)} of ${s.reviews.length} comments`),
                  s.reviews.slice(0, 25).map((r, i) => h('div', { class: 'cmt' + (i === 0 && csLastCount >= 0 ? ' new' : '') }, avatar(r.look, 44), h('div', {}, h('div', {}, h('span', { class: 'who' }, r.name), ' ', h('span', { class: 'dt' }, r.date)), h('div', { class: 'st' }, stars(r.stars)), h('div', {}, r.text)))),
                )),
              ),
            ),
          ));
          csLastCount = s.reviews.length;
        };
        win.opts.update = throttle(() => { if (csDirty) { csDirty = false; const st = page.scrollTop; render(); page.scrollTop = st; } }, 1500);
        csDirty = false; render();
      },
    });
  }
  function reviewsChanged() { csDirty = true; }

  // ================================================================ CRAIGZLIST (staff)
  function openCraigs() {
    return wm.open({
      id: 'craigs', title: 'craigzlist: tri-county > jobs wanted — Microsoft Internet Explorer', icon: '📰', x: leftX() + 80, y: 60, w: 560, h: 430, resizable: true,
      build: (b, win) => {
        ieChrome(b, 'http://tricounty.craigzlist.org/jobs-wanted/');
        const page = h('div', { class: 'ie-page' });
        b.append(page);
        const render = () => {
          const s = g.sim;
          page.innerHTML = '';
          const post = (kind: 'janitor' | 'tech' | 'bouncer', title: string, desc: string, wage: number, locked: boolean) => h('div', { class: 'cl-post' },
            h('div', { style: { fontSize: '28px' } }, kind === 'janitor' ? '🧹' : kind === 'tech' ? '🤓' : '🦍'),
            h('div', { class: 't' }, h('span', { class: 'lnk' }, title), ` - $${wage}/day`, h('small', {}, desc), h('small', {}, `Currently employed: ${s.staffHired[kind]}`)),
            locked ? h('span', { style: { color: '#c00' } }, '🔒 needs Bouncer License (Windows Update)') :
              h('div', { style: { display: 'flex', gap: '4px' } }, h('button', { class: 'xpbtn', onclick: () => { s.hire(kind); render(); balloon('New hire!', `${title.split(':')[0]} has joined your café.`, '🤝'); } }, 'Hire'), h('button', { class: 'xpbtn', disabled: s.staffHired[kind] === 0 ? 'disabled' : undefined, onclick: () => { s.fire_(kind); render(); } }, 'Fire')),
          );
          page.append(h('div', { class: 'cl-page' },
            h('h2', {}, 'craigzlist'), h('div', { style: { marginBottom: '8px' } }, h('span', { class: 'lnk' }, 'tri-county'), ' > ', h('span', { class: 'lnk' }, 'jobs wanted'), ' > ', h('b', {}, 'LAN cafe staff (desperate)')),
            post('janitor', 'Janitor: will mop anything. ANYTHING.', 'Cleans puddles, pizza boxes, scorch marks. Does not ask questions. Has seen things.', 80, false),
            post('tech', 'IT Guy: fixes PCs, puts out fires, judges you', 'Repairs smashed keyboards, extinguishes fires, removes LimeWire viruses. Says "I use Linux btw".', 150, false),
            post('bouncer', 'Bouncer: escorts people out. gently. mostly.', 'Removes ragers BEFORE they smash a keyboard. Bench-presses gamers. Size: yes.', 120, !s.researched.r_bouncer),
            h('div', { style: { marginTop: '12px', fontSize: '12px', color: '#555' } }, 'Wages are paid at midnight. Staff do not sleep. Staff are fine. Do not check on the staff.'),
          ));
        };
        render();
      },
    });
  }

  // ================================================================ WINDOWS UPDATE (research)
  function openUpdate() {
    return wm.open({
      id: 'upd', title: 'Windows Update — Microsoft Internet Explorer', icon: '🛡️', x: leftX() + 50, y: 30, w: 580, h: H() - 80, resizable: true,
      build: (b, win) => {
        ieChrome(b, 'http://windowsupdate.macrohard.com/lanlord/');
        const page = h('div', { class: 'ie-page' });
        b.append(page);
        let last = '';
        const render = () => {
          const s = g.sim;
          const sig = JSON.stringify([s.researched, s.researching?.id, Math.floor(s.money / 500)]);
          if (sig === last) { const p = page.querySelector('.xpprog > div') as HTMLElement | null; if (p && s.researching) p.style.width = (s.researching.progress * 100) + '%'; return; }
          last = sig;
          page.innerHTML = '';
          page.append(h('div', { class: 'wu-ban' }, h('div', { class: 'lg' }, '🛡️'), h('div', {}, h('h3', {}, 'Windows Update'), h('div', {}, 'Keep your café secure, XTREME, and only occasionally on fire.'))));
          if (s.researching) {
            const r = RESEARCH.find(x => x.id === s.researching!.id)!;
            page.append(h('div', { class: 'wu-prog' }, h('b', {}, `Installing update 1 of 1: ${r.name} (${r.kb})...`), h('div', { style: { margin: '6px 0' } }, h('div', { class: 'xpprog' }, h('div', { style: { width: (s.researching.progress * 100) + '%' } }))), h('i', {}, 'Do not turn off your café. Do not unplug the router. Do not look directly at the progress bar.')));
          }
          const list = h('div', { class: 'wu-list' }, h('b', { style: { fontSize: '13px' } }, 'High-priority updates for LAN LORD XP'));
          for (const r of RESEARCH) {
            const done = !!s.researched[r.id];
            const req = r.requires && !s.researched[r.requires];
            list.append(h('div', { class: 'wu-item' + (done ? ' done' : '') },
              h('div', { style: { fontSize: '20px' } }, done ? '✅' : req ? '🔒' : '📦'),
              h('div', { class: 't' }, h('b', {}, `${r.name} (${r.kb})`), h('small', {}, r.desc), h('small', {}, `Download size: ${fmt(r.cost)} • Install time: ${r.hours} hours${req ? ' • Requires ' + RESEARCH.find(x => x.id === r.requires)!.kb : ''}`)),
              done ? h('span', { style: { color: '#080', fontWeight: 'bold' } }, 'Installed') :
                h('button', { class: 'xpbtn', disabled: (s.researching || req || s.money < r.cost) ? 'disabled' : undefined, onclick: () => { if (s.startResearch(r.id)) { audio.sfx('click'); balloon('Downloading update...', `${r.name} will finish in ${r.hours} in-game hours.`, '🛡️'); } } }, 'Install'),
            ));
          }
          page.append(list);
        };
        win.opts.update = throttle(render, 500);
        render();
      },
    });
  }

  // ================================================================ GOALS (Notepad)
  function openGoals() {
    return wm.open({
      id: 'goals', title: 'goals.txt — Notepad', icon: '📝', x: leftX() + 20, y: 80, w: 470, h: 380, resizable: true,
      build: (b, win) => {
        b.append(h('div', { class: 'menubar' }, ['File', 'Edit', 'Format', 'View', 'Help'].map(m => h('div', { class: 'mi' }, m))));
        const pad = h('div', { class: 'notepad' });
        b.append(pad);
        const renderGoals = () => {
          const s = g.sim; const gs = s.goals().map((x, i) => ({ ...x, done: x.done || s.goalsDone[i] }));
          const bar = (c: number, m: number) => { const n = Math.round(Math.min(1, c / m) * 20); return '[' + '#'.repeat(n) + '.'.repeat(20 - n) + ']'; };
          const got = s.goalsDone.filter(Boolean).length;
          pad.textContent =
            `=== ${s.L.chapter.toUpperCase()} ===
location: ${s.L.name} (${s.L.year})
written by: me (LAN LORD)

THE PLAN:
${s.loc === 0 ? 'make enough money to get out of mom\'s basement.' : s.loc === 4 ? 'become the LAN LORD. forever.' : 'get bigger. get badder. crush Bob.'}
get ★★ to MOVE UP (top bar). ★★★ = max Clout.

GOALS:
${gs.map((x, i) => `${x.done ? '[X]' : '[ ]'} ${'★'.repeat(i + 1)} ${x.label}${s.goalsDone[i] ? '  (ACHIEVED ✓)' : ''}
     ${bar(x.cur, x.max)} ${x.cur.toLocaleString()}/${x.max.toLocaleString()}`).join('\n\n')}

STARS EARNED: ${'★'.repeat(got)}${'☆'.repeat(3 - got)}   →  Clout if you move now: ${s.cloutEarned()} 😎

NOTES TO SELF:
- routers near PCs!!! no internet = riot
- PCs in a clump = HOT. hot = FIRE. buy AC
- 1 toilet is not enough. it is never enough
- weekends + evenings = busy
- Nov 13 = Wrath of the Lich King launch (!!!)
- do NOT google "llama in lan cafe"
- the guy in seat 4 hasnt moved since tuesday. check on him
${s.won ? '\n*** ALL 3 STARS. GO MOVE UP. ***\n' : ''}`;
        };
        win.opts.update = throttle(renderGoals, 1000);
        renderGoals();
      },
    });
  }

  // ================================================================ TASK MANAGER (top complaints)
  function openTaskMgr() {
    let tab = 0;
    return wm.open({
      id: 'tm', title: 'Windows Task Manager', icon: '📈', x: leftX() + 140, y: 70, w: 420, h: 420, resizable: true,
      build: (b, win) => {
        const tabs = h('div', { class: 'tabs' });
        const body = h('div', { class: 'tabbody' });
        const foot = h('div', { class: 'statusbar' });
        const names = ['Processes (Complaints)', 'Performance', 'Users'];
        const renderTabs = () => { tabs.innerHTML = ''; names.forEach((n, i) => tabs.append(h('span', { class: tab === i ? 'on' : '', onclick: () => { tab = i; renderTabs(); upd(); } }, n))); };
        b.append(tabs, body, foot);
        const upd = () => {
          const s = g.sim;
          body.innerHTML = '';
          const cust = s.customers();
          if (tab === 0) {
            const entries = Object.entries(s.thoughtCounts).sort((a, b) => b[1] - a[1]);
            const tot = entries.reduce((a, e) => a + e[1], 0) || 1;
            body.append(h('div', { style: { color: '#555', marginBottom: '4px' } }, 'What customers are thinking today (resets at midnight):'),
              h('table', { class: 'tm' }, h('tr', {}, h('th', {}, 'Image Name'), h('th', {}, 'User'), h('th', {}, 'CPU'), h('th', {}, 'Count')),
                entries.map(([k, v]) => h('tr', {}, h('td', {}, k + '.exe'), h('td', {}, ['ping', 'noNet', 'hot', 'smell', 'noToilet', 'accident', 'litter', 'virus', 'waitLong', 'price', 'rage', 'ragequit'].includes(k) ? '⚠️ PROBLEM' : 'SYSTEM'), h('td', {}, String(Math.round(v / tot * 99)).padStart(2, '0')), h('td', {}, String(v))))));
            if (!entries.length) body.append(h('div', { style: { padding: '10px', color: '#888' } }, 'No thoughts yet. Customers are thinking about nothing. As usual.'));
          } else if (tab === 1) {
            const pcs = s.objects.filter(o => s.isPC(o));
            const used = pcs.filter(o => o.user !== -1).length;
            const avgT = pcs.length ? pcs.reduce((a, o) => a + s.heat[o.y * s.W + o.x], 0) / pcs.length : 22;
            const ping = pcs.length ? pcs.reduce((a, o) => a + Math.min(o.ping, 999), 0) / pcs.length : 0;
            const avgH = cust.length ? cust.reduce((a, c) => a + (c.happy || 0), 0) / cust.length : 0;
            const meter = (label: string, v: number, max: number, txt: string, cls = '') => h('fieldset', { class: 'xp' }, h('legend', {}, label), h('div', { class: 'xpprog ' + cls }, h('div', { style: { width: Math.min(100, v / max * 100) + '%' } })), h('div', { style: { marginTop: '3px' } }, txt));
            body.append(
              meter('PC Usage', used, Math.max(1, pcs.length), `${used} / ${pcs.length} PCs in use`),
              meter('Avg PC Temperature', avgT - 15, 40, `${avgT.toFixed(1)}°C ${avgT > 42 ? '— 🔥 DANGER' : avgT > 35 ? '— toasty' : '— chill'}`, avgT > 42 ? 'red' : avgT > 35 ? 'yel' : ''),
              meter('Avg Ping', ping, 400, `${ping.toFixed(0)} ms`, ping > 200 ? 'red' : ping > 100 ? 'yel' : ''),
              meter('Avg Happiness', avgH, 100, `${avgH.toFixed(0)}% of customers' souls intact`, avgH < 35 ? 'red' : avgH < 60 ? 'yel' : ''),
              meter('Litter', s.litter.length, 20, `${s.litter.length} gross things on the floor`, s.litter.length > 8 ? 'red' : ''),
            );
          } else {
            body.append(h('table', { class: 'tm' }, h('tr', {}, h('th', {}, 'User'), h('th', {}, 'Type'), h('th', {}, 'Status'), h('th', {}, 'Mood')),
              s.agents.map(a => h('tr', { style: { cursor: 'pointer' }, onclick: () => g.selectAgent(a.id) }, h('td', {}, a.name), h('td', {}, a.kind === 'customer' ? ARCHES.find(x => x.id === a.arche)!.label : a.kind), h('td', {}, a.dead ? 'Not Responding' : a.state), h('td', {}, a.kind === 'customer' ? `${Math.round(a.happy || 0)}%` : '-')))));
          }
          foot.innerHTML = '';
          foot.append(h('div', { class: 'sp' }, `Processes: ${s.agents.length}`), h('div', { class: 'sp' }, `CPU Usage: ${Math.min(100, cust.length * 7)}%`), h('div', { class: 'sp', style: { flex: 1 } }, `Commit Charge: ${fmt(s.money)}`));
        };
        renderTabs();
        win.opts.update = throttle(upd, 1000);
        upd();
      },
    });
  }

  // ================================================================ PROPERTIES (inspector)
  function openProps() {
    const s = g.sim, ren = g.ren;
    const a = s.agent(ren.selectedAgent);
    const o = s.obj(ren.selectedObj);
    if (!a && !o) return;
    const ex = wm.wins.get('props');
    const pos = ex ? { x: ex.el.offsetLeft, y: ex.el.offsetTop } : { x: leftX() + 14, y: 120 };
    if (ex) wm.close('props');
    wm.open({
      id: 'props', title: a ? `Properties: ${a.name}` : `Properties: ${ITEM[o!.type].name}`, icon: a ? '👤' : '🖥️', x: pos.x, y: pos.y, w: 300, noMax: true,
      build: (b, win) => {
        const p = h('div', { class: 'props' });
        b.append(p);
        if (a) {
          const bars: Record<string, [HTMLElement, HTMLElement]> = {};
          const bar = (k: string, label: string) => { const fill = h('div', {}); const v = h('span', { class: 'v' }); bars[k] = [fill, v]; return h('div', { class: 'row' }, h('span', { class: 'k' }, label), h('div', { class: 'xpprog' }, fill), v); };
          const sub = h('div', { class: 'sub' });
          const th = h('div', { class: 'thoughts' });
          const stat = h('div', { style: { marginTop: '4px' } });
          const isC = a.kind === 'customer';
          p.append(h('div', { class: 'top' }, avatar(a.look, 54, a.kind), h('div', {}, h('div', { class: 'nm' }, a.name), sub)));
          if (isC) p.append(bar('happy', 'Happiness'), bar('rage', 'RAGE'), bar('hunger', 'Hunger'), bar('thirst', 'Thirst'), bar('bladder', 'Bladder'), bar('tired', 'Sleepy'), bar('hygiene', 'Hygiene'), stat, h('b', {}, 'Recent thoughts:'), th,
            h('div', { class: 'btns' }, h('button', { class: 'xpbtn', onclick: () => { s.febreze(a); win.opts.update!(); } }, '🧴 Febreze ($5)'), h('button', { class: 'xpbtn', onclick: () => { s.kick(a); win.opts.update!(); } }, '👢 Kick Out'), a.dead ? h('button', { class: 'xpbtn', onclick: () => { s.revive(a); win.opts.update!(); } }, '⚡ Revive ($50)') : null));
          else p.append(stat, th);
          win.opts.update = () => {
            const aa = s.agent(a.id);
            if (!aa) { sub.textContent = 'Left the building.'; return; }
            const label = isC ? ARCHES.find(x => x.id === aa.arche)!.label : ({ owner: `YOU! Owner, operator, degen (Degen level: ${g.meta.profile?.degen || '?'})`, mom: 'An Angry Mom', janitor: 'Janitor — $80/day', tech: 'IT Technician — $150/day', bouncer: 'Bouncer — $120/day', ghost: 'A Ghost (deceased gamer)', llama: 'Llama (unexplained)', inspector: 'Health Inspector' } as any)[aa.kind];
            sub.innerHTML = `${label}<br>Status: <b>${aa.dead ? 'NOT RESPONDING' : aa.state}</b>`;
            if (isC) {
              const set = (k: string, v: number, inv = false) => { const [f, t] = bars[k]; f.style.width = v + '%'; t.textContent = Math.round(v) + '%'; f.parentElement!.className = 'xpprog ' + ((inv ? v < 30 : v > 75) ? 'red' : (inv ? v < 55 : v > 50) ? 'yel' : ''); };
              set('happy', aa.happy!, true); set('rage', aa.rage!); set('hunger', aa.hunger!); set('thirst', aa.thirst!); set('bladder', aa.bladder!); set('tired', aa.tired!); set('hygiene', aa.hygiene!, true);
              stat.innerHTML = `💵 Wallet: <b>${fmt(aa.cash!)}</b> &nbsp; Spent: <b>${fmt(aa.spent!)}</b><br>🎮 Played: <b>${Math.floor(aa.played! / 60)}h ${aa.played! % 60}m</b> of ${Math.floor(aa.wantMin! / 60)}h planned${aa.marathon ? ' <span style="color:#c00">(MARATHON — has not slept)</span>' : ''}`;
              th.innerHTML = (aa.log || []).map(l => `💭 ${l}`).join('<br>') || '<i>(blank stare)</i>';
            } else { stat.textContent = ''; th.innerHTML = aa.thought ? '💬 ' + aa.thought.text : '<i>...</i>'; }
          };
        } else if (o) {
          const def = ITEM[o.type];
          const info = h('div', {});
          const btns = h('div', { class: 'btns' });
          p.append(h('div', { class: 'top' }, itemIcon(ren, o.type, 54), h('div', {}, h('div', { class: 'nm' }, def.name), h('div', { class: 'sub' }, def.file))), info, h('div', { style: { marginTop: '6px', color: '#555', fontStyle: 'italic' } }, def.desc), btns);
          let lastSig = '';
          win.opts.update = () => {
            const oo = s.obj(o.id);
            if (!oo) { info.textContent = 'This object no longer exists. It has moved on.'; btns.innerHTML = ''; return; }
            const t = s.heat[oo.y * s.W + oo.x];
            const user = oo.user >= 0 ? s.agent(oo.user) : null;
            let html = `🌡️ Temperature: <b style="color:${t > 46 ? '#c00' : t > 38 ? '#c80' : '#080'}">${t.toFixed(1)}°C</b>${t > 46 ? ' — FIRE RISK!' : ''}<br>`;
            if (def.quality) html += `📶 Ping: <b>${oo.ping >= 999 ? 'NO CONNECTION' : oo.ping + ' ms'}</b><br>👤 User: <b>${user ? user.name : 'nobody'}</b><br>`;
            if (def.routerCap) html += `📡 Capacity: ${def.routerCap * (s.researched.r_fiber ? 1.5 : 1)} gamers • Range: ${def.routerRadius} tiles<br>👥 Connected: ${s.objects.filter(q => q.routerId === oo.id && q.user !== -1).length}<br>`;
            html += `Status: <b>${oo.fire > 0 ? '🔥 ON FIRE' : oo.burnt ? '⚫ Charcoal' : oo.broken ? '🔧 Broken' : oo.infected ? '☠️ Infected (LimeWire)' : '✅ OK'}</b>`;
            info.innerHTML = html;
            const sig = [oo.fire > 0, oo.broken, oo.infected].join();
            if (sig !== lastSig) {
              lastSig = sig; btns.innerHTML = '';
              if (oo.fire > 0) btns.append(h('button', { class: 'xpbtn', onclick: () => { s.extinguish(oo); lastSig = ''; win.opts.update!(); } }, '🧯 Extinguish ($100)'));
              if (oo.broken && !oo.fire) btns.append(h('button', { class: 'xpbtn', onclick: () => { s.repair(oo); lastSig = ''; win.opts.update!(); } }, '🔧 Call Geek Platoon ($75)'));
              if (oo.infected) {
                const n = s.infectedPCs().length;
                btns.append(h('button', { class: 'xpbtn', onclick: () => { s.format(oo); lastSig = ''; win.opts.update!(); } }, '💾 Format C: ($20)'));
                if (n > 1) btns.append(h('button', { class: 'xpbtn', onclick: () => { s.formatAll(); lastSig = ''; win.opts.update!(); } }, `💾 Format ALL infected (${n} × $15)`));
              }
              btns.append(h('button', { class: 'xpbtn', onclick: () => { s.removeObj(oo, true); audio.sfx('sell'); wm.close('props'); } }, `♻️ Sell (${fmt(def.cost / 2)})`));
            }
          };
        }
        win.opts.update!();
      },
      onClose: () => { g.ren.selectedAgent = -1; g.ren.selectedObj = -1; },
    });
  }

  // ================================================================ misc windows
  function openTourney() {
    const c = g.sim.canTourney();
    dialog('Tournament.exe', '🏆', `<b>HOST A LAN TOURNAMENT?</b><br><br>• Costs $500 (prize pool)<br>• Lasts 6 hours<br>• 3× customers, mostly Pro Gamers (Self-Proclaimed)<br>• $15 entry fee per player<br>• +RAGE, +HYPE, +fire risk<br><br>${c.ok ? '<span style="color:#080">✔ Ready to go!</span>' : '<span style="color:#c00">✖ ' + c.reason + '</span>'}`,
      c.ok ? [{ label: '🏆 START!', fn: () => g.sim.startTourney() }, { label: 'Cancel' }] : [{ label: 'OK' }], 'tourney');
  }
  function openMyComputer() {
    const s = g.sim;
    dialog('System Properties', '🖥️', `<b>LAN LORD XP Professional</b><br>Version 2002 Service Pack 2<br><br>Registered to: <b>LAN LORD</b><br>Computer: Pentium 4 @ 2.4GHz (it's hot)<br>512 MB of RAM (download more)<br><br>
      <b>Café Lifetime Stats</b><br>Gamers served: ${s.served}<br>Peak crowd: ${s.peakCustomers}<br>Fires: ${s.stats.fires} 🔥<br>Keyboards smashed: ${s.stats.smashes}<br>"Accidents": ${s.stats.accidents}<br>Deaths: ${s.deaths} 👻<br>Customers turned away: ${s.turnedAway}`, [{ label: 'OK' }], 'mycomp');
  }
  function openAbout() {
    dialog('About LAN LORD', '🎮', `<b>LAN LORD XP</b> v${GAME_VERSION}<br>A fully absurd 2004–2012 LAN café tycoon.<br>An <b>open-source community build</b> — made by a human, an AI dev team, and you.<br><br><a href="${REPO_URL}" target="_blank">Source code on GitHub</a> · <a href="${PLAY_URL}" target="_blank">Play link</a><br><br>© 2004 Macrohard Entertainment (not a real company).<br>All music is original. No llamas were harmed. One was confused.`, [{ label: '📮 Dev Notes', fn: () => openFeedback() }, { label: '🐦 Share', fn: () => shareOnX() }, { label: 'OK' }], 'about');
  }
  function openHelp() {
    wm.open({
      id: 'help', title: 'Help and Support Center', icon: '❓', x: leftX() + 60, y: 40, w: 520, h: 480, resizable: true,
      build: (b) => {
        b.append(h('div', { class: 'wu-ban', style: { background: 'linear-gradient(to right,#0b3a91,#3b77d2)' } }, h('div', { class: 'lg' }, '❓'), h('div', {}, h('h3', {}, 'Help and Support'), h('div', {}, 'How to become the LAN LORD'))),
          h('div', { class: 'notepad', style: { fontFamily: 'Tahoma', fontSize: '12px' } },
            `🎮 THE BASICS
• Gamers walk in, find a free PC, play, and pay your hourly rate.
• Open "Build Stuff" (B) → click an item → click the floor. R rotates. Right-click cancels. Shift = keep placing.
• Every PC needs a seat spot (blue tile) and a ROUTER in range. Check the WiFi overlay (N).

🔥 HEAT
• Running PCs make heat. Clumped PCs make LOTS of heat. Above ~46°C things catch fire.
• Use the Heat overlay (H). AC units cool a radius. Click fires to extinguish ($100) or hire an IT guy.

📶 PING
• Each router handles a limited number of gamers. Overloaded = lag = RAGE.
• Rage hits 100% → keyboard SMASH. Bouncers (research) escort ragers out first.

🚽 NEEDS
• Gamers get hungry, thirsty, sleepy, smelly, and need the toilet. Provide fridges, Hot Pocket machines, toilets, couches, showers.
• No toilet = "accidents". Litter = sad. Hire a janitor.

💰 MONEY
• Set prices in Control Panel. Watch Finances.xls. Borrow from Mom if broke.
• Research upgrades in Windows Update. Hire staff on craigzlist.
• Host tournaments (needs 8 working PCs) for big crowds.

⭐ WIN: complete the 3 goals in goals.txt.

⌨️ KEYS: WASD/arrows pan • wheel zoom • Space pause • 1/2/3 speed • H heat • N wifi • B build • Del sell • Esc cancel
🖱️ Click a person or object to inspect it. Right-drag or middle-drag to pan.`));
      },
    });
  }

  // ---------------- tray clock + money
  setInterval(() => {
    const s = g.sim; const d = s.date();
    trayMoney.textContent = fmt(s.money);
    trayMoney.style.color = s.money < 0 ? '#ffb3b3' : '#fff';
    trayClock.textContent = `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
    gameUpdate();
    wm.updateAll();
  }, 250);

  // ---------------- clippy-esque paperclip on desktop
  const clip = h('div', { class: 'paperclip', title: 'Clippy\'s cousin, Clipboy' }, '📎');
  const tips = ['It looks like you\'re running a LAN café. Would you like help setting something on fire?', 'Did you know? 1 toilet per 6 gamers prevents 94% of "accidents".', 'Tip: Gamers rage harder when the ping is above 200ms. So does Clipboy.', 'Have you tried turning the café off and on again?', 'It looks like you\'re broke. Would you like to call Mom?'];
  let clipB: HTMLElement | null = null;
  clip.addEventListener('click', () => { clipB?.remove(); clipB = h('div', { class: 'clipbubble', onclick: () => { clipB?.remove(); clipB = null; } }, tips[Math.floor(Math.random() * tips.length)]); clipB.style.left = (parseInt(clip.style.left) - 210) + 'px'; clipB.style.top = (parseInt(clip.style.top) - 30) + 'px'; desk.append(clipB); audio.sfx('balloon'); });
  const placeClip = () => { clip.style.left = (W() - 60) + 'px'; clip.style.top = (H() - 70) + 'px'; };
  void placeClip;

  // ---------------- initial layout
  openGame();

  return {
    wm, msn, advisor, balloon, dialog, openProps, reviewsChanged, toast, showStory, openMoveUp, openHallOfFame,
    buildCategory: (cat: string) => { buildCat = cat as any; if (!wm.wins.get('build')) openBuild(); else buildRefresh(); },
    hover: (t: string) => { hoverSpan.textContent = t; },
    toolHint: (t: string) => { toolHintEl.textContent = t; toolHintEl.style.display = t ? 'block' : 'none'; },
    bumpMoney, refreshBuild: () => buildRefresh(), openBuild: () => { wm.toggle('build', openBuild); }, setOverlay,
  };
}

function throttle(fn: () => void, ms: number) { let last = 0; return () => { const n = performance.now(); if (n - last >= ms) { last = n; fn(); } }; }

// ---------------------------------------------------------------- Boot + Welcome screens
export function bootSequence(done: () => void, userName = 'LAN LORD', isNew = false) {
  const boot = h('div', { id: 'boot' },
    h('div', { class: 'xp-logo' }, h('div', { class: 'xp-flag' }, h('i', { style: { background: '#f65314' } }), h('i', { style: { background: '#7cbb00' } }), h('i', { style: { background: '#00a1f1' } }), h('i', { style: { background: '#ffbb00' } })),
      h('div', { class: 'xp-word' }, h('small', {}, 'Macrohard®'), 'LAN LORD', h('sup', {}, 'xp'))),
    h('div', { class: 'bootbar' }, h('i'), h('i'), h('i')),
    h('div', { class: 'boot-copy' }, 'Copyright © 1985-2008 Macrohard Corporation'), h('div', { class: 'boot-copy r' }, 'Macrohard'),
  );
  document.body.append(boot);
  setTimeout(() => {
    const welcome = h('div', { id: 'welcome' },
      h('div', { class: 'wt' }),
      h('div', { class: 'wm' },
        h('div', { class: 'wl' }, h('div', { class: 'xp-logo' }, h('div', { class: 'xp-flag' }, h('i', { style: { background: '#f65314' } }), h('i', { style: { background: '#7cbb00' } }), h('i', { style: { background: '#00a1f1' } }), h('i', { style: { background: '#ffbb00' } })), h('div', { class: 'xp-word' }, 'LAN LORD', h('sup', {}, 'xp'))), h('div', { class: 'tag' }, 'To begin, click your user name')),
        h('div', { class: 'wr' },
          h('div', { class: 'user', onclick: () => { audio.initAudio(); audio.xpStartup(); welcome.classList.add('fadeout'); setTimeout(() => welcome.remove(), 700); done(); } }, h('div', { class: 'pic' }, isNew ? '❔' : '🎮'), h('div', {}, isNew ? 'New User' : userName, h('small', {}, isNew ? 'Click to begin your degenerate journey' : 'Owner. Operator. Legend.'))),
          h('div', { class: 'user dis' }, h('div', { class: 'pic', style: { background: 'linear-gradient(135deg,#888,#444)' } }, '👻'), h('div', {}, 'Guest', h('small', {}, 'Account disabled (he died at a LAN in 2006)'))),
          h('div', { class: 'user dis' }, h('div', { class: 'pic', style: { background: 'linear-gradient(135deg,#d6a,#a38)' } }, '👩'), h('div', {}, 'Mom', h('small', {}, 'Password hint: "dinner is ready"'))),
        ),
      ),
      h('div', { class: 'wb' }, h('span', { style: { flex: 1 } }, '⏻ Turn off LAN LORD'), h('span', {}, 'After you log on, the café opens immediately. Gamers are already outside. They are pressing their faces against the glass.')),
    );
    document.body.append(welcome);
    boot.classList.add('fadeout'); setTimeout(() => boot.remove(), 700);
  }, 2600);
}
