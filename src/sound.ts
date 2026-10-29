import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

const FILES = {
  tick: require('../assets/sounds/tick.wav'),
  beep: require('../assets/sounds/beep.wav'),
  error: require('../assets/sounds/error.wav'),
  whoosh: require('../assets/sounds/whoosh.wav'),
  wave: require('../assets/sounds/wave.wav'),
  win: require('../assets/sounds/win.wav'),
  reveal: require('../assets/sounds/reveal.wav'),
  shimmer: require('../assets/sounds/shimmer.wav'),
};
type Name = keyof typeof FILES;

const KEY = 'hw.sound';
// Ticks overlap at full spin speed, so they rotate through a few players
const TICK_VOICES = 4;

let players: Partial<Record<Name, AudioPlayer>> = {};
let ticks: AudioPlayer[] = [];
let nextTick = 0, lastTick = 0;
let on = true;
const listeners = new Set<(on: boolean) => void>();

function play(p: AudioPlayer | undefined, volume = 1) {
  if (!on || !p) return;
  try {
    p.volume = volume;
    p.seekTo(0).then(() => p.play()).catch(() => {});
  } catch {}
}

export const Sound = {
  async init() {
    try {
      on = (await AsyncStorage.getItem(KEY)) !== 'off';
      await setAudioModeAsync({ playsInSilentMode: true });
      for (const name of Object.keys(FILES) as Name[]) if (name !== 'tick') players[name] = createAudioPlayer(FILES[name]);
      ticks = Array.from({ length: TICK_VOICES }, () => createAudioPlayer(FILES.tick));
    } catch {}
    listeners.forEach(l => l(on));
  },
  isOn: () => on,
  subscribe(l: (on: boolean) => void) { listeners.add(l); return () => { listeners.delete(l); }; },
  toggle() {
    on = !on;
    AsyncStorage.setItem(KEY, on ? 'on' : 'off').catch(() => {});
    listeners.forEach(l => l(on));
    if (on) this.beep();
  },
  tick(volume = 1) {
    const now = Date.now();
    if (now - lastTick < 32) return;
    lastTick = now;
    play(ticks[nextTick++ % TICK_VOICES], volume);
  },
  beep: () => play(players.beep),
  error: () => play(players.error),
  whoosh: () => play(players.whoosh),
  wave: () => play(players.wave),
  win: () => play(players.win),
  reveal: () => play(players.reveal),
  shimmer: () => play(players.shimmer),
};
