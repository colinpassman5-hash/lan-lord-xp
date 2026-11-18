// ============ LAN LORD — LimeWire.exe: free music! (mostly) (sometimes) (viruses) ============
import { h, WM, GameCtx, UIApi } from './ui';
import * as audio from './audio';
import { CURSED_TRACKS } from './tracks_era2';

type Ref = { kind: 'track'; prefix: string } | { kind: 'cursed'; id: string };
interface Entry { file: string; keys: string; size: string; kbps: number; sources: number; speed: 'T1' | 'Cable' | 'DSL' | 'Modem'; ref: Ref; virus: number; }
export interface Download { file: string; ref: Ref; }

const T = (prefix: string): Ref => ({ kind: 'track', prefix });
const C = (id: string): Ref => ({ kind: 'cursed', id });
const CATALOG: Entry[] = [
  { file: 'razor1912_keygen_music.xm', keys: 'razor keygen crack music xm', size: '0.2 MB', kbps: 0, sources: 812, speed: 'T1', ref: T('RAZOR 1912'), virus: 0.25 },
  { file: 'RAZOR1912_photoshop_cs2_keygen.exe', keys: 'razor keygen crack photoshop', size: '0.4 MB', kbps: 0, sources: 4096, speed: 'Cable', ref: C('polka'), virus: 0.9 },
  { file: 'Linkin Bark - In The Endless Loading Screen.mp3', keys: 'linkin bark park numb end loading', size: '3.4 MB', kbps: 128, sources: 211, speed: 'DSL', ref: T('Linkin Bark'), virus: 0.04 },
  { file: 'linkin_bark_-_numb3rs_(REAL)(NOT FAKE).mp3', keys: 'linkin bark park numb real', size: '4.1 MB', kbps: 192, sources: 88, speed: 'Cable', ref: C('goat'), virus: 0.15 },
  { file: 'Sum 42 - Fat Lip Sync.mp3', keys: 'sum 42 41 fat lip punk', size: '3.0 MB', kbps: 128, sources: 140, speed: 'DSL', ref: T('Sum 42'), virus: 0.06 },
  { file: 'sum_42_fat_lip_sync_LIVE_bootleg.mp3', keys: 'sum 42 41 fat lip live', size: '6.6 MB', kbps: 96, sources: 12, speed: 'Modem', ref: C('skip'), virus: 0.1 },
  { file: 'my_heart_will_LAG_on_FINAL.mid', keys: 'heart lag titanic midi ballad celine', size: '0.03 MB', kbps: 0, sources: 999, speed: 'T1', ref: T('my_heart_will_LAG_on'), virus: 0 },
  { file: 'titanic_flute_solo_REAL_celine_HQ.mp3', keys: 'titanic heart celine flute', size: '2.2 MB', kbps: 64, sources: 31, speed: 'Modem', ref: C('kazoo'), virus: 0.12 },
  { file: 'Crazy Toad - Ding Ding (Polyphonic Ringtone).mp3', keys: 'crazy toad frog ding ringtone', size: '1.1 MB', kbps: 96, sources: 620, speed: 'Cable', ref: T('Crazy Toad'), virus: 0.08 },
  { file: 'crazy_toad_FULL_VERSION.mp3.exe', keys: 'crazy toad frog ringtone full', size: '0.3 MB', kbps: 0, sources: 2001, speed: 'T1', ref: C('dialup'), virus: 0.95 },
  { file: 'Taking Back Saturday - Cute Without The Ping.mp3', keys: 'taking back saturday sunday emo cute', size: '3.9 MB', kbps: 160, sources: 74, speed: 'DSL', ref: T('Taking Back Saturday'), virus: 0.05 },
  { file: 'emo_screamo_breakdown_HQ_xX.mp3', keys: 'emo screamo breakdown scream', size: '2.0 MB', kbps: 128, sources: 66, speed: 'DSL', ref: C('screamo'), virus: 0.1 },
  { file: 'Through The Fire And The Lag (EXPERT).mp3', keys: 'through fire flames lag guitar hero expert dragon', size: '5.8 MB', kbps: 192, sources: 333, speed: 'Cable', ref: T('Through The Fire'), virus: 0.08 },
  { file: 'Lil Jawn - Get Low Ping (Crunk Mix).wma', keys: 'lil jawn jon get low ping crunk', size: '3.3 MB', kbps: 128, sources: 190, speed: 'DSL', ref: T('Lil Jawn'), virus: 0.07 },
  { file: 'DORUDE - DUNESTORM (original mix).mp3', keys: 'dorude darude dunestorm sandstorm trance', size: '7.1 MB', kbps: 192, sources: 1337, speed: 'T1', ref: T('DORUDE'), virus: 0.05 },
  { file: 'darude_sandstorm_REAL_REAL.mp3', keys: 'darude dorude sandstorm dunestorm real', size: '3.0 MB', kbps: 128, sources: 444, speed: 'Cable', ref: C('xpslow'), virus: 0.2 },
  { file: 'Smooth Elevator Jazz Vol. 7.mp3', keys: 'smooth elevator jazz lobby chill', size: '4.0 MB', kbps: 128, sources: 9, speed: 'Modem', ref: T('Smooth Elevator'), virus: 0.01 },
  { file: 'The Hamster Bounce (Geocities Remix).wma', keys: 'hamster dance bounce geocities', size: '1.8 MB', kbps: 96, sources: 777, speed: 'Cable', ref: T('The Hamster'), virus: 0.05 },
  { file: 'windows_xp_startup_REMIX_extended.mp3', keys: 'windows xp startup remix', size: '9.9 MB', kbps: 320, sources: 58, speed: 'DSL', ref: C('xpslow'), virus: 0.1 },
  { file: 'funny_video_lol_MUST_SEE.wmv.exe', keys: 'funny video lol', size: '0.1 MB', kbps: 0, sources: 6969, speed: 'T1', ref: C('fart'), virus: 1.0 },
  { file: 'FREE_IPOD_NANO_WINNER.exe', keys: 'free ipod nano winner', size: '0.1 MB', kbps: 0, sources: 9999, speed: 'T1', ref: C('polka'), virus: 1.0 },
  { file: 'goat_screaming_like_a_man_ORIGINAL.mp3', keys: 'goat scream', size: '0.5 MB', kbps: 64, sources: 42, speed: 'DSL', ref: C('goat'), virus: 0.02 },
  { file: 'Aviici - Lan-vels (Radio Edit).mp3', keys: 'aviici avicii levels lanvels edm', size: '5.2 MB', kbps: 256, sources: 912, speed: 'T1', ref: T('Aviici'), virus: 0.04 },
  { file: 'Skrillecks - Scary Monsters & Nice Routers.mp3', keys: 'skrillecks skrillex dubstep scary monsters', size: '6.0 MB', kbps: 320, sources: 501, speed: 'Cable', ref: T('Skrillecks'), virus: 0.06 },
  { file: 'Cascada Falls - Everytime We LAN.mp3', keys: 'cascada falls everytime we touch lan eurodance', size: '4.4 MB', kbps: 192, sources: 380, speed: 'Cable', ref: T('Cascada Falls'), virus: 0.05 },
  { file: 'My Chemical Bromance - Helena Rubinstein.mp3', keys: 'my chemical bromance romance helena emo', size: '3.8 MB', kbps: 192, sources: 260, speed: 'DSL', ref: T('My Chemical'), virus: 0.05 },
  { file: 'Bonzai Buddy - Hi Im Your Friend (Dance Remix).mp3', keys: 'bonzai buddy friend dance remix purple', size: '2.7 MB', kbps: 128, sources: 305, speed: 'Cable', ref: C('kazoo'), virus: 0.35 },
  { file: 'Nokya_Ringtone_Pack_FREE_x500.zip.exe', keys: 'nokya nokia ringtone pack free polyphonic', size: '0.2 MB', kbps: 0, sources: 5120, speed: 'T1', ref: C('dialup'), virus: 0.96 },
  { file: 'DJ Buffering - 56k Anthem (Club Mix).mp3', keys: 'dj buffering 56k modem anthem club mix', size: '4.8 MB', kbps: 192, sources: 77, speed: 'Modem', ref: C('dialup'), virus: 0.08 },
  { file: 'totally_not_a_virus_screensaver.scr.exe', keys: 'screensaver scr virus free pipes', size: '0.1 MB', kbps: 0, sources: 8888, speed: 'T1', ref: C('fart'), virus: 0.99 },
  { file: 'Hot Pockit Hero - Microwave Me Maybe.mp3', keys: 'hot pocket pockit hero microwave pop catchy', size: '3.5 MB', kbps: 160, sources: 410, speed: 'DSL', ref: C('polka'), virus: 0.06 },
  { file: 'class_presentation_FINAL_v7_REAL.ppt.mp3.exe', keys: 'class presentation homework ppt essay', size: '0.3 MB', kbps: 0, sources: 1500, speed: 'Cable', ref: C('skip'), virus: 0.93 },
  { file: 'Screaming Goat Orchestra - Greatest Bleats Vol. 2.mp3', keys: 'screaming goat orchestra bleats greatest hits', size: '5.1 MB', kbps: 128, sources: 29, speed: 'Modem', ref: C('goat'), virus: 0.03 },
  { file: 'chiptune_boss_battle_xX_darkness_Xx.mp3', keys: 'chiptune boss battle darkness emo metal', size: '2.9 MB', kbps: 128, sources: 144, speed: 'DSL', ref: C('screamo'), virus: 0.1 },
];
const SPEED_SECS: Record<Entry['speed'], [number, number]> = { T1: [2, 4], Cable: [4, 7], DSL: [6, 10], Modem: [12, 18] };
const CURSED_REACT: Record<string, string> = {
  goat: '...this is a goat. this is just a goat screaming.', dialup: 'its... the sound of the internet connecting. for 4 minutes.', xpslow: 'why is the startup sound 9 minutes long',
  fart: '[2:34 of silence] ...*pfffbt*. thats it. thats the file.', kazoo: 'that is NOT a flute. that is a kazoo. and a sad man.', skip: 'the CD is skipping. its an mp3. HOW',
  screamo: 'it\'s just the screaming part. on loop. honestly kind of a banger', polka: 'polka?? i searched for photoshop',
};

let lwSeq = 0;
export function registerDownload(d: Download): number {
  // add a playable Winamp entry (mislabeled files play their cursed loop)
  let base: audio.Track | undefined;
  if (d.ref.kind === 'cursed') base = CURSED_TRACKS[d.ref.id];
  else { const p = d.ref.prefix; base = audio.TRACKS.find(t => t.title.startsWith(p) && !(t as any).downloaded); }
  if (!base) base = audio.TRACKS[0];
  const tr: audio.Track = { title: d.file, bpm: base.bpm, length: base.length, steps: base.steps, play: base.play };
  (tr as any).downloaded = true; (tr as any).cursed = d.ref.kind === 'cursed';
  audio.TRACKS.push(tr);
  window.dispatchEvent(new Event('lanlord-playlist'));
  return audio.TRACKS.length - 1;
}

export function openLimeWire(wm: WM, g: GameCtx, ui: UIApi) {
  const W = window.innerWidth;
  return wm.open({
    id: 'limewire', title: 'LimeWire PRO 4.12 (not actually PRO) — Gnutella Network', icon: '🍋', x: W / 2 - 330, y: 120, w: 660, h: 470, resizable: true, cls: 'lw',
    build: (b, win) => {
      let tab: 'search' | 'dl' = 'search';
      const tabs = h('div', { class: 'lw-tabs' });
      const body = h('div', { class: 'lw-body' });
      const status = h('div', { class: 'lw-status' });
      const input = h('input', { class: 'lw-q', placeholder: 'search: linkin bark, keygen, free ipod...', value: '' }) as HTMLInputElement;
      input.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') doSearch(); });
      let results: Entry[] = [];
      const dls: { e: Entry; p: number; dur: number; start: number; done: boolean; idx?: number; virus?: boolean }[] = (win as any).dls || [];
      (win as any).dls = dls;
      const fmtSrc = (n: number) => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n);
      function doSearch() {
        const words = input.value.toLowerCase().split(/\s+/).filter(Boolean);
        audio.sfx('click');
        if (!words.length) results = CATALOG.slice().sort(() => Math.random() - 0.5).slice(0, 12);
        else {
          results = CATALOG.filter(e => words.some(w => e.keys.includes(w) || e.file.toLowerCase().includes(w)));
          // LimeWire ALWAYS has something for you. it is usually a lie.
          const q = words.join('_');
          results.push({ file: `${q}_REAL_FINAL_HQ.mp3`, keys: q, size: '3.1 MB', kbps: 128, sources: 55, speed: 'DSL', ref: C(['goat', 'skip', 'kazoo', 'xpslow'][q.length % 4]), virus: 0.2 });
          results.push({ file: `${q}.mp3.exe`, keys: q, size: '0.2 MB', kbps: 0, sources: 3003, speed: 'T1', ref: C(['fart', 'polka', 'dialup'][q.length % 3]), virus: 0.97 });
        }
        tab = 'search'; render();
      }
      function download(e: Entry) {
        const [a, bb] = SPEED_SECS[e.speed];
        dls.push({ e, p: 0, dur: (a + Math.random() * (bb - a)) * 1000, start: performance.now(), done: false });
        audio.sfx('click');
        ui.toast('LimeWire', `Downloading ${e.file}... (${e.speed}, ${fmtSrc(e.sources)} sources)`, '🍋');
        render();
      }
      function complete(d: typeof dls[0]) {
        d.done = true; d.p = 1;
        const dl: Download = { file: d.e.file, ref: d.e.ref };
        d.idx = registerDownload(dl);
        g.meta.downloads = [...(g.meta.downloads || []), dl]; g.saveMeta();
        d.virus = Math.random() < d.e.virus;
        audio.sfx('kaching');
        if (d.virus) {
          const hit = g.sim.infectRandom(1 + (d.e.virus > 0.9 ? 1 : 0));
          ui.dialog('BonziBUDDY', '🦍', `<b>Hi! I'm BonziBUDDY!</b> I came with <i>${d.e.file}</i>!<br><br>I'll be your friend forever. I've also made myself at home on ${hit ? `<b>${hit} of your café PCs</b>` : 'your computer'}. 💜<br><br><small>(LimeWire virus. Format infected PCs or research Norton.)</small>`, [{ label: 'OK' }, { label: 'Yes' }, { label: 'Of course' }], 'bonzi' + (lwSeq++));
        } else ui.toast('Download complete!', `${d.e.file} added to Winamp. ${d.e.ref.kind === 'cursed' ? '(file size seems... off)' : ''}`, '🎵');
      }
      function render() {
        tabs.innerHTML = '';
        for (const [k, lbl] of [['search', '🔍 Search'], ['dl', `⬇ Downloads (${dls.filter(d => !d.done).length})`]] as const) tabs.append(h('span', { class: tab === k ? 'on' : '', onclick: () => { tab = k as any; render(); } }, lbl));
        body.innerHTML = '';
        if (tab === 'search') {
          body.append(h('div', { class: 'lw-bar' }, input, h('button', { class: 'xpbtn', onclick: doSearch }, 'Search'), h('span', { class: 'lw-hint' }, 'tip: if it ends in .exe... its probably fine'))); 
          const tbl = h('table', { class: 'lw-t' }, h('tr', {}, h('th', {}, 'Name'), h('th', {}, 'Size'), h('th', {}, 'Speed'), h('th', {}, 'Sources'), h('th', {}, 'Bitrate'), h('th', {}, '')));
          for (const e of results) {
            const stars = '★'.repeat(Math.min(4, Math.max(1, Math.round(Math.log10(e.sources + 1))))) ;
            tbl.append(h('tr', { class: e.file.endsWith('.exe') ? 'sus' : '' }, h('td', {}, (e.file.endsWith('.exe') ? '⚙️ ' : e.file.endsWith('.mid') || e.file.endsWith('.xm') ? '🎹 ' : '🎵 ') + e.file), h('td', {}, e.size), h('td', {}, e.speed), h('td', {}, `${fmtSrc(e.sources)} ${stars}`), h('td', {}, e.kbps ? e.kbps + ' kbps' : '—'),
              h('td', {}, h('button', { class: 'xpbtn lw-dl', onclick: () => download(e) }, 'Download'))));
          }
          if (!results.length) tbl.append(h('tr', {}, h('td', { colspan: 6, style: { color: '#666', padding: '18px' } }, 'Type something and hit Search. LimeWire has EVERYTHING. (allegedly)')));
          body.append(h('div', { class: 'lw-scroll' }, tbl));
        } else {
          const list = h('div', { class: 'lw-scroll' });
          if (!dls.length) list.append(h('div', { style: { padding: '18px', color: '#666' } }, 'No downloads yet. Your hard drive is suspiciously clean.'));
          for (const d of dls.slice().reverse()) {
            const bar = h('div', { class: 'xpprog' + (d.virus ? ' red' : '') }, h('div', { style: { width: Math.round(d.p * 100) + '%' } }));
            const row = h('div', { class: 'lw-row' }, h('div', { class: 'lw-fn' }, d.e.file), bar,
              h('div', { class: 'lw-st' }, d.done ? (d.virus ? '☠️ Complete (+ bonus friend)' : '✅ Complete') : `Downloading ${Math.round(d.p * 100)}%`),
              d.done && d.idx !== undefined ? h('button', { class: 'xpbtn', onclick: () => { audio.initAudio(); audio.playTrack(d.idx!); window.dispatchEvent(new Event('lanlord-playlist')); const t = audio.TRACKS[d.idx!] as any; if (t.cursed && d.e.ref.kind === 'cursed') setTimeout(() => ui.toast('Now playing', CURSED_REACT[(d.e.ref as any).id] || 'that is... not the song', '🎵'), 1500); } }, '▶ Play') : null);
            (row as any)._bar = bar; list.append(row);
          }
          body.append(list);
        }
        status.textContent = `🟢 Connected to Gnutella · ${(1337000 + Math.floor(Math.random() * 9000)).toLocaleString()} hosts · Sharing 4,812 files (you didn't know you were sharing)`;
      }
      win.opts.update = () => {
        let changed = false;
        for (const d of dls) if (!d.done) { d.p = Math.min(1, (performance.now() - d.start) / d.dur); if (d.p >= 1) { complete(d); changed = true; } }
        if (tab === 'dl') { if (changed) render(); else body.querySelectorAll('.lw-row').forEach((r, i) => { const d = dls.slice().reverse()[i]; const bar = (r as any)._bar as HTMLElement; if (bar && d) { (bar.firstChild as HTMLElement).style.width = Math.round(d.p * 100) + '%'; (r.querySelector('.lw-st') as HTMLElement).textContent = d.done ? (d.virus ? '☠️ Complete (+ bonus friend)' : '✅ Complete') : `Downloading ${Math.round(d.p * 100)}%`; } }); }
        else if (changed) render();
      };
      b.append(h('div', { class: 'lw-head' }, h('span', { class: 'lw-logo' }, '🍋 LimeWire'), h('span', { class: 'lw-pro' }, 'PRO'), h('span', { style: { flex: 1 } }), h('span', { class: 'lw-turbo' }, '⚡ Turbo-Charged Downloads™')), tabs, body, status);
      results = CATALOG.slice(0, 10);
      render();
      setTimeout(() => input.focus(), 50);
    },
  });
}

export function restoreDownloads(list: Download[] | undefined) { for (const d of list || []) registerDownload(d); }
