// Owned by the music agent. Extra Winamp tracks (one per LAN LORD XP era/location).
import type { Track } from './audio';
import { getMusicBus, hat, kick, lead, N, noise, pad, snare, tone } from './audio';

// ---------------- Era-specific WebAudio synth helpers (all routed through musicBus)

function modemChirp(t: number, dur: number, f0: number, f1: number, vol = 0.045) {
  const bus = getMusicBus();
  if (!bus || dur <= 0.02 || vol <= 0 || f0 <= 0 || f1 <= 0) return;
  noise(t, dur, vol * 0.75, 'bandpass', (f0 + f1) * 0.5, bus, 6);
  tone('square', f0, f1, t, dur, vol * 0.55, bus, 0.004);
}

function powerChord(t: number, rootMidi: number, dur: number, vol = 0.085, palmMuted = false) {
  const bus = getMusicBus();
  if (!bus || dur <= 0.02 || vol <= 0) return;
  const ac = bus.context;
  const fl = ac.createBiquadFilter();
  const g = ac.createGain();
  fl.type = 'lowpass';
  fl.Q.setValueAtTime(palmMuted ? 2.2 : 1.1, t);
  fl.frequency.setValueAtTime(palmMuted ? 1150 : 3100, t);
  fl.frequency.exponentialRampToValueAtTime(palmMuted ? 260 : 1350, t + dur);

  const perOsc = vol / 3;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(perOsc, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  fl.connect(g);
  g.connect(bus);

  const detunes = [0.998, 1.002, 1.0];
  [rootMidi, rootMidi + 7, rootMidi + 12].forEach((m, i) => {
    const f = N(m) * detunes[i];
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.connect(fl);
    o.start(t);
    o.stop(t + dur + 0.04);
  });
}

function wobbleBass(t: number, f: number, dur: number, wobbles: number, vol = 0.16, maxFreq = 2600) {
  const bus = getMusicBus();
  if (!bus || !Number.isFinite(f) || f <= 0 || dur <= 0.04 || vol <= 0) return;
  const ac = bus.context;
  const o1 = ac.createOscillator();
  const o2 = ac.createOscillator();
  const sub = ac.createOscillator();
  const fl = ac.createBiquadFilter();
  const g = ac.createGain();
  const subG = ac.createGain();

  o1.type = 'sawtooth';
  o1.frequency.setValueAtTime(f, t);
  o2.type = 'sawtooth';
  o2.frequency.setValueAtTime(f * 1.008, t);
  sub.type = 'sine';
  sub.frequency.setValueAtTime(f * 0.5, t);

  fl.type = 'lowpass';
  fl.Q.setValueAtTime(6.5, t);

  const minFreq = 130;
  const cycles = Math.max(1, Math.round(wobbles));
  const cycDur = dur / cycles;
  fl.frequency.setValueAtTime(minFreq, t);
  for (let i = 0; i < cycles; i++) {
    const cStart = t + i * cycDur;
    const cPeak = cStart + cycDur * 0.42;
    const cEnd = cStart + cycDur;
    fl.frequency.exponentialRampToValueAtTime(Math.max(200, maxFreq), cPeak);
    fl.frequency.exponentialRampToValueAtTime(minFreq, cEnd);
  }

  const sawGain = vol * 0.6;
  const subGain = vol * 0.5;
  const sustainEnd = Math.max(t + 0.012, t + dur - 0.02);

  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(sawGain, t + 0.008);
  g.gain.setValueAtTime(sawGain, sustainEnd);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  subG.gain.setValueAtTime(0.0001, t);
  subG.gain.linearRampToValueAtTime(subGain, t + 0.008);
  subG.gain.setValueAtTime(subGain, sustainEnd);
  subG.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  o1.connect(fl);
  o2.connect(fl);
  fl.connect(g);
  g.connect(bus);
  sub.connect(subG);
  subG.connect(bus);

  o1.start(t);
  o2.start(t);
  sub.start(t);
  o1.stop(t + dur + 0.04);
  o2.stop(t + dur + 0.04);
  sub.stop(t + dur + 0.04);
}

function supersaw(t: number, notes: number[], dur: number, vol = 0.08, fStart = 2800, fEnd = 1200, attack = 0.025) {
  const bus = getMusicBus();
  if (!bus || notes.length === 0 || dur <= attack + 0.015 || vol <= 0) return;
  const ac = bus.context;
  const fl = ac.createBiquadFilter();
  const g = ac.createGain();
  fl.type = 'lowpass';
  fl.Q.setValueAtTime(1.2, t);
  fl.frequency.setValueAtTime(Math.max(120, fStart), t);
  fl.frequency.exponentialRampToValueAtTime(Math.max(120, fEnd), t + dur);

  const peak = vol / (notes.length * 2.2);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  fl.connect(g);
  g.connect(bus);

  const detunes = [0.993, 1.0, 1.007];
  for (const m of notes) {
    const base = N(m);
    for (const d of detunes) {
      const o = ac.createOscillator();
      o.type = 'sawtooth';
      o.frequency.setValueAtTime(base * d, t);
      o.connect(fl);
      o.start(t);
      o.stop(t + dur + 0.04);
    }
  }
}

function pianoStab(t: number, notes: number[], dur: number, vol = 0.07) {
  const bus = getMusicBus();
  if (!bus || notes.length === 0 || dur <= 0.02 || vol <= 0) return;
  const v = vol / notes.length;
  for (const m of notes) {
    tone('triangle', N(m), N(m), t, dur, v, bus, 0.004);
    tone('sine', N(m + 12), N(m + 12), t, dur * 0.65, v * 0.45, bus, 0.003);
  }
}

// ---------------- 5 Era Tracks

export const EXTRA_TRACKS: Track[] = [
  // 1. Basement Era (2004): Lo-fi "dial-up modem" chiptune (16 bars: 8-bar A + 8-bar B)
  {
    title: "Mom's Basement Blues (56k Remix).mp3",
    bpm: 126,
    length: '2:44',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isB = bar >= 8;

      // Drums + 56k modem-screech percussion
      if (!isB) {
        if (st === 0 || st === 8 || (bar % 2 === 1 && st === 10)) kick(t);
        if (st === 4 || st === 12) snare(t, 0.22);
        if (st % 2 === 1) hat(t, 0.08);
        // Handshake screech fills at end of 4-bar phrases
        if (bar % 4 === 3 && st >= 12) {
          const freqs = [2100, 1650, 2400, 1300];
          modemChirp(t, spb * 0.85, freqs[st - 12], freqs[(st - 11) % 4], 0.045);
        } else if (st === 14 && bar % 2 === 0) {
          modemChirp(t, spb * 0.7, 1850, 2650, 0.032);
        }
      } else {
        // B section: faster 8-bit hustle + modem static hats
        if (st % 4 === 0) kick(t);
        if (st === 4 || st === 12) snare(t, 0.25);
        if (st % 2 === 1) modemChirp(t, spb * 0.38, 3200, 2400, 0.022);
        if (bar === 15 && st >= 10) {
          // Reconnect handshake turnaround back to A
          const f = 1400 + ((st - 10) % 3) * 650;
          modemChirp(t, spb * 0.85, f, f * 1.25, 0.048);
        }
      }

      // Harmony & Bass
      const b4 = bar % 4;
      const chordsA = [
        [60, 63, 67], // Cm
        [65, 68, 72], // Fm
        [68, 72, 75], // Ab
        [67, 71, 74], // G
      ];
      const chordsB = [
        [63, 67, 70], // Eb
        [62, 65, 70], // Bb
        [65, 68, 72], // Fm
        [67, 71, 74], // G
      ];
      const bassRootsA = [36, 41, 44, 43];
      const bassRootsB = [39, 46, 41, 43];

      const ch = isB ? chordsB[b4] : chordsA[b4];
      const root = isB ? bassRootsB[b4] : bassRootsA[b4];

      // 8-bit walking octave bass on 8th notes
      if (st % 2 === 0) {
        const oct = st === 2 || st === 6 || st === 10 || st === 14 ? 12 : st === 12 ? 7 : 0;
        const f = N(root + oct);
        tone('square', f, f, t, spb * 1.4, 0.095, bus, 0.004);
      }

      // Soft triangle 16th chiptune arp
      const arpSeq = [ch[0], ch[1], ch[2], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]];
      const arpNote = arpSeq[st % 8];
      tone('triangle', N(arpNote), N(arpNote), t, spb * 0.75, 0.032, bus, 0.004);

      // Lead melodies (Section A vs Section B)
      const melA = [
        [72, 0, 75, 72, 79, 0, 75, 74, 72, 75, 79, 0, 75, 72, 70, 0],
        [77, 0, 80, 77, 75, 0, 72, 0, 77, 75, 72, 75, 77, 0, 72, 0],
        [75, 0, 80, 79, 75, 0, 72, 0, 75, 80, 84, 0, 80, 79, 75, 0],
        [74, 0, 79, 77, 74, 0, 71, 0, 74, 77, 79, 0, 74, 71, 67, 0],
      ];
      const melB = [
        [79, 79, 0, 75, 79, 0, 82, 0, 79, 75, 74, 75, 79, 0, 0, 0],
        [77, 77, 0, 74, 77, 0, 82, 0, 77, 74, 72, 74, 77, 0, 0, 0],
        [80, 0, 77, 75, 72, 0, 75, 77, 80, 0, 84, 0, 80, 77, 75, 0],
        [79, 0, 74, 71, 74, 79, 83, 0, 79, 74, 71, 0, 0, 0, 0, 0],
      ];

      const mn = (isB ? melB : melA)[b4][st];
      if (mn) {
        const f = N(mn);
        const fStart = st % 4 === 0 ? N(mn - 2) : f; // subtle chiptune pitch-bend ornament
        tone('square', fStart, f, t, spb * 1.1, 0.055, bus, 0.004);
        if ((bar >= 4 && !isB) || isB) {
          tone('square', N(mn + 12), N(mn + 12), t, spb * 0.65, 0.02, bus, 0.004);
        }
      }
    },
  },

  // 2. Strip Mall (2006): Emo / Pop-punk power chords with sawtooth (16 bars: 8-bar Verse A + 8-bar Chorus B)
  {
    title: 'My Chemical Bromance - Helena Rubinstein.mp3',
    bpm: 168,
    length: '3:18',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isChorus = bar >= 8;

      if (!isChorus) {
        // Section A: Emo Verse (clean arpeggio -> palm-muted build -> snare roll into chorus)
        if (st === 0 || st === 6 || st === 8 || (bar >= 4 && st === 10)) kick(t);
        if (st === 4 || st === 12) snare(t, 0.28);
        if (st % 2 === 0) hat(t, bar >= 4 ? 0.12 : 0.07);
        if (bar === 7 && st >= 10) snare(t, 0.34); // punk fill into chorus

        const b4 = bar % 4;
        const roots = [52, 48, 55, 50]; // Em - C - G - D
        const bassRoots = [40, 36, 43, 38];

        // Clean emo intro guitar arpeggio on 8th notes
        const arps = [
          [64, 71, 76, 71, 64, 71, 76, 79],
          [60, 67, 72, 67, 60, 67, 72, 76],
          [55, 62, 67, 62, 55, 62, 71, 67],
          [50, 57, 62, 66, 69, 66, 62, 57],
        ];
        if (st % 2 === 0) {
          const an = arps[b4][st / 2];
          tone('triangle', N(an), N(an), t, spb * 2.4, 0.065, bus, 0.004);
        }

        // Palm-muted sawtooth power-chord chugs (light in bars 0-3, driving in bars 4-7)
        const chugPat = [1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 0, 1];
        if (bar >= 2 && chugPat[st]) {
          powerChord(t, roots[b4], spb * 1.1, bar >= 4 ? 0.08 : 0.05, true);
        }
        if (bar >= 4 && st % 2 === 0) {
          const bf = N(bassRoots[b4]);
          tone('sawtooth', bf, bf, t, spb * 1.5, 0.13, bus, 0.005);
        }
      } else {
        // Section B: Full Open Chorus (roaring sawtooth power chords + octave emo lead)
        const cBar = bar - 8;
        if (st === 0 || st === 2 || st === 6 || st === 8 || st === 10) kick(t);
        if (st === 4 || st === 12) snare(t, 0.34);
        if (st % 2 === 0) hat(t, 0.15);
        if (cBar % 4 === 0 && st === 0) noise(t, 0.28, 0.09, 'highpass', 5000, bus);

        // C - D - Em - G (bars 8-11), C - D - Em - B (bars 12-15)
        const chorusRoots = [48, 50, 52, 55, 48, 50, 52, 47];
        const chorusBass = [36, 38, 40, 43, 36, 38, 40, 35];
        const strumPat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0];

        if (strumPat[st]) {
          powerChord(t, chorusRoots[cBar], spb * 2.4, 0.09, false);
        }
        if (st % 2 === 0) {
          const bf = N(chorusBass[cBar]);
          tone('sawtooth', bf, bf, t, spb * 1.6, 0.15, bus, 0.005);
        }

        const chorusLead = [
          [79, 0, 79, 0, 76, 0, 79, 0, 83, 0, 81, 0, 79, 0, 76, 0],
          [78, 0, 78, 0, 74, 0, 78, 0, 81, 0, 79, 0, 78, 0, 74, 0],
          [76, 0, 76, 0, 79, 0, 83, 0, 84, 0, 83, 0, 79, 0, 76, 0],
          [79, 0, 83, 0, 86, 0, 83, 0, 81, 0, 79, 0, 78, 0, 74, 0],
          [79, 0, 79, 0, 76, 0, 79, 0, 83, 0, 81, 0, 79, 0, 76, 0],
          [78, 0, 78, 0, 74, 0, 78, 0, 81, 0, 83, 0, 81, 0, 78, 0],
          [79, 0, 76, 0, 79, 0, 83, 0, 84, 0, 83, 0, 79, 0, 76, 0],
          [78, 0, 75, 0, 78, 0, 83, 0, 87, 0, 83, 0, 78, 0, 75, 0],
        ];
        const ln = chorusLead[cBar][st];
        if (ln) {
          lead(t, N(ln), spb * 1.8, 0.055, 'sawtooth');
          tone('triangle', N(ln + 12), N(ln + 12), t, spb * 1.6, 0.028, bus, 0.005);
        }
      }
    },
  },

  // 3. Blockbuster (2008): Bouncy Eurodance (16 bars: 8-bar Breakdown/Build A + 8-bar Hands-Up Drop B)
  {
    title: 'Cascada Falls - Everytime We LAN.mp3',
    bpm: 142,
    length: '3:42',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isDrop = bar >= 8;
      const b4 = bar % 4;

      // F#m - D - A - E progression
      const chords = [
        [66, 69, 73],
        [62, 66, 69],
        [69, 73, 76],
        [64, 68, 71],
      ];
      const bassRoots = [42, 38, 45, 40];
      const ch = chords[b4];
      const bass = bassRoots[b4];

      if (!isDrop) {
        // Section A: Eurodance pad + bouncy pluck + snare build
        if (st === 0) pad(t, ch, spb * 14, 0.032);
        if (bar >= 4 && st % 4 === 0) kick(t);
        if (bar >= 4 && st % 4 === 2) {
          const oct = st === 14 ? 12 : 0;
          lead(t, N(bass + oct), spb * 1.5, 0.08, 'sawtooth');
          tone('sine', N(bass + oct - 12), N(bass + oct - 12), t, spb * 1.4, 0.06, bus, 0.004);
        }
        // Build snares in bars 6 & 7
        if (bar === 4 || bar === 5) {
          if (st === 4 || st === 12) snare(t, 0.2);
        } else if (bar === 6 && st % 2 === 0) {
          snare(t, 0.18);
        } else if (bar === 7) {
          snare(t, 0.15 + st * 0.012);
          if (st % 4 === 0) tone('sawtooth', N(69 + st / 4), N(71 + st / 4), t, spb * 3.5, 0.035, bus, 0.01);
        }

        // Bouncy Euro pluck arp
        if (st % 2 === 0) {
          const arp = [ch[0], ch[1], ch[2], ch[1], ch[2], ch[0] + 12, ch[2], ch[1]];
          const an = arp[st / 2];
          tone('triangle', N(an), N(an), t, spb * 1.2, 0.05, bus, 0.004);
        }
      } else {
        // Section B: Hands-Up Drop (4-on-the-floor kick, offbeat pumping bass, catchy lead)
        if (st % 4 === 0) kick(t);
        if (st === 4 || st === 12) snare(t, 0.28);
        if (st % 4 === 2) hat(t, 0.16);
        else if (st % 2 === 1) hat(t, 0.06);
        if ((bar === 8 || bar === 12) && st === 0) noise(t, 0.25, 0.08, 'highpass', 5500, bus);

        // Off-beat pumping Euro bass
        if (st % 4 === 2) {
          const oct = st === 14 ? 12 : 0;
          const f = N(bass + oct);
          lead(t, f, spb * 1.6, 0.09, 'sawtooth');
          tone('sine', f * 0.5, f * 0.5, t, spb * 1.5, 0.075, bus, 0.004);
        }

        // Dance piano stabs
        if (st === 0 || st === 3 || st === 6 || st === 8 || st === 11 || st === 14) {
          pianoStab(t, ch, spb * 1.6, 0.055);
        }

        // Original Hands-Up Lead Melody
        const mel1 = [
          [73, 0, 76, 73, 78, 0, 76, 0, 73, 0, 76, 78, 81, 0, 78, 0],
          [74, 0, 78, 74, 81, 0, 78, 0, 74, 0, 76, 78, 81, 0, 78, 0],
          [76, 0, 81, 76, 85, 0, 83, 0, 81, 0, 80, 78, 76, 0, 73, 0],
          [76, 0, 71, 76, 80, 0, 76, 0, 75, 76, 80, 0, 83, 0, 80, 0],
        ];
        const mel2End = [83, 0, 80, 76, 80, 0, 83, 0, 85, 0, 83, 0, 80, 0, 76, 0];
        const mn = bar === 15 ? mel2End[st] : mel1[b4][st];
        if (mn) {
          lead(t, N(mn), spb * 1.25, 0.085, 'sawtooth');
          tone('square', N(mn + 12), N(mn + 12), t, spb * 0.9, 0.022, bus, 0.004);
        }
      }
    },
  },

  // 4. Warehouse (2010): Dubstep-ish with wobble bass (16 bars: 8-bar Eerie Intro/Build A + 8-bar Wobble Drop B)
  {
    title: 'Skrillecks - Scary Monsters & Nice Routers.mp3',
    bpm: 140,
    length: '4:04',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isDrop = bar >= 8;

      if (!isDrop) {
        // Section A: Eerie Warehouse Intro + Half-time Snare Riser
        const b4 = bar % 4;
        const chords = [
          [62, 65, 69], // Dm
          [58, 62, 65], // Bb
          [55, 58, 62], // Gm
          [57, 61, 64], // A
        ];
        const subRoots = [38, 34, 31, 33];

        if (st === 0) {
          pad(t, chords[b4], spb * 14, 0.028);
          tone('sine', N(subRoots[b4]), N(subRoots[b4]), t, spb * 12, 0.14, bus, 0.02);
        }
        // Creepy high bell arp
        if (st % 2 === 0 && bar < 7) {
          const bellPat = [chords[b4][2] + 12, chords[b4][1] + 12, chords[b4][0] + 12, chords[b4][2] + 12];
          const bn = bellPat[(st / 2) % 4];
          tone('sine', N(bn), N(bn), t, spb * 2.2, 0.04, bus, 0.004);
        }

        // Half-time drums + snare riser
        if (bar < 4) {
          if (st === 0) kick(t);
          if (st === 8) snare(t, 0.28);
          if (st % 4 === 2) hat(t, 0.07);
        } else if (bar === 4 || bar === 5) {
          if (st % 4 === 0) snare(t, 0.24);
          if (st === 0) kick(t);
        } else if (bar === 6) {
          if (st % 2 === 0) {
            snare(t, 0.26);
            tone('sawtooth', N(62 + st * 0.5), N(63 + st * 0.5), t, spb * 1.6, 0.03, bus, 0.005);
          }
        } else if (bar === 7) {
          if (st < 12) {
            snare(t, 0.2 + st * 0.015);
            tone('sawtooth', N(70 + st * 0.6), N(71 + st * 0.6), t, spb * 0.9, 0.035, bus, 0.004);
          } else if (st === 13) {
            // Pre-drop zap pause
            tone('sawtooth', 920, 140, t, spb * 2.4, 0.065, bus, 0.005);
          }
        }
      } else {
        // Section B: Heavy Dubstep Wobble Drop (half-time: kick on 0, huge snare on 8)
        const dBar = bar - 8;
        if (st === 0 || (dBar % 2 === 0 && st === 6) || (dBar % 2 === 1 && st === 10)) kick(t);
        if (st === 8) {
          snare(t, 0.42);
          tone('triangle', 210, 95, t, 0.11, 0.15, bus, 0.004);
        }
        if (st % 2 === 0) hat(t, st % 4 === 2 ? 0.12 : 0.06);
        if ((dBar === 0 || dBar === 4) && st === 0) noise(t, 0.3, 0.09, 'highpass', 4500, bus);

        // Non-overlapping rhythmic wobble phrases (note, durInSixteenths, wobbleCount, maxCutoff)
        type WobEvent = [number, number, number, number];
        const phrases: Record<number, WobEvent>[] = [
          { 0: [38, 4, 2, 2400], 4: [38, 4, 4, 2900], 10: [41, 3, 3, 2700], 13: [40, 3, 2, 2200] },
          { 0: [34, 4, 1, 2100], 4: [38, 4, 3, 2800], 10: [36, 2, 2, 2500], 12: [41, 4, 6, 3200] },
          { 0: [31, 4, 2, 2300], 4: [38, 4, 4, 2900], 10: [43, 4, 4, 3000], 14: [41, 2, 2, 2600] },
          { 0: [33, 6, 3, 2500], 6: [39, 2, 2, 2900] },
          { 0: [38, 4, 2, 2500], 4: [38, 4, 4, 3100], 10: [41, 3, 3, 2800], 13: [43, 3, 3, 3000] },
          { 0: [34, 4, 2, 2400], 4: [38, 4, 6, 3200], 10: [41, 2, 2, 2600], 12: [36, 4, 4, 2900] },
          { 0: [31, 4, 2, 2400], 4: [41, 4, 4, 3000], 10: [43, 3, 3, 2900], 13: [40, 3, 3, 2800] },
          { 0: [33, 4, 2, 2600], 4: [38, 4, 4, 3100] },
        ];

        const wob = phrases[dBar][st];
        if (wob) {
          wobbleBass(t, N(wob[0]), spb * wob[1], wob[2], 0.135, wob[3]);
        }

        // High screechy synth fills answering the wobbles in turnaround bars 11 and 15
        if (dBar === 3 && st >= 10 && st % 2 === 0) {
          const fill = [86, 81, 77];
          lead(t, N(fill[(st - 10) / 2]), spb * 1.4, 0.065, 'sawtooth');
        } else if (dBar === 7 && st >= 10) {
          const glitch = [74, 77, 81, 86, 81, 77];
          lead(t, N(glitch[st - 10]), spb * 0.85, 0.065, 'sawtooth');
        } else if (st === 2 || st === 14) {
          // Subtle sparkling top-end stab
          const top = dBar % 2 === 0 ? 74 : 77;
          tone('square', N(top), N(top), t, spb * 0.8, 0.028, bus, 0.004);
        }
      }
    },
  },

  // 5. Tower (2012): Big-room EDM anthem with supersaw build & drop (16 bars: 8-bar Build A + 8-bar Drop B)
  {
    title: 'Aviici - Lan-vels.mp3',
    bpm: 128,
    length: '5:12',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isDrop = bar >= 8;
      const b4 = bar % 4;

      // C#m - A - E - B progression
      const chords = [
        [61, 64, 68],
        [57, 61, 64],
        [64, 68, 71],
        [59, 63, 66],
      ];
      const bassRoots = [37, 33, 40, 35];
      const ch = chords[b4];
      const bass = bassRoots[b4];

      if (!isDrop) {
        // Section A: Festival Piano + Opening Supersaw Build
        const pianoPat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0, 0, 0];
        if (bar < 7 && pianoPat[st]) {
          pianoStab(t, ch, spb * 1.8, 0.065);
        }

        // Swelling supersaw filter opens across bars 0..7
        if (st === 0 && bar < 7) {
          const cutStart = 500 + bar * 550;
          const cutEnd = 900 + bar * 650;
          supersaw(t, ch, spb * 15, 0.045 + bar * 0.005, cutStart, cutEnd, 0.05);
        }

        // Progressive build drums (bars 0-3 gentle pulse, 4-7 accelerating snare build)
        if (bar < 4) {
          if (st % 4 === 0) kick(t);
          if (st % 4 === 2) hat(t, 0.09);
        } else if (bar === 4) {
          if (st % 4 === 0) { kick(t); snare(t, 0.2); }
        } else if (bar === 5) {
          if (st % 2 === 0) snare(t, 0.22);
          if (st % 4 === 0) kick(t);
        } else if (bar === 6) {
          snare(t, 0.16 + st * 0.008);
          if (st % 4 === 0) tone('sawtooth', N(64 + st * 0.3), N(66 + st * 0.3), t, spb * 3.5, 0.035, bus, 0.005);
        } else if (bar === 7) {
          if (st < 11) {
            snare(t, 0.22 + st * 0.014);
            tone('sawtooth', N(68 + st * 0.5), N(70 + st * 0.5), t, spb * 0.9, 0.04, bus, 0.004);
          } else if (st === 12) {
            // Dramatic pre-drop vocal/chime breath
            snare(t, 0.4);
            tone('sine', N(76), N(88), t, spb * 3.5, 0.07, bus, 0.01);
          }
        }
      } else {
        // Section B: Big-Room Festival Supersaw Drop
        if (st % 4 === 0) kick(t);
        if (st === 4 || st === 12) snare(t, 0.32);
        if (st % 4 === 2) hat(t, 0.17);
        if ((bar === 8 || bar === 12) && st === 0) noise(t, 0.32, 0.1, 'highpass', 5200, bus);

        // Sidechain-pumped supersaw chords (attack ducks around each kick)
        if (st % 4 === 0) {
          supersaw(t, ch, spb * 3.8, 0.085, 4200, 1800, 0.038);
        }

        // Driving big-room bassline
        const bassPat = [1, 0, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0];
        if (bassPat[st]) {
          const bf = N(bass);
          lead(t, bf, spb * 1.4, 0.085, 'sawtooth');
          tone('sine', bf * 0.5, bf * 0.5, t, spb * 1.4, 0.075, bus, 0.005);
        }

        // Soaring original festival anthem melody
        const melLow = [
          [76, 0, 76, 0, 80, 0, 76, 0, 75, 0, 73, 0, 76, 0, 80, 0],
          [81, 0, 81, 0, 80, 0, 76, 0, 73, 0, 76, 0, 80, 0, 76, 0],
          [83, 0, 83, 0, 80, 0, 76, 0, 75, 0, 76, 0, 80, 0, 83, 0],
          [87, 0, 85, 0, 83, 0, 80, 0, 78, 0, 75, 0, 78, 0, 83, 0],
        ];
        const melPeak = [
          [76, 0, 76, 0, 80, 0, 76, 0, 75, 0, 73, 0, 76, 0, 80, 0],
          [81, 0, 81, 0, 80, 0, 76, 0, 73, 0, 76, 0, 80, 0, 76, 0],
          [88, 0, 88, 0, 85, 0, 83, 0, 80, 0, 83, 0, 85, 0, 88, 0],
          [87, 0, 85, 0, 83, 0, 80, 0, 78, 0, 75, 0, 78, 0, 83, 0],
        ];

        const mn = (bar >= 12 ? melPeak : melLow)[b4][st];
        if (mn) {
          lead(t, N(mn), spb * 1.8, 0.08, 'sawtooth');
          tone('triangle', N(mn + 12), N(mn + 12), t, spb * 1.4, 0.025, bus, 0.005);
        }
      }
    },
  },
];
