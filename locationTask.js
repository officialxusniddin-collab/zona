import * as TaskManager from 'expo-task-manager';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const LOCATION_TASK = 'zona-location-task';
const IDX_KEY = 'zona_bg_index';
const CHUNK = 'zona_bg_c';
const MAX_CHUNKS = 400;      // 400 x 300 = 120000 nuqta (~80 soat)
const CHUNK_SIZE = 300;

let buffer = [];
let listener = null;

export function getBuffer() { return buffer; }

export function clearBuffer() {
  buffer = [];
  clearBgBuffer();
}

export function setListener(fn) { listener = fn; }

async function readIndex() {
  try {
    const raw = await AsyncStorage.getItem(IDX_KEY);
    if (!raw) return { list: [], open: null, n: 0 };
    const o = JSON.parse(raw);
    return { list: o.list || [], open: o.open || null, n: o.n || 0 };
  } catch (e) {
    return { list: [], open: null, n: 0 };
  }
}

async function writeIndex(idx) {
  try { await AsyncStorage.setItem(IDX_KEY, JSON.stringify(idx)); } catch (e) {}
}

export async function loadBgBuffer() {
  try {
    const idx = await readIndex();
    if (!idx.list.length) return [];
    const keys = idx.list.map((k) => CHUNK + k);
    const pairs = await AsyncStorage.multiGet(keys);
    let out = [];
    for (const [, val] of pairs) {
      if (!val) continue;
      try {
        const arr = JSON.parse(val);
        if (Array.isArray(arr)) out = out.concat(arr);
      } catch (e) {}
    }
    return out;
  } catch (e) {
    return [];
  }
}

export async function clearBgBuffer() {
  try {
    const idx = await readIndex();
    if (idx.list.length) {
      await AsyncStorage.multiRemove(idx.list.map((k) => CHUNK + k));
    }
    await AsyncStorage.removeItem(IDX_KEY);
  } catch (e) {}
}

async function appendToDisk(points) {
  try {
    const idx = await readIndex();
    let openKey = idx.open;
    let cur = [];

    if (openKey != null) {
      const raw = await AsyncStorage.getItem(CHUNK + openKey);
      if (raw) { try { cur = JSON.parse(raw) || []; } catch (e) { cur = []; } }
    } else {
      openKey = idx.n;
      idx.n = idx.n + 1;
      idx.list.push(openKey);
      idx.open = openKey;
    }

    for (const p of points) cur.push(p);

    if (cur.length >= CHUNK_SIZE) {
      idx.open = null;
    }

    await AsyncStorage.setItem(CHUNK + openKey, JSON.stringify(cur));

    // Juda eski bo'laklarni olib tashlaymiz
    while (idx.list.length > MAX_CHUNKS) {
      const old = idx.list.shift();
      AsyncStorage.removeItem(CHUNK + old).catch(() => {});
    }

    await writeIndex(idx);
  } catch (e) {
    console.log('bg buffer yozish xatosi:', e.message);
  }
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) { console.log('Task xatosi:', error.message); return; }
  if (!data) return;
  const { locations } = data;
  if (!locations || locations.length === 0) return;

  const pts = locations.map((loc) => ({
    latitude: loc.coords.latitude,
    longitude: loc.coords.longitude,
    accuracy: loc.coords.accuracy,
    speed: loc.coords.speed,
    timestamp: loc.timestamp,
  }));

  for (const p of pts) buffer.push(p);
  await appendToDisk(pts);
  if (listener) listener(buffer);
});

