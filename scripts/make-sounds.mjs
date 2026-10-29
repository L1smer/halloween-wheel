// Generates the app's sound effects as small WAV files in assets/sounds.
// Run with: node scripts/make-sounds.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const RATE = 22050;
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', 'assets', 'sounds');
mkdirSync(OUT, { recursive: true });

let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

function buffer(seconds) { return new Float32Array(Math.ceil(seconds * RATE)); }

// Attack/decay envelope like an exponential ramp
function env(t, attack, dur) {
  if (t < 0 || t > dur) return 0;
  if (t < attack) return t / attack;
  return Math.exp(-5 * (t - attack) / (dur - attack));
}

function tone(buf, freq, at, dur, { type = 'sine', vol = 0.3, vib = 0 } = {}) {
  let phase = 0;
  const start = Math.floor(at * RATE), n = Math.floor(dur * RATE);
  for (let i = 0; i < n && start + i < buf.length; i++) {
    const t = i / RATE;
    const f = freq + (vib ? Math.sin(2 * Math.PI * 5.5 * t) * vib : 0);
    phase += (2 * Math.PI * f) / RATE;
    const s = type === 'sine' ? Math.sin(phase)
      : type === 'square' ? Math.sign(Math.sin(phase))
      : (2 / Math.PI) * Math.asin(Math.sin(phase)); // triangle
    buf[start + i] += s * vol * env(t, 0.015, dur);
  }
}

function write(name, buf, gain = 1) {
  let peak = 0;
  for (const s of buf) peak = Math.max(peak, Math.abs(s));
  const k = peak > 0 ? (0.89 / peak) * gain : 0;
  const data = Buffer.alloc(buf.length * 2);
  buf.forEach((s, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, s * k)) * 32767), i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(join(OUT, name + '.wav'), Buffer.concat([h, data]));
}

// Wheel peg click: a short, bright burst of filtered noise
{
  const b = buffer(0.05); let lp = 0, prev = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / RATE, n = rand();
    const hp = n - prev; prev = n; lp += (hp - lp) * 0.55;
    b[i] = lp * Math.exp(-t / 0.007);
  }
  write('tick', b, 0.55);
}
// Receipt read
{ const b = buffer(0.32); tone(b, 1320, 0, 0.1); tone(b, 1760, 0.12, 0.18); write('beep', b, 0.7); }
// Could not read
{ const b = buffer(0.6); tone(b, 220, 0, 0.25, { type: 'square', vol: 0.15 }); tone(b, 185, 0.18, 0.38, { type: 'square', vol: 0.15 }); write('error', b, 0.45); }
// Spin start and wave transition: noise swept through a low-pass filter
for (const [name, dur] of [['whoosh', 0.9], ['wave', 1.4]]) {
  const b = buffer(dur); let lp = 0;
  for (let i = 0; i < b.length; i++) {
    const p = i / b.length;
    const cutoff = p < 0.45 ? 250 * Math.pow(1800 / 250, p / 0.45) : 1800 * Math.pow(200 / 1800, (p - 0.45) / 0.55);
    const a = 1 - Math.exp((-2 * Math.PI * cutoff) / RATE);
    lp += (rand() - lp) * a;
    const g = p < 0.4 ? p / 0.4 : Math.exp(-4 * (p - 0.4));
    b[i] = lp * g;
  }
  write(name, b, 0.6);
}
// Landing on a prize: a rising arpeggio over a low hum
{
  const b = buffer(2.3);
  [440, 523.25, 659.25, 830.61, 880, 1046.5].forEach((n, i) => tone(b, n, i * 0.1, 1.6, { type: 'triangle', vol: 0.1, vib: 4 }));
  tone(b, 110, 0, 1.8, { vol: 0.14, vib: 2 });
  write('win', b, 0.8);
}
// Prize reveal
{ const b = buffer(1.8); [659.25, 830.61, 987.77, 1318.5].forEach((n, i) => tone(b, n, 0.05 + i * 0.07, 1.4, { vol: 0.07, vib: 6 })); write('reveal', b, 0.6); }
// Sparkle while the wish is written
{ const b = buffer(0.55); tone(b, 1760, 0, 0.5, { vol: 0.05, vib: 8 }); tone(b, 2349.3, 0.04, 0.45, { vol: 0.03, vib: 8 }); write('shimmer', b, 0.3); }

console.log('Sounds written to', OUT);
