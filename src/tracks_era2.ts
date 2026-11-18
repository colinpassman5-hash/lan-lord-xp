// Owned by the composer agent: era tracks v2 + cursed LimeWire files.
import type { Track } from './audio';
import {
  chord,
  drums,
  getMusicBus,
  guitar,
  midi,
  N,
  noise,
  scratch,
  tone,
  trackerArp,
  woah,
} from './audio';

// ---------------- Local v2 synth helpers (all routed through musicBus)

/** Nasal kazoo: square + saw buzz shaped through a resonant vocal bandpass. */
function kazoo(t: number, note: number, dur: number, vol = 0.06) {
  const bus = getMusicBus();
  if (!bus || !Number.isFinite(note) || dur <= 0 || vol <= 0) return;
  const ac = bus.context;
  const f = N(note);
  const o1 = ac.createOscillator();
  const o2 = ac.createOscillator();
  const lfo = ac.createOscillator();
  const lfoG = ac.createGain();
  const bp = ac.createBiquadFilter();
  const g = ac.createGain();

  o1.type = 'square';
  o1.frequency.setValueAtTime(f * 0.96, t);
  o1.frequency.linearRampToValueAtTime(f, t + Math.min(0.03, dur * 0.35));
  o2.type = 'sawtooth';
  o2.frequency.setValueAtTime(f * 1.004, t);

  lfo.frequency.setValueAtTime(19, t);
  lfoG.gain.setValueAtTime(22, t);
  lfo.connect(lfoG);
  lfoG.connect(o1.detune);
  lfoG.connect(o2.detune);

  bp.type = 'bandpass';
  bp.frequency.setValueAtTime(Math.min(2400, Math.max(750, f * 2.1)), t);
  bp.Q.setValueAtTime(5.2, t);

  const atk = Math.min(0.012, dur * 0.2);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + atk);
  g.gain.setValueAtTime(vol * 0.85, Math.max(t + atk, t + dur * 0.8));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.03);

  o1.connect(bp);
  o2.connect(bp);
  bp.connect(g);
  g.connect(bus);

  o1.start(t);
  o2.start(t);
  lfo.start(t);
  o1.stop(t + dur + 0.05);
  o2.stop(t + dur + 0.05);
  lfo.stop(t + dur + 0.05);
}

/** Accordion-ish musette reed: organ base + detuned reedy harmonics. */
function reed(t: number, note: number, dur: number, vol = 0.045) {
  const bus = getMusicBus();
  if (!bus || !Number.isFinite(note) || dur <= 0 || vol <= 0) return;
  midi(t, note, dur, vol * 0.72, 'organ');
  const ac = bus.context;
  const f = N(note);
  const lp = ac.createBiquadFilter();
  const g = ac.createGain();
  lp.type = 'bandpass';
  lp.frequency.setValueAtTime(Math.min(3200, Math.max(600, f * 2.4)), t);
  lp.Q.setValueAtTime(1.4, t);

  const atk = Math.min(0.015, dur * 0.25);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol * 0.45, t + atk);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.04);

  lp.connect(g);
  g.connect(bus);

  for (const det of [-11, 11]) {
    const o = ac.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(f, t);
    o.detune.setValueAtTime(det, t);
    o.connect(lp);
    o.start(t);
    o.stop(t + dur + 0.06);
  }
}

/** Synthesized comedic wet burble for the 'fart' cursed LimeWire file. */
function fartBurble(t: number, vol = 0.14) {
  const bus = getMusicBus();
  if (!bus || vol <= 0) return;
  const puffs = [0, 0.045, 0.095, 0.145, 0.2, 0.26, 0.32, 0.39];
  puffs.forEach((off, i) => {
    const f0 = Math.max(36, 98 - i * 6 + (i % 2 === 0 ? 12 : -5));
    const f1 = Math.max(28, f0 * 0.62);
    tone('sawtooth', f0, f1, t + off, 0.075, vol * (i < 6 ? 1 : 0.75), bus, 0.004);
  });
  noise(t, 0.42, vol * 0.75, 'lowpass', 240, bus, 4.5);
  tone('sine', 230, 315, t + 0.44, 0.09, vol * 0.24, bus, 0.008);
}

// ---------------- 7 Era 2 Tracks (2004–2012)

export const ERA2_TRACKS: Track[] = [
  // 1. 2004 Keygen / Crack-Intro Tracker (16 bars: 8-bar bouncy A + 8-bar heroic B)
  {
    title: 'RAZOR 1912 - k3yg3n_1nstall3r.xm',
    bpm: 145,
    length: '2:19',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isB = bar >= 8;
      const b4 = bar % 4;

      // Drums: punchy Amiga tracker kit
      if (st % 4 === 0) drums.kick(t, 0.7);
      if (!isB && st === 10 && bar % 2 === 1) drums.kick(t, 0.55);
      if (st === 4 || st === 12) {
        drums.snare(t, 0.26);
        drums.rim(t, 0.06);
      }
      if (st % 2 === 1) drums.hat(t, isB ? 0.085 : 0.06);
      if (isB && st % 4 === 2) drums.openHat(t, 0.065);
      if ((bar === 0 || bar === 8 || bar === 12) && st === 0) drums.crash(t, 0.085);
      if ((bar === 7 || bar === 15) && st >= 12) {
        drums.snare(t, 0.16 + (st - 12) * 0.04);
        if (st === 14) drums.tom(t, 48, 0.26);
      }

      // Harmony: A minor heroic tracker progressions
      const chordsA = [
        [57, 60, 64], // Am
        [53, 57, 60], // F
        [60, 64, 67], // C
        [55, 59, 62], // G
      ];
      const chordsB =
        bar < 12
          ? [
              [53, 57, 60], // F
              [55, 59, 62], // G
              [52, 55, 59], // Em
              [57, 60, 64], // Am
            ]
          : [
              [53, 57, 60], // F
              [55, 59, 62], // G
              [52, 56, 59], // E
              [57, 60, 64], // Am
            ];
      const bassRootsA = [45, 41, 48, 43];
      const bassRootsB = [41, 43, 40, 45];

      const ch = isB ? chordsB[b4] : chordsA[b4];
      const bassRoot = isB ? bassRootsB[b4] : bassRootsA[b4];

      // Iconic 50Hz trackerArp chord texture
      if (st % 4 === 0) {
        trackerArp(
          t,
          isB ? [ch[0] + 12, ch[1] + 12, ch[2] + 12] : ch,
          spb * 3.75,
          isB ? 0.036 : 0.034,
          isB ? 'sawtooth' : 'square',
        );
      }

      // Bouncy octave-jumping chip bassline
      if (st % 2 === 0) {
        const oct = st === 2 || st === 6 || st === 10 || st === 14 ? 12 : st === 12 ? 7 : 0;
        midi(t, bassRoot + oct, spb * 1.4, 0.085, 'bass');
      }

      // Original bouncy keygen melodies (Section A vs Section B)
      const melA = [
        [76, 0, 72, 76, 81, 0, 79, 76, 72, 0, 76, 79, 76, 0, 72, 0],
        [77, 0, 72, 77, 81, 0, 79, 77, 76, 0, 72, 74, 76, 0, 0, 0],
        [79, 0, 76, 79, 84, 0, 83, 79, 76, 0, 79, 83, 81, 0, 79, 0],
        [74, 76, 79, 0, 74, 79, 83, 0, 81, 79, 76, 74, 71, 0, 74, 0],
      ];
      const melAEnd = [74, 76, 79, 81, 83, 81, 79, 76, 79, 81, 83, 84, 83, 81, 79, 76];

      const melB = [
        [81, 0, 81, 84, 81, 0, 77, 0, 77, 79, 81, 0, 84, 0, 81, 0],
        [83, 0, 83, 86, 83, 0, 79, 0, 79, 81, 83, 0, 86, 0, 83, 0],
        [84, 0, 83, 79, 83, 0, 79, 76, 79, 0, 76, 74, 76, 0, 0, 0],
        [81, 0, 79, 76, 72, 76, 79, 0, 81, 0, 84, 83, 81, 0, 79, 0],
      ];
      const melB2 = [
        [81, 0, 81, 84, 81, 0, 77, 0, 77, 79, 81, 0, 84, 0, 81, 0],
        [83, 0, 83, 86, 83, 0, 79, 0, 79, 81, 83, 0, 86, 0, 83, 0],
        [83, 0, 80, 76, 80, 83, 88, 0, 86, 84, 83, 80, 76, 0, 80, 0],
        [81, 0, 84, 0, 88, 0, 84, 81, 79, 76, 72, 76, 81, 0, 0, 0],
      ];

      const mn = !isB
        ? bar === 7
          ? melAEnd[st]
          : melA[b4][st]
        : (bar >= 12 ? melB2 : melB)[b4][st];

      if (mn) {
        const f = N(mn);
        const slideFrom = st % 4 === 0 ? N(mn - 2) : f;
        tone('square', slideFrom, f, t, spb * 1.15, 0.045, bus, 0.004);
        if (isB || bar >= 4) {
          midi(t, mn, spb * 1.1, 0.025, 'lead');
        }
      }
    },
  },

  // 2. 2004 Crunk Hip-Hop (16 bars: 8-bar Minimal Stomp Verse A + 8-bar Brass & Gang-Shout Hook B)
  {
    title: 'Lil Jawn & The Ping Boyz - Get Low Ping (Crunk Mix).mp3',
    bpm: 102,
    length: '4:04',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isHook = bar >= 8;

      // 808 kick + claps + crunk hat ratchets
      const kickPatA = [1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0];
      const kickPatB = [1, 0, 0, 1, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 1, 0];
      if ((isHook ? kickPatB : kickPatA)[st]) {
        drums.kick808(t, 0.72);
      }

      if (st === 4 || st === 12) {
        drums.clap(t, 0.28);
        drums.rim(t, 0.075);
      }
      if (bar % 4 === 3 && st >= 13) {
        drums.clap(t, 0.22);
      }

      // Crunk hi-hat groove with 16th-note bounce rolls
      if (st % 2 === 0) {
        drums.hat(t, st % 4 === 2 ? 0.085 : 0.05);
      } else if ((bar % 2 === 1 && st >= 11) || (isHook && (st === 7 || st === 15))) {
        drums.hat(t, 0.065);
      }
      if (isHook && st === 14) drums.openHat(t, 0.075);

      // Sub bass following E Phrygian bounce
      const bassNotes = [40, 40, 41, 40];
      const bRoot = bassNotes[bar % 4];
      if (st === 0 || st === 6 || st === 10) {
        midi(t, st === 10 && bar % 2 === 1 ? bRoot + 1 : bRoot, spb * 2.6, 0.085, 'bass');
      }

      // Brass stabs (E5 -> F5 Phrygian punch)
      const em = [52, 59, 64];
      const fMaj = [53, 60, 65];
      const gMaj = [55, 62, 67];

      if (!isHook) {
        if (st === 0 || st === 3 || st === 6) {
          chord(t, bar % 4 === 2 ? fMaj : em, spb * 1.4, 0.025, 'brass');
        }
        if (bar % 2 === 1 && st === 12) {
          chord(t, fMaj, spb * 1.6, 0.025, 'brass');
        }
      } else {
        // Big crunk hook brass pattern
        if (st === 0 || st === 3 || st === 6) {
          chord(t, bar % 4 === 3 ? gMaj : em, spb * 1.5, 0.028, 'brass');
        } else if (st === 8 || st === 11) {
          chord(t, bar % 2 === 1 ? fMaj : em, spb * 1.4, 0.026, 'brass');
        }
      }

      // Call-and-response "woah" / "ah" hype shouts
      if (!isHook) {
        if (bar % 2 === 0 && st === 8) {
          woah(t, 52, spb * 2.4, 0.046, 'ah', -4);
        } else if (bar % 2 === 1 && st === 12) {
          woah(t, 55, spb * 2.2, 0.044, 'oh', -3);
        }
      } else {
        if (st === 8) {
          woah(t, 52, spb * 2.2, 0.036, 'ah', 2);
          woah(t, 59, spb * 2.2, 0.026, 'ah', 2);
        } else if (st === 12 && bar % 2 === 1) {
          woah(t, 53, spb * 2.2, 0.038, 'oh', -4);
          woah(t, 60, spb * 2.2, 0.026, 'oh', -4);
        }
      }

      // Original high crunk synth whistle motif (enters bars 4-7 and throughout Hook)
      if (bar >= 4) {
        const whistleA = [88, 0, 0, 89, 0, 0, 88, 0, 86, 0, 83, 0, 88, 0, 0, 0];
        const whistleB = [88, 0, 89, 88, 86, 0, 83, 0, 88, 0, 89, 91, 89, 0, 88, 0];
        const wn = (isHook ? whistleB : whistleA)[st];
        if (wn) {
          const slideTo = st === 6 || st === 14 ? N(wn - 2) : N(wn);
          tone('sine', N(wn), slideTo, t, spb * 1.7, 0.042, bus, 0.01);
          if (isHook) midi(t, wn - 12, spb * 1.3, 0.025, 'lead');
        }
      }
    },
  },

  // 3. Cheesy 2004 GeoCities MIDI Power Ballad (24 bars: Verse C -> Chorus C -> BIG KEY CHANGE D!)
  {
    title: 'my_heart_will_LAG_on_FINAL.mid',
    bpm: 78,
    length: '4:41',
    steps: 96,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 24;
      const isChorus1 = bar >= 8 && bar < 16;
      const isKeyChange = bar >= 16;
      const transpose = isKeyChange ? 2 : 0; // +2 semitones: C major -> D major!
      const b8 = bar % 8;

      // Verse chords (C-G/B-Am-F-C-G-F-G), Chorus chords (Am-F-C-G-F-G-C-G)
      const verseChords = [
        [60, 64, 67], // C
        [59, 62, 67], // G/B
        [57, 60, 64], // Am
        [53, 57, 60], // F
        [60, 64, 67], // C
        [55, 59, 62], // G
        [53, 57, 60], // F
        [55, 59, 62], // G
      ];
      const chorusChords = [
        [57, 60, 64], // Am
        [53, 57, 60], // F
        [60, 64, 67], // C
        [55, 59, 62], // G
        [53, 57, 60], // F
        [55, 59, 62], // G
        [60, 64, 67], // C
        [55, 59, 62], // G (bar 15 switches to A7 turnaround for key change!)
      ];
      const verseBass = [48, 47, 45, 41, 48, 43, 41, 43];
      const chorusBass = [45, 41, 48, 43, 41, 43, 48, 43];

      let rawChord = bar < 8 ? verseChords[b8] : chorusChords[b8];
      let rawBass = bar < 8 ? verseBass[b8] : chorusBass[b8];
      // Dramatic pivot dominant A7 on bar 15 second half -> catapults into D major!
      if (bar === 15 && st >= 8) {
        rawChord = [57, 61, 64, 67];
        rawBass = 45;
      }

      const ch = rawChord.map(n => n + transpose);
      const bassNote = rawBass + transpose;

      // Rolling GM MIDI Piano arpeggio
      if (st % 2 === 0) {
        const arp = [ch[0] - 12, ch[1], ch[2], ch[1], ch[0], ch[2], ch[1] + 12, ch[2]];
        midi(t, arp[st / 2], spb * 2.6, bar < 8 ? 0.048 : 0.055, 'piano');
      }
      if (st === 0 && (isChorus1 || isKeyChange)) {
        chord(t, ch, spb * 7.5, 0.02, 'piano');
      }

      // Lush GM Strings swelling underneath
      if (st === 0 || (bar === 15 && st === 8)) {
        const dur = bar === 15 ? spb * 7.5 : spb * 15;
        const vol = isKeyChange ? 0.028 : isChorus1 ? 0.024 : bar >= 4 ? 0.018 : 0.014;
        chord(t, ch, dur, vol, 'strings');
        midi(t, bassNote, dur, isKeyChange ? 0.085 : 0.072, 'bass');
      }

      // Sparkly GM Bells at section peaks & key change
      if ((isKeyChange && st === 0) || (isChorus1 && b8 % 2 === 0 && st === 0)) {
        midi(t, ch[2] + 12, spb * 6, 0.022, 'bell');
      }

      // Ballad Drums (enter in Chorus 1, huge in Key Change)
      if (isChorus1 || isKeyChange) {
        if (st === 0 || st === 10) drums.kick(t, isKeyChange ? 0.7 : 0.58);
        if (st === 4 || st === 12) drums.snare(t, isKeyChange ? 0.28 : 0.22);
        if (st % 2 === 0) drums.hat(t, 0.045);
        if (isKeyChange && st % 4 === 2) drums.ride(t, 0.04);
        if ((bar === 8 || bar === 16 || bar === 20) && st === 0) {
          drums.crash(t, isKeyChange ? 0.105 : 0.085);
        }
        // Cheesy dramatic ballad tom fills before transitions
        if ((bar === 15 || bar === 23) && st >= 12) {
          drums.tom(t, 54 - (st - 12) * 3, 0.3);
        }
      } else if (bar === 7 && st >= 12) {
        drums.tom(t, 52 - (st - 12) * 3, 0.22);
      }

      // Original soaring earnest Flute ballad melody
      const melVerse = [
        [0, 0, 76, 0, 79, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0],
        [0, 0, 74, 0, 79, 0, 76, 0, 74, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 72, 0, 76, 0, 79, 0, 81, 0, 79, 0, 76, 0, 0, 0],
        [77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 0, 0, 0, 0, 0, 0],
        [0, 0, 76, 0, 79, 0, 81, 0, 79, 0, 76, 0, 72, 0, 0, 0],
        [0, 0, 74, 0, 76, 0, 79, 0, 79, 0, 0, 0, 0, 0, 0, 0],
        [81, 0, 0, 0, 79, 0, 77, 0, 76, 0, 77, 0, 76, 0, 0, 0],
        [74, 0, 0, 0, 72, 0, 74, 0, 79, 0, 0, 0, 0, 0, 0, 0],
      ];
      const melChorus = [
        [81, 0, 0, 0, 79, 0, 76, 0, 79, 0, 81, 0, 84, 0, 0, 0],
        [81, 0, 79, 0, 77, 0, 76, 0, 77, 0, 0, 0, 76, 0, 0, 0],
        [79, 0, 0, 0, 76, 0, 72, 0, 76, 0, 79, 0, 84, 0, 0, 0],
        [83, 0, 0, 0, 79, 0, 74, 0, 79, 0, 0, 0, 0, 0, 0, 0],
        [81, 0, 84, 0, 81, 0, 77, 0, 76, 0, 77, 0, 79, 0, 0, 0],
        [79, 0, 83, 0, 79, 0, 74, 0, 79, 0, 81, 0, 83, 0, 0, 0],
        [84, 0, 0, 0, 83, 0, 79, 0, 76, 0, 74, 0, 72, 0, 0, 0],
        [74, 0, 76, 0, 79, 0, 0, 0, 79, 0, 0, 0, 0, 0, 0, 0],
      ];

      const rawMel = bar < 8 ? melVerse[b8][st] : melChorus[b8][st];
      if (rawMel) {
        const mn = rawMel + transpose;
        midi(t, mn, spb * 2.6, isKeyChange ? 0.068 : 0.06, 'flute');
        if (isKeyChange) {
          midi(t, mn + 12, spb * 2.2, 0.02, 'strings');
        }
      }
    },
  },

  // 4. Fast Pop-Punk (16 bars: 8-bar Palm-Muted Chug Verse -> 8-bar Open Power-Chord Chorus + "Woah-Oh" Gang Vocals)
  {
    title: 'Sum 42 - Fat Lip Sync.mp3',
    bpm: 184,
    length: '2:58',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isChorus = bar >= 8;
      const b4 = bar % 4;

      // B - F# - G#m - E pop-punk progression
      const chords = [
        [47, 54, 59], // B5
        [42, 49, 54], // F#5
        [44, 51, 56], // G#5
        [40, 47, 52], // E5
      ];
      const bassRoots = [35, 30, 32, 28];
      const ch = chords[b4];
      const bassRoot = bassRoots[b4];

      if (!isChorus) {
        // Section A: Tight palm-muted chug verse
        if (st === 0 || st === 6 || st === 8) drums.kick(t, 0.7);
        if (st === 4 || st === 12) drums.snare(t, 0.28);
        if (st % 2 === 0) drums.hat(t, 0.065);
        if (bar === 7 && st >= 10) {
          drums.snare(t, 0.22 + (st - 10) * 0.02);
        }

        const chugPat = [1, 0, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 0, 1, 1];
        if (chugPat[st]) {
          const openTail = (bar === 3 && st >= 12) || (bar === 7 && st >= 8);
          guitar(t, ch, spb * (openTail ? 1.5 : 0.9), 0.056, !openTail);
        }
        if (st % 2 === 0) {
          midi(t, bassRoot, spb * 1.5, 0.085, 'bass');
        }

        // Catchy skate-punk staccato riff in bars 4-7
        if (bar >= 4) {
          const riff = [
            [71, 0, 71, 0, 75, 0, 71, 0, 78, 0, 75, 0, 71, 0, 0, 0],
            [70, 0, 70, 0, 73, 0, 70, 0, 78, 0, 73, 0, 70, 0, 0, 0],
            [68, 0, 68, 0, 71, 0, 68, 0, 75, 0, 71, 0, 68, 0, 0, 0],
            [71, 0, 75, 0, 78, 0, 75, 0, 78, 0, 80, 0, 83, 0, 0, 0],
          ];
          const rn = riff[b4][st];
          if (rn) midi(t, rn, spb * 1.4, 0.042, 'lead');
        }
      } else {
        // Section B: Open crashing power-chord chorus + "Woah-Oh" gang vocals
        if (st === 0 || st === 2 || st === 6 || st === 8 || st === 10) drums.kick(t, 0.72);
        if (st === 4 || st === 12) drums.snare(t, 0.31);
        if (st % 2 === 0) drums.openHat(t, 0.06);
        if ((bar === 8 || bar === 12) && st === 0) drums.crash(t, 0.1);
        if (bar === 15 && st >= 12) drums.snare(t, 0.28);

        if (st === 0 || st === 4 || st === 8 || st === 10 || st === 12 || st === 14) {
          guitar(t, ch, spb * (st % 4 === 0 ? 3.5 : 1.7), 0.062, false);
        }
        if (st % 2 === 0) {
          midi(t, bassRoot, spb * 1.6, 0.09, 'bass');
        }

        // Gang vocal "Woah-Oh" choir
        const gangA: Record<number, [number, number, 'oh' | 'ah', number]>[] = [
          { 0: [71, 3.5, 'oh', 0], 4: [66, 3.5, 'oh', 0], 8: [68, 3.5, 'ah', 0], 12: [71, 3.5, 'oh', -2] },
          { 0: [70, 7.0, 'oh', 0], 8: [66, 6.0, 'ah', 0] },
          { 0: [68, 3.5, 'oh', 0], 4: [71, 3.5, 'oh', 0], 8: [73, 3.5, 'ah', 0], 12: [71, 3.5, 'oh', 0] },
          { 0: [71, 7.0, 'oh', -4], 8: [64, 6.0, 'ah', 0] },
        ];
        const gv = gangA[b4][st];
        if (gv) {
          woah(t, gv[0], spb * gv[1], 0.036, gv[2], gv[3]);
          if (bar >= 12) {
            woah(t, gv[0] + 4, spb * gv[1], 0.024, gv[2], gv[3]);
          }
        }

        // High octave pop-punk lead counter-hook
        const leadHook = [
          [83, 0, 83, 0, 78, 0, 83, 0, 87, 0, 85, 0, 83, 0, 78, 0],
          [82, 0, 82, 0, 78, 0, 82, 0, 85, 0, 83, 0, 82, 0, 78, 0],
          [80, 0, 80, 0, 75, 0, 80, 0, 83, 0, 82, 0, 80, 0, 75, 0],
          [79, 0, 83, 0, 87, 0, 83, 0, 82, 0, 78, 0, 75, 0, 0, 0],
        ];
        const ln = leadHook[b4][st];
        if (ln) midi(t, ln, spb * 1.6, 0.044, 'lead');
      }
    },
  },

  // 5. Emo / Screamo (16 bars: 8-bar Clean Arpeggio Verse -> 8-bar Crashing Dual-Vocal Chorus)
  {
    title: 'Taking Back Saturday - Cute Without The Ping.mp3',
    bpm: 156,
    length: '3:31',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isChorus = bar >= 8;
      const b4 = bar % 4;

      if (!isChorus) {
        // Section A: Delicate clean emo arpeggios (C#m9 - Aadd9 - E - B)
        const arps = [
          [61, 68, 73, 75, 76, 75, 73, 68],
          [57, 64, 69, 71, 73, 71, 69, 64],
          [64, 71, 76, 78, 80, 78, 76, 71],
          [59, 66, 71, 73, 75, 73, 71, 66],
        ];
        if (st % 2 === 0 && !(bar === 7 && st >= 12)) {
          const note = arps[b4][st / 2];
          midi(t, note, spb * 2.8, 0.056, 'pluck');
          midi(t, note, spb * 3.0, 0.03, 'epiano');
        }

        // Intimate verse drums building into bar 7 pick-scrape transition
        if (st === 0 || st === 6 || st === 8) drums.kick(t, bar >= 4 ? 0.68 : 0.55);
        if (st === 4 || st === 12) {
          if (bar < 4) drums.rim(t, 0.09);
          else drums.snare(t, 0.24);
        }
        if (st % 2 === 0 && bar < 7) drums.hat(t, bar >= 4 ? 0.075 : 0.045);

        if (bar >= 4 && st % 2 === 0 && bar < 7) {
          const bassRoots = [37, 33, 40, 35];
          midi(t, bassRoots[b4], spb * 1.6, 0.08, 'bass');
        }
        if (bar === 7) {
          if (st >= 8 && st < 14) drums.snare(t, 0.18 + (st - 8) * 0.025);
          if (st === 13) scratch(t, spb * 2.2, 0.13);
        }
      } else {
        // Section B: Crashing distorted guitar chorus (A - B - C#m - G#m)
        const chorusChords = [
          [45, 52, 57], // A5
          [47, 54, 59], // B5
          [49, 56, 61], // C#5
          [44, 51, 56], // G#5
        ];
        const chorusBass = [33, 35, 37, 32];
        const ch = chorusChords[b4];

        if (st === 0 || st === 3 || st === 6 || st === 8 || st === 10) drums.kick(t, 0.72);
        if (st === 4 || st === 12) drums.snare(t, 0.32);
        if (st % 4 === 0) drums.openHat(t, 0.07);
        if ((bar === 8 || bar === 10 || bar === 12 || bar === 14) && st === 0) {
          drums.crash(t, 0.105);
        }

        if (st === 0 || st === 6 || st === 8 || st === 12 || st === 14) {
          guitar(t, ch, spb * (st === 0 || st === 8 ? 3.8 : 1.9), 0.063, false);
        }
        if (st % 2 === 0) {
          midi(t, chorusBass[b4], spb * 1.6, 0.09, 'bass');
        }

        // Dramatic emo octave lead
        const emoLead = [
          [76, 0, 75, 0, 73, 0, 71, 0, 73, 0, 76, 0, 80, 0, 0, 0],
          [78, 0, 76, 0, 75, 0, 71, 0, 75, 0, 78, 0, 83, 0, 0, 0],
          [80, 0, 76, 0, 73, 0, 71, 0, 73, 0, 75, 0, 76, 0, 0, 0],
          [75, 0, 73, 0, 71, 0, 68, 0, 71, 0, 75, 0, 78, 0, 0, 0],
        ];
        const ln = emoLead[b4][st];
        if (ln) midi(t, ln, spb * 2.2, 0.044, 'lead');

        // Dual call-and-response emo "ah" / "oh" gang vocals
        if (st === 0) {
          const vNotes = [69, 71, 73, 68];
          woah(t, vNotes[b4], spb * 5.5, 0.036, b4 % 2 === 0 ? 'ah' : 'oh', -2);
        } else if (st === 10 && b4 % 2 === 1) {
          woah(t, b4 === 1 ? 75 : 71, spb * 4.2, 0.032, 'oh', -3);
        }
      }
    },
  },

  // 6. Guitar Hero Shred-Metal (16 bars: 8-bar Galloping Riff A + 8-bar Expert Shred Solo B)
  {
    title: 'Through The Fire And The Lag (EXPERT).mp3',
    bpm: 196,
    length: '7:21',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isSolo = bar >= 8;
      const b4 = bar % 4;

      // D minor harmonic power-metal progression: Dm - Bb - C - Dm/A
      const chords = [
        [38, 45, 50], // D5
        [46, 53, 58], // Bb5
        [48, 55, 60], // C5
        bar >= 4 && !isSolo ? [45, 52, 57] : isSolo ? [45, 52, 57] : [38, 45, 50], // A5 / D5
      ];
      const bassRoots = [38, 34, 36, bar >= 4 ? 33 : 38];
      const ch = chords[b4];

      // Blistering double-kick & power-metal drums
      const doubleKickBar = isSolo ? b4 !== 3 : bar === 2 || bar === 6 || bar === 7;
      if (doubleKickBar) {
        drums.kick(t, 0.52);
      } else if (st % 4 === 0 || st % 4 === 2 || st % 4 === 3) {
        drums.kick(t, 0.58);
      }
      if (st === 4 || st === 12) drums.snare(t, 0.28);
      if (st % 2 === 0) drums.ride(t, 0.048);
      if ((bar === 0 || bar === 8 || bar === 12) && st === 0) drums.crash(t, 0.095);

      if (!isSolo) {
        // Section A: Galloping metal rhythm guitar (1-e-&-a: hit 0, 2, 3)
        const isGallopHit = st % 4 === 0 || st % 4 === 2 || st % 4 === 3;
        if (isGallopHit) {
          const openTurn = (bar === 3 || bar === 7) && st >= 12;
          guitar(t, ch, spb * (openTurn ? 1.4 : 0.85), 0.056, !openTurn);
        }
        if (st % 2 === 0) midi(t, bassRoots[b4], spb * 1.4, 0.08, 'bass');

        // Fast harmonic-minor metal lead riff
        const riff = [
          [74, 0, 76, 77, 76, 74, 73, 0, 74, 0, 77, 0, 81, 0, 79, 77],
          [70, 0, 74, 77, 74, 70, 69, 0, 70, 0, 74, 0, 77, 0, 74, 0],
          [72, 0, 76, 79, 76, 72, 71, 0, 72, 0, 76, 0, 79, 0, 76, 0],
          [73, 0, 76, 81, 79, 77, 76, 74, 73, 74, 76, 77, 79, 81, 85, 0],
        ];
        const rn = riff[b4][st];
        if (rn) midi(t, rn, spb * 1.05, 0.055, 'lead');
      } else {
        // Section B: EXPERT 16th-note shredding sweeps + symphonic strings!
        if (st === 0) chord(t, ch.map(n => n + 24), spb * 14, 0.02, 'strings');
        if (st % 4 === 0) guitar(t, ch, spb * 3.5, 0.056, false);
        if (st % 2 === 0) midi(t, bassRoots[b4], spb * 1.4, 0.085, 'bass');

        const solo1 = [
          [62, 65, 69, 74, 77, 74, 69, 65, 62, 65, 69, 74, 81, 77, 74, 69],
          [58, 62, 65, 70, 74, 70, 65, 62, 70, 74, 77, 82, 86, 82, 77, 74],
          [60, 64, 67, 72, 76, 72, 67, 64, 72, 76, 79, 84, 83, 79, 76, 72],
          [57, 61, 64, 67, 70, 73, 76, 79, 82, 85, 82, 79, 76, 73, 70, 67],
        ];
        const solo2 = [
          [74, 77, 81, 77, 86, 81, 77, 74, 77, 81, 84, 81, 86, 81, 77, 74],
          [70, 74, 77, 74, 82, 77, 74, 70, 74, 77, 81, 77, 82, 77, 74, 70],
          [72, 76, 79, 76, 84, 79, 76, 72, 76, 79, 83, 79, 84, 79, 76, 72],
          [85, 81, 79, 77, 76, 74, 73, 74, 76, 77, 79, 81, 85, 86, 86, 0],
        ];
        const sn = (bar >= 12 ? solo2 : solo1)[b4][st];
        if (sn) {
          midi(t, sn, spb * 0.95, 0.056, 'lead');
          if (bar >= 12 && st % 2 === 0) {
            midi(t, sn + 4, spb * 0.95, 0.02, 'lead');
          }
        }
      }
    },
  },

  // 7. 2005 Ringtone-Chart Eurodance (16 bars: 8-bar Polyphonic Intro/Build A + 8-bar Cowbell Eurodance Drop B)
  {
    title: 'Crazy Toad - Ding Ding (Polyphonic Ringtone).mp3',
    bpm: 140,
    length: '2:53',
    steps: 64,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 16;
      const isDrop = bar >= 8;
      const b4 = bar % 4;

      // F#m - D - A - E Eurodance progression
      const chords = [
        [66, 69, 73], // F#m
        [62, 66, 69], // D
        [69, 73, 76], // A
        [64, 68, 71], // E
      ];
      const bassRoots = [42, 38, 45, 40];
      const ch = chords[b4];
      const bass = bassRoots[b4];

      // Percussion & signature cowbell
      if (isDrop || bar >= 4) {
        if (st % 4 === 0) drums.kick(t, 0.72);
        if (st === 4 || st === 12) {
          drums.clap(t, 0.24);
          drums.snare(t, 0.18);
        }
      }
      if (!isDrop && bar < 4) {
        if (st % 4 === 0) drums.rim(t, 0.09);
        if (st % 4 === 2) drums.hat(t, 0.06);
      } else {
        if (st % 4 === 2) drums.openHat(t, 0.075);
      }

      // Cowbell groove (light in intro, full Euro-mania in drop)
      if (isDrop ? st === 0 || st === 3 || st === 6 || st === 10 || st === 12 || st === 14 : st % 4 === 2) {
        drums.cowbell(t, isDrop ? 0.058 : 0.038);
      }
      if ((bar === 8 || bar === 12) && st === 0) drums.crash(t, 0.09);
      if (bar === 7 && st >= 10) drums.snare(t, 0.16 + (st - 10) * 0.03);

      // Pumping offbeat Euro bass & bright pluck stabs in Drop
      if (isDrop) {
        if (st % 4 === 2) {
          midi(t, bass + (st === 14 ? 12 : 0), spb * 1.5, 0.085, 'slap');
        }
        if (st === 0 || st === 6 || st === 10) {
          chord(t, ch, spb * 1.2, 0.024, 'pluck');
        }
      } else if (bar >= 4 && st % 4 === 2) {
        midi(t, bass, spb * 1.4, 0.07, 'bass');
      }

      // 100% ORIGINAL bouncy ringtone synth hook (distinct contour/rhythm from Axel F!)
      const hookA = [
        [73, 0, 78, 0, 76, 73, 78, 0, 81, 0, 78, 76, 73, 0, 71, 0],
        [74, 0, 78, 0, 81, 0, 78, 74, 73, 74, 78, 0, 81, 0, 0, 0],
        [76, 0, 81, 0, 80, 76, 81, 0, 85, 0, 81, 80, 76, 0, 73, 0],
        [76, 74, 71, 0, 76, 0, 80, 0, 83, 0, 80, 76, 75, 0, 71, 0],
      ];
      const hookB = [
        [78, 0, 81, 0, 85, 0, 81, 78, 76, 0, 78, 81, 78, 0, 73, 0],
        [74, 0, 78, 0, 81, 0, 86, 0, 85, 81, 78, 0, 74, 0, 0, 0],
        [81, 0, 85, 0, 88, 0, 85, 81, 80, 0, 81, 85, 81, 0, 76, 0],
        [80, 0, 83, 0, 87, 0, 83, 80, 76, 78, 80, 83, 80, 0, 0, 0],
      ];

      const hn = (isDrop ? hookB : hookA)[b4][st];
      if (hn) {
        midi(t, hn, spb * 1.1, 0.052, 'lead');
        midi(t, hn + 12, spb * 0.8, 0.02, 'bell');
      }

      // Silly Crazy Toad ribbit/boing slides at turnarounds
      if (isDrop && b4 === 3 && st === 13) {
        tone('square', N(66), N(78), t, spb * 1.1, 0.04, bus, 0.005);
        woah(t + spb, 71, spb * 1.5, 0.038, 'ee', 5);
      }
    },
  },
];

// ---------------- 8 Cursed LimeWire Tracks

export const CURSED_TRACKS: Record<string, Track> = {
  // 1. Goat screaming over a sad piano beat
  goat: {
    title: 'goat_scream_remix.mp3',
    bpm: 92,
    length: '0:10',
    steps: 16,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 4;
      const chords = [
        [57, 60, 64], // Am
        [53, 57, 60], // F
        [60, 64, 67], // C
        [55, 59, 62], // G
      ];

      // Sad gentle beat & piano chords
      if (st === 0 || st === 10) drums.kick(t, 0.62);
      if (st === 4 || st === 12) drums.snare(t, 0.22);
      if (st % 2 === 0) drums.hat(t, 0.05);
      if (st % 4 === 0) chord(t, chords[bar], spb * 3.8, 0.028, 'piano');

      // Dramatic unhinged GOAT SCREAM on bars 1 & 3
      if ((bar === 1 || bar === 3) && st < 10) {
        if (st % 2 === 0) {
          const pitch = st < 4 ? 71 : 69 - (st - 4);
          woah(t, pitch, spb * 1.8, 0.052, st % 4 === 0 ? 'ah' : 'ee', st >= 6 ? -4 : 1);
        }
        tone('sawtooth', N(71 - st * 0.4), N(64 - st * 0.4), t, spb * 0.85, 0.032, bus, 0.004);
      }
    },
  },

  // 2. 56k Modem handshake screech loop
  dialup: {
    title: 'dialup_56k_NO_VIRUS.mp3',
    bpm: 120,
    length: '0:08',
    steps: 16,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 4;

      if (bar === 0) {
        // Dial tone -> DTMF phone dialing beeps
        if (st < 4 && st === 0) {
          tone('sine', 350, 350, t, spb * 3.8, 0.045, bus, 0.005);
          tone('sine', 440, 440, t, spb * 3.8, 0.045, bus, 0.005);
        } else if (st >= 4 && st % 2 === 0) {
          const rows = [697, 770, 852, 941, 770, 852];
          const cols = [1209, 1336, 1477, 1336, 1477, 1209];
          const idx = ((st - 4) / 2) % rows.length;
          tone('sine', rows[idx], rows[idx], t, spb * 1.2, 0.045, bus, 0.003);
          tone('sine', cols[idx], cols[idx], t, spb * 1.2, 0.045, bus, 0.003);
        }
      } else if (bar === 1) {
        // Answer carrier + 2100Hz phase chime
        if (st === 0 || st === 8) tone('sine', 2100, 2100, t, spb * 6.5, 0.055, bus, 0.004);
        if (st >= 12) tone('square', 1200 + (st - 12) * 300, 1400, t, spb * 0.8, 0.035, bus, 0.003);
      } else if (bar === 2) {
        // V.90 FSK handshake warble
        const f = st % 2 === 0 ? 1375 : 2250;
        tone('square', f, f * 1.08, t, spb * 0.9, 0.038, bus, 0.002);
        noise(t, spb * 0.9, 0.06, 'bandpass', 1800, bus, 4);
      } else {
        // Full 56k static screech burst
        const freq = 1600 + ((st * 370) % 1400);
        noise(t, spb * 0.95, 0.11, 'bandpass', freq, bus, 2.5);
        tone('sawtooth', freq * 0.8, freq * 1.1, t, spb * 0.8, 0.025, bus, 0.002);
      }
    },
  },

  // 3. Absurdly slow & detuned original OS startup chime
  xpslow: {
    title: 'xp_startup_400pct_slower.mp3',
    bpm: 60,
    length: '0:32',
    steps: 32,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 8;

      // Original Dmaj9 startup chime played at glacial speed & drooping pitch
      const notes = [62, 69, 74, 78, 81, 86];
      const starts = [0, 1, 2, 4, 5, 6];
      const idx = starts.indexOf(bar);
      if (idx !== -1 && st === 0) {
        const n = notes[idx];
        const dur = spb * 22;
        midi(t, n, dur, 0.042, 'pad');
        midi(t, n - 12, dur, 0.035, 'epiano');
        // Sagging detuned tape-slow pitch droop
        tone('sine', N(n) * 0.97, N(n - 1.2), t, dur, 0.055, bus, 0.12);
        tone('triangle', N(n) * 1.02, N(n - 0.8), t, dur, 0.03, bus, 0.15);
        noise(t, Math.min(2.5, dur), 0.02, 'bandpass', 2400, bus, 0.8);
      }
    },
  },

  // 4. Mostly silence, then a single wet burble every 4 bars
  fart: {
    title: 'bass_drop_WAIT_FOR_IT.mp3',
    bpm: 120,
    length: '0:08',
    steps: 16,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 4;

      if (bar === 3 && st === 4) {
        fartBurble(t, 0.15);
      }
    },
  },

  // 5. Nasal kazoo rendition of an original dumb tune
  kazoo: {
    title: 'kazoo_symphony_128kbps.mp3',
    bpm: 124,
    length: '0:08',
    steps: 16,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 4;

      // Silly toy-march accompaniment
      if (st % 4 === 0) drums.rim(t, 0.09);
      if (st === 4 || st === 12) drums.snare(t, 0.16);
      if (st % 4 === 0) midi(t, [36, 41, 43, 36][bar], spb * 2.5, 0.075, 'bass');

      // 100% original goofy kazoo melody in C major
      const mel = [
        [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 74, 0, 72, 0, 0, 0],
        [77, 0, 79, 0, 81, 0, 77, 0, 79, 0, 76, 0, 74, 0, 0, 0],
        [74, 0, 77, 0, 79, 0, 83, 0, 79, 0, 77, 0, 74, 0, 0, 0],
        [72, 0, 76, 0, 79, 0, 84, 0, 81, 79, 76, 74, 72, 0, 0, 0],
      ];
      const mn = mel[bar][st];
      if (mn) kazoo(t, mn, spb * 1.6, 0.065);
    },
  },

  // 6. Scratched CD that stutters & skips
  skip: {
    title: 'scratched_cd_Track04.mp3',
    bpm: 132,
    length: '0:07',
    steps: 16,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 4;

      if (bar === 0) {
        // Normal upbeat 2004 pop-dance intro
        if (st % 4 === 0) drums.kick(t, 0.68);
        if (st === 4 || st === 12) drums.snare(t, 0.24);
        const mel = [72, 0, 76, 0, 79, 0, 76, 0, 81, 0, 79, 0, 76, 0, 74, 0];
        if (mel[st]) {
          midi(t, mel[st], spb * 1.4, 0.055, 'piano');
          midi(t, mel[st], spb * 1.2, 0.04, 'lead');
        }
      } else if (bar === 1) {
        // First half normal, then hits scratch and starts stuttering on note 79!
        if (st < 8) {
          if (st % 4 === 0) drums.kick(t, 0.68);
          if (st === 4) drums.snare(t, 0.24);
          if (st % 2 === 0) midi(t, [74, 77, 79, 77][st / 2], spb * 1.4, 0.055, 'piano');
        } else {
          if (st === 8) scratch(t, spb * 1.6, 0.16);
          if (st % 2 === 0) {
            drums.kick(t, 0.6);
            midi(t, 79, spb * 0.8, 0.055, 'lead');
          }
        }
      } else if (bar === 2) {
        // Stuck in frantic repeating CD-skip loop!
        if (st === 4 || st === 12) scratch(t, spb * 1.3, 0.15);
        if (st % 2 === 0) {
          drums.snare(t, 0.22);
          midi(t, 79, spb * 0.65, 0.055, 'lead');
          midi(t, 67, spb * 0.65, 0.045, 'piano');
        }
      } else {
        // Stutters faster, skips, then briefly recovers at the end
        if (st < 8) {
          if (st === 0) scratch(t, spb * 1.8, 0.17);
          midi(t, 79, spb * 0.55, 0.05, 'lead');
        } else {
          if (st % 4 === 0) drums.kick(t, 0.65);
          if (st === 12) drums.snare(t, 0.24);
          if (st % 2 === 0) midi(t, [76, 74, 72, 72][(st - 8) / 2], spb * 1.4, 0.055, 'piano');
        }
      }
    },
  },

  // 7. Only the screaming part + blast beat
  screamo: {
    title: 'just_the_screamo_part.mp3',
    bpm: 200,
    length: '0:05',
    steps: 16,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 4;

      // Relentless 200 BPM blast beat
      if (st % 2 === 0) drums.kick(t, 0.58);
      else drums.snare(t, 0.3);
      if (st % 4 === 0) drums.crash(t, 0.085);

      // Harsh dissonant minor-2nd tremolo guitar chugs
      const ch = bar % 2 === 0 ? [40, 41, 47] : [41, 42, 48];
      if (st % 2 === 0) guitar(t, ch, spb * 1.2, 0.058, false);

      // Unhinged screaming formant 'ah' + harsh static rasp
      if (st % 4 === 0) {
        const screamNote = 64 + ((bar * 3 + st) % 5);
        woah(t, screamNote, spb * 2.8, 0.052, 'ah', st % 8 === 0 ? 4 : -6);
        noise(t, spb * 2.2, 0.075, 'bandpass', 2200, bus, 3.2);
      }
    },
  },

  // 8. Completely the wrong genre: cheerful accordion polka
  polka: {
    title: 'polka_WRONG_DOWNLOAD.mp3',
    bpm: 136,
    length: '0:07',
    steps: 16,
    play(s, t, spb) {
      const bus = getMusicBus();
      if (!bus || spb <= 0) return;
      const st = s % 16;
      const bar = Math.floor(s / 16) % 4;

      // G - D7 - D7 - G oom-pah polka
      const bassNotes = [43, 38, 38, 43];
      const fifthNotes = [38, 45, 45, 38];
      const chords = [
        [55, 59, 62], // G
        [57, 60, 62, 66], // D7
        [57, 60, 62, 66], // D7
        [55, 59, 62], // G
      ];

      // Oom-pah rhythm
      if (st === 0 || st === 8) {
        drums.kick(t, 0.62);
        midi(t, st === 0 ? bassNotes[bar] : fifthNotes[bar], spb * 2.2, 0.095, 'bass');
      }
      if (st === 4 || st === 12) {
        drums.snare(t, 0.2);
        drums.hat(t, 0.07);
        chord(t, chords[bar], spb * 1.5, 0.02, 'organ');
      }

      // Cheerful original accordion polka melody in G major
      const mel = [
        [79, 0, 74, 0, 79, 0, 83, 0, 81, 79, 78, 76, 74, 0, 0, 0],
        [78, 0, 74, 0, 78, 0, 81, 0, 79, 78, 76, 74, 72, 0, 0, 0],
        [74, 0, 76, 78, 79, 0, 81, 0, 83, 0, 81, 79, 78, 0, 74, 0],
        [79, 0, 83, 0, 86, 0, 83, 0, 81, 78, 74, 0, 79, 0, 0, 0],
      ];
      const mn = mel[bar][st];
      if (mn) reed(t, mn, spb * 1.6, 0.048);
    },
  },
};
