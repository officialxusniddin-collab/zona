import AsyncStorage from '@react-native-async-storage/async-storage';

const ZONES_KEY = 'zona_zones_v1';

export async function saveZones(zones) {
  /* juda kop zona ilovani sekinlashtiradi - oxirgi 300 tasi yetarli */
  try {
    if (Array.isArray(zones) && zones.length > 300) zones = zones.slice(-300);
  } catch (e) {}
  try {
    await AsyncStorage.setItem(ZONES_KEY, JSON.stringify(zones));
  } catch (e) {
    console.log('Saqlash xatosi:', e.message);
  }
}

export async function loadZones() {
  try {
    const raw = await AsyncStorage.getItem(ZONES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.log('Yuklash xatosi:', e.message);
    return [];
  }
}

export async function clearZones() {
  try {
    await AsyncStorage.removeItem(ZONES_KEY);
  } catch (e) {
    console.log('Tozalash xatosi:', e.message);
  }
}

const TRACK_KEY = 'zona_track_v1';

export async function saveTrack(data) {
  try { await AsyncStorage.setItem(TRACK_KEY, JSON.stringify(data)); }
  catch (e) {}
}

export async function loadTrack() {
  try {
    const raw = await AsyncStorage.getItem(TRACK_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) { return null; }
}

export async function clearTrack() {
  try { await AsyncStorage.removeItem(TRACK_KEY); } catch (e) {}
}



/* -- Yuborilmagan zonalar -- */
const PEND_KEY = 'zona_pending_v1';

export async function loadPending() {
  try {
    const v = await AsyncStorage.getItem(PEND_KEY);
    const arr = v ? JSON.parse(v) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

export async function savePending(list) {
  try {
    await AsyncStorage.setItem(PEND_KEY, JSON.stringify(list || []));
  } catch (e) {}
}

export async function addPending(item) {
  const list = await loadPending();
  list.push(item);
  /* navbat cheksiz osmasin - eng eskisi tushib qoladi */
  const MAX = 40;
  const trimmed = list.length > MAX ? list.slice(list.length - MAX) : list;
  await savePending(trimmed);
  return trimmed.length;
}

export async function removePending(id) {
  const list = await loadPending();
  const nz = list.filter((x) => x.id !== id);
  await savePending(nz);
  return nz.length;
}
