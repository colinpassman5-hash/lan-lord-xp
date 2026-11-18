// headless balance test: node --experimental-strip-types won't resolve .ts imports w/o ext, so we bundle with esbuild via vite's dep
import { Sim } from '../src/sim';
import { newMeta } from '../src/data';

function run(label: string, setup: (s: Sim) => void, hours: number) {
  const s = new Sim(42, 2, newMeta());
  s.newGame();
  setup(s);
  const pcs = () => s.objects.filter(o => s.isPC(o));
  let maxHeat = 0, fires = 0, peak = 0;
  const evCount: Record<string, number> = {};
  for (let i = 0; i < hours * 60; i++) {
    s.step();
    for (const e of s.events) evCount[e.t === 'advisor' ? 'adv:' + e.key : e.t] = (evCount[e.t === 'advisor' ? 'adv:' + e.key : e.t] || 0) + 1;
    s.events.length = 0;
    for (const p of pcs()) maxHeat = Math.max(maxHeat, s.heat[p.y * s.W + p.x]);
    peak = Math.max(peak, s.customers().length);
  }
  const used = pcs().filter(p => p.user !== -1).length;
  console.log(`\n== ${label} (${hours}h) ==`);
  console.log(`money=${Math.round(s.money)} rating=${s.rating.toFixed(2)} served=${s.served} turnedAway=${s.turnedAway} peak=${peak} nowCustomers=${s.customers().length} pcsUsed=${used}/${pcs().length}`);
  console.log(`maxPCheat=${maxHeat.toFixed(1)} fires=${s.stats.fires} smashes=${s.stats.smashes} accidents=${s.stats.accidents} deaths=${s.deaths} litter=${s.litter.length} reviews=${s.reviews.length}`);
  console.log('pc heats:', pcs().map(p => s.heat[p.y * s.W + p.x].toFixed(0)).join(','), 'pings:', pcs().map(p => p.ping).join(','));
  console.log('events:', JSON.stringify(evCount));
  console.log('top thoughts:', JSON.stringify(Object.entries(s.thoughtCounts).sort((a, b) => b[1] - a[1]).slice(0, 8)));
  console.log('ledgerYesterday:', JSON.stringify(s.ledgerYesterday));
  console.log('sample reviews:', s.reviews.slice(0, 3).map(r => `${r.stars}★ ${r.text}`).join(' | '));
}

run('starter only', () => { }, 48);
run('cluster of 8 beige, 1 router', (s) => {
  for (let x = 4; x < 12; x++) s.place('pc_beige', x, 6, 1, true);
}, 48);
run('cluster of 6 xtreme no AC', (s) => {
  s.researched.r_gamer = s.researched.r_xtreme = true;
  for (let x = 4; x < 10; x++) s.place('pc_xtreme', x, 6, 1, true);
  s.place('router', 7, 8, 0, true);
}, 48);
run('6 xtreme + 2 AC', (s) => {
  s.researched.r_gamer = s.researched.r_xtreme = true;
  for (let x = 4; x < 10; x++) s.place('pc_xtreme', x, 6, 1, true);
  s.place('router', 7, 8, 0, true); s.place('ac', 5, 5, 0, true); s.place('ac', 8, 5, 0, true);
}, 48);
run('big cafe w staff', (s) => {
  for (let x = 3; x < 13; x++) s.place('pc_beige', x, 7, 1, true);
  for (let x = 3; x < 13; x++) s.place('pc_beige', x, 10, 3, true);
  s.place('router', 7, 12, 0, true); s.place('router', 14, 8, 0, true); s.place('vending', 16, 5, 1, true); s.place('toilet', 18, 4, 1, true);
  s.place('ac', 2, 8, 0, true); s.place('ac', 13, 8, 0, true);
  s.hire('janitor'); s.hire('tech');
}, 96);
