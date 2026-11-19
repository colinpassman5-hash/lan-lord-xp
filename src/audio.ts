// ============ LAN LORD — WebAudio synth (no audio files, all procedural) ============
let ac: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode;
export let analyser: AnalyserNode | null = null;
let noiseBuf: AudioBuffer;

export function initAudio() {
  if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
  ac = new AudioContext();
  master = ac.createGain(); master.gain.value = 0.7; master.connect(ac.destination);
  sfxBus = ac.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
  musicBus = ac.createGain(); musicBus.gain.value = 0.32;
  analyser = ac.createAnalyser(); analyser.fftSize = 64;
  musicBus.connect(analyser); analyser.connect(master);
  noiseBuf = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
export function getMusicBus(): GainNode { return musicBus; }
export function setMusicVolume(v: number) { if (musicBus) musicBus.gain.value = v; }
export function setSfxVolume(v: number) { if (sfxBus) sfxBus.gain.value = v; }

export function tone(type: OscillatorType, f0: number, f1: number, t: number, dur: number, vol: number, bus: AudioNode = sfxBus, attack = 0.005) {
  if (!ac) return;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(bus); o.start(t); o.stop(t + dur + 0.05);
}
export function noise(t: number, dur: number, vol: number, filterType: BiquadFilterType, freq: number, bus: AudioNode = sfxBus, q = 1) {
  if (!ac) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf;
  const f = ac.createBiquadFilter(); f.type = filterType; f.frequency.value = freq; f.Q.value = q;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(bus); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}
export const N = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

let lastSfx: Record<string, number> = {};
export function sfx(name: string) {
  if (!ac) return;
  const t = ac.currentTime;
  if (lastSfx[name] && t - lastSfx[name] < 0.06) return;
  lastSfx[name] = t;
  switch (name) {
    case 'click': tone('square', 900, 900, t, 0.03, 0.08); break;
    case 'open': tone('sine', 500, 900, t, 0.08, 0.12); break;
    case 'close': tone('sine', 700, 350, t, 0.08, 0.1); break;
    case 'kaching': tone('square', N(88), N(88), t, 0.06, 0.12); tone('square', N(93), N(93), t + 0.06, 0.25, 0.12); noise(t, 0.12, 0.15, 'highpass', 6000); break;
    case 'place': tone('sine', 140, 50, t, 0.18, 0.5); noise(t, 0.1, 0.25, 'lowpass', 900); break;
    case 'sell': tone('triangle', 600, 200, t, 0.2, 0.2); tone('square', N(81), N(81), t + 0.1, 0.12, 0.08); break;
    case 'error': tone('sine', N(84), N(84), t, 0.6, 0.18); tone('sine', N(79), N(79), t, 0.6, 0.14); tone('triangle', N(72), N(72), t, 0.5, 0.08); break;
    case 'ding': tone('sine', N(88), N(88), t, 0.5, 0.15); tone('sine', N(84), N(84), t + 0.12, 0.6, 0.15); break;
    case 'msn': tone('sine', N(83), N(83), t, 0.25, 0.14); tone('sine', N(88), N(88), t + 0.1, 0.35, 0.14); tone('sine', N(91), N(91), t + 0.2, 0.4, 0.1); break;
    case 'nudge': for (let i = 0; i < 6; i++) tone('square', 70, 55, t + i * 0.06, 0.06, 0.15); break;
    case 'balloon': tone('sine', 600, 950, t, 0.12, 0.12); break;
    case 'smash': noise(t, 0.35, 0.6, 'lowpass', 2500); tone('square', 120, 40, t, 0.25, 0.25); for (let i = 0; i < 5; i++) tone('square', 2000 + Math.random() * 3000, 1500, t + 0.03 * i, 0.04, 0.05); break;
    case 'fire': for (let i = 0; i < 12; i++) noise(t + i * 0.07 + Math.random() * 0.04, 0.05, 0.25, 'bandpass', 800 + Math.random() * 1500, sfxBus, 3); tone('sawtooth', 200, 80, t, 0.8, 0.08); break;
    case 'foam': noise(t, 0.6, 0.3, 'highpass', 3000); break;
    case 'spray': noise(t, 0.35, 0.25, 'highpass', 5000); break;
    case 'fix': tone('square', N(72), N(72), t, 0.06, 0.08); tone('square', N(79), N(79), t + 0.07, 0.06, 0.08); tone('square', N(84), N(84), t + 0.14, 0.12, 0.08); break;
    case 'clean': noise(t, 0.2, 0.2, 'bandpass', 2500); tone('sine', 1200, 1800, t + 0.1, 0.1, 0.05); break;
    case 'virus': for (let i = 0; i < 8; i++) tone('square', N(80 - i * 2), N(80 - i * 2), t + i * 0.05, 0.05, 0.06); break;
    case 'outage': tone('sawtooth', 400, 30, t, 1.2, 0.2); noise(t, 0.3, 0.3, 'lowpass', 400); break;
    case 'mom': tone('sawtooth', 300, 420, t, 0.15, 0.12); tone('sawtooth', 420, 260, t + 0.17, 0.25, 0.12); break;
    case 'fanfare': [60, 64, 67, 72, 67, 72].forEach((n, i) => tone('square', N(n + 12), N(n + 12), t + i * 0.1, i === 5 ? 0.5 : 0.12, 0.08)); break;
    case 'munch': for (let i = 0; i < 3; i++) noise(t + i * 0.12, 0.08, 0.3, 'bandpass', 900, sfxBus, 2); break;
    case 'hire': tone('triangle', N(76), N(76), t, 0.1, 0.12); tone('triangle', N(83), N(83), t + 0.1, 0.18, 0.12); break;
    case 'win': [72, 76, 79, 84, 88, 91, 96].forEach((n, i) => tone('triangle', N(n), N(n), t + i * 0.09, 0.5, 0.1)); break;
    case 'research': [76, 79, 83, 88].forEach((n, i) => tone('sine', N(n), N(n), t + i * 0.08, 0.4, 0.1)); break;
    case 'review': tone('sine', N(91), N(91), t, 0.1, 0.06); break;
  }
}

export function xpStartup() {
  if (!ac) return;
  const t = ac.currentTime + 0.05;
  // a warm, hopeful 2001-ish chime (original, not the real one)
  const chord = [63, 70, 75, 79, 82];
  chord.forEach((n, i) => { tone('sine', N(n), N(n), t + i * 0.18, 3.2 - i * 0.3, 0.09, sfxBus, 0.08); tone('triangle', N(n - 12), N(n - 12), t + i * 0.18, 2.5, 0.04, sfxBus, 0.2); });
  tone('sine', N(87), N(87), t + 1.0, 2.4, 0.07, sfxBus, 0.3);
  noise(t, 2.5, 0.03, 'bandpass', 3000, sfxBus, 0.5);
}

// ---------------------------------------------------------------- Winamp music
export interface Track { title: string; bpm: number; length: string; play: (step: number, t: number, spb: number) => void; steps: number; }
export const kick = (t: number) => { tone('sine', 160, 40, t, 0.22, 0.9, musicBus); };
export const hat = (t: number, v = 0.12) => noise(t, 0.04, v, 'highpass', 8000, musicBus);
export const snare = (t: number, v = 0.35) => { noise(t, 0.15, v, 'bandpass', 1800, musicBus, 0.8); tone('triangle', 220, 160, t, 0.08, 0.15, musicBus); };
export const lead = (t: number, f: number, d: number, v: number, type: OscillatorType = 'sawtooth') => {
  if (!ac) return;
  const o = ac.createOscillator(), o2 = ac.createOscillator(), fl = ac.createBiquadFilter(), g = ac.createGain();
  o.type = type; o2.type = type; o.frequency.value = f; o2.frequency.value = f * 1.007;
  fl.type = 'lowpass'; fl.frequency.setValueAtTime(3200, t); fl.frequency.exponentialRampToValueAtTime(700, t + d);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
  o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(musicBus);
  o.start(t); o2.start(t); o.stop(t + d + 0.05); o2.stop(t + d + 0.05);
};
export const pad = (t: number, notes: number[], d: number, v: number) => notes.forEach(n => { tone('triangle', N(n), N(n), t, d, v, musicBus, 0.05); tone('sine', N(n + 12), N(n + 12), t, d * 0.8, v * 0.4, musicBus, 0.02); });

// ================================================================ INSTRUMENT KIT v2 (2004-era: MIDI patches, distorted guitars, drum machine, "woah" choir)
let distCurve: Float32Array | null = null;
function getDist(amount = 60) {
  if (distCurve) return distCurve;
  const n = 2048; distCurve = new Float32Array(n);
  for (let i = 0; i < n; i++) { const x = (i * 2) / n - 1; distCurve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x)); }
  return distCurve;
}
function env(g: GainNode, t: number, a: number, d: number, sus: number, rel: number, peak: number, dur: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.linearRampToValueAtTime(peak * sus, t + a + d);
  g.gain.setValueAtTime(peak * sus, t + Math.max(a + d, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(a + d, dur) + rel);
}
/** Distorted power chord / single note guitar. notes = MIDI numbers (e.g. [40, 47, 52] = E5 power chord). palm = palm-muted chug. */
export function guitar(t: number, notes: number[], dur: number, vol = 0.06, palm = false) {
  if (!ac) return;
  const ws = ac.createWaveShaper(); ws.curve = getDist() as any; ws.oversample = '2x';
  const pre = ac.createGain(); pre.gain.value = 2.2;
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = palm ? 900 : 3200;
  const cab = ac.createBiquadFilter(); cab.type = 'peaking'; cab.frequency.value = 1800; cab.gain.value = -6;
  const g = ac.createGain(); env(g, t, 0.004, 0.08, palm ? 0.25 : 0.75, palm ? 0.04 : 0.25, vol, palm ? Math.min(dur, 0.09) : dur);
  pre.connect(ws); ws.connect(lp); lp.connect(cab); cab.connect(g); g.connect(musicBus);
  for (const n of notes) for (const det of [-6, 6]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = N(n); o.detune.value = det;
    o.connect(pre); o.start(t); o.stop(t + dur + 0.4);
  }
}
/** General-MIDI-ish patches, the sound of a 2004 GeoCities page. */
export type Patch = 'piano' | 'epiano' | 'strings' | 'brass' | 'organ' | 'bass' | 'slap' | 'lead' | 'pluck' | 'bell' | 'pad' | 'flute';
export function midi(t: number, note: number, dur: number, vol = 0.07, patch: Patch = 'piano') {
  if (!ac) return;
  const f = N(note);
  const out = ac.createGain();
  const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 6000;
  out.connect(lp); lp.connect(musicBus);
  const osc = (type: OscillatorType, mult: number, gain: number, detune = 0) => { const o = ac!.createOscillator(); o.type = type; o.frequency.value = f * mult; o.detune.value = detune; const g = ac!.createGain(); g.gain.value = gain; o.connect(g); g.connect(out); o.start(t); o.stop(t + dur + 1.2); return o; };
  switch (patch) {
    case 'piano': osc('triangle', 1, 1); osc('sine', 2, 0.3); osc('sine', 3, 0.08); env(out, t, 0.003, 0.25, 0.35, 0.3, vol, dur); lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(1200, t + dur + 0.3); break;
    case 'epiano': osc('sine', 1, 1); osc('sine', 4, 0.12); osc('triangle', 1, 0.2, 4); env(out, t, 0.004, 0.4, 0.4, 0.5, vol, dur); break;
    case 'strings': osc('sawtooth', 1, 0.5, -8); osc('sawtooth', 1, 0.5, 8); osc('sawtooth', 0.5, 0.25); lp.frequency.value = 2200; env(out, t, 0.18, 0.2, 0.85, 0.5, vol, dur); break;
    case 'brass': osc('sawtooth', 1, 0.7); osc('sawtooth', 1, 0.4, 7); lp.frequency.setValueAtTime(600, t); lp.frequency.linearRampToValueAtTime(3500, t + 0.06); lp.frequency.linearRampToValueAtTime(1800, t + 0.3); env(out, t, 0.03, 0.12, 0.7, 0.15, vol, dur); break;
    case 'organ': osc('sine', 1, 0.6); osc('sine', 2, 0.4); osc('sine', 3, 0.25); osc('sine', 4, 0.15); env(out, t, 0.01, 0.05, 0.9, 0.08, vol, dur); break;
    case 'bass': osc('triangle', 1, 1); osc('sine', 0.5, 0.6); lp.frequency.value = 900; env(out, t, 0.005, 0.15, 0.6, 0.08, vol, dur); break;
    case 'slap': osc('sawtooth', 1, 0.6); osc('sine', 0.5, 0.7); lp.frequency.setValueAtTime(3000, t); lp.frequency.exponentialRampToValueAtTime(400, t + 0.15); env(out, t, 0.002, 0.12, 0.4, 0.06, vol, dur); break;
    case 'lead': osc('square', 1, 0.5, -10); osc('square', 1, 0.5, 10); lp.frequency.value = 3500; env(out, t, 0.01, 0.1, 0.8, 0.1, vol, dur); break;
    case 'pluck': osc('sawtooth', 1, 0.8); lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(300, t + 0.2); env(out, t, 0.002, 0.2, 0.0001, 0.05, vol, dur); break;
    case 'bell': osc('sine', 1, 0.7); osc('sine', 2.76, 0.4); osc('sine', 5.4, 0.2); env(out, t, 0.002, 0.8, 0.2, 1.0, vol, dur); break;
    case 'pad': osc('sawtooth', 1, 0.3, -12); osc('sawtooth', 1, 0.3, 12); osc('triangle', 2, 0.2); lp.frequency.value = 1400; env(out, t, 0.6, 0.4, 0.8, 1.0, vol, dur); break;
    case 'flute': osc('sine', 1, 1); osc('sine', 2, 0.1); env(out, t, 0.06, 0.1, 0.8, 0.1, vol, dur); noise(t, Math.min(dur, 0.12), vol * 0.3, 'bandpass', f * 2, musicBus, 4); break;
  }
}
export function chord(t: number, notes: number[], dur: number, vol = 0.05, patch: Patch = 'piano') { for (const n of notes) midi(t, n, dur, vol, patch); }
/** Robot-choir vowel ("woah", "oh", "ah", "ee") via formant filtering — for emo/pop-punk gang vocals. */
export function woah(t: number, note: number, dur: number, vol = 0.05, vowel: 'oh' | 'ah' | 'ee' | 'oo' = 'oh', slide = 0) {
  if (!ac) return;
  const F: Record<string, [number, number, number]> = { oh: [450, 800, 2830], ah: [730, 1090, 2440], ee: [270, 2290, 3010], oo: [300, 870, 2240] };
  const out = ac.createGain(); env(out, t, 0.06, 0.1, 0.85, 0.18, vol, dur); out.connect(musicBus);
  const src = ac.createGain(); src.gain.value = 1;
  for (const det of [-9, 0, 9]) {
    const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(N(note), t); if (slide) o.frequency.linearRampToValueAtTime(N(note + slide), t + dur);
    o.detune.value = det; const vib = ac.createOscillator(); vib.frequency.value = 5.5; const vg = ac.createGain(); vg.gain.value = 6; vib.connect(vg); vg.connect(o.detune); vib.start(t); vib.stop(t + dur + 0.3);
    o.connect(src); o.start(t); o.stop(t + dur + 0.3);
  }
  F[vowel].forEach((fr, i) => { const bp = ac!.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = 9; const g = ac!.createGain(); g.gain.value = [1, 0.6, 0.25][i] * 3; src.connect(bp); bp.connect(g); g.connect(out); });
}
/** Drum machine kit (808/909-ish). */
export const drums = {
  kick: (t: number, v = 0.9) => { tone('sine', 150, 42, t, 0.28, v, musicBus); tone('triangle', 400, 60, t, 0.02, v * 0.3, musicBus); },
  kick808: (t: number, v = 0.9) => { tone('sine', 120, 38, t, 0.8, v, musicBus); },
  snare: (t: number, v = 0.35) => { noise(t, 0.18, v, 'highpass', 1500, musicBus, 0.7); tone('triangle', 230, 170, t, 0.07, v * 0.6, musicBus); },
  clap: (t: number, v = 0.3) => { for (let i = 0; i < 3; i++) noise(t + i * 0.011, 0.05 + (i === 2 ? 0.1 : 0), v, 'bandpass', 1300, musicBus, 1.2); },
  hat: (t: number, v = 0.1) => noise(t, 0.035, v, 'highpass', 8500, musicBus),
  openHat: (t: number, v = 0.1) => noise(t, 0.22, v, 'highpass', 7000, musicBus),
  crash: (t: number, v = 0.15) => noise(t, 1.4, v, 'highpass', 4500, musicBus),
  ride: (t: number, v = 0.06) => { noise(t, 0.4, v, 'bandpass', 6500, musicBus, 3); tone('sine', 4200, 4100, t, 0.3, v * 0.3, musicBus); },
  tom: (t: number, note = 45, v = 0.4) => tone('sine', N(note) * 2, N(note), t, 0.3, v, musicBus),
  cowbell: (t: number, v = 0.08) => { tone('square', 540, 540, t, 0.12, v, musicBus); tone('square', 800, 800, t, 0.12, v * 0.7, musicBus); },
  rim: (t: number, v = 0.12) => tone('square', 1700, 1700, t, 0.015, v, musicBus),
};
/** Tracker/keygen-style fast arpeggio: cycles chord tones every 1/50s like an Amiga MOD. */
export function trackerArp(t: number, notes: number[], dur: number, vol = 0.04, type: OscillatorType = 'square') {
  if (!ac) return;
  const o = ac.createOscillator(); o.type = type;
  const step = 1 / 50; let k = 0;
  for (let tt = t; tt < t + dur; tt += step) { o.frequency.setValueAtTime(N(notes[k % notes.length]), tt); k++; }
  const g = ac.createGain(); env(g, t, 0.003, 0.05, 0.7, 0.05, vol, dur);
  o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.1);
}
/** Vinyl/DJ scratch-ish effect (also for "cursed" files). */
export function scratch(t: number, dur = 0.25, vol = 0.2) {
  if (!ac) return;
  const s = ac.createBufferSource(); s.buffer = noiseBuf; s.playbackRate.setValueAtTime(0.3, t); s.playbackRate.linearRampToValueAtTime(2.2, t + dur * 0.5); s.playbackRate.linearRampToValueAtTime(0.4, t + dur);
  const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 2;
  const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(bp); bp.connect(g); g.connect(musicBus); s.start(t); s.stop(t + dur + 0.05);
}

import { EXTRA_TRACKS } from './tracks_extra';
import { ERA2_TRACKS } from './tracks_era2';
export const TRACKS: Track[] = [
  {
    title: 'DORUDE - DUNESTORM (LAN Party Mix).mp3', bpm: 138, length: '7:33', steps: 64,
    play(s, t, spb) {
      const st = s % 16;
      if (st % 4 === 0) kick(t);
      if (st % 4 === 2) hat(t, 0.18);
      if (st === 4 || st === 12) snare(t, 0.2);
      const bar = Math.floor(s / 16) % 4;
      const root = [64, 64, 69, 67][bar];
      // the iconic "du du du du du" — sixteenth stabs with a rest pattern
      const pat = [1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 1, 1, 0, 1, 0];
      if (pat[st]) lead(t, N(root + (st >= 12 && bar === 3 ? 5 : 0)), spb * 0.9, 0.09);
      if (st % 2 === 0) tone('sawtooth', N(root - 24), N(root - 24), t, spb * 1.6, 0.12, musicBus);
    },
  },
  {
    title: 'Smooth Elevator Jazz Vol. 7 (Lobby Edit).mp3', bpm: 96, length: '4:20', steps: 64,
    play(s, t, spb) {
      const st = s % 16, bar = Math.floor(s / 16) % 4;
      const chords = [[62, 65, 69, 72], [67, 71, 74, 77], [60, 64, 67, 71], [57, 60, 64, 67]];
      const bass = [50, 43, 48, 45];
      if (st === 0) pad(t, chords[bar], spb * 14, 0.035);
      if (st === 6) pad(t, chords[bar], spb * 6, 0.02);
      if (st % 4 === 0) tone('sine', N(bass[bar] - (st === 8 ? -7 : 0)), N(bass[bar]), t, spb * 3, 0.22, musicBus);
      if (st % 2 === 0) noise(t, 0.06, st % 4 === 2 ? 0.08 : 0.04, 'highpass', 6000, musicBus);
      if (st === 4 || st === 12) noise(t, 0.12, 0.06, 'bandpass', 2500, musicBus);
      const mel = [76, 0, 74, 72, 0, 74, 76, 0, 79, 0, 77, 76, 74, 0, 72, 0];
      if (bar % 2 === 1 && mel[st]) tone('sine', N(mel[st]), N(mel[st]), t, spb * 1.8, 0.07, musicBus, 0.01);
    },
  },
  {
    title: 'The Hamster Bounce (Geocities Remix).wma', bpm: 160, length: '2:56', steps: 32,
    play(s, t, spb) {
      const st = s % 16;
      if (st % 4 === 0) kick(t);
      if (st % 2 === 1) hat(t, 0.1);
      if (st === 4 || st === 12) snare(t, 0.25);
      const mel = [72, 76, 79, 76, 81, 79, 76, 72, 74, 77, 81, 77, 79, 76, 74, 71];
      const bar = Math.floor(s / 16) % 2;
      tone('square', N(mel[st] + (bar ? 2 : 0) + 12), N(mel[st] + (bar ? 2 : 0) + 12), t, spb * 0.7, 0.045, musicBus);
      if (st % 4 === 0) tone('square', N(48 + (bar ? 5 : 0)), N(48 + (bar ? 5 : 0)), t, spb * 2, 0.07, musicBus);
    },
  },
  {
    title: 'Linkin Bark - In The Endless Loading Screen.mp3', bpm: 105, length: '3:36', steps: 64,
    play(s, t, spb) {
      const st = s % 16, bar = Math.floor(s / 16) % 4;
      if (st === 0 || st === 10) kick(t);
      if (st === 4 || st === 12) snare(t, 0.4);
      if (st % 2 === 0) hat(t, 0.08);
      const piano = [[75, 0, 70, 0, 70, 0, 70, 0], [74, 0, 70, 0, 70, 0, 70, 0], [72, 0, 67, 0, 67, 0, 67, 0], [70, 0, 65, 0, 67, 0, 70, 0]];
      if (st % 2 === 0) { const n = piano[bar][st / 2]; if (n) tone('triangle', N(n), N(n), t, spb * 2.5, 0.09, musicBus); }
      const pw = [51, 50, 48, 46][bar];
      if (st % 8 === 0) lead(t, N(pw - 12), spb * 7, 0.06, 'sawtooth');
    },
  },
];
TRACKS.push(...EXTRA_TRACKS);
TRACKS.push(...ERA2_TRACKS);

let seqTimer: number | null = null;
export let currentTrack = -1;
let step = 0; let nextTime = 0; let startTime = 0;
const lenSecs = (tr: Track) => { const [m, s] = tr.length.split(':').map(Number); return (m || 0) * 60 + (s || 0); };
const skipTrack = (tr: Track | undefined) => !tr || !tr.title || tr.title.startsWith('Prologue') || tr.title.startsWith('Professor');
export function playTrack(i: number) {
  if (!ac) return;
  stopMusic();
  currentTrack = i; step = 0; nextTime = ac.currentTime + 0.05; startTime = nextTime;
  const tr = TRACKS[i];
  const spb = 60 / tr.bpm / 4;
  seqTimer = window.setInterval(() => {
    if (!ac) return;
    // Winamp behaviour: play to the listed length, then auto-advance (loops repeat underneath)
    if (!skipTrack(tr) && ac.currentTime - startTime > lenSecs(tr) && lenSecs(tr) > 0) {
      let n = i; do { n = (n + 1) % TRACKS.length; } while (skipTrack(TRACKS[n]) && n !== i);
      playTrack(n); window.dispatchEvent(new Event('lanlord-playlist')); return;
    }
    while (nextTime < ac.currentTime + 0.12) {
      tr.play(step, nextTime, spb);
      step = (step + 1) % (tr.steps * 4);
      nextTime += spb;
    }
  }, 25);
}
export function stopMusic() { if (seqTimer !== null) clearInterval(seqTimer); seqTimer = null; currentTrack = -1; }
export function musicPlaying() { return seqTimer !== null; }
export function musicElapsed() { if (!ac || currentTrack < 0) return 0; return Math.max(0, ac.currentTime - startTime); }
