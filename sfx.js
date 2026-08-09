import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

const FILES = {
  zona: require('./assets/sounds/zona.mp3'),
  zona_big: require('./assets/sounds/zona_big.mp3'),
  lost: require('./assets/sounds/lost.mp3'),
  ready: require('./assets/sounds/ready.mp3'),
  start: require('./assets/sounds/start.mp3'),
  stop: require('./assets/sounds/stop.mp3'),
  daily: require('./assets/sounds/daily.mp3'),
};

const cache = {};
let enabled = true;
let ready = false;

export async function initSfx() {
  try {
    const raw = await AsyncStorage.getItem('zona_sound');
    enabled = raw !== '0';
  } catch (e) {}

  try {
    await Audio.setAudioModeAsync({
      playsInSilentModeIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
    });
  } catch (e) {}

  for (const key of Object.keys(FILES)) {
    try {
      const { sound } = await Audio.Sound.createAsync(FILES[key], {
        shouldPlay: false,
        volume: 1.0,
      });
      cache[key] = sound;
    } catch (e) {
      console.log('sfx yuklash xato:', key, e.message);
    }
  }
  ready = true;
}

export async function sfx(name) {
  if (!enabled || !ready) return;
  const s = cache[name];
  if (!s) return;
  try {
    await s.setPositionAsync(0);
    await s.playAsync();
  } catch (e) {}
}

export function isSoundOn() { return enabled; }

export async function setSoundOn(on) {
  enabled = !!on;
  try { await AsyncStorage.setItem('zona_sound', on ? '1' : '0'); } catch (e) {}
}