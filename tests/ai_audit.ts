// Self-contained headless AI quality & metrics audit for LAN LORD XP.
// Build & run from project root (PowerShell):
//   npx.cmd esbuild tests/ai_audit.ts --bundle --platform=node --outfile=tests/ai_audit.cjs --log-level=warning; node tests/ai_audit.cjs

import { Sim, Agent, Obj } from '../src/sim';
import { newMeta } from '../src/data';

const SEEDS = [101, 202, 303];
const DAYS = 5;
const TICKS_PER_DAY = 1440;
const TOTAL_TICKS = DAYS * TICKS_PER_DAY;
const SAMPLE_EVERY = 5;

type HealthStatus = 'PASS' | 'WARN' | 'FAIL';

interface ScenarioDef {
  id: string;
  name: string;
  desc: string;
  loc: number;
  isCapacityStress?: boolean;
  setup: (s: Sim) => void;
}

interface SeedMetrics {
  seed: number;
  pcs: number;
  routers: number;
  samples: number;
  waitWhileFreeSamples: number;
  waitWhileEmptyResSamples: number;
  reserverStateHist: Record<string, number>;
  orphanResChecks: number;
  orphanSamples: number;
  noNetWhileFreeSamples: number;
  waitTimes: number[];
  avgWait: number;
  p90Wait: number;
  arrivals: number;
  satCount: number;
  leftNoPlayCount: number;
  leftNoPlayPct: number;
  stuckMoving: number;
  stuckMovingByState: Record<string, number>;
  stuckWaitingIdle: number;
  stuckUnknown: number;
  pathFailures: number;
  rating: number;
  served: number;
  turnedAway: number;
  money: number;
  buzzEnd: number;
  starCounts: Record<number, number>;
  reviewCount: number;
  gameOver: boolean;
}

interface ScenarioAvg {
  def: ScenarioDef;
  runs: SeedMetrics[];
  pcs: number;
  routers: number;
  waitWhileFreePct: number;
  waitWhileEmptyResPct: number;
  awayResSharePct: number;
  reserverStateHist: Record<string, number>;
  orphanResChecksAvg: number;
  orphanSamplesPct: number;
  noNetWhileFreePct: number;
  avgWait: number;
  p90Wait: number;
  leftNoPlayPct: number;
  stuckMovingAvg: number;
  stuckMovingByState: Record<string, number>;
  stuckWaitingIdleAvg: number;
  stuckUnknownAvg: number;
  pathFailuresAvg: number;
  rating: number;
  served: number;
  turnedAway: number;
  money: number;
  buzzEnd: number;
  starCountsTotal: Record<number, number>;
  reviewCountTotal: number;
}

const STATIONARY_OK_STATES = new Set([
  'play', 'sleep', 'useService', 'dead', 'work', 'idle', 'wander', 'arrive', 'findPC',
]);

function isWaitingState(state: string): boolean {
  const s = (state || '').toLowerCase();
  return s.includes('wait') || s.includes('queue');
}

function classifyState(state: string, hasPath: boolean): 'waiting' | 'moving' | 'stationary' | 'unknown' {
  const raw = state || '';
  if (isWaitingState(raw)) return 'waiting';
  const s = raw.toLowerCase();
  if (
    s === 'topc' || s === 'toservice' || s === 'leave' || s === 'dragged' ||
    s === 'tojob' || s === 'tokid' ||
    s.startsWith('to') || s.includes('walk') || s.includes('move') || s.includes('exit')
  ) {
    return 'moving';
  }
  if (STATIONARY_OK_STATES.has(raw)) return 'stationary';
  return hasPath ? 'moving' : 'unknown';
}

function isPCFree(o: Obj): boolean {
  return !o.broken && !o.burnt && !(o.fire > 0) && o.user === -1 && o.reserved === -1;
}

function isAtServiceOrPCDest(s: Sim, a: Agent): boolean {
  const st = a.state || '';
  const oid = st === 'toPC'
    ? (typeof a.seat === 'number' && a.seat >= 0 ? a.seat : a.target)
    : a.target;
  if (typeof oid !== 'number' || oid < 0) return false;
  const o = s.obj(oid);
  if (!o) return false;
  const def = s.def(o);
  const dest = def?.useTile ? s.useTileOf(o) : { x: o.x, y: o.y };
  return Math.round(a.x) === dest.x && Math.round(a.y) === dest.y;
}

function percentile(sorted: number[], q: number): number {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil(q * sorted.length) - 1));
  return sorted[idx];
}

function mean(vals: number[]): number {
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
}

const SCENARIOS: ScenarioDef[] = [
  {
    id: 'A',
    name: 'A: Basement+',
    desc: 'loc 0 starter + 3 pc_beige + toilet/fridge/vending, buzz=1.0',
    loc: 0,
    setup: (s) => {
      s.buzz = 1.0;
      for (let i = 0; i < 3; i++) s.placeSomewhere('pc_beige', 1);
      s.placeSomewhere('toilet', 1);
      s.placeSomewhere('fridge', 1);
      s.placeSomewhere('vending', 1);
    },
  },
  {
    id: 'B',
    name: 'B: StripMall',
    desc: 'loc 1 w/ 10 PCs, 2 routers, vending/fridge/2 toilets/AC/trash + janitor',
    loc: 1,
    setup: (s) => {
      s.placeSomewhere('router', 0);
      for (let i = 0; i < 7; i++) s.placeSomewhere('pc_beige', 1);
      s.placeSomewhere('vending', 1);
      s.placeSomewhere('toilet', 1);
      s.placeSomewhere('ac', 0);
      s.placeSomewhere('trash', 0);
      s.hire('janitor');
    },
  },
  {
    id: 'C',
    name: 'C: Blockbuster',
    desc: 'loc 2 w/ 18 PCs, 2 routers, vending/fridge/2 toilets/2 AC/trash + janitor/tech',
    loc: 2,
    setup: (s) => {
      s.placeSomewhere('router', 0);
      for (let i = 0; i < 14; i++) s.placeSomewhere('pc_beige', 1);
      s.placeSomewhere('vending', 1);
      s.placeSomewhere('toilet', 1);
      s.placeSomewhere('ac', 0);
      s.placeSomewhere('ac', 0);
      s.placeSomewhere('trash', 0);
      s.hire('janitor');
      s.hire('tech');
    },
  },
  {
    id: 'D',
    name: 'D: UnderBuilt',
    desc: 'loc 0 starter only (2 PCs, no amenities), buzz=1.0 (queue stress)',
    loc: 0,
    isCapacityStress: true,
    setup: (s) => {
      s.buzz = 1.0;
    },
  },
];

function runSeed(def: ScenarioDef, seed: number): SeedMetrics {
  const s = new Sim(seed, def.loc, newMeta());
  s.newGame();
  def.setup(s);

  const starCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let reviewCount = 0;
  const origPostReview = s.postReview.bind(s);
  s.postReview = (a: Agent) => {
    const prevTop = s.reviews[0];
    origPostReview(a);
    const newest = s.reviews[0];
    if (newest && newest !== prevTop) {
      const st = Math.max(1, Math.min(5, Math.round(Number(newest.stars) || 1)));
      starCounts[st] = (starCounts[st] || 0) + 1;
      reviewCount++;
    }
  };

  let samples = 0;
  let waitWhileFreeSamples = 0;
  let waitWhileEmptyResSamples = 0;
  const reserverStateHist: Record<string, number> = {};
  let orphanResChecks = 0;
  let orphanSamples = 0;
  let noNetWhileFreeSamples = 0;

  // Per-customer arrival -> sit / leave-without-playing tracking
  const custTracks = new Map<number, { arrivedAt: number; satAt: number | null; leftNoPlay: boolean }>();
  const waitTimes: number[] = [];

  // Per-agent stuck & path-failure tracking (all agents)
  const agentMotion = new Map<number, {
    x: number;
    y: number;
    state: string;
    stillTicks: number;
    pathFailTicks: number;
    flaggedMoving: boolean;
    flaggedWait: boolean;
    flaggedUnknown: boolean;
    flaggedPathFail: boolean;
  }>();
  let stuckMoving = 0;
  const stuckMovingByState: Record<string, number> = {};
  let stuckWaitingIdle = 0;
  let stuckUnknown = 0;
  let pathFailures = 0;

  for (let t = 1; t <= TOTAL_TICKS; t++) {
    s.step();
    s.events.length = 0;

    const pcs = s.objects.filter((o) => s.isPC(o));
    const custs = s.customers();
    const custIds = new Set<number>();

    for (const c of custs) {
      custIds.add(c.id);
      let tr = custTracks.get(c.id);
      if (!tr) {
        tr = { arrivedAt: t, satAt: null, leftNoPlay: false };
        custTracks.set(c.id, tr);
      }
      const st = String(c.state || '');
      const seatedOnPC = pcs.some((o) => o.user === c.id);
      if (tr.satAt === null && (st === 'play' || (c.played || 0) > 0 || seatedOnPC)) {
        tr.satAt = t;
        waitTimes.push(t - tr.arrivedAt);
      } else if (tr.satAt === null && !tr.leftNoPlay && (st === 'leave' || st === 'dragged' || !!c.dead)) {
        tr.leftNoPlay = true;
      }
    }
    for (const [id, tr] of custTracks) {
      if (!custIds.has(id) && tr.satAt === null && !tr.leftNoPlay) {
        tr.leftNoPlay = true;
      }
    }

    // Stuck & path failure checks every tick across all live agents
    const liveIds = new Set<number>();
    for (const a of s.agents) {
      liveIds.add(a.id);
      const st = String(a.state || '');
      const pathLen = Array.isArray(a.path) ? a.path.length : 0;
      const prev = agentMotion.get(a.id);

      let stillTicks = 0;
      let flaggedMoving = prev?.flaggedMoving || false;
      let flaggedWait = prev?.flaggedWait || false;
      let flaggedUnknown = prev?.flaggedUnknown || false;

      if (prev && Math.hypot(a.x - prev.x, a.y - prev.y) < 1e-6 && st === prev.state) {
        stillTicks = prev.stillTicks + 1;
      } else {
        stillTicks = 0;
        flaggedMoving = false;
        flaggedWait = false;
        flaggedUnknown = false;
      }

      const cat = classifyState(st, pathLen > 0);
      if (stillTicks > 180) {
        if (cat === 'moving' && !flaggedMoving) {
          flaggedMoving = true;
          stuckMoving++;
          stuckMovingByState[st] = (stuckMovingByState[st] || 0) + 1;
        } else if (cat === 'waiting' && !flaggedWait) {
          flaggedWait = true;
          stuckWaitingIdle++;
        } else if (cat === 'unknown' && !flaggedUnknown) {
          flaggedUnknown = true;
          stuckUnknown++;
        }
      }

      let pathFailTicks = 0;
      let flaggedPathFail = prev?.flaggedPathFail || false;
      if (st === 'toPC' || st === 'toService') {
        if (pathLen === 0 && !isAtServiceOrPCDest(s, a)) {
          pathFailTicks = (prev?.pathFailTicks || 0) + 1;
        } else {
          pathFailTicks = 0;
          flaggedPathFail = false;
        }
        if (pathFailTicks > 20 && !flaggedPathFail) {
          flaggedPathFail = true;
          pathFailures++;
        }
      } else {
        pathFailTicks = 0;
        flaggedPathFail = false;
      }

      agentMotion.set(a.id, {
        x: a.x,
        y: a.y,
        state: st,
        stillTicks,
        pathFailTicks,
        flaggedMoving,
        flaggedWait,
        flaggedUnknown,
        flaggedPathFail,
      });
    }
    for (const id of agentMotion.keys()) {
      if (!liveIds.has(id)) agentMotion.delete(id);
    }

    // 5-tick periodic sampling
    if (t % SAMPLE_EVERY === 0) {
      samples++;
      const waiting = custs.filter((c) => isWaitingState(String(c.state || '')));
      const freePCs = pcs.filter(isPCFree);
      const emptyReserved = pcs.filter((o) => o.user === -1 && o.reserved !== -1);

      if (waiting.length > 0 && freePCs.length > 0) {
        waitWhileFreeSamples++;
      }

      if (waiting.length > 0 && emptyReserved.length > 0) {
        waitWhileEmptyResSamples++;
        for (const o of emptyReserved) {
          const r = s.agent(o.reserved);
          const key = !r
            ? 'MISSING'
            : r.kind !== 'customer'
              ? `kind:${r.kind}`
              : String(r.state || 'UNKNOWN');
          reserverStateHist[key] = (reserverStateHist[key] || 0) + 1;
        }
      }

      let hadOrphan = false;
      for (const o of pcs) {
        if (o.reserved !== -1) {
          const r = s.agent(o.reserved);
          if (!r || r.kind !== 'customer' || r.seat !== o.id) {
            orphanResChecks++;
            hadOrphan = true;
          }
        }
      }
      if (hadOrphan) orphanSamples++;

      const hasNetFree = freePCs.some((o) => (o.ping ?? 999) < 999);
      const hasNoNetSeated = pcs.some((o) => o.user !== -1 && (o.ping ?? 999) >= 999);
      if (hasNetFree && hasNoNetSeated) {
        noNetWhileFreeSamples++;
      }
    }
  }

  waitTimes.sort((a, b) => a - b);
  let satCount = 0;
  let leftNoPlayCount = 0;
  for (const tr of custTracks.values()) {
    if (tr.satAt !== null) satCount++;
    else if (tr.leftNoPlay) leftNoPlayCount++;
  }
  const resolved = satCount + leftNoPlayCount;

  return {
    seed,
    pcs: s.objects.filter((o) => s.isPC(o)).length,
    routers: s.objects.filter((o) => !!s.def(o)?.routerRadius).length,
    samples,
    waitWhileFreeSamples,
    waitWhileEmptyResSamples,
    reserverStateHist,
    orphanResChecks,
    orphanSamples,
    noNetWhileFreeSamples,
    waitTimes,
    avgWait: mean(waitTimes),
    p90Wait: percentile(waitTimes, 0.9),
    arrivals: custTracks.size,
    satCount,
    leftNoPlayCount,
    leftNoPlayPct: resolved > 0 ? (100 * leftNoPlayCount) / resolved : 0,
    stuckMoving,
    stuckMovingByState,
    stuckWaitingIdle,
    stuckUnknown,
    pathFailures,
    rating: s.rating,
    served: s.served,
    turnedAway: s.turnedAway,
    money: s.money,
    buzzEnd: s.buzz,
    starCounts,
    reviewCount,
    gameOver: s.gameOver,
  };
}

function runScenario(def: ScenarioDef): ScenarioAvg {
  const runs = SEEDS.map((seed) => runSeed(def, seed));
  const mergedHist: Record<string, number> = {};
  const mergedStuckStates: Record<string, number> = {};
  const starCountsTotal: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  let reviewCountTotal = 0;

  for (const r of runs) {
    for (const [k, v] of Object.entries(r.reserverStateHist)) {
      mergedHist[k] = (mergedHist[k] || 0) + v;
    }
    for (const [k, v] of Object.entries(r.stuckMovingByState)) {
      mergedStuckStates[k] = (mergedStuckStates[k] || 0) + v;
    }
    for (let st = 1; st <= 5; st++) {
      starCountsTotal[st] += r.starCounts[st] || 0;
    }
    reviewCountTotal += r.reviewCount;
  }

  const totalHist = Object.values(mergedHist).reduce((a, b) => a + b, 0);
  const toPCTotal = mergedHist['toPC'] || 0;
  const awayResSharePct = totalHist > 0 ? (100 * (totalHist - toPCTotal)) / totalHist : 0;

  return {
    def,
    runs,
    pcs: Math.round(mean(runs.map((r) => r.pcs))),
    routers: Math.round(mean(runs.map((r) => r.routers))),
    waitWhileFreePct: mean(runs.map((r) => (100 * r.waitWhileFreeSamples) / r.samples)),
    waitWhileEmptyResPct: mean(runs.map((r) => (100 * r.waitWhileEmptyResSamples) / r.samples)),
    awayResSharePct,
    reserverStateHist: mergedHist,
    orphanResChecksAvg: mean(runs.map((r) => r.orphanResChecks)),
    orphanSamplesPct: mean(runs.map((r) => (100 * r.orphanSamples) / r.samples)),
    noNetWhileFreePct: mean(runs.map((r) => (100 * r.noNetWhileFreeSamples) / r.samples)),
    avgWait: mean(runs.map((r) => r.avgWait)),
    p90Wait: mean(runs.map((r) => r.p90Wait)),
    leftNoPlayPct: mean(runs.map((r) => r.leftNoPlayPct)),
    stuckMovingAvg: mean(runs.map((r) => r.stuckMoving)),
    stuckMovingByState: mergedStuckStates,
    stuckWaitingIdleAvg: mean(runs.map((r) => r.stuckWaitingIdle)),
    stuckUnknownAvg: mean(runs.map((r) => r.stuckUnknown)),
    pathFailuresAvg: mean(runs.map((r) => r.pathFailures)),
    rating: mean(runs.map((r) => r.rating)),
    served: mean(runs.map((r) => r.served)),
    turnedAway: mean(runs.map((r) => r.turnedAway)),
    money: mean(runs.map((r) => r.money)),
    buzzEnd: mean(runs.map((r) => r.buzzEnd)),
    starCountsTotal,
    reviewCountTotal,
  };
}

// ---------------- Formatting & Health Evaluation ----------------
const padR = (s: string, n: number) => s.length >= n ? s : s + ' '.repeat(n - s.length);
const padL = (s: string, n: number) => s.length >= n ? s : ' '.repeat(n - s.length) + s;

interface HealthCheck {
  name: string;
  observed: string;
  thresholds: string;
  status: HealthStatus;
  note?: string;
}

function worstStatus(statuses: HealthStatus[]): HealthStatus {
  if (statuses.includes('FAIL')) return 'FAIL';
  if (statuses.includes('WARN')) return 'WARN';
  return 'PASS';
}

function maxBy<T>(items: T[], fn: (x: T) => number): { item: T; val: number } {
  let best = items[0];
  let bv = fn(best);
  for (const it of items.slice(1)) {
    const v = fn(it);
    if (v > bv) { best = it; bv = v; }
  }
  return { item: best, val: bv };
}

function minBy<T>(items: T[], fn: (x: T) => number): { item: T; val: number } {
  let best = items[0];
  let bv = fn(best);
  for (const it of items.slice(1)) {
    const v = fn(it);
    if (v < bv) { best = it; bv = v; }
  }
  return { item: best, val: bv };
}

function evaluateHealth(results: ScenarioAvg[]): { checks: HealthCheck[]; overall: HealthStatus } {
  const normal = results.filter((r) => !r.def.isCapacityStress);

  const wf = maxBy(results, (r) => r.waitWhileFreePct);
  const wfStatus: HealthStatus = wf.val <= 1.0 ? 'PASS' : wf.val <= 5.0 ? 'WARN' : 'FAIL';

  const wr = maxBy(results, (r) => r.waitWhileEmptyResPct);
  const wrStatus: HealthStatus = wr.val <= 30.0 ? 'PASS' : wr.val <= 50.0 ? 'WARN' : 'FAIL';

  const away = maxBy(results, (r) => r.awayResSharePct);
  const awayStatus: HealthStatus = away.val <= 25.0 ? 'PASS' : away.val <= 45.0 ? 'WARN' : 'FAIL';

  const orph = maxBy(results, (r) => r.orphanResChecksAvg);
  const orphStatus: HealthStatus = orph.val === 0 ? 'PASS' : 'FAIL';

  const sm = maxBy(results, (r) => r.stuckMovingAvg);
  const smStatus: HealthStatus = sm.val === 0 ? 'PASS' : 'FAIL';

  const sw = maxBy(results, (r) => r.stuckWaitingIdleAvg);
  const swStatus: HealthStatus = sw.val === 0 ? 'PASS' : sw.val <= 2.0 ? 'WARN' : 'FAIL';

  const pf = maxBy(results, (r) => r.pathFailuresAvg);
  const pfStatus: HealthStatus = pf.val === 0 ? 'PASS' : pf.val <= 1.0 ? 'WARN' : 'FAIL';

  const nn = maxBy(results, (r) => r.noNetWhileFreePct);
  const nnStatus: HealthStatus = nn.val === 0 ? 'PASS' : nn.val <= 1.0 ? 'WARN' : 'FAIL';

  const aw = maxBy(normal, (r) => r.avgWait);
  const p90 = maxBy(normal, (r) => r.p90Wait);
  const waitStatus: HealthStatus =
    aw.val <= 75 && p90.val <= 120 ? 'PASS'
      : aw.val <= 100 && p90.val <= 150 ? 'WARN' : 'FAIL';

  const lnp = maxBy(normal, (r) => r.leftNoPlayPct);
  const lnpStatus: HealthStatus = lnp.val <= 20.0 ? 'PASS' : lnp.val <= 35.0 ? 'WARN' : 'FAIL';

  const rat = minBy(normal, (r) => r.rating);
  const ratStatus: HealthStatus = rat.val >= 3.0 ? 'PASS' : rat.val >= 2.2 ? 'WARN' : 'FAIL';

  const checks: HealthCheck[] = [
    {
      name: 'Wait while free PC exists (all)',
      observed: `${wf.val.toFixed(2)}% (max @ ${wf.item.def.id})`,
      thresholds: 'PASS <= 1.0% | WARN <= 5.0% | FAIL > 5.0%',
      status: wfStatus,
    },
    {
      name: 'Wait while empty-reserved (all)',
      observed: `${wr.val.toFixed(1)}% (max @ ${wr.item.def.id})`,
      thresholds: 'PASS <= 30% | WARN <= 50% | FAIL > 50%',
      status: wrStatus,
    },
    {
      name: 'Non-toPC share of empty-res holds',
      observed: `${away.val.toFixed(1)}% (max @ ${away.item.def.id})`,
      thresholds: 'PASS <= 25% | WARN <= 45% | FAIL > 45%',
      status: awayStatus,
    },
    {
      name: 'Orphan reservations (all)',
      observed: `${orph.val.toFixed(2)} checks/run (max @ ${orph.item.def.id})`,
      thresholds: 'PASS == 0 | FAIL > 0',
      status: orphStatus,
    },
    {
      name: 'Stuck agents in moving state >180t',
      observed: `${sm.val.toFixed(2)}/run (max @ ${sm.item.def.id})`,
      thresholds: 'PASS == 0 | FAIL > 0',
      status: smStatus,
    },
    {
      name: 'Wait/queue idle >180t (separate)',
      observed: `${sw.val.toFixed(2)}/run (max @ ${sw.item.def.id})`,
      thresholds: 'PASS == 0 | WARN <= 2.0 | FAIL > 2.0',
      status: swStatus,
    },
    {
      name: 'Path failure proxy >20t (all)',
      observed: `${pf.val.toFixed(2)}/run (max @ ${pf.item.def.id})`,
      thresholds: 'PASS == 0 | WARN <= 1.0 | FAIL > 1.0',
      status: pfStatus,
    },
    {
      name: 'No-net seated w/ net PC free (all)',
      observed: `${nn.val.toFixed(2)}% (max @ ${nn.item.def.id})`,
      thresholds: 'PASS == 0% | WARN <= 1.0% | FAIL > 1.0%',
      status: nnStatus,
    },
    {
      name: 'Arrival->Sit wait avg/p90 (A-C)',
      observed: `avg ${aw.val.toFixed(1)}m (${aw.item.def.id}), p90 ${p90.val.toFixed(1)}m (${p90.item.def.id})`,
      thresholds: 'PASS <=75/120m | WARN <=100/150m | FAIL >100/150m',
      status: waitStatus,
    },
    {
      name: 'Left w/o ever playing (A-C)',
      observed: `${lnp.val.toFixed(1)}% (max @ ${lnp.item.def.id})`,
      thresholds: 'PASS <= 20% | WARN <= 35% | FAIL > 35%',
      status: lnpStatus,
      note: 'D excluded (intentional overflow)',
    },
    {
      name: 'Final rating (A-C)',
      observed: `${rat.val.toFixed(2)}★ (min @ ${rat.item.def.id})`,
      thresholds: 'PASS >= 3.0★ | WARN >= 2.2★ | FAIL < 2.2★',
      status: ratStatus,
    },
  ];

  return { checks, overall: worstStatus(checks.map((c) => c.status)) };
}

function main() {
  const results = SCENARIOS.map(runScenario);
  const { checks, overall } = evaluateHealth(results);

  console.log('================================================================================================================================');
  console.log(`LAN LORD XP — CUSTOMER AI AUDIT (${DAYS} in-game days = ${TOTAL_TICKS} ticks/run, sampled every ${SAMPLE_EVERY} ticks, seeds: ${SEEDS.join(',')})`);
  console.log('================================================================================================================================');

  const headers = [
    padR('Scenario', 15),
    padL('PCs', 3),
    padL('WaitFree%', 9),
    padL('WaitRes%', 8),
    padL('Orph', 5),
    padL('AvgW', 6),
    padL('P90W', 6),
    padL('NoPlay%', 7),
    padL('StuckM', 6),
    padL('Wait180', 7),
    padL('PathF', 5),
    padL('NoNet%', 6),
    padL('Served', 6),
    padL('Turned', 6),
    padL('Rating', 6),
    padL('Money$', 7),
  ];
  console.log(headers.join(' '));
  console.log('-'.repeat(128));

  for (const r of results) {
    const row = [
      padR(r.def.name, 15),
      padL(String(r.pcs), 3),
      padL(r.waitWhileFreePct.toFixed(2) + '%', 9),
      padL(r.waitWhileEmptyResPct.toFixed(1) + '%', 8),
      padL(r.orphanResChecksAvg.toFixed(1), 5),
      padL(r.avgWait.toFixed(1) + 'm', 6),
      padL(r.p90Wait.toFixed(0) + 'm', 6),
      padL(r.leftNoPlayPct.toFixed(1) + '%', 7),
      padL(r.stuckMovingAvg.toFixed(1), 6),
      padL(r.stuckWaitingIdleAvg.toFixed(1), 7),
      padL(r.pathFailuresAvg.toFixed(1), 5),
      padL(r.noNetWhileFreePct.toFixed(2) + '%', 6),
      padL(r.served.toFixed(1), 6),
      padL(r.turnedAway.toFixed(1), 6),
      padL(r.rating.toFixed(2), 6),
      padL('$' + Math.round(r.money), 7),
    ];
    console.log(row.join(' '));
  }

  console.log('\n--- Scenario Details (Reserver State Histogram While Waiting & Review Star Distribution) ---');
  for (const r of results) {
    const totHist = Object.values(r.reserverStateHist).reduce((a, b) => a + b, 0);
    const histStr = totHist === 0
      ? 'none'
      : Object.entries(r.reserverStateHist)
          .sort((a, b) => b[1] - a[1])
          .map(([k, v]) => `${k}:${(v / SEEDS.length).toFixed(1)} (${((100 * v) / totHist).toFixed(1)}%)`)
          .join(', ');
    const starParts = [1, 2, 3, 4, 5].map((st) => {
      const cnt = r.starCountsTotal[st] || 0;
      const pct = r.reviewCountTotal > 0 ? ((100 * cnt) / r.reviewCountTotal).toFixed(0) : '0';
      return `${st}★:${cnt}(${pct}%)`;
    });
    const stuckExtra = r.stuckUnknownAvg > 0 ? ` | unknownStuck=${r.stuckUnknownAvg.toFixed(1)}` : '';
    const goFlag = r.runs.some((x) => x.gameOver) ? ' [GAME_OVER]' : '';
    console.log(`[${r.def.name}] ${r.def.desc} | routers=${r.routers}, endBuzz=${r.buzzEnd.toFixed(2)}${stuckExtra}${goFlag}`);
    console.log(`  Reserver states while waiting (avg holds/run): ${histStr}`);
    console.log(`  Reviews (3-seed total n=${r.reviewCountTotal}): ${starParts.join('  ')}`);
  }

  console.log('\n--- AI HEALTH SUMMARY & THRESHOLDS ---');
  console.log(`${padR('Check', 36)} ${padR('Observed', 38)} ${padR('Thresholds', 44)} Status`);
  console.log('-'.repeat(128));
  for (const c of checks) {
    const note = c.note ? ` (${c.note})` : '';
    console.log(`${padR(c.name, 36)} ${padR(c.observed, 38)} ${padR(c.thresholds, 44)} ${c.status}${note}`);
  }
  console.log('-'.repeat(128));
  const fails = checks.filter((c) => c.status === 'FAIL').map((c) => c.name);
  const warns = checks.filter((c) => c.status === 'WARN').map((c) => c.name);
  console.log(`OVERALL AI HEALTH: ${overall} (PASS=${checks.filter((c) => c.status === 'PASS').length}, WARN=${warns.length}, FAIL=${fails.length})`);
  if (fails.length) console.log(`  FAIL drivers: ${fails.join('; ')}`);
  if (warns.length) console.log(`  WARN drivers: ${warns.join('; ')}`);
}

main();
