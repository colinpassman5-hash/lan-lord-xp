import { Sim } from '../src/sim';
import { newMeta } from '../src/data';
const s = new Sim(3, 0, newMeta());
s.newGame();
s.buzz = 1.0;
for (let i = 0; i < 3; i++) s.placeSomewhere('pc_beige', 1);
s.placeSomewhere('toilet', 1); s.placeSomewhere('fridge', 1); s.placeSomewhere('vending', 1);
let samples = 0, waitWhileFree = 0, emptyReserved = 0, orphanRes = 0, noNetSeats = 0;
const awayHolds: number[] = [];
for (let i = 0; i < 6 * 1440; i++) {
  s.step(); s.events.length = 0;
  if (i % 10) continue;
  samples++;
  const pcs = s.objects.filter(o => s.isPC(o));
  const waiting = s.customers().filter(c => c.state === 'waitPC').length;
  const free = pcs.filter(o => !o.broken && !o.fire && o.user === -1 && o.reserved === -1).length;
  const emptyRes = pcs.filter(o => o.user === -1 && o.reserved !== -1);
  if (waiting && free) waitWhileFree++;
  if (waiting && emptyRes.length) emptyReserved++;
  for (const o of emptyRes) {
    const a = s.agent(o.reserved);
    if (!a || a.kind !== 'customer' || a.seat !== o.id) orphanRes++;
    else awayHolds.push(a.state as any);
  }
  noNetSeats += pcs.filter(o => o.user !== -1 && o.ping >= 999).length;
}
const hist: Record<string, number> = {};
for (const st of awayHolds) hist[st] = (hist[st] || 0) + 1;
console.log({ samples, waitWhileFree, waitingWhileSomeoneHoldsEmptySeat: emptyReserved, orphanReservations: orphanRes, noNetSeats, turnedAway: s.turnedAway, served: s.served });
console.log('who holds empty seats (state):', hist);
console.log('thoughts:', JSON.stringify(s.thoughtCounts));
