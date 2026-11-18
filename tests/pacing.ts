import { Sim } from '../src/sim';
import { newMeta } from '../src/data';
// measure arrivals over the first real minutes at 1x (7 game-min/sec)
for (const loc of [0, 1, 2]) {
  const s = new Sim(11, loc, newMeta());
  s.newGame();
  let arrivals = 0; const seen = new Set<number>();
  const marks: string[] = [];
  for (let i = 1; i <= 14 * 1440; i++) {
    s.step(); s.events.length = 0;
    for (const a of s.customers()) if (!seen.has(a.id)) { seen.add(a.id); arrivals++; }
    if (i === 7 * 60) marks.push(`1min:${arrivals}arr/${s.customers().length}now`);
    if (i === 21 * 60) marks.push(`3min:${arrivals}/${s.customers().length}`);
    if (i % 1440 === 0 && [1, 3, 7, 14].includes(i / 1440)) marks.push(`d${i / 1440}:${arrivals}arr buzz=${s.buzz.toFixed(2)}(${s.buzzTier()[1]}) rating=${s.rating.toFixed(1)} $${Math.round(s.money)} served=${s.served}`);
    // light bot expansion: buy a PC each day if affordable
    if (i % 1440 === 720 && s.money > 1200) s.placeSomewhere('pc_beige', 1);
  }
  console.log(s.L.short, '| pcs', s.objects.filter(o => s.isPC(o)).length, '|', marks.join(' | '));
}
