import AsyncStorage from '@react-native-async-storage/async-storage';

let BASE = 'https://donagame.duckdns.org/zona';
const BASE_ALT = 'http://167.233.210.10:8000';
const BASE_KEY = 'zona_base_v1';

export async function pickBase() {
  try {
    const saved = await AsyncStorage.getItem(BASE_KEY);
    if (saved) BASE = saved;
  } catch (e) {}
  try {
    const r = await fetch(BASE + '/health', { method: 'GET' });
    if (r.ok) return BASE;
  } catch (e) {}
  try {
    const r2 = await fetch(BASE_ALT + '/health', { method: 'GET' });
    if (r2.ok) {
      BASE = BASE_ALT;
      AsyncStorage.setItem(BASE_KEY, BASE_ALT).catch(() => {});
      return BASE;
    }
  } catch (e) {}
  return BASE;
}
const DEVICE_KEY = 'zona_device_id';
const USER_KEY = 'zona_user';

async function getDeviceId() {
  let id = await AsyncStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = 'dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10);
    await AsyncStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

export async function ensureUser() {
  const cached = await AsyncStorage.getItem(USER_KEY);
  if (cached) { try { return JSON.parse(cached); } catch (e) {} }
  const deviceId = await getDeviceId();
  const res = await fetch(BASE + '/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ device_id: deviceId }),
  });
  if (!res.ok) throw new Error('Registratsiya xatosi');
  const user = await res.json();
  await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}

export async function pushZone(userId, coords, area, extra) {
  const body = JSON.stringify({
    user_id: userId,
    coords: coords,
    area: area,
    duration: (extra && extra.duration) || 0,
    distance: (extra && extra.distance) || 0,
    mocked: !!(extra && extra.mocked),
  });
  const waits = [0, 2000, 6000];
  let last = 'Zona yuborilmadi';
  for (let k = 0; k < waits.length; k++) {
    if (waits[k] > 0) await new Promise((r) => setTimeout(r, waits[k]));
    try {
      const res = await fetch(BASE + '/zones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: body,
      });
      if (res.ok) return res.json();
      let msg = 'Zona yuborilmadi';
      try { const e = await res.json(); if (e && e.detail) msg = e.detail; } catch (x) {}
      last = msg;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) throw new Error(msg);
    } catch (e) {
      last = String(e.message || last);
      if (last.indexOf('Juda tez -') === 0 || last.indexOf('Zona juda') === 0 ||
          last.indexOf('Kam nuqta') === 0 || last.indexOf('Juda qisqa') === 0) {
        throw new Error(last);
      }
    }
  }
  throw new Error(last);
}
export async function fetchZones(lat, lon, radius = 5000) {
  const url = BASE + '/zones?lat=' + lat + '&lon=' + lon + '&radius=' + radius;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Zonalar olinmadi');
  const data = await res.json();
  return data.zones || [];
}

export async function fetchLeaderboard() {
  const res = await fetch(BASE + '/leaderboard');
  if (!res.ok) throw new Error('Reyting olinmadi');
  const data = await res.json();
  return data.top || [];
}

export async function fetchMe(userId) {
  const res = await fetch(BASE + '/me?user_id=' + userId);
  if (!res.ok) throw new Error('Malumot olinmadi');
  return res.json();
}

export async function setName(userId, name) {
  const res = await fetch(BASE + '/name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, name }),
  });
  if (!res.ok) {
    let msg = 'Ism saqlanmadi';
    try { const e = await res.json(); if (e && e.detail) msg = e.detail; } catch (x) {}
    throw new Error(msg);
  }
  const data = await res.json();
  const cached = await AsyncStorage.getItem(USER_KEY);
  if (cached) {
    try {
      const u = JSON.parse(cached);
      u.name = data.name;
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch (e) {}
  }
  return data;
}

// Rasm yuklash
export async function uploadAvatar(userId, uri) {
  const form = new FormData();
  form.append('user_id', userId);
  form.append('file', {
    uri: uri,
    name: 'avatar.jpg',
    type: 'image/jpeg',
  });
  const res = await fetch(BASE + '/avatar', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error('Rasm yuklanmadi');
  return res.json();
}

// Premium profil yangilash
export async function updateProfile(userId, data) {
  const body = Object.assign({ user_id: userId }, data);
  const res = await fetch(BASE + '/profile', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error('Saqlanmadi');
  return res.json();
}

// Premium ranglar ro'yxati
export async function fetchColors() {
  const res = await fetch(BASE + '/colors');
  if (!res.ok) throw new Error('Ranglar olinmadi');
  const data = await res.json();
  return data.colors || [];
}


export async function uploadLogo(userId, uri) {
  const form = new FormData();
  form.append('user_id', userId);
  form.append('file', { uri: uri, name: 'logo.jpg', type: 'image/jpeg' });
  const res = await fetch(BASE + '/logo', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Logo yuklanmadi');
  return res.json();
}



export async function uploadBanner(userId, uri) {
  const form = new FormData();
  form.append('user_id', userId);
  form.append('file', { uri: uri, name: 'banner.jpg', type: 'image/jpeg' });
  const res = await fetch(BASE + '/banner', { method: 'POST', body: form });
  if (!res.ok) throw new Error('Banner yuklanmadi');
  return res.json();
}




export async function checkName(name) {
  const res = await fetch(BASE + '/name_free?name=' + encodeURIComponent(name));
  if (!res.ok) return false;
  const d = await res.json();
  return !!d.free;
}




export async function fetchAdmin(key) {
  const res = await fetch(BASE + '/admin/data?key=' + encodeURIComponent(key));
  if (!res.ok) throw new Error('Kalit notogri');
  return res.json();
}



export async function savePushToken(userId, token) {
  const res = await fetch(BASE + '/push_token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, token: token }),
  });
  return res.ok;
}



export async function fetchNearby(lat, lon, radius) {
  const url = BASE + '/nearby?lat=' + lat + '&lon=' + lon + '&radius=' + (radius || 30000);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Reyting olinmadi');
  const d = await res.json();
  return d.top || [];
}



export async function fetchWeekly(lat, lon) {
  let url = BASE + '/weekly';
  if (lat != null && lon != null) url += '?lat=' + lat + '&lon=' + lon;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Xato');
  const d = await res.json();
  return d.top || [];
}

export async function fetchStats(userId) {
  const res = await fetch(BASE + '/stats?user_id=' + userId);
  if (!res.ok) throw new Error('Xato');
  return res.json();
}



export async function fetchDaily(userId) {
  const res = await fetch(BASE + '/daily?user_id=' + userId);
  if (!res.ok) throw new Error('Xato');
  return res.json();
}

export async function fetchAround(lat, lon) {
  const res = await fetch(BASE + '/around?lat=' + lat + '&lon=' + lon);
  if (!res.ok) throw new Error('Xato');
  return res.json();
}



export async function deleteMyZones(userId) {
  const res = await fetch(BASE + '/my_zones_delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) throw new Error('Ochirilmadi');
  return res.json();
}



const GKEY = 'AIzaSyBRUe-leQlt3k9ns-ZdQpiuQqchhliDkxs';

export async function searchPlace(query) {
  const url = 'https://maps.googleapis.com/maps/api/place/textsearch/json?query=' +
    encodeURIComponent(query) + '&region=uz&language=uz&key=' + GKEY;
  const res = await fetch(url);
  if (!res.ok) throw new Error('Qidiruv ishlamadi');
  const d = await res.json();
  if (!d.results) return [];
  return d.results.slice(0, 8).map((r) => ({
    name: r.name,
    address: r.formatted_address || '',
    lat: r.geometry.location.lat,
    lon: r.geometry.location.lng,
  }));
}



export async function suggestPlace(query) {
  if (!query || query.length < 2) return [];
  const res = await fetch(BASE + '/search?q=' + encodeURIComponent(query));
  if (!res.ok) return [];
  const d = await res.json();
  return d.results || [];
}

export async function placeDetails(placeId) {
  const res = await fetch(BASE + '/place?id=' + encodeURIComponent(placeId));
  if (!res.ok) throw new Error('Topilmadi');
  return res.json();
}







export async function addView(ownerId, viewerId, kind) {
  try {
    await fetch(BASE + '/view', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ owner_id: ownerId, viewer_id: viewerId, kind: kind || 'card' }),
    });
  } catch (e) {}
}

export async function fetchViews(userId) {
  const res = await fetch(BASE + '/views?user_id=' + userId);
  if (!res.ok) throw new Error('Xato');
  return res.json();
}



export async function deleteOneZone(userId, zoneId) {
  const res = await fetch(BASE + '/my_zone_delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, zone_id: zoneId }),
  });
  if (!res.ok) throw new Error('Ochirilmadi');
  return res.json();
}


export async function fetchTasks(userId) {
  const res = await fetch(BASE + '/tasks?user_id=' + userId);
  if (!res.ok) throw new Error('Xato');
  return res.json();
}


export async function fetchBorders(userId) {
  const res = await fetch(BASE + '/borders?user_id=' + userId);
  if (!res.ok) throw new Error('Xato');
  return res.json();
}

export async function setBorder(userId, code) {
  const res = await fetch(BASE + '/border_set', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, code: code }),
  });
  if (!res.ok) throw new Error('Xato');
  return res.json();
}

export async function unlockBorder(userId, code) {
  const res = await fetch(BASE + '/border_unlock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, code: code }),
  });
  if (!res.ok) throw new Error('Xato');
  return res.json();
}



export async function fetchAppLink() {
  try {
    const res = await fetch(BASE + '/applink');
    if (!res.ok) return null;
    const d = await res.json();
    return d && d.url ? d.url : null;
  } catch (e) { return null; }
}


export async function fetchPlayerZone(userId) {
  const res = await fetch(BASE + '/player_zone?user_id=' + encodeURIComponent(userId));
  if (!res.ok) return null;
  return res.json();
}

export async function fetchDailyPhotos(userId) {
  const res = await fetch(BASE + '/daily_photos?user_id=' + encodeURIComponent(userId));
  if (!res.ok) return { photos: [], left_today: 0 };
  return res.json();
}

export async function uploadDailyPhoto(userId, uri, caption) {
  const fd = new FormData();
  fd.append('user_id', userId);
  fd.append('caption', caption || '');
  fd.append('file', { uri: uri, name: 'photo.jpg', type: 'image/jpeg' });
  const res = await fetch(BASE + '/daily_photo', { method: 'POST', body: fd });
  if (!res.ok) {
    let msg = 'Yuklanmadi';
    try { const e = await res.json(); if (e && e.detail) msg = e.detail; } catch (x) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function deleteDailyPhoto(userId, url) {
  const res = await fetch(BASE + '/daily_photo_delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, url: url }),
  });
  if (!res.ok) throw new Error('Ochirilmadi');
  return res.json();
}

export async function fetchPlan(userId) {
  const res = await fetch(BASE + '/plan?user_id=' + encodeURIComponent(userId));
  if (!res.ok) return null;
  return res.json();
}

export async function startTrial(userId) {
  const res = await fetch(BASE + '/plan_trial', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  if (!res.ok) {
    let msg = 'Xato';
    try { const e = await res.json(); if (e && e.detail) msg = e.detail; } catch (x) {}
    throw new Error(msg);
  }
  return res.json();
}

const CFG_KEY = 'zona_cfg_v1';

export async function fetchConfig() {
  try {
    const res = await fetch(BASE + '/config');
    if (res.ok) {
      const j = await res.json();
      AsyncStorage.setItem(CFG_KEY, JSON.stringify(j)).catch(() => {});
      return j;
    }
  } catch (e) {}
  try {
    const v = await AsyncStorage.getItem(CFG_KEY);
    if (v) return JSON.parse(v);
  } catch (e) {}
  return null;
}

export async function authSend(contact) {
  const res = await fetch(BASE + '/auth/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact: contact }),
  });
  if (!res.ok) {
    let msg = 'Yuborilmadi';
    try { const e = await res.json(); if (e && e.detail) msg = e.detail; } catch (x) {}
    throw new Error(msg);
  }
  return res.json();
}

export async function authVerify(contact, code) {
  let dev = '';
  try { dev = (await AsyncStorage.getItem(DEVICE_KEY)) || ''; } catch (e) {}
  const res = await fetch(BASE + '/auth/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contact: contact, code: code, device_id: dev }),
  });
  if (!res.ok) {
    let msg = 'Kod notogri';
    try { const e = await res.json(); if (e && e.detail) msg = e.detail; } catch (x) {}
    throw new Error(msg);
  }
  const j = await res.json();
  try {
    await AsyncStorage.setItem(USER_KEY, JSON.stringify({ user_id: j.user_id, name: j.name }));
  } catch (e) {}
  return j;
}

export async function fetchWalkBoard(limit) {
  const res = await fetch(BASE + '/leaderboard_walk?limit=' + (limit || 50));
  if (!res.ok) throw new Error('xato');
  const j = await res.json();
  return j.top || [];
}
