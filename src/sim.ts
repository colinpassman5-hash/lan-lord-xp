// ============ LAN LORD — simulation ============
import {
  ITEM, ItemDef, RESEARCH, ARCHES, Arche, genName, THOUGHTS, REVIEWS, REVIEW_SPECIAL,
  LOCATIONS, LocationDef, Meta, newMeta, MOM_LAUNDRY, OWNER_LINES, CLAN_TAGS,
} from './data';

export const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

export interface Obj {
  id: number; type: string; x: number; y: number; dir: number;
  broken: boolean; fire: number; infected: boolean;
  user: number; reserved: number; claim: number; ping: number; routerId: number; burnt?: boolean;
}
export interface Litter { id: number; x: number; y: number; kind: 'can' | 'pizza' | 'puddle' | 'scorch'; claim: number; rot: number; }
export type AgentKind = 'customer' | 'mom' | 'janitor' | 'tech' | 'bouncer' | 'ghost' | 'llama' | 'inspector' | 'owner';
export interface Look { shirt: string; pants: string; skin: string; hair: string; hairStyle: number; glasses: boolean; beard: boolean; hat: '' | 'pumpkin' | 'santa' | 'cap' | 'headset' | 'beanie' | 'fedora' | 'trucker'; sex?: 'm' | 'f'; top?: string; bottom?: string; acc?: string; scale: number; wide: number; }
export interface Agent {
  id: number; kind: AgentKind; name: string;
  x: number; y: number; px: number; py: number; path: { x: number; y: number }[]; speed: number;
  state: string; timer: number; target: number; face: number;
  look: Look;
  // customer stats
  arche?: Arche; cash?: number; spent?: number; hunger?: number; thirst?: number; bladder?: number; tired?: number;
  hygiene?: number; rage?: number; happy?: number; wantMin?: number; played?: number; awake?: number; wait?: number;
  marathon?: boolean; flags?: Record<string, boolean>; thoughtCD?: number; billed?: number;
  thought?: { text: string; ttl: number; mood: number }; log?: string[];
  victim?: number; life?: number; seat?: number; dead?: boolean;
  group?: number; awayStart?: number; patience?: number;
}
export interface Review { name: string; stars: number; text: string; date: string; arche: string; look: Look; }
export interface GEvent { t: string; [k: string]: any }
export interface Ledger { [k: string]: number }
export interface DayRecord { label: string; income: number; expense: number; cash: number; }

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);

const SHIRTS = ['#e8483b', '#1e7fd8', '#3cb44b', '#ffc23c', '#9b59b6', '#222222', '#ff7fbf', '#f58231', '#46f0f0', '#ffffff', '#7a5230', '#2c3e50'];
const PANTS = ['#2b3a67', '#3b3b3b', '#5a4632', '#1f4e79', '#6b6b6b', '#222'];
const SKINS = ['#ffdbac', '#f1c27d', '#e0ac69', '#c68642', '#8d5524', '#ffe0bd'];
const HAIRS = ['#2b1d0e', '#5a3825', '#b55239', '#e6c35c', '#111', '#888', '#d64fd6', '#2e86de'];

export class Sim {
  rng: () => number;
  tick = 0;
  money = 8000;
  objects: Obj[] = [];
  agents: Agent[] = [];
  litter: Litter[] = [];
  W: number; H: number; doorY: number;
  loc: number; L: LocationDef; meta: Meta;
  occ: Int32Array; useOcc: Int32Array; heat: Float32Array; tmpHeat: Float32Array;
  totalEarned = 0; canMoveUp = false;
  queue: number[] = [];  // FIFO of waiting customer ids
  musicVibe: 'none' | 'banger' | 'cursed' = 'none';
  nextGroup = 1;
  buzz = 0.2;            // word-of-mouth fame, 0..1.25 — scales foot traffic
  static BUZZ_TIERS: [number, string, string][] = [[0, 'Unknown', '🤷'], [0.3, 'A Few Kids Know', '🗣️'], [0.5, "Word's Out", '📣'], [0.7, 'Local Buzz', '🔥'], [0.9, 'Hot Spot', '🌶️'], [1.1, 'LEGENDARY', '👑']];
  buzzTier() { let t = Sim.BUZZ_TIERS[0]; for (const x of Sim.BUZZ_TIERS) if (this.buzz >= x[0]) t = x; return t; }
  events: GEvent[] = [];
  nextId = 1;
  rating = 3.0;
  reviews: Review[] = [];
  regulars: Record<string, { spent: number; look: Look; arche: string; visits: number }> = {};
  rate = 4;           // $/hr
  drinkPrice = 3;
  foodPrice = 4;
  researched: Record<string, boolean> = {};
  researching: { id: string; progress: number } | null = null;
  staffHired: { janitor: number; tech: number; bouncer: number } = { janitor: 0, tech: 0, bouncer: 0 };
  ledgerToday: Ledger = {};
  ledgerYesterday: Ledger = {};
  days: DayRecord[] = [];
  cashHistory: number[] = [];
  thoughtCounts: Record<string, number> = {};
  served = 0; turnedAway = 0; peakCustomers = 0; deaths = 0;
  outage = 0; rickroll = 0; demandMult = 1; demandTimer = 0;
  tourney = 0; tourneyDay = -1; lastInspector = -9999;
  debt = 0;
  advised: Record<string, number> = {};
  goalsDone: boolean[] = [false, false, false];
  gameOver = false; won = false;
  stats = { fires: 0, smashes: 0, accidents: 0 };

  constructor(seed = 1337, loc = 0, meta?: Meta) {
    this.rng = mulberry32(seed);
    this.meta = meta || newMeta();
    this.loc = Math.max(0, Math.min(LOCATIONS.length - 1, loc));
    this.L = LOCATIONS[this.loc];
    this.W = this.L.w; this.H = this.L.h; this.doorY = this.L.doorY;
    this.occ = new Int32Array(this.W * this.H).fill(-1);
    this.useOcc = new Int32Array(this.W * this.H).fill(-1);
    this.heat = new Float32Array(this.W * this.H).fill(22);
    this.tmpHeat = new Float32Array(this.W * this.H);
    this.money = this.L.startCash + this.perk('fund') * 1500;
    this.rate = [3, 4, 6, 8, 12][this.loc] || 4;
    this.buzz = ([0.18, 0.28, 0.32, 0.36, 0.4][this.loc] ?? 0.3) + 0.04 * this.perk('mouth');
    if (this.perk('savant')) this.researched = { ...this.meta.research };
  }
  perk(id: string) { return this.meta.perks[id] || 0; }
  spawnOwner() {
    const P = this.meta.profile; if (!P) return;
    const o = this.baseAgent('owner', P.name, { ...P.look });
    o.x = o.px = 2; o.y = o.py = this.doorY - 1; o.state = 'wander'; o.speed = 0.22;
    o.thought = { text: this.loc === 0 ? 'welcome to my dungeon' : 'new place. new me.', ttl: 160, mood: 1 };
    this.agents.push(o);
  }
  findSpot(type: string, dir: number): { x: number; y: number } | null {
    const keep = this.money; this.money = 1e9;
    const routers = this.objects.filter(o => this.def(o).routerRadius);
    let best: { x: number; y: number } | null = null, bd = 1e9;
    for (let y = 1; y < this.H - 1; y++) for (let x = 2; x < this.W - 1; x++) {
      if (!this.canPlace(type, x, y, dir).ok) continue;
      const d = routers.length ? Math.min(...routers.map(r => Math.hypot(r.x - x, r.y - y))) : 0;
      const R = routers.length ? Math.max(...routers.map(r => this.def(r).routerRadius!)) : 99;
      if (ITEM[type].quality && d > R - 1) continue;
      const owner = this.agents.find(a => a.kind === 'owner');
      const nearOwner = owner && Math.hypot(owner.x - x, owner.y - y) < 2.5 ? 5 : 0;
      const score = (ITEM[type].quality ? Math.abs(d - 2.5) : -d * 0.2) + Math.abs(x - this.W / 2) * 0.05 + nearOwner;
      if (score < bd) { bd = score; best = { x, y }; }
    }
    this.money = keep;
    return best;
  }
  placeSomewhere(type: string, dir: number) {
    const keep = this.money; this.money = 1e9;
    const routers = this.objects.filter(o => this.def(o).routerRadius);
    const cands: [number, number, number][] = [];
    for (let y = 1; y < this.H - 1; y++) for (let x = 2; x < this.W - 1; x++) {
      if (!this.canPlace(type, x, y, dir).ok) continue;
      const d = routers.length ? Math.min(...routers.map(r => Math.hypot(r.x - x, r.y - y))) : 0;
      cands.push([x, y, ITEM[type].quality ? d : -d]);
    }
    cands.sort((a, b) => a[2] - b[2]);
    if (cands.length) this.place(type, cands[0][0], cands[0][1], dir, true);
    this.money = keep;
  }
  costOf(type: string) { return Math.round(ITEM[type].cost * (1 - 0.08 * this.perk('bulk'))); }
  starsDone() { return this.goalsDone.filter(Boolean).length; }
  cloutEarned() { return Math.round(this.L.clout * this.starsDone() / 3 + this.totalEarned / 2000); }

  // ------------------------------------------------------------ helpers
  r() { return this.rng(); }
  ri(a: number, b: number) { return Math.floor(a + this.rng() * (b - a + 1)); }
  pick<T>(a: T[]): T { return a[Math.floor(this.rng() * a.length)]; }
  emit(e: GEvent) { this.events.push(e); }
  inB(x: number, y: number) { return x >= 0 && y >= 0 && x < this.W && y < this.H; }
  idx(x: number, y: number) { return y * this.W + x; }
  walkable(x: number, y: number) {
    if (x === -1 && y === this.doorY) return true;
    return this.inB(x, y) && this.occ[this.idx(x, y)] === -1;
  }
  objAt(x: number, y: number): Obj | undefined {
    if (!this.inB(x, y)) return undefined;
    const id = this.occ[this.idx(x, y)];
    return id >= 0 ? this.objects.find(o => o.id === id) : undefined;
  }
  obj(id: number) { return this.objects.find(o => o.id === id); }
  agent(id: number) { return this.agents.find(a => a.id === id); }
  useTileOf(o: Obj) { const d = DIRS[o.dir]; return { x: o.x + d[0], y: o.y + d[1] }; }
  def(o: Obj): ItemDef { return ITEM[o.type]; }
  isPC(o: Obj) { return !!this.def(o).quality; }
  date() { return new Date(this.L.year, this.L.month, this.L.day, 10, 0 + this.tick); }
  hour() { return this.date().getHours(); }
  dayIndex() { return Math.floor((this.tick + 600) / 1440); }
  isUnlocked(id: string) { const d = ITEM[id]; return !d.unlockedBy || !!this.researched[d.unlockedBy]; }
  customers() { return this.agents.filter(a => a.kind === 'customer'); }

  spend(amount: number, cat: string, x?: number, y?: number) {
    this.money -= amount;
    this.ledgerToday[cat] = (this.ledgerToday[cat] || 0) - amount;
    if (x !== undefined && amount >= 1) this.emit({ t: 'float', x, y, text: `-$${Math.round(amount)}`, color: '#ff4b3e' });
  }
  earn(amount: number, cat: string, x?: number, y?: number, show = true) {
    this.money += amount;
    if (cat !== 'Loans' && cat !== 'Sales') { this.totalEarned += amount; this.meta.lifetime.earned += amount; }
    this.ledgerToday[cat] = (this.ledgerToday[cat] || 0) + amount;
    if (show && x !== undefined) this.emit({ t: 'float', x, y, text: `+$${amount % 1 ? amount.toFixed(2) : amount}`, color: '#39e639' });
  }
  advise(key: string, cooldownMin = 720) {
    const last = this.advised[key];
    if (last !== undefined && this.tick - last < cooldownMin) return;
    this.advised[key] = this.tick;
    this.emit({ t: 'advisor', key });
  }

  // ------------------------------------------------------------ pathfinding (BFS — grid is tiny)
  bfs(sx: number, sy: number, tx: number, ty: number): { x: number; y: number }[] | null {
    sx = Math.round(sx); sy = Math.round(sy);
    if (sx === tx && sy === ty) return [];
    const W = this.W + 1, H = this.H; // include x=-1 column via offset
    const key = (x: number, y: number) => (y * W + (x + 1));
    const prev = new Int32Array(W * H).fill(-2);
    const q: number[] = [];
    const sk = key(sx, sy);
    if (sk < 0 || sk >= prev.length) return null;
    prev[sk] = -1; q.push(sk);
    let head = 0;
    const target = key(tx, ty);
    while (head < q.length) {
      const k = q[head++];
      if (k === target) break;
      const x = (k % W) - 1, y = Math.floor(k / W);
      for (let i = 0; i < 4; i++) {
        const nx = x + DIRS[i][0], ny = y + DIRS[i][1];
        if (ny < 0 || ny >= H || nx < -1 || nx >= this.W) continue;
        if (!(nx === tx && ny === ty) && !this.walkable(nx, ny)) continue;
        if (nx === tx && ny === ty && !this.walkable(nx, ny)) continue;
        const nk = key(nx, ny);
        if (prev[nk] !== -2) continue;
        prev[nk] = k; q.push(nk);
      }
    }
    if (prev[target] === -2) return null;
    const path: { x: number; y: number }[] = [];
    let k = target;
    while (k !== sk && k >= 0) { path.push({ x: (k % W) - 1, y: Math.floor(k / W) }); k = prev[k]; }
    path.reverse();
    return path;
  }
  goTo(a: Agent, tx: number, ty: number) {
    const p = this.bfs(a.x, a.y, tx, ty);
    if (!p) return false;
    a.path = p;
    return true;
  }
  reachableSet(): Uint8Array {
    const seen = new Uint8Array(this.W * this.H);
    const q: number[] = [];
    const start = this.idx(0, this.doorY);
    if (this.occ[start] !== -1) return seen;
    seen[start] = 1; q.push(start);
    let h = 0;
    while (h < q.length) {
      const k = q[h++]; const x = k % this.W, y = Math.floor(k / this.W);
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1];
        if (!this.inB(nx, ny)) continue;
        const nk = this.idx(nx, ny);
        if (seen[nk] || this.occ[nk] !== -1) continue;
        seen[nk] = 1; q.push(nk);
      }
    }
    return seen;
  }

  // ------------------------------------------------------------ building
  canPlace(type: string, x: number, y: number, dir: number): { ok: boolean; reason?: string } {
    const d = ITEM[type];
    if (!this.inB(x, y)) return { ok: false, reason: 'Out of bounds' };
    if (this.money < this.costOf(type)) return { ok: false, reason: 'Not enough money' };
    if ((x === 0 || x === 1) && y === this.doorY) return { ok: false, reason: 'Blocking the door' };
    const i = this.idx(x, y);
    if (this.occ[i] !== -1) return { ok: false, reason: 'Tile occupied' };
    if (this.useOcc[i] !== -1) return { ok: false, reason: 'That spot is someone\'s seat' };
    if (this.litter.some(l => l.x === x && l.y === y && l.kind !== 'scorch')) return { ok: false, reason: 'Clean up the mess first' };
    let ux = -99, uy = -99;
    if (d.useTile) {
      ux = x + DIRS[dir][0]; uy = y + DIRS[dir][1];
      if (!this.inB(ux, uy)) return { ok: false, reason: 'Seat faces the wall (press R)' };
      const ui = this.idx(ux, uy);
      if (this.occ[ui] !== -1 || this.useOcc[ui] !== -1) return { ok: false, reason: 'Seat spot blocked (press R)' };
    }
    // connectivity check
    this.occ[i] = 999999;
    const seen = this.reachableSet();
    this.occ[i] = -1;
    if (d.useTile && !seen[this.idx(ux, uy)]) return { ok: false, reason: 'Seat would be unreachable' };
    for (const o of this.objects) {
      if (!this.def(o).useTile) continue;
      const u = this.useTileOf(o);
      if (!seen[this.idx(u.x, u.y)]) return { ok: false, reason: 'Would block a path' };
    }
    return { ok: true };
  }
  place(type: string, x: number, y: number, dir: number, free = false): Obj | null {
    if (!free) {
      const c = this.canPlace(type, x, y, dir);
      if (!c.ok) return null;
      this.spend(this.costOf(type), 'Construction', x, y);
    }
    const o: Obj = { id: this.nextId++, type, x, y, dir, broken: false, fire: 0, infected: false, user: -1, reserved: -1, claim: -1, ping: 999, routerId: -1 };
    this.objects.push(o);
    this.occ[this.idx(x, y)] = o.id;
    if (ITEM[type].useTile) { const u = this.useTileOf(o); this.useOcc[this.idx(u.x, u.y)] = o.id; }
    // scorch under it is covered
    this.litter = this.litter.filter(l => !(l.x === x && l.y === y));
    // agents standing on it get nudged
    for (const a of this.agents) if (Math.round(a.x) === x && Math.round(a.y) === y) this.nudgeOff(a);
    // agents whose path crosses it re-path
    for (const a of this.agents) if (a.path.some(p => p.x === x && p.y === y)) {
      const dst = a.path[a.path.length - 1];
      if (!this.goTo(a, dst.x, dst.y)) a.path = [];
    }
    this.updateNetwork();
    this.emit({ t: 'placed', x, y, type });
    return o;
  }
  nudgeOff(a: Agent) {
    const x = Math.round(a.x), y = Math.round(a.y);
    for (const d of DIRS) if (this.walkable(x + d[0], y + d[1])) { a.x = a.px = x + d[0]; a.y = a.py = y + d[1]; return; }
  }
  removeObj(o: Obj, refund: boolean) {
    if (refund && this.def(o).scenery) { this.emit({ t: 'balloon', title: 'Nope', text: 'That belongs to the building (or to Mom). You can\'t sell it.' }); return; }
    if (refund) this.earn(Math.floor(this.costOf(o.type) * 0.5), 'Sales', o.x, o.y);
    this.occ[this.idx(o.x, o.y)] = -1;
    if (this.def(o).useTile) { const u = this.useTileOf(o); this.useOcc[this.idx(u.x, u.y)] = -1; }
    this.objects = this.objects.filter(q => q !== o);
    this.updateNetwork();
    for (const a of this.agents) {
      if (a.target === o.id) {
        if (a.kind === 'customer' && a.state !== 'leave') { a.target = -1; a.state = 'findPC'; a.path = []; }
        else if (a.kind !== 'customer') { a.state = 'idle'; a.target = -1; a.path = []; }
      }
      if (a.seat === o.id) a.seat = -1;
    }
  }

  // ------------------------------------------------------------ setup
  newGame() {
    for (const s of this.L.starter) this.place(s[0], s[1], s[2], s[3], true);
    const P = this.meta.profile;
    if (P) {
      if (P.starter === 'beige') this.placeSomewhere('pc_beige', 1);
      if (P.starter === 'emachine') this.placeSomewhere('fridge', 1);
      if (P.starter === 'gateway') this.money += 750;
      if (P.fav === 'ddr') this.placeSomewhere('lavalamp', 0);
      this.spawnOwner();
    }
    this.advise('welcome', 0);
    this.cashHistory.push(this.money);
  }

  // ------------------------------------------------------------ customers
  makeLook(kind: AgentKind, arche?: Arche): Look {
    const d = this.date();
    const m = d.getMonth(), day = d.getDate();
    let hat: Look['hat'] = this.r() < 0.12 ? 'cap' : (this.r() < 0.18 ? 'headset' : '');
    if (m === 9 && day === 31 && kind === 'customer') hat = 'pumpkin';
    if (m === 11 && day >= 20 && kind === 'customer' && this.r() < 0.6) hat = 'santa';
    return {
      shirt: this.pick(SHIRTS), pants: this.pick(PANTS), skin: this.pick(SKINS), hair: this.pick(HAIRS),
      hairStyle: this.r() < 0.5 ? this.ri(0, 3) : this.ri(4, 17), top: this.pick(['tee', 'tee', 'band', 'polo', 'hoodie', 'track']), bottom: this.pick(['pants', 'pants', 'jnco', 'shorts', 'flare']), acc: this.r() < 0.3 ? this.pick(['puka', 'livestrong', 'belt', 'chain', 'sweatband', 'bandana']) : '', glasses: arche === 'neckbeard' || this.r() < 0.25,
      beard: arche === 'neckbeard' && this.r() < 0.8, hat,
      scale: arche === 'kid' ? 0.78 : 1, wide: arche === 'neckbeard' ? 1.3 : (arche === 'tryhard' ? 0.95 : 1),
    };
  }
  baseAgent(kind: AgentKind, name: string, look: Look): Agent {
    return {
      id: this.nextId++, kind, name, x: -1, y: this.doorY, px: -1, py: this.doorY, path: [], speed: 0.25,
      state: 'arrive', timer: 0, target: -1, face: 0, look, log: [],
    };
  }
  spawnCustomer(forceArche?: Arche) {
    let arche: Arche;
    if (forceArche) arche = forceArche;
    else {
      const tot = ARCHES.reduce((s, a) => s + a.weight, 0);
      let r = this.r() * tot; arche = 'normie';
      for (const a of ARCHES) { r -= a.weight; if (r <= 0) { arche = a.id; break; } }
    }
    const A = ARCHES.find(a => a.id === arche)!;
    const a = this.baseAgent('customer', genName(this.rng), this.makeLook('customer', arche));
    if (this.regulars[a.name]) a.look = this.regulars[a.name].look;
    a.arche = arche;
    a.cash = this.ri(A.cash[0], A.cash[1]);
    a.spent = 0; a.billed = 0;
    a.hunger = this.ri(5, 65); a.thirst = this.ri(5, 65); a.bladder = this.ri(0, 45); a.tired = this.ri(0, 30);
    a.hygiene = arche === 'neckbeard' ? this.ri(28, 70) : this.ri(55, 100);
    a.rage = this.ri(0, 15); a.happy = this.ri(55, 72);
    a.wantMin = this.ri(A.hours[0] * 60, A.hours[1] * 60);
    a.marathon = arche === 'neckbeard' && this.r() < 0.12;
    if (this.meta.profile?.fav === 'wow') a.wantMin = Math.round(a.wantMin * 1.15);
    if (a.marathon) a.wantMin = 80 * 60;
    a.played = 0; a.awake = 0; a.wait = 0; a.flags = {}; a.thoughtCD = this.ri(20, 60); a.seat = -1;
    a.speed = arche === 'kid' ? 0.38 : arche === 'neckbeard' ? 0.26 : 0.32;
    this.agents.push(a);
    return a;
  }
  think(a: Agent, key: string, force = false, mood = 0) {
    if (!force && (a.thoughtCD || 0) > 0) return;
    const list = THOUGHTS[key]; if (!list) return;
    let text = this.pick(list).replace('%r', String(this.rate)).replace('%m', String(Math.round(a.spent || 0))).replace(/%n/g, String(this.queuePos(a) >= 0 ? this.queuePos(a) + 1 : a.group ? this.agents.filter(f => f.group === a.group).length : (a.seat !== undefined && a.seat >= 0 ? this.objects.filter(o => this.isPC(o)).findIndex(o => o.id === a.seat) + 1 : 2)));
    a.thought = { text, ttl: 90, mood };
    a.thoughtCD = this.ri(90, 200);
    a.log = [text, ...(a.log || [])].slice(0, 6);
    this.thoughtCounts[key] = (this.thoughtCounts[key] || 0) + 1;
  }
  willingness(a: Agent) {
    const A = ARCHES.find(x => x.id === a.arche)!;
    const pcs = this.objects.filter(o => this.isPC(o));
    const q = pcs.length ? pcs.reduce((s, o) => s + (this.def(o).quality || 1), 0) / pcs.length : 1;
    return A.will * (1 + 0.45 * (q - 1)) * (0.7 + this.rating * 0.1) * (this.tourney > 0 ? 1.3 : 1) * this.L.payMult * (1 + 0.1 * this.perk('cred')) * (this.meta.profile?.fav === 'halo' ? 1.05 : 1);
  }
  pcScore(o: Obj) {
    const u = this.useTileOf(o);
    const h = this.heat[this.idx(o.x, o.y)];
    return (this.def(o).quality || 1) * 12 - Math.min(o.ping, 400) / 25 - Math.max(0, h - 35) + this.r() * 4 + (o.infected ? -10 : 0)
      + (this.useOcc[this.idx(u.x, u.y)] === o.id ? 0 : 0);
  }
  friendSeatBonus(a: Agent, o: Obj) {
    if (!a.group) return 0;
    let b = 0;
    for (const f of this.agents) {
      if (f === a || f.group !== a.group || f.seat === undefined || f.seat < 0) continue;
      const fo = this.obj(f.seat); if (!fo) continue;
      const d = Math.hypot(fo.x - o.x, fo.y - o.y);
      if (d <= 1.5) b += 20; else if (d <= 3) b += 6;
    }
    return b;
  }
  findPC(a: Agent): Obj | null {
    const free = this.objects.filter(o => this.isPC(o) && !o.broken && o.fire === 0 && o.user === -1 && o.reserved === -1);
    const sc = new Map<Obj, number>();
    for (const o of free) sc.set(o, this.pcScore(o) + (o.ping >= 999 && !this.outage ? -100 : 0) + this.friendSeatBonus(a, o));
    free.sort((p, q) => sc.get(q)! - sc.get(p)!);
    for (const o of free) {
      const u = this.useTileOf(o);
      if (this.goTo(a, u.x, u.y)) return o;
    }
    return null;
  }
  findService(a: Agent, types: string[]): Obj | null {
    const cands = this.objects.filter(o => types.includes(o.type) && !o.broken && o.fire === 0)
      .map(o => ({ o, d: Math.abs(o.x - a.x) + Math.abs(o.y - a.y) + (o.user !== -1 ? 6 : 0) }))
      .sort((p, q) => p.d - q.d);
    for (const c of cands) { const u = this.useTileOf(c.o); if (this.goTo(a, u.x, u.y)) return c.o; }
    return null;
  }
  queueTiles(n: number): { x: number; y: number }[] {
    // walkable tiles in BFS order from the door, skipping seats/service spots and the doorway itself
    const out: { x: number; y: number }[] = [];
    const seen = new Uint8Array(this.W * this.H);
    const q: [number, number][] = [[0, this.doorY]];
    seen[this.idx(0, this.doorY)] = 1;
    while (q.length && out.length < n) {
      const [x, y] = q.shift()!;
      if (!(x <= 1 && y === this.doorY) && this.useOcc[this.idx(x, y)] === -1) out.push({ x, y });
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1];
        if (!this.inB(nx, ny) || seen[this.idx(nx, ny)] || this.occ[this.idx(nx, ny)] !== -1) continue;
        seen[this.idx(nx, ny)] = 1; q.push([nx, ny]);
      }
    }
    return out;
  }
  queuePos(a: Agent) { return this.queue.indexOf(a.id); }
  dispatchQueue() {
    if (!this.queue.length) return;
    // FIFO: hand every free seat to whoever has waited longest (front first)
    for (const id of [...this.queue]) {
      const a = this.agent(id);
      if (!a || a.kind !== 'customer' || a.state !== 'waitPC') { this.leaveQueue({ id } as Agent); continue; }
      const o = this.findPC(a);
      if (!o) break;
      this.claimSeat(a, o);
      if (a.flags!.vip) { a.flags!.vip = false; this.think(a, 'queueFront', true, 1); }
    }
  }
  joinQueue(a: Agent) {
    if (!this.queue.includes(a.id)) { if (a.flags!.vip) this.queue.unshift(a.id); else this.queue.push(a.id); }
    a.state = 'waitPC'; a.wait = 0;
    a.patience = ({ kid: 45, tryhard: 40, neckbeard: 90, normie: 35, weirdo: 70 } as any)[a.arche!] ?? 50;
    this.goToQueueSpot(a);
  }
  leaveQueue(a: Agent) { const i = this.queue.indexOf(a.id); if (i >= 0) this.queue.splice(i, 1); }
  goToQueueSpot(a: Agent) {
    const i = this.queuePos(a); if (i < 0) return;
    const tiles = this.queueTiles(i + 1);
    const t = tiles[Math.min(i, tiles.length - 1)];
    if (t && (Math.round(a.x) !== t.x || Math.round(a.y) !== t.y)) this.goTo(a, t.x, t.y);
  }
  claimSeat(a: Agent, o: Obj) { o.reserved = a.id; a.seat = o.id; a.target = o.id; a.state = 'toPC'; this.leaveQueue(a); }
  releaseSeat(a: Agent) {
    if (a.seat !== undefined && a.seat >= 0) {
      const o = this.obj(a.seat);
      if (o) { if (o.user === a.id) o.user = -1; if (o.reserved === a.id) o.reserved = -1; }
    }
    a.seat = -1;
  }
  leave(a: Agent, flag?: string) {
    if (flag) a.flags![flag] = true;
    this.leaveQueue(a);
    this.releaseSeat(a);
    if (a.target >= 0) { const o = this.obj(a.target); if (o && o.user === a.id) o.user = -1; }
    a.state = 'leave'; a.target = -1;
    if (!this.goTo(a, -1, this.doorY)) { a.path = []; a.x = a.px = 0; a.y = a.py = this.doorY; this.goTo(a, -1, this.doorY); }
  }
  dropLitter(a: Agent, kind: Litter['kind']) {
    const x = Math.round(a.x), y = Math.round(a.y);
    if (!this.inB(x, y) || this.occ[this.idx(x, y)] !== -1) return;
    const nearTrash = this.objects.some(o => o.type === 'trash' && Math.abs(o.x - x) + Math.abs(o.y - y) <= 4);
    if (kind !== 'puddle' && nearTrash && this.r() < 0.9) return;
    if (this.litter.filter(l => l.x === x && l.y === y).length >= 2) return;
    this.litter.push({ id: this.nextId++, x, y, kind, claim: -1, rot: this.r() * 6.28 });
  }
  postReview(a: Agent) {
    const f = a.flags || {};
    let stars = clamp(Math.round(1.2 + (a.happy || 0) / 22 - ((a.rage || 0) > 70 ? 1 : 0)), 1, 5);
    if (f.ragequit || f.bounced) stars = 1;
    if (f.fire) stars = Math.min(stars, 2);
    if (f.mom) stars = Math.min(stars, 3);
    const positive = ['shower', 'ghost', 'llama', 'tourney'];
    const specials = Object.keys(f).filter(k => REVIEW_SPECIAL[k] && (positive.includes(k) || stars <= 3));
    let text = specials.length && this.r() < 0.55 ? this.pick(REVIEW_SPECIAL[this.pick(specials)]) : this.pick(REVIEWS[stars]);
    const d = this.date();
    const rev: Review = { name: a.name, stars, text, date: `${d.getMonth() + 1}/${d.getDate()}/${String(d.getFullYear() % 100).padStart(2, '0')} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`, arche: a.arche!, look: a.look };
    this.reviews.unshift(rev);
    if (this.reviews.length > 60) this.reviews.pop();
    this.rating = clamp(this.rating * 0.93 + stars * 0.07, 0.5, 5);
    const before = this.buzzTier()[1];
    this.buzz = clamp(this.buzz + (0.011 + (stars - 3) * 0.009) / (1 + this.loc * 0.2), 0.05, 1.25);
    const after = this.buzzTier();
    if (after[1] !== before) this.emit({ t: 'buzz', tier: after[1], icon: after[2], up: this.buzz > 0 });
    const reg = this.regulars[a.name] || { spent: 0, look: a.look, arche: a.arche!, visits: 0 };
    reg.spent += a.spent || 0; reg.visits++;
    this.regulars[a.name] = reg;
    this.emit({ t: 'review', review: rev });
  }

  // ------------------------------------------------------------ staff
  hire(kind: 'janitor' | 'tech' | 'bouncer') {
    const names = { janitor: ['Gary', 'Big Earl', 'Mop Steve'], tech: ['Dave (IT)', 'Linux Larry', 'Geek Squad Greg'], bouncer: ['Large Tony', 'Medium Tony', 'The Fridge'] };
    const n = this.staffHired[kind];
    const look = this.makeLook(kind);
    if (kind === 'janitor') { look.shirt = '#3a7d44'; look.pants = '#3a7d44'; look.hat = 'cap'; }
    if (kind === 'tech') { look.shirt = '#1e5fb4'; look.pants = '#222'; look.glasses = true; look.hat = ''; }
    if (kind === 'bouncer') { look.shirt = '#111'; look.pants = '#111'; look.wide = 1.6; look.scale = 1.2; look.glasses = true; look.hairStyle = 3; look.hat = ''; }
    const a = this.baseAgent(kind, names[kind][n % 3] + (n >= 3 ? ` ${Math.floor(n / 3) + 1}` : ''), look);
    a.state = 'idle'; a.speed = kind === 'tech' ? 0.32 : 0.26;
    this.agents.push(a);
    this.staffHired[kind]++;
    this.emit({ t: 'sfx', name: 'hire' });
  }
  fire_(kind: 'janitor' | 'tech' | 'bouncer') {
    const a = this.agents.find(x => x.kind === kind && x.state !== 'leave');
    if (!a) return;
    this.staffHired[kind]--;
    a.state = 'leave'; a.target = -1; this.goTo(a, -1, this.doorY);
  }
  wages() { return this.staffHired.janitor * 80 + this.staffHired.tech * 150 + this.staffHired.bouncer * 120; }

  // ------------------------------------------------------------ actions from UI
  extinguish(o: Obj) { if (o.fire > 0) { if (!this.perk('insurance')) this.spend(100, 'Repairs', o.x, o.y); o.fire = 0; o.broken = true; this.emit({ t: 'foam', x: o.x, y: o.y }); this.emit({ t: 'sfx', name: 'foam' }); } }
  repair(o: Obj) { if (o.broken && !o.fire) { this.spend(75, 'Repairs', o.x, o.y); o.broken = false; o.burnt = false; this.emit({ t: 'sfx', name: 'fix' }); } }
  format(o: Obj) { if (o.infected) { this.spend(20, 'Repairs', o.x, o.y); o.infected = false; this.emit({ t: 'sfx', name: 'fix' }); } }
  infectedPCs() { return this.objects.filter(o => o.infected); }
  infectRandom(n: number) {
    let hit = 0;
    for (let k = 0; k < n; k++) { const c = this.objects.filter(o => this.isPC(o) && !o.infected && !o.broken); if (!c.length) break; this.pick(c).infected = true; hit++; }
    if (hit) { this.advise('virus', 0); this.emit({ t: 'sfx', name: 'virus' }); }
    return hit;
  }
  formatAll() { const list = this.infectedPCs(); for (const o of list) { this.spend(15, 'Repairs', o.x, o.y); o.infected = false; } if (list.length) this.emit({ t: 'sfx', name: 'fix' }); return list.length; }
  cleanLitter(l: Litter) { this.spend(5, 'Repairs', l.x, l.y); this.litter = this.litter.filter(q => q !== l); this.emit({ t: 'sfx', name: 'clean' }); }
  borrow() { this.debt += 5000; this.earn(5000, 'Loans', undefined, undefined, false); this.emit({ t: 'sfx', name: 'kaching' }); }
  repay() { if (this.debt >= 1000 && this.money >= 1000) { this.debt -= 1000; this.spend(1000, 'Loans'); } }
  kick(a: Agent) { if (a.kind === 'customer' && a.state !== 'leave') { a.happy = Math.min(a.happy || 0, 20); this.think(a, 'ragequit', true, -1); this.leave(a, 'bounced'); } }
  febreze(a: Agent) { if (a.kind === 'customer') { this.spend(5, 'Repairs', a.x, a.y); a.hygiene = Math.min(100, (a.hygiene || 0) + 35); this.emit({ t: 'sfx', name: 'spray' }); } }
  revive(a: Agent) { this.spend(50, 'Repairs', a.x, a.y); a.dead = false; a.tired = 0; a.awake = 0; a.happy = 80; a.marathon = false; a.state = 'play'; a.wantMin = (a.played || 0) + 120; this.think(a, 'happy', true, 1); a.thought = { text: 'I saw a light... it was my monitor', ttl: 120, mood: 1 }; }
  ghostify(a: Agent) {
    this.releaseSeat(a);
    this.agents = this.agents.filter(q => q !== a);
    const g = this.baseAgent('ghost', 'Ghost of ' + a.name, a.look);
    g.x = g.px = a.x; g.y = g.py = a.y; g.state = 'wander'; g.life = 2880; g.speed = 0.08;
    this.agents.push(g);
  }
  startResearch(id: string) {
    const r = RESEARCH.find(x => x.id === id)!;
    if (this.researching || this.researched[id] || this.money < r.cost) return false;
    if (r.requires && !this.researched[r.requires]) return false;
    this.spend(r.cost, 'Research');
    this.researching = { id, progress: 0 };
    return true;
  }
  canTourney() {
    const working = this.objects.filter(o => this.isPC(o) && !o.broken && o.fire === 0).length;
    if (this.tourney > 0) return { ok: false, reason: 'A tournament is already running!' };
    if (this.tourneyDay === this.dayIndex()) return { ok: false, reason: 'One tournament per day. Players need to sleep. (They won\'t.)' };
    if (working < 8) return { ok: false, reason: `You need at least 8 working PCs (you have ${working}).` };
    if (this.money < 500) return { ok: false, reason: 'You need $500 for the prize pool.' };
    return { ok: true };
  }
  startTourney() {
    if (!this.canTourney().ok) return false;
    this.spend(500, 'Events');
    this.tourney = 360; this.tourneyDay = this.dayIndex();
    this.advise('tourneyStart', 0);
    this.emit({ t: 'sfx', name: 'fanfare' });
    for (let i = 0; i < 6; i++) this.spawnCustomer('tryhard');
    return true;
  }

  // ------------------------------------------------------------ simulation step (1 tick = 1 game minute)
  step() {
    if (this.gameOver) return;
    this.tick++;
    const t = this.tick;
    const hourChanged = t % 60 === 0;
    if (hourChanged) this.hourly();
    if (this.outage > 0) { this.outage--; if (this.outage === 0) this.emit({ t: 'balloon', title: 'Power restored', text: 'The lights are back. The rage remains.' }); }
    if (this.rickroll > 0) this.rickroll--;
    if (this.demandTimer > 0) { this.demandTimer--; if (this.demandTimer === 0) this.demandMult = 1; }
    if (this.tourney > 0) { this.tourney--; if (this.tourney === 0) this.endTourney(); }

    if (this.loc === 0) { if (t === 100) this.advise('tip1', 0); if (t === 300) this.advise('tip2', 0); if (t === 600) this.advise('tip3', 0); if (t === 1000) this.advise('tip4', 0); }
    this.updateNetwork();
    this.updateHeat();
    this.updateFires();
    this.spawnLogic();
    for (const a of [...this.agents]) this.updateAgent(a);
    this.dispatchQueue();
    const cc = this.customers().length;
    if (cc > this.peakCustomers) this.peakCustomers = cc;
  }

  hourly() {
    const d = this.date();
    const h = d.getHours();
    // running costs
    let power = 0;
    for (const o of this.objects) {
      const def = this.def(o);
      if (this.isPC(o)) power += o.user !== -1 ? def.power : def.power * 0.2;
      else power += def.power;
    }
    if (power > 0) this.spend(power, 'Electricity');
    if (this.debt > 0) this.spend(this.debt * 0.001, 'Interest');
    // research
    if (this.researching) {
      const r = RESEARCH.find(x => x.id === this.researching!.id)!;
      this.researching.progress += 1 / r.hours;
      if (this.researching.progress >= 1) {
        this.researched[r.id] = true;
        this.researching = null;
        this.emit({ t: 'research', id: r.id });
        this.advise('research', 0);
      }
    }
    // moms
    const basement = this.L.id === 'basement';
    if ((h >= 20 || h <= 2 || basement) && !this.perk('blessing')) for (const k of this.customers()) {
      if (k.arche === 'kid' && k.state === 'play' && !k.flags!.momComing && this.r() < (basement ? (h >= 20 ? 0.3 : 0.04) : 0.25)) this.spawnMom(k);
    }
    if (basement && this.r() < 0.06 && !this.agents.some(a => a.kind === 'mom' && a.state === 'wander')) this.spawnLaundryMom();
    // random events
    const pcs = this.objects.filter(o => this.isPC(o)).length;
    if (!this.outage && !this.researched.r_ups && pcs >= 3 && this.r() < 0.012) { this.outage = 45; this.advise('outage', 0); this.emit({ t: 'sfx', name: 'outage' }); for (const c of this.customers()) if (c.state === 'play') { c.rage = (c.rage || 0) + 30; this.think(c, 'outage', true, -1); } }
    const graceOver = this.tick > 2 * 1440;
    const virusChance = (this.researched.r_antivirus ? 0.003 : this.loc === 0 ? 0.016 : 0.02);
    if (pcs >= 3 && graceOver && this.r() < virusChance) {
      const cand = this.objects.filter(o => this.isPC(o) && !o.infected);
      if (cand.length) { this.pick(cand).infected = true; this.advise('virus'); this.emit({ t: 'sfx', name: 'virus' }); }
    }
    for (const o of this.objects.filter(o => o.infected)) {
      if (this.r() < (this.loc === 0 ? 0.15 : 0.3)) {
        const n = this.objects.filter(q => this.isPC(q) && !q.infected && q.routerId === o.routerId && q.routerId !== -1);
        if (n.length && !(this.researched.r_antivirus && this.r() < 0.9)) this.pick(n).infected = true;
      }
    }
    if (this.r() < 0.012 && !this.agents.some(a => a.kind === 'llama')) this.spawnSpecial('llama');
    if (this.r() < 0.012 && t_since(this.tick, this.lastInspector) > 4320) { this.lastInspector = this.tick; this.spawnSpecial('inspector'); }
    if (!this.rickroll && this.r() < 0.008) { this.rickroll = 25; this.advise('rickroll', 0); for (const c of this.customers()) if (c.state === 'play') this.think(c, 'rickroll', true, 0); }
    // money tracking
    this.cashHistory.push(Math.round(this.money));
    if (this.cashHistory.length > 168) this.cashHistory.shift();
    // daily
    if (h === 0) this.daily();
    // advisor hints
    if (this.money < 0) this.advise('broke', 360);
    if (this.money > 30000) this.advise('rich', 99999);
    if (this.money < -8000) { this.gameOver = true; this.emit({ t: 'gameover' }); }
    this.checkGoals();
  }
  daily() {
    const d = this.date();
    if (this.L.rent) this.spend(this.L.rent, 'Rent');
    const w = this.wages(); if (w) this.spend(w, 'Wages');
    const inc = Object.values(this.ledgerToday).filter(v => v > 0).reduce((s, v) => s + v, 0);
    const exp = -Object.values(this.ledgerToday).filter(v => v < 0).reduce((s, v) => s + v, 0);
    const y = new Date(d.getTime() - 86400000);
    this.days.push({ label: `${y.getMonth() + 1}/${y.getDate()}`, income: inc, expense: exp, cash: this.money });
    if (this.days.length > 30) this.days.shift();
    this.ledgerYesterday = this.ledgerToday; this.ledgerToday = {};
    this.thoughtCounts = {};
    const m = d.getMonth(), day = d.getDate();
    if (m === 9 && day === 31) this.advise('halloween', 0);
    if (m === 10 && day === 13) { this.demandMult = 3; this.demandTimer = 2880; this.advise('wotlk', 0); }
    this.emit({ t: 'newday' });
  }
  checkGoals() {
    const g = this.goals();
    g.forEach((x, i) => { if (x.done && !this.goalsDone[i]) { this.goalsDone[i] = true; this.emit({ t: 'goal', i }); } });
    if (this.starsDone() >= 2 && !this.canMoveUp) { this.canMoveUp = true; this.emit({ t: 'canMoveUp' }); }
    if (this.goalsDone.every(Boolean) && !this.won) { this.won = true; this.emit({ t: 'win' }); }
  }
  goals() {
    const G = this.L.goals;
    return [
      { label: `Serve ${G.serve} customers`, cur: this.served, max: G.serve, done: this.served >= G.serve },
      { label: `Have $${G.cash.toLocaleString('en-US')} in the bank`, cur: Math.max(0, Math.round(this.money)), max: G.cash, done: this.money >= G.cash },
      { label: `Reach a ${G.rating.toFixed(1)}★ rating with ${G.crowd}+ customers at once`, cur: Math.min(this.peakCustomers, G.crowd), max: G.crowd, done: this.rating >= G.rating && this.peakCustomers >= G.crowd },
    ];
  }
  endTourney() {
    const present = this.customers().filter(c => c.state === 'play');
    const w = present.length ? this.pick(present) : null;
    this.advise('tourneyEnd', 0);
    this.emit({ t: 'tourneyEnd', winner: w ? w.name : 'nobody (everyone ragequit)' });
    if (w) { w.flags!.tourney = true; w.happy = 100; w.thought = { text: 'I AM THE CHAMPION!!!', ttl: 160, mood: 1 }; }
    this.rating = clamp(this.rating + 0.15, 0, 5);
  }
  spawnMom(kid: Agent) {
    kid.flags!.momComing = true;
    const look = this.makeLook('mom'); look.shirt = '#b05fc4'; look.pants = '#b05fc4'; look.hairStyle = 2; look.hair = '#c9a35f'; look.hat = '';
    const m = this.baseAgent('mom', `${kid.name}'s Mom`, look);
    m.state = 'toKid'; m.victim = kid.id; m.speed = 0.22;
    this.agents.push(m);
    this.advise('mom', 1440);
  }
  spawnLaundryMom() {
    const look = this.makeLook('mom'); look.shirt = '#b05fc4'; look.pants = '#b05fc4'; look.hairStyle = 2; look.hair = '#c9a35f'; look.hat = '';
    const m = this.baseAgent('mom', 'Your Mom', look);
    m.state = 'wander'; m.life = 100; m.speed = 0.2;
    m.thought = { text: this.pick(MOM_LAUNDRY), ttl: 120, mood: -1 };
    this.agents.push(m);
  }
  spawnSpecial(kind: 'llama' | 'inspector') {
    const look = this.makeLook(kind);
    if (kind === 'inspector') { look.shirt = '#ddd'; look.pants = '#333'; look.glasses = true; look.hat = ''; }
    const a = this.baseAgent(kind, kind === 'llama' ? 'A Llama' : 'Health Inspector Dolores', look);
    a.state = 'wander'; a.life = kind === 'llama' ? 360 : 150; a.speed = kind === 'llama' ? 0.1 : 0.12;
    this.agents.push(a);
    this.advise(kind, 0);
  }

  // ------------------------------------------------------------ network
  updateNetwork() {
    const routers = this.objects.filter(o => this.def(o).routerRadius && !o.broken && o.fire === 0);
    const capMult = this.researched.r_fiber ? 1.5 : 1;
    const load: Record<number, number> = {};
    const pcs = this.objects.filter(o => this.isPC(o));
    for (const p of pcs) {
      let best: Obj | null = null, bd = 1e9;
      for (const r of routers) {
        const d = Math.hypot(r.x - p.x, r.y - p.y);
        if (d <= this.def(r).routerRadius! && d < bd) { bd = d; best = r; }
      }
      p.routerId = best ? best.id : -1;
      (p as any)._dist = bd;
      if (best && p.user !== -1) load[best.id] = (load[best.id] || 0) + 1;
    }
    for (const p of pcs) {
      if (this.outage) { p.ping = 999; continue; }
      if (p.routerId === -1) { p.ping = 999; continue; }
      const r = this.obj(p.routerId)!;
      const cap = this.def(r).routerCap! * capMult;
      const l = load[r.id] || 0;
      p.ping = Math.round(22 + (p as any)._dist * 6 + (l > cap ? (l - cap) * 90 : 0) + (p.infected ? 80 : 0));
    }
  }
  // ------------------------------------------------------------ heat
  updateHeat() {
    const H = this.heat, T = this.tmpHeat;
    for (const o of this.objects) {
      const d = this.def(o);
      const i = this.idx(o.x, o.y);
      let s = 0;
      if (this.isPC(o)) s = (o.user !== -1 && !this.outage) ? d.heat : (d.idleHeat || 0);
      else s = d.heat;
      if (o.fire > 0) s += 0.8;
      H[i] += s * 6;
    }
    for (const a of this.agents) {
      if (a.kind !== 'customer') continue;
      const x = Math.round(a.x), y = Math.round(a.y);
      if (this.inB(x, y)) H[this.idx(x, y)] += 0.04;
    }
    if (!this.outage || this.researched.r_ups) for (const o of this.objects) {
      const d = this.def(o); if (!d.cool || o.broken) continue;
      const r = d.coolRadius!;
      for (let y = o.y - r; y <= o.y + r; y++) for (let x = o.x - r; x <= o.x + r; x++) {
        if (!this.inB(x, y)) continue;
        const dist = Math.hypot(x - o.x, y - o.y); if (dist > r + 0.5) continue;
        const i = this.idx(x, y);
        const f = 1 - dist / (r + 1);
        if (H[i] > 17) H[i] -= d.cool! * f * (0.5 + (H[i] - 17) * 0.06);
      }
    }
    for (let y = 0; y < this.H; y++) for (let x = 0; x < this.W; x++) {
      const i = this.idx(x, y);
      let sum = 0;
      for (const d of DIRS) {
        const nx = x + d[0], ny = y + d[1];
        sum += this.inB(nx, ny) ? H[this.idx(nx, ny)] : 22;
      }
      const h = H[i];
      T[i] = h + 0.22 * (sum / 4 - h) + (22 - h) * 0.012;
    }
    for (let i = 0; i < T.length; i++) if (T[i] > 85) T[i] = 85;
    H.set(T);
  }
  tileHeat(x: number, y: number) { x = Math.round(x); y = Math.round(y); return this.inB(x, y) ? this.heat[this.idx(x, y)] : 22; }
  // ------------------------------------------------------------ fire
  updateFires() {
    for (const o of this.objects) {
      if (o.fire > 0) {
        o.fire--;
        if (this.r() < 0.0022) {
          const n = this.objects.filter(q => q !== o && q.fire === 0 && !q.burnt && Math.abs(q.x - o.x) <= 1 && Math.abs(q.y - o.y) <= 1);
          if (n.length) { const v = this.pick(n); v.fire = 160; this.stats.fires++; }
        }
        if (o.fire === 0) {
          o.burnt = true; o.broken = true; o.infected = false;
          this.litter.push({ id: this.nextId++, x: o.x, y: o.y, kind: 'scorch', claim: -1, rot: 0 });
          this.emit({ t: 'balloon', title: 'Fire burned out', text: `${this.def(o).name} is now a charcoal sculpture. Repair it for $75.` });
        }
        continue;
      }
      if (!this.isPC(o) || o.broken || o.user === -1 || this.outage) continue;
      const h = this.heat[this.idx(o.x, o.y)];
      if (h > 46 && this.r() < 0.0009 * (h - 46) * (this.perk('insurance') ? 0.5 : 1)) {
        o.fire = 200; this.stats.fires++;
        this.advise('fire', 600);
        this.emit({ t: 'sfx', name: 'fire' });
        this.emit({ t: 'balloon', title: '🔥 FIRE!', text: `${this.def(o).name} at (${o.x},${o.y}) caught fire. Click it to extinguish ($100).` });
      }
    }
  }

  // ------------------------------------------------------------ spawning
  spawnLogic() {
    const h = this.hour();
    const dow = this.date().getDay();
    let base = h < 6 ? 0.009 : h < 10 ? 0.02 : h < 15 ? 0.042 : h < 19 ? 0.068 : 0.085;
    if (dow === 0 || dow === 6 || (dow === 5 && h >= 17)) base *= 1.4;
    base *= this.demandMult * (0.6 + this.rating * 0.1) * (this.tourney > 0 ? 3 : 1) * this.L.spawnMult * (1 + 0.12 * this.perk('mouth')) * (this.meta.profile?.fav === 'rs' ? 1.1 : 1);
    base *= this.buzz * 1.25;
    const pcs = this.objects.filter(o => this.isPC(o) && !o.broken).length;
    const cap = pcs + Math.max(1, Math.round(pcs * 0.25)) + (this.tourney > 0 ? 4 : 0);
    if (this.customers().length < cap && this.r() < base) {
      let arche: Arche | undefined;
      if (this.tourney > 0 && this.r() < 0.7) arche = 'tryhard';
      else if (this.demandMult > 1 && this.r() < 0.6) arche = 'neckbeard';
      const room = cap - this.customers().length;
      const groupSize = room >= 2 && this.r() < 0.2 ? Math.min(room, this.r() < 0.6 ? 2 : 3) : 1;
      const gid = groupSize > 1 ? this.nextGroup++ : 0;
      const tag = this.pick(CLAN_TAGS);
      for (let k = 0; k < groupSize; k++) {
        const a = this.spawnCustomer(arche);
        if (this.tourney > 0) { this.earn(15, 'Events', 0, this.doorY); a.flags!.tourney = true; }
        if (gid) {
          a.group = gid; a.name = (tag + a.name.replace(/^(xX_|xXx_|~\*|MLG_)/, '')).slice(0, 18);
          a.x = a.px = -1 - k * 0.6; a.y = a.py = this.doorY;
          if (k === 0) this.think(a, 'clanArrive', true, 1);
        }
      }
    }
  }

  // ------------------------------------------------------------ agents
  move(a: Agent): boolean {
    a.px = a.x; a.py = a.y;
    if (!a.path.length) return true;
    const n = a.path[0];
    const dx = n.x - a.x, dy = n.y - a.y;
    const d = Math.hypot(dx, dy);
    let sp = a.speed;
    if (a.kind === 'customer' && (a.bladder || 0) > 90) sp *= 1.4;
    if (d <= sp) { a.x = n.x; a.y = n.y; a.path.shift(); }
    else { a.x += dx / d * sp; a.y += dy / d * sp; }
    if (Math.abs(dx) > Math.abs(dy)) a.face = dx > 0 ? 0 : 2; else if (d > 0.01) a.face = dy > 0 ? 1 : 3;
    // re-validate next node
    if (a.path.length) {
      const nn = a.path[0];
      if (!this.walkable(nn.x, nn.y) && a.path.length > 1) {
        const dst = a.path[a.path.length - 1];
        if (!this.goTo(a, dst.x, dst.y)) a.path = [];
      }
    }
    return a.path.length === 0;
  }
  faceObj(a: Agent, o: Obj) {
    const dx = o.x - a.x, dy = o.y - a.y;
    a.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 0 : 2) : (dy > 0 ? 1 : 3);
  }
  randomFloorNear(x: number, y: number, r: number) {
    for (let k = 0; k < 20; k++) {
      const nx = Math.round(x) + this.ri(-r, r), ny = Math.round(y) + this.ri(-r, r);
      if (this.walkable(nx, ny) && this.inB(nx, ny) && this.useOcc[this.idx(nx, ny)] === -1) return { x: nx, y: ny };
    }
    return null;
  }
  wander(a: Agent, r = 4) {
    if (a.path.length) return;
    if (a.timer > 0) { a.timer--; return; }
    const p = this.randomFloorNear(a.x, a.y, r);
    if (p) this.goTo(a, p.x, p.y);
    a.timer = this.ri(10, 40);
  }

  updateAgent(a: Agent) {
    if (a.thought) { a.thought.ttl--; if (a.thought.ttl <= 0) a.thought = undefined; }
    switch (a.kind) {
      case 'customer': return this.updateCustomer(a);
      case 'mom': return this.updateMom(a);
      case 'janitor': return this.updateJanitor(a);
      case 'tech': return this.updateTech(a);
      case 'bouncer': return this.updateBouncer(a);
      case 'owner': return this.updateOwner(a);
      default: return this.updateSpecial(a);
    }
  }
  despawn(a: Agent) { this.leaveQueue(a); this.agents = this.agents.filter(q => q !== a); }

  updateCustomer(a: Agent) {
    if (a.thoughtCD! > 0) a.thoughtCD!--;
    const A = ARCHES.find(x => x.id === a.arche)!;
    const arrived = this.move(a);
    if (a.dead) { a.px = a.x; a.py = a.y; return; }
    // universal needs (when not leaving)
    if (a.state !== 'leave') {
      a.hunger = clamp(a.hunger! + 0.075 * A.hungerM, 0, 100);
      a.thirst = clamp(a.thirst! + 0.1 * A.thirstM, 0, 100);
      a.bladder = clamp(a.bladder! + 0.07 * (1 - 0.2 * this.perk('bladder')), 0, 100);
      const night = this.hour() < 6;
      if (a.state !== 'sleep') { a.tired = clamp(a.tired! + (night ? 0.12 : 0.06), 0, 100); a.awake!++; }
      a.hygiene = clamp(a.hygiene! - 0.025 * A.smellM, 0, 100);
      a.rage = clamp(a.rage! - 0.06, 0, 100);
      // accident
      if (a.bladder! >= 100 && a.state !== 'toilet' && a.state !== 'useToilet') {
        a.bladder = 0; a.hygiene = Math.max(0, a.hygiene! - 40); a.happy = Math.max(0, a.happy! - 25);
        this.dropLitter(a, 'puddle'); a.flags!.accident = true; this.stats.accidents++;
        this.think(a, 'accident', true, -1); this.advise('accident');
        if (!this.objects.some(o => o.type === 'toilet')) this.advise('accident', 720);
      }
      // smell aura effects on neighbours
      if (a.hygiene! < 25) {
        for (const b of this.agents) if (b !== a && b.kind === 'customer' && Math.abs(b.x - a.x) < 1.8 && Math.abs(b.y - a.y) < 1.8) {
          b.happy = clamp(b.happy! - 0.05, 0, 100);
          if (this.r() < 0.02) { this.think(b, 'smell', false, -1); if (this.r() < 0.3) b.flags!.smell = true; }
        }
        if (this.r() < 0.002) this.advise('smell');
      }
      // ghost / llama proximity
      for (const s of this.agents) {
        if ((s.kind === 'ghost' || s.kind === 'llama') && Math.abs(s.x - a.x) < 2 && Math.abs(s.y - a.y) < 2) {
          a.flags![s.kind] = true;
          if (s.kind === 'ghost') { a.rage = clamp(a.rage! + 0.15, 0, 100); }
          else a.happy = clamp(a.happy! + 0.02, 0, 100);
          if (this.r() < 0.03) this.think(a, s.kind, false, 0);
        }
      }
      // litter nearby
      const x = Math.round(a.x), y = Math.round(a.y);
      let lit = 0;
      for (const l of this.litter) if (l.kind !== 'scorch' && Math.abs(l.x - x) <= 2 && Math.abs(l.y - y) <= 2) lit += l.kind === 'puddle' ? 2 : 1;
      if (lit) { a.happy = clamp(a.happy! - 0.012 * lit, 0, 100); if (lit > 2 && this.r() < 0.01) { this.think(a, 'litter', false, -1); this.advise('litter'); } }
      // decor
      for (const o of this.objects) {
        const dd = this.def(o).decor; if (!dd) continue;
        if (Math.abs(o.x - x) <= 3 && Math.abs(o.y - y) <= 3) { a.happy = clamp(a.happy! + dd * 0.008, 0, 100); if (dd > 1 && this.r() < 0.002) this.think(a, 'decor', false, 1); }
        if (o.type === 'shrine' && Math.abs(o.x - x) <= 4 && Math.abs(o.y - y) <= 4) a.rage = clamp(a.rage! - 0.25, 0, 100);
      }
      // heat
      const h = this.tileHeat(x, y);
      if (h > 36) { a.happy = clamp(a.happy! - (h - 36) * 0.012, 0, 100); a.thirst = clamp(a.thirst! + (h - 36) * 0.01, 0, 100); if (h > 40 && this.r() < 0.02) { this.think(a, 'hot', false, -1); this.advise('hot'); } }
      // ragequit
      if (a.rage! >= 100 && a.state === 'play') return this.rageQuit(a);
    }

    if ((a.state === 'toService' || a.state === 'useService') && a.seat !== undefined && a.seat >= 0 && a.awayStart !== undefined) {
      const away = this.tick - a.awayStart;
      if (this.queue.length > 0 && away > 25) { this.releaseSeat(a); a.flags!.lostSeat = true; a.flags!.vip = true; }
    }
    switch (a.state) {
      case 'arrive': {
        if (this.rate > this.willingness(a) * 1.6) { this.think(a, 'price', true, -1); this.turnedAway++; return this.leave(a); }
        if (this.rate > this.willingness(a)) { a.happy! -= 12; this.think(a, 'pricey', true, 0); }
        if (this.tourney > 0 && this.r() < 0.4) this.think(a, 'tourney', true, 1);
        a.state = 'findPC';
        // fallthrough
      }
      case 'findPC': {
        // only jump ahead of the line if nobody is waiting (or you're returning from the toilet)
        const canCut = this.queue.length === 0 || (a.flags!.returning && !a.flags!.vip);
        const o = canCut ? this.findPC(a) : null;
        if (o) { a.flags!.returning = false; this.claimSeat(a, o); }
        else {
          if (a.flags!.returning && a.flags!.lostSeat && !a.flags!.vip) this.think(a, 'seatLost', true, -1);
          a.flags!.returning = false;
          this.joinQueue(a);
          const n = this.queuePos(a) + 1;
          if (n > 1) { a.thought = { text: this.pick(THOUGHTS.queue || ['#%n in line']).replace('%n', String(n)), ttl: 120, mood: 0 }; a.thoughtCD = 120; }
          else this.think(a, 'noPC', true, 0);
        }
        return;
      }
      case 'waitPC': {
        a.wait!++;
        const pos = this.queuePos(a);
        if (pos < 0) { this.joinQueue(a); return; }
        if (a.wait! % 5 === 0) this.goToQueueSpot(a);
        // FIFO: the front of the line grabs the next seat. Friends of the front person can come along if there's room.
        const front = this.agent(this.queue[0]);
        if (a.wait! % 3 === 0 && pos > 0 && front && front.group && front.group === a.group) {
          const o = this.findPC(a);
          if (o) { this.claimSeat(a, o); return; }
        }
        if (pos === 0 && a.wait! % 40 === 10 && (a.thoughtCD || 0) <= 0) this.think(a, 'queueFront', false, 0);
        else if (a.wait! % 50 === 25 && (a.thoughtCD || 0) <= 0) {
          const saved = this.objects.find(o => this.isPC(o) && o.user === -1 && o.reserved !== -1);
          if (saved && this.r() < 0.6) { a.thought = { text: this.pick(THOUGHTS.savedSeat || ['seat is saved']).replace('%n', String(this.objects.filter(q => this.isPC(q)).indexOf(saved) + 1)), ttl: 110, mood: 0 }; a.thoughtCD = 140; }
          else this.think(a, 'queueBored', false, 0);
        }
        if (a.wait! > (a.patience || 50)) { this.think(a, 'waitLong', true, -1); this.turnedAway++; this.rating = clamp(this.rating - 0.002, 0, 5); this.leave(a); }
        return;
      }
      case 'toPC': {
        const o = this.obj(a.seat!);
        if (!o || o.broken || o.fire) { this.releaseSeat(a); a.state = 'findPC'; return; }
        if (arrived) {
          const u = this.useTileOf(o);
          if (Math.round(a.x) !== u.x || Math.round(a.y) !== u.y) { if (!this.goTo(a, u.x, u.y)) { this.releaseSeat(a); a.state = 'findPC'; } return; }
          o.user = a.id; o.reserved = a.id; a.state = 'play'; this.faceObj(a, o);
          if (!a.flags!.counted) { a.flags!.counted = true; this.served++; }
        }
        return;
      }
      case 'play': return this.updatePlay(a, A);
      case 'toService': {
        const o = this.obj(a.target);
        if (!o) { this.backToPC(a); return; }
        if (arrived) {
          this.faceObj(a, o);
          if (o.type === 'toilet' || o.type === 'shower' || o.type === 'couch') {
            if (o.user !== -1 && o.user !== a.id) { a.timer = (a.timer || 0) + 1; if (a.timer > 60) { a.timer = 0; this.backToPC(a); } return; }
            o.user = a.id; a.state = 'useService'; a.timer = o.type === 'toilet' ? 12 : o.type === 'shower' ? 20 : this.ri(120, 240);
            if (o.type === 'shower') { this.think(a, 'shower', true, 0); a.flags!.shower = true; }
            if (o.type === 'couch') this.think(a, 'sleepCouch', true, 0);
            return;
          }
          // fridge / vending: instant purchase
          if (o.type === 'fridge') {
            if (a.cash! >= this.drinkPrice) { a.cash! -= this.drinkPrice; a.spent! += this.drinkPrice; this.earn(this.drinkPrice, 'Drinks', o.x, o.y); a.thirst = 0; a.bladder = clamp(a.bladder! + 18, 0, 100); a.tired = clamp(a.tired! - 15, 0, 100); a.happy = clamp(a.happy! + 4, 0, 100); this.emit({ t: 'sfx', name: 'kaching' }); a.flags!.litterPending = true; }
            else this.think(a, 'broke', true, -1);
          } else if (o.type === 'vending') {
            if (a.cash! >= this.foodPrice) { a.cash! -= this.foodPrice; a.spent! += this.foodPrice; this.earn(this.foodPrice, 'Food', o.x, o.y); a.hunger = 0; a.happy = clamp(a.happy! + 5, 0, 100); this.emit({ t: 'sfx', name: 'kaching' }); a.flags!.litterPending = true; }
            else this.think(a, 'broke', true, -1);
          }
          this.backToPC(a);
        }
        return;
      }
      case 'useService': {
        a.timer!--;
        const o = this.obj(a.target);
        if (!o) { this.backToPC(a); return; }
        if (o.type === 'couch') { a.tired = clamp(a.tired! - 0.7, 0, 100); a.awake = 0; }
        if (a.timer! <= 0) {
          if (o.type === 'toilet') { a.bladder = 0; a.happy = clamp(a.happy! + 5, 0, 100); }
          if (o.type === 'shower') { a.hygiene = 100; a.happy = clamp(a.happy! + 3, 0, 100); }
          if (o.type === 'couch') { a.tired = 0; a.awake = 0; }
          o.user = -1;
          this.backToPC(a);
        }
        return;
      }
      case 'sleep': {
        a.timer!--; a.tired = clamp(a.tired! - 0.5, 0, 100); a.awake = 0;
        if (a.timer! % 60 === 0) this.bill(a, 60, true);
        if (a.timer! <= 0) { a.state = 'play'; a.tired = 5; }
        return;
      }
      case 'dragged': {
        if (arrived && Math.round(a.x) === -1) { this.finishCustomer(a); }
        else if (arrived) this.goTo(a, -1, this.doorY);
        return;
      }
      case 'leave': {
        if (arrived) {
          if (Math.round(a.x) === -1 && Math.round(a.y) === this.doorY) this.finishCustomer(a);
          else if (!this.goTo(a, -1, this.doorY)) { a.x = a.px = -1; a.y = a.py = this.doorY; this.finishCustomer(a); }
        }
        return;
      }
    }
  }
  finishCustomer(a: Agent) {
    if ((a.played || 0) > 20 || Object.keys(a.flags || {}).some(k => REVIEW_SPECIAL[k])) this.postReview(a);
    this.despawn(a);
  }
  awayFromSeat(a: Agent) {
    a.awayStart = this.tick;
    if (this.queue.length > 0) { this.releaseSeat(a); a.flags!.vip = true; }
    else if (this.r() < 0.35) this.think(a, 'seatSaver', true, 0);
  }
  backToPC(a: Agent) {
    a.flags!.returning = true;
    if (a.flags!.litterPending) { a.flags!.litterPending = false; a.flags!.carryTrash = true; a.timer = this.ri(20, 80); }
    const o = a.seat !== undefined && a.seat >= 0 ? this.obj(a.seat) : undefined;
    if (o && !o.broken && !o.fire) { const u = this.useTileOf(o); a.target = o.id; a.state = 'toPC'; if (!this.goTo(a, u.x, u.y)) { this.releaseSeat(a); a.state = 'findPC'; } }
    else { this.releaseSeat(a); a.state = 'findPC'; }
  }
  bill(a: Agent, minutes: number, show: boolean) {
    const amt = this.rate * minutes / 60;
    if (a.cash! < amt) { this.think(a, 'broke', true, -1); this.leave(a, ''); return false; }
    a.cash! -= amt; a.spent! += amt;
    this.earn(amt, 'PC Time', a.x, a.y, show);
    return true;
  }
  rageQuit(a: Agent) {
    const o = a.seat !== undefined && a.seat >= 0 ? this.obj(a.seat) : undefined;
    this.think(a, 'ragequit', true, -1);
    if (o) { o.broken = true; this.emit({ t: 'smash', x: o.x, y: o.y }); this.emit({ t: 'sfx', name: 'smash' }); this.stats.smashes++; }
    this.advise('ragequit');
    a.happy = Math.min(a.happy!, 15);
    for (const b of this.customers()) if (b !== a && Math.hypot(b.x - a.x, b.y - a.y) < 3) { b.rage = clamp(b.rage! + 12, 0, 100); }
    this.leave(a, 'ragequit');
  }
  updatePlay(a: Agent, A: typeof ARCHES[0]) {
    if (this.meta.profile?.fav === 'cs') A = { ...A, rageM: A.rageM * 0.85 };
    const o = this.obj(a.seat!);
    if (!o) { a.state = 'findPC'; return; }
    if (o.fire > 0 || o.broken) {
      if (o.fire > 0) { a.flags!.fire = true; this.think(a, 'fire', true, -1); a.happy = clamp(a.happy! - 20, 0, 100); }
      this.releaseSeat(a); a.state = 'findPC';
      return;
    }
    o.user = a.id;
    a.played!++;
    // stuck on a PC with no internet? move to a working free one
    if (o.ping >= 999 && !this.outage && a.played! % 20 === 5) {
      const better = this.objects.find(q => this.isPC(q) && q !== o && !q.broken && q.fire === 0 && q.user === -1 && q.reserved === -1 && q.ping < 999);
      if (better) { const u = this.useTileOf(better); if (this.goTo(a, u.x, u.y)) { this.releaseSeat(a); this.claimSeat(a, better); this.think(a, 'switchSeat', true, 0); return; } }
    }
    // friends nearby?
    if (a.group && a.played! % 30 === 0) {
      const near = this.agents.some(f => f !== a && f.group === a.group && f.state === 'play' && Math.hypot(f.x - a.x, f.y - a.y) <= 1.8);
      if (near) { a.happy = clamp(a.happy! + 0.6, 0, 100); if (this.r() < 0.25) this.think(a, this.r() < 0.5 ? 'clanTogether' : 'clanBanter', false, 1); }
      else if (this.agents.some(f => f !== a && f.group === a.group && f.state === 'play')) { a.happy = clamp(a.happy! - 0.3, 0, 100); if (this.r() < 0.2) this.think(a, 'clanApart', false, -1); }
    }
    // billing every hour with a popup
    if (a.played! % 60 === 0) { if (!this.bill(a, 60, true)) return; }
    // fun
    const q = this.def(o).quality || 1;
    let fun = 0.05 * q + 0.025;
    if (o.ping >= 999) { fun -= 0.5; a.rage = clamp(a.rage! + 0.25 * A.rageM, 0, 100); if (this.r() < 0.05) { this.think(a, this.outage ? 'outage' : 'noNet', false, -1); if (!this.outage) this.advise('noNet', 360); } }
    else if (o.ping > 220) { fun -= 0.22; a.rage = clamp(a.rage! + 0.18 * A.rageM, 0, 100); if (this.r() < 0.03) { this.think(a, 'ping', false, -1); this.advise('ping', 480); } }
    else if (o.ping > 110) { fun -= 0.06; a.rage = clamp(a.rage! + 0.05 * A.rageM, 0, 100); if (this.r() < 0.01) this.think(a, 'ping', false, -1); }
    if (o.infected) { fun -= 0.12; a.flags!.virus = true; if (this.r() < 0.03) this.think(a, 'virus', false, -1); }
    if (this.rickroll) fun += 0.05;
    if (this.musicVibe === 'banger') { fun += 0.008; if (this.r() < 0.0015) this.think(a, 'banger', false, 1); }
    else if (this.musicVibe === 'cursed') { fun -= 0.006; if (this.r() < 0.003) this.think(a, 'cursedMusic', false, -1); }
    if (this.tourney > 0) { fun += 0.05; a.rage = clamp(a.rage! + 0.04 * A.rageM, 0, 100); }
    a.happy = clamp(a.happy! + fun, 0, 100);
    // random rage spike (lost a round)
    if (this.r() < 0.004 * A.rageM) {
      a.rage = clamp(a.rage! + this.ri(8, 22), 0, 100); this.think(a, 'rage', false, -1);
      const nb = this.customers().find(b => b !== a && b.state === 'play' && Math.hypot(b.x - a.x, b.y - a.y) <= 1.6 && (b.thoughtCD || 0) <= 0);
      if (nb && this.r() < 0.35) { if (nb.group && nb.group === a.group) { this.think(nb, 'consoleNeighbor', true, 1); a.rage = clamp(a.rage! - 6, 0, 100); } else this.think(nb, 'trashTalk', true, 0); }
    }
    if (a.happy! > 80 && this.r() < 0.006) {
      this.think(a, 'happy', false, 1);
      const fr = this.customers().find(b => b !== a && b.group && b.group === a.group && b.state === 'play' && (b.thoughtCD || 0) <= 0);
      if (fr && this.r() < 0.4) this.think(fr, 'cheer', true, 1);
    }
    // litter after snack
    if (a.flags!.carryTrash) { a.timer!--; if (a.timer! <= 0) { a.flags!.carryTrash = false; this.dropLitter(a, this.r() < 0.5 ? 'can' : 'pizza'); } }
    // marathon death
    if (a.marathon && a.awake! > 48 * 60) {
      a.dead = true; a.state = 'dead'; this.deaths++;
      this.emit({ t: 'death', id: a.id, name: a.name });
      this.advise('death', 0);
      this.emit({ t: 'sfx', name: 'error' });
      return;
    }
    // needs
    if (a.bladder! > 80) {
      const t = this.findService(a, ['toilet']);
      if (t) { a.target = t.id; a.state = 'toService'; a.timer = 0; o.user = -1; this.awayFromSeat(a); return; }
      if (this.r() < 0.02) this.think(a, this.objects.some(x => x.type === 'toilet') ? 'bladder' : 'noToilet', false, -1);
    }
    if (a.thirst! > 70) {
      const t = this.findService(a, ['fridge']);
      if (t) { a.target = t.id; a.state = 'toService'; o.user = -1; this.awayFromSeat(a); return; }
      if (this.r() < 0.02) this.think(a, 'noDrink', false, -1);
      a.happy = clamp(a.happy! - 0.04, 0, 100);
    }
    if (a.hunger! > 75) {
      const t = this.findService(a, ['vending']);
      if (t) { a.target = t.id; a.state = 'toService'; o.user = -1; this.awayFromSeat(a); return; }
      if (this.r() < 0.02) { const hasV = this.objects.some(x => x.type === 'vending'); this.think(a, hasV ? 'hungry' : 'noFood', false, -1); if (!hasV) this.advise('noFood', 600); }
      a.happy = clamp(a.happy! - 0.02, 0, 100);
    }
    if (a.hygiene! < 20 && this.objects.some(x => x.type === 'shower') && this.r() < 0.02) {
      const t = this.findService(a, ['shower']);
      if (t) { a.target = t.id; a.state = 'toService'; o.user = -1; this.awayFromSeat(a); return; }
    }
    if (a.tired! > 92 && !a.marathon) {
      const c = this.findService(a, ['couch']);
      if (c && c.user === -1) { a.target = c.id; a.state = 'toService'; o.user = -1; this.releaseSeat(a); return; }
      a.state = 'sleep'; a.timer = this.ri(90, 200); this.think(a, 'tired', true, 0);
      return;
    }
    if (a.tired! > 75 && this.r() < 0.01) this.think(a, 'tired', false, 0);
    // done?
    if (a.played! >= a.wantMin!) {
      const extra = a.played! % 60; if (extra > 5) this.bill(a, extra, true);
      if (a.happy! > 60) this.think(a, 'leaveHappy', true, 1);
      this.leave(a);
    }
  }

  updateMom(m: Agent) {
    const kid = this.agent(m.victim!);
    const arrived = this.move(m);
    if (m.state === 'wander') {
      this.wander(m, 4); m.life!--;
      if (this.r() < 0.012) m.thought = { text: this.pick(MOM_LAUNDRY), ttl: 110, mood: -1 };
      for (const c of this.customers()) if (Math.abs(c.x - m.x) < 2 && Math.abs(c.y - m.y) < 2 && this.r() < 0.01) { c.thought = { text: this.pick(['hi mrs. LAN LORD', 'ur mom is so nice', 'is she gonna make pizza rolls?']), ttl: 90, mood: 1 }; c.happy = clamp((c.happy || 0) + 2, 0, 100); }
      if (m.life! <= 0) { m.state = 'leave'; this.goTo(m, -1, this.doorY); }
      return;
    }
    if (m.state === 'toKid') {
      if (!kid || kid.state === 'leave' || kid.kind !== 'customer') { m.state = 'leave'; this.goTo(m, -1, this.doorY); return; }
      if (!m.path.length && !arrived) { }
      if (arrived) {
        const d = Math.hypot(kid.x - m.x, kid.y - m.y);
        if (d < 1.3) {
          m.thought = { text: this.pick(THOUGHTS.momSays), ttl: 120, mood: -1 };
          this.think(kid, 'mom', true, -1);
          kid.rage = clamp(kid.rage! + 40, 0, 100);
          this.releaseSeat(kid);
          kid.flags!.mom = true;
          kid.state = 'dragged'; kid.speed = 0.22; this.goTo(kid, -1, this.doorY);
          m.state = 'leave'; this.goTo(m, -1, this.doorY);
          this.emit({ t: 'sfx', name: 'mom' });
        } else {
          const t = this.randomFloorNear(kid.x, kid.y, 1) || { x: Math.round(kid.x), y: Math.round(kid.y) };
          if (!this.goTo(m, t.x, t.y)) { m.state = 'leave'; this.goTo(m, -1, this.doorY); }
        }
      }
      return;
    }
    if (arrived && Math.round(m.x) === -1) this.despawn(m);
    else if (arrived) this.goTo(m, -1, this.doorY);
  }
  updateOwner(a: Agent) {
    this.move(a);
    this.wander(a, 6);
    if (this.r() < 0.004) a.thought = { text: this.r() < 0.2 && this.meta.profile?.away ? 'AIM away msg: "' + this.meta.profile.away + '"' : this.pick(OWNER_LINES), ttl: 120, mood: 1 };
    if (this.objects.some(o => o.fire > 0) && this.r() < 0.02) a.thought = { text: this.pick(['NOT AGAIN', 'FIRE!!! (this is fine)', 'where is the extinguisher', 'insurance pls']), ttl: 100, mood: -1 };
    if (this.money < 0 && this.r() < 0.01) a.thought = { text: 'I should call Mom', ttl: 100, mood: -1 };
  }
  updateJanitor(a: Agent) {
    const arrived = this.move(a);
    if (a.state === 'leave') { if (arrived) this.despawn(a); return; }
    if (a.state === 'idle') {
      const cands = this.litter.filter(l => l.claim === -1).sort((p, q) => (Math.abs(p.x - a.x) + Math.abs(p.y - a.y)) - (Math.abs(q.x - a.x) + Math.abs(q.y - a.y)));
      for (const l of cands) if (this.goTo(a, l.x, l.y)) { l.claim = a.id; a.target = l.id; a.state = 'toJob'; return; }
      this.wander(a, 5);
      return;
    }
    if (a.state === 'toJob') {
      const l = this.litter.find(q => q.id === a.target);
      if (!l) { a.state = 'idle'; return; }
      if (arrived) { a.state = 'work'; a.timer = l.kind === 'scorch' ? 25 : 8; }
      return;
    }
    if (a.state === 'work') {
      a.timer!--;
      if (a.timer! <= 0) { this.litter = this.litter.filter(q => q.id !== a.target); a.state = 'idle'; if (this.r() < 0.1) a.thought = { text: this.pick(['another day another puddle', 'I have seen things', 'why is it warm', 'mop life']), ttl: 80, mood: 0 }; }
    }
  }
  techJobTile(o: Obj) {
    if (this.def(o).useTile) { const u = this.useTileOf(o); return u; }
    for (const d of DIRS) if (this.walkable(o.x + d[0], o.y + d[1])) return { x: o.x + d[0], y: o.y + d[1] };
    return null;
  }
  updateTech(a: Agent) {
    const arrived = this.move(a);
    if (a.state === 'leave') { if (arrived) this.despawn(a); return; }
    if (a.state === 'idle') {
      const jobs = this.objects.filter(o => o.claim === -1 && (o.fire > 0 || o.broken || o.infected))
        .sort((p, q) => (q.fire > 0 ? 100 : 0) - (p.fire > 0 ? 100 : 0) || (Math.abs(p.x - a.x) + Math.abs(p.y - a.y)) - (Math.abs(q.x - a.x) + Math.abs(q.y - a.y)));
      for (const o of jobs) { const t = this.techJobTile(o); if (t && this.goTo(a, t.x, t.y)) { o.claim = a.id; a.target = o.id; a.state = 'toJob'; return; } }
      this.wander(a, 3);
      return;
    }
    const o = this.obj(a.target);
    if (!o) { a.state = 'idle'; return; }
    if (a.state === 'toJob' && arrived) { a.state = 'work'; a.timer = o.fire > 0 ? 8 : o.broken ? 30 : 18; this.faceObj(a, o); }
    if (a.state === 'work') {
      a.timer!--;
      if (o.fire > 0 && a.timer! % 3 === 0) this.emit({ t: 'foam', x: o.x, y: o.y });
      if (a.timer! <= 0) {
        if (o.fire > 0) { o.fire = 0; o.broken = true; a.timer = 30; this.emit({ t: 'sfx', name: 'foam' }); return; }
        if (o.broken) { o.broken = false; o.burnt = false; this.litter = this.litter.filter(l => !(l.kind === 'scorch' && l.x === o.x && l.y === o.y)); }
        else if (o.infected) o.infected = false;
        if (o.infected) { a.timer = 18; return; }
        o.claim = -1; a.state = 'idle';
        if (this.r() < 0.15) a.thought = { text: this.pick(['have you tried turning it off and on', 'PEBKAC', 'who downloaded LimeWire AGAIN', 'I use Linux btw']), ttl: 80, mood: 0 };
      }
    }
  }
  updateBouncer(a: Agent) {
    const arrived = this.move(a);
    if (a.state === 'leave') { if (arrived && a.target === -1) this.despawn(a); else if (arrived) { a.state = 'idle'; } return; }
    if (a.state === 'idle') {
      const v = this.customers().find(c => (c.rage || 0) > 78 && c.state === 'play' && !this.agents.some(b => b.kind === 'bouncer' && b.target === c.id));
      if (v && this.goTo(a, Math.round(v.x), Math.round(v.y))) { a.target = v.id; a.state = 'toJob'; return; }
      if (!a.path.length && Math.hypot(a.x - 2, a.y - this.doorY) > 3) { const p = this.randomFloorNear(2, this.doorY - 1, 2); if (p) this.goTo(a, p.x, p.y); }
      return;
    }
    if (a.state === 'toJob') {
      const v = this.agent(a.target);
      if (!v || v.state === 'leave') { a.state = 'idle'; a.target = -1; return; }
      if (arrived) {
        if (Math.hypot(v.x - a.x, v.y - a.y) < 1.5) {
          a.thought = { text: this.pick(['time to go, champ', 'you\'re done, buddy', 'out. now.', 'nap time']), ttl: 100, mood: 0 };
          v.rage = 50; this.think(v, 'ragequit', true, -1);
          this.leave(v, 'bounced');
          a.state = 'idle'; a.target = -1;
        } else if (!this.goTo(a, Math.round(v.x), Math.round(v.y))) { a.state = 'idle'; a.target = -1; }
      }
    }
  }
  updateSpecial(a: Agent) {
    const arrived = this.move(a);
    if (a.state === 'leave') { if (arrived) { if (Math.round(a.x) === -1) this.despawn(a); else this.goTo(a, -1, this.doorY); } return; }
    a.life!--;
    if (a.kind === 'ghost') {
      // ghosts float through anything — drift randomly
      if (!a.path.length) { const p = this.randomFloorNear(a.x, a.y, 5); if (p) this.goTo(a, p.x, p.y); }
      if (this.r() < 0.004) a.thought = { text: this.pick(['boooo', 'one more game...', 'I died doing what I loved', 'gg']), ttl: 90, mood: 0 };
      if (a.life! <= 0) this.despawn(a);
      return;
    }
    this.wander(a, 4);
    if (a.kind === 'llama') {
      const plant = this.objects.find(o => o.type === 'plant' && Math.abs(o.x - a.x) + Math.abs(o.y - a.y) <= 1);
      if (plant && this.r() < 0.02) { this.removeObj(plant, false); a.thought = { text: '*munch* (llama ate your plant)', ttl: 120, mood: 0 }; this.emit({ t: 'sfx', name: 'munch' }); }
      else if (this.r() < 0.004) a.thought = { text: this.pick(['...', 'llama.', '*judges you*', '*spits*']), ttl: 80, mood: 0 };
    }
    if (a.life! <= 0) {
      if (a.kind === 'inspector') {
        const dirt = this.litter.filter(l => l.kind !== 'scorch').length;
        const stink = this.customers().filter(c => (c.hygiene || 100) < 25).length;
        if (dirt > 4 || stink > 2) { this.spend(500, 'Fines', a.x, a.y); this.rating = clamp(this.rating - 0.2, 0, 5); this.emit({ t: 'inspection', pass: false, dirt, stink }); }
        else { this.rating = clamp(this.rating + 0.2, 0, 5); this.emit({ t: 'inspection', pass: true, dirt, stink }); }
      }
      a.state = 'leave'; this.goTo(a, -1, this.doorY);
    }
  }

  // ------------------------------------------------------------ save / load
  save() {
    return JSON.stringify({
      v: 2, loc: this.loc, totalEarned: this.totalEarned, buzz: this.buzz, tick: this.tick, money: this.money, rating: this.rating, rate: this.rate, drinkPrice: this.drinkPrice, foodPrice: this.foodPrice,
      researched: this.researched, researching: this.researching, staff: this.staffHired, debt: this.debt, served: this.served,
      peak: this.peakCustomers, reviews: this.reviews.slice(0, 30), regulars: this.regulars, days: this.days, cash: this.cashHistory,
      objects: this.objects.map(o => [o.type, o.x, o.y, o.dir, o.broken ? 1 : 0]), goals: this.goalsDone, nextId: this.nextId,
    });
  }
  load(json: string) {
    const s = JSON.parse(json);
    this.objects = []; this.agents = []; this.litter = [];
    this.occ.fill(-1); this.useOcc.fill(-1); this.heat.fill(22);
    Object.assign(this, { totalEarned: s.totalEarned || 0, buzz: s.buzz ?? this.buzz, tick: s.tick, money: s.money, rating: s.rating, rate: s.rate, drinkPrice: s.drinkPrice, foodPrice: s.foodPrice, researched: s.researched, researching: s.researching, debt: s.debt, served: s.served, peakCustomers: s.peak, reviews: s.reviews, regulars: s.regulars, days: s.days, cashHistory: s.cash, goalsDone: s.goals, nextId: s.nextId });
    for (const o of s.objects) { const ob = this.place(o[0], o[1], o[2], o[3], true); if (ob && o[4]) ob.broken = true; }
    this.staffHired = { janitor: 0, tech: 0, bouncer: 0 };
    for (const k of ['janitor', 'tech', 'bouncer'] as const) for (let i = 0; i < (s.staff[k] || 0); i++) this.hire(k);
    this.spawnOwner();
    this.events = [];
  }
}
function t_since(now: number, then: number) { return now - then; }
