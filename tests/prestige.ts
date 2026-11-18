import { Sim } from '../src/sim';
import { newMeta } from '../src/data';
// simple "bot": every 6h buy a beige PC + router coverage if affordable, stop at cap
function run(loc: number, days: number, rate?: number) {
  const s = new Sim(99, loc, newMeta());
  s.newGame();
  if (rate) s.rate = rate;
  let peakMoney = 0;
  for (let i = 0; i < days * 1440; i++) {
    s.step(); s.events.length = 0;
    if (i % 360 === 0 && s.money > 900) {
      // try to place a PC somewhere valid near a router
      outer: for (let y = 1; y < s.H - 1; y++) for (let x = 2; x < s.W - 1; x++) {
        if (s.canPlace('pc_beige', x, y, 1).ok) { const r = s.objects.find(o => o.type.startsWith('router')); if (r && Math.hypot(r.x - x, r.y - y) <= 4.5) { s.place('pc_beige', x, y, 1); break outer; } }
      }
      if (!s.objects.some(o => o.type === 'toilet')) for (let x = s.W - 2; x > 2; x--) if (s.canPlace('toilet', x, 1, 1).ok) { s.place('toilet', x, 1, 1); break; }
      if (!s.objects.some(o => o.type === 'fridge')) for (let x = s.W - 3; x > 2; x--) if (s.canPlace('fridge', x, 1, 1).ok) { s.place('fridge', x, 1, 1); break; }
    }
    peakMoney = Math.max(peakMoney, s.money);
  }
  const g = s.goals();
  console.log(`${s.L.short} rate=$${s.rate} after ${days}d: money=${Math.round(s.money)} rating=${s.rating.toFixed(2)} served=${s.served} peak=${s.peakCustomers} pcs=${s.objects.filter(o => s.isPC(o)).length} goals=${g.map(x => x.done ? '★' : '☆').join('')} clout=${s.cloutEarned()} turned=${s.turnedAway}`);
}
run(0, 8); run(0, 14); run(1, 12); run(2, 12);
