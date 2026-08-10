import { useEffect, useState, useRef } from 'react';
import { AppState, StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Animated, Modal, ScrollView, TextInput, Image, Linking, Dimensions, RefreshControl, BackHandler, PanResponder, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Easing } from 'react-native';
import MapView, { Polyline, Marker, Polygon, Overlay } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Battery from 'expo-battery';
import * as MapLibreGL from '@maplibre/maplibre-react-native';
import { ZonesBatch, PathLine, ZoneImage, ZoneLogos, MeDot } from './MapZone';
import ZoneBorder, { NAMES } from './ZoneBorder';
import BorderPreview from './BorderPreview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Onboard from './Onboard';
import Login from './Login';
import Celebrate from './Celebrate';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LOCATION_TASK, getBuffer, clearBuffer, loadBgBuffer, clearBgBuffer } from './locationTask';
import { distanceM, polygonAreaM2, findLoop, findZoneTouch, smoothPolygon, resetLoopCache, setGeoConfig } from './geo';
import ErrorBoundary from './ErrorBoundary';
import { initSfx, sfx, isSoundOn, setSoundOn } from './sfx';
import { Press, Skel, SkelList, FadeIn, Sheet, Empty, Toast, tap, tapOk, tapErr } from './ui';
import { saveZones, loadZones, clearZones, saveTrack, loadTrack, clearTrack, loadPending, savePending, addPending, removePending } from './storage';
import { ensureUser, pushZone, fetchZones, fetchLeaderboard, fetchMe, setName, uploadAvatar, updateProfile, fetchColors, uploadLogo, uploadBanner, checkName, fetchAdmin, savePushToken, fetchNearby, fetchWeekly, fetchWalkBoard, fetchStats, fetchDaily, fetchAround, searchPlace, suggestPlace, placeDetails, addView, fetchViews, deleteOneZone, fetchTasks, fetchBorders, setBorder, unlockBorder, fetchAppLink, fetchPlayerZone, fetchDailyPhotos, uploadDailyPhoto, deleteDailyPhoto, fetchPlan, startTrial, fetchConfig, pickBase } from './api';
 
const MIN_AREA_M2 = 60;
const MIN_STEP_M = 2;
const SCREEN_W = Dimensions.get('window').width;
const MAPTILER_KEY = 'OYAd5Vwx65s6D8i9P5yo';
const MAP_STYLE = 'https://api.maptiler.com/maps/streets-v4/style.json?key=' + MAPTILER_KEY;
const MAP_STYLE_DARK = 'https://api.maptiler.com/maps/streets-v4-dark/style.json?key=' + MAPTILER_KEY;

const SCREEN_H = Dimensions.get('window').height;
const DRAWER_W = Math.min(SCREEN_W * 0.78, 320);
 
const DARK_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#0F1620' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0B0F14' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#7A8794' }] },
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C2634' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5A6672' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 3 }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0A1018' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#0F1620' }] },
];
 
const LIGHT_MAP = [
  { elementType: 'geometry', stylers: [{ color: '#DFE4E9' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#4A555F' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 2 }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#DFE4E9' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#A3B0BD' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#8E9DAC' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#5A6672' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }, { weight: 3 }] },
  { featureType: 'road.local', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'road.arterial', elementType: 'labels', stylers: [{ visibility: 'on' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#4FA3D1' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#2E6C8E' }] },
];
 
const T = {
  dark: {
    accent: '#00E5A0', accentInk: '#04140E', zoneFill: 'rgba(0,229,160,0.28)',
    stop: '#FF4D6D', stopInk: '#22060C',
    panelBg: 'rgba(11,15,20,0.85)', panelBorder: 'rgba(122,135,148,0.18)',
    sheetBg: '#111820', rowBg: 'rgba(255,255,255,0.04)',
    textMain: '#FFFFFF', textSub: '#7A8794', screenBg: '#0B0F14', bar: 'light',
  },
  light: {
    accent: '#00A878', accentInk: '#FFFFFF', zoneFill: 'rgba(0,168,120,0.25)',
    stop: '#E23E5C', stopInk: '#FFFFFF',
    panelBg: 'rgba(255,255,255,0.94)', panelBorder: 'rgba(90,102,114,0.16)',
    sheetBg: '#FFFFFF', rowBg: 'rgba(0,0,0,0.03)',
    textMain: '#151C24', textSub: '#5A6672', screenBg: '#DFE4E9', bar: 'dark',
  },
};
 
function alpha(hex, a) {
  const h = (hex || '#888888').replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}
 
function fmtTime(sec) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}
 
function centerOf(coords) {
  let la = 0, lo = 0;
  for (const p of coords) { la += p.latitude; lo += p.longitude; }
  return { latitude: la / coords.length, longitude: lo / coords.length };
}
 
function cornerOf(coords) {
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const p of coords) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  const cLat = (minLat + maxLat) / 2;
  const cLon = (minLon + maxLon) / 2;
  return { latitude: cLat + (maxLat - cLat) * 0.45, longitude: cLon + (maxLon - cLon) * 0.45 };
}

function zoneSpanDeg(coords) {
  let minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
  for (const p of coords) {
    if (p.latitude < minLat) minLat = p.latitude;
    if (p.latitude > maxLat) maxLat = p.latitude;
    if (p.longitude < minLon) minLon = p.longitude;
    if (p.longitude > maxLon) maxLon = p.longitude;
  }
  return Math.max(maxLat - minLat, maxLon - minLon);
}
 
export default function App() {
  return (
    <ErrorBoundary>
      <ZonaApp />
    </ErrorBoundary>
  );
}
function smoothOnce(pts) {
  const n = pts.length;
  if (n < 5) return pts;
  const out = new Array(n);
  out[0] = pts[0];
  out[n - 1] = pts[n - 1];
  for (let i = 1; i < n - 1; i++) {
    const a = pts[i - 1], b = pts[i], c = pts[i + 1];
    out[i] = {
      latitude: a.latitude * 0.3 + b.latitude * 0.4 + c.latitude * 0.3,
      longitude: a.longitude * 0.3 + b.longitude * 0.4 + c.longitude * 0.3,
    };
  }
  return out;
}

function smoothPath(pts) {
  const n = pts.length;
  if (n < 6) return [...pts];
  /* juda uzun yolda faqat oxirgi qismni silliqlaymiz */
  if (n > 1200) {
    const head = pts.slice(0, n - 1200);
    let tail = pts.slice(n - 1200);
    for (let k = 0; k < 3; k++) tail = smoothOnce(tail);
    return head.concat(tail);
  }
  let r = pts;
  for (let k = 0; k < 3; k++) r = smoothOnce(r);
  return r;
}

function ptInPoly(lat, lon, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i].latitude, xi = poly[i].longitude;
    const yj = poly[j].latitude, xj = poly[j].longitude;
    const hit = ((yi > lat) !== (yj > lat)) && (lon < ((xj - xi) * (lat - yi)) / ((yj - yi) || 1e-12) + xi);
    if (hit) inside = !inside;
  }
  return inside;
}

function bdVisible(b, p, view) {
  const y = (p._top || 0) + (b._y || 0);
  return y > view.y - 160 && y < view.y + view.h + 160;
}

function ZonaApp() {
  const [location, setLocation] = useState(null);
  const [error, setError] = useState(null);
  const hour = new Date().getHours();
  const [isDark, setIsDark] = useState(false);
 
  const [user, setUser] = useState(null);
  const [online, setOnline] = useState(false);
  const [remoteZones, setRemoteZones] = useState([]);
  const [myZoneImgs, setMyZoneImgs] = useState([]);
  const [zoomDelta, setZoomDelta] = useState(0.003);
 
  const [showBoard, setShowBoard] = useState(false);
  const [board, setBoard] = useState([]);
  const [nearBoard, setNearBoard] = useState([]);
  const [weekBoard, setWeekBoard] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [daily, setDaily] = useState(null);
  const [around, setAround] = useState(null);
  const [showDaily, setShowDaily] = useState(true);
  const [showTasks, setShowTasks] = useState(false);
  const [tasks, setTasks] = useState(null);
  const [showBorders, setShowBorders] = useState(false);
  const [bdData, setBdData] = useState(null);
  const [bdView, setBdView] = useState({ y: 0, h: 800 });
  const [myBorder, setMyBorder] = useState('simple_1');
  const [showHint, setShowHint] = useState(false);
  const [toast2, setToast2] = useState(null);
  const [soundOn, setSoundOnState] = useState(true);
  const [showSfx, setShowSfx] = useState(false);
  const [myViews, setMyViews] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [is3D, setIs3D] = useState(false);
  const [showDelZones, setShowDelZones] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchRes, setSearchRes] = useState([]);
  const [searching, setSearching] = useState(false);
  const [boardMode, setBoardMode] = useState('near');
  const [meStats, setMeStats] = useState(null);
  const [boardLoading, setBoardLoading] = useState(false);
  const [walkBoard, setWalkBoard] = useState([]);
  const [editName, setEditName] = useState(false);
  const [nameInput, setNameInput] = useState('');
  const [uploading, setUploading] = useState(false);
 
  const [showPrem, setShowPrem] = useState(false);
  const [colors, setColors] = useState([]);
  const [pf, setPf] = useState({ zone_name: '', zone_color: '', phone: '', instagram: '', address: '', work_hours: '', promo: '', logo_color: '' });
  const [savingPf, setSavingPf] = useState(false);
  const [infoZone, setInfoZone] = useState(null);
  const [pending, setPending] = useState(null);
  const [celebrate, setCelebrate] = useState(null);
 
  const [menuOpen, setMenuOpen] = useState(false);
  const [speed, setSpeed] = useState(0);
  const [splash, setSplash] = useState(true);
  const [showIntro, setShowIntro] = useState(false);
  const [infoPage, setInfoPage] = useState(null);
  const [needNick, setNeedNick] = useState(false);
  const [askAuth, setAskAuth] = useState(false);
  const [mustAuth, setMustAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminKey, setAdminKey] = useState('');
  const [adminData, setAdminData] = useState(null);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminTab, setAdminTab] = useState('live');
  const [nick, setNick] = useState('');
  const [nickState, setNickState] = useState('');
  const [savingNick, setSavingNick] = useState(false);
  const spLogo = useRef(new Animated.Value(0)).current;
  const spText = useRef(new Animated.Value(0)).current;
  const spFade = useRef(new Animated.Value(1)).current;
  const spPulse = useRef(new Animated.Value(0)).current;
  const pendAnim = useRef(new Animated.Value(0)).current;
  const pendGlow = useRef(new Animated.Value(0)).current;
 
  const [tracking, setTracking] = useState(false);
  const [path, setPath] = useState([]);
  const [zones, setZones] = useState([]);
  const [distance, setDistance] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [toast, setToast] = useState(null);
 
  useEffect(() => { initSfx().then(() => setSoundOnState(isSoundOn())); }, []);


  useEffect(() => {
    fetchAppLink().then((u) => { if (u) apkRef.current = u; }).catch(() => {});
  }, []);

  useEffect(() => {
    pickBase().catch(() => {});
    fetchConfig().then((j) => {
      if (j) {
        setCfg(j);
        cfgRef.current = j;
        if (j.geo) setGeoConfig(j.geo);
        const myV = 1;
        const mode = j.update_mode || 'none';
        if (mode === 'force' && (j.min_version || 1) > myV) {
          setUpdInfo({ force: true, text: j.update_text, note: j.update_note, url: j.update_url });
        } else if (mode === 'soft' && (j.min_version || 1) > myV) {
          setUpdInfo({ force: false, text: j.update_text, note: j.update_note, url: j.update_url });
        }
        if (j.map_key && j.map_key !== MAPTILER_KEY) setMapKey(j.map_key);
        if (j.notice) setTimeout(() => say(String(j.notice), 'warn'), 3500);
      }
    }).catch(() => {});
    const tp = setTimeout(() => { loadPlan(); loadMyPhotos(); }, 2000);
    return () => clearTimeout(tp);
  }, []);

  useEffect(() => {
    const t0 = setTimeout(() => loadBorders(), 2500);
    return () => clearTimeout(t0);
  }, []);

  const say = (msg, kind) => {
    setToast2({ msg: msg, kind: kind || 'info', id: Date.now() });
    if (kind === 'ok') tapOk();
    else if (kind === 'err') tapErr();
    else tap();
  };

  const mapRef = useRef(null);
  const camRef = useRef(null);
  const shotRef = useRef(null);
  const lastPointRef = useRef(null);
  const distRef = useRef(0);
  const readIndexRef = useRef(0);
  const pathRef = useRef([]);
  const trackingRef = useRef(false);
  const userRef = useRef(null);
  const locRef = useRef(null);
  const viewRef = useRef(null);
  const mockedRef = useRef(false);
  const distRefPt = useRef(null);
  const distBuf = useRef([]);
  const warnRef = useRef(false);
  const sendingRef = useRef(false);
  const zoneStartRef = useRef(0);
  const secRef = useRef(0);
  const lastMoveRef = useRef(0);
  const lastSaveRef = useRef(0);
  const pendBgRef = useRef([]);
  const appActiveRef = useRef(true);
  const bgBusyRef = useRef(false);
  const liveQRef = useRef([]);
  const queueRef = useRef([]);
  const followRef = useRef(true);
  const speedRef = useRef(0);
  const zonesCountRef = useRef(0);
  const myHaRef = useRef(0);
  const startTimeRef = useRef(0);
  const lastCamRef = useRef(0);
  const headRef = useRef(0);
  const followTimerRef = useRef(null);
  const [follow, setFollow] = useState(true);
  const [camHead, setCamHead] = useState(0);
  const [warn, setWarn] = useState(null);
  const moveTimerRef = useRef(null);
  const pendingRef = useRef(null);
  const dismissedRef = useRef(0);
  const dismissedAreaRef = useRef(0);
  const skippedRef = useRef([]);
  const [skipCount, setSkipCount] = useState(0);
  const [showSkipped, setShowSkipped] = useState(false);
  const lastZoneAtRef = useRef(0);
  const zonesRef = useRef([]);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(900)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
 
  const c = isDark ? T.dark : T.light;
 
  useEffect(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setTimeout(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}), 450);
    Animated.loop(Animated.timing(spPulse, { toValue: 1, duration: 2600, easing: Easing.linear, useNativeDriver: true })).start();
    Animated.sequence([
      Animated.timing(spLogo, { toValue: 1, duration: 850, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
      Animated.timing(spText, { toValue: 1, duration: 700, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.delay(750),
      Animated.timing(spFade, { toValue: 0, duration: 650, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
    ]).start(() => setSplash(false));
    return () => { spPulse.stopAnimation(); spLogo.stopAnimation(); spText.stopAnimation(); spFade.stopAnimation(); };
  }, []);

  useEffect(() => {
    loadZones().then((z) => { if (z.length > 0) setZones(z); });
  }, []);
 
  useEffect(() => {
    ensureUser()
      .then((u) => {
        userRef.current = u;
        setUser(u);
        setOnline(true);
        fetchMe(u.user_id).then((m) => {
          setMeStats(m);
          if (m && !m.verified) setMustAuth(true);
      else if (m && m.name && m.name.indexOf('Oyinchi') === 0) setNeedNick(true);
        }).catch(() => {});
      })
      .catch(() => setOnline(false));
  }, []);
 
  useEffect(() => {
    AsyncStorage.getItem('zona_intro_v14').then((v) => { if (!v) setShowIntro(true); }).catch(() => { setShowIntro(true); });
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const { status: ex } = await Notifications.getPermissionsAsync();
        let st = ex;
        if (ex !== 'granted') {
          const r = await Notifications.requestPermissionsAsync();
          st = r.status;
        }
        try {
          await Notifications.setNotificationChannelAsync('zona-alert', {
            name: 'Zona ogohlantirishlari',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 600, 250, 600, 250, 900],
            lightColor: '#00E5A0',
            sound: 'default',
          });
        } catch (e) {}
        if (st !== 'granted') return;
        const tk = await Notifications.getExpoPushTokenAsync();
        const u = userRef.current;
        if (tk && tk.data && u) savePushToken(u.user_id, tk.data).catch(() => {});
      } catch (e) {}
    })();
  }, [user]);

  const apkRef = useRef(null);
  const zoomRef = useRef(0);
  const [pendCount, setPendCount] = useState(0);
  const [openRow, setOpenRow] = useState(null);
  const [showRw, setShowRw] = useState(null);
  const [myPhotos, setMyPhotos] = useState({ photos: [], left_today: 0 });
  const [cardPhotos, setCardPhotos] = useState([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [bigPhoto, setBigPhoto] = useState(null);
  const [showPhotos, setShowPhotos] = useState(false);
  const [pfTab, setPfTab] = useState('look');
  const [trialWin, setTrialWin] = useState(false);
  const [winInfo, setWinInfo] = useState({ name: 'Biznes+', days: 30, up: false });
  const [cfg, setCfg] = useState(null);
  const [mapKey, setMapKey] = useState(MAPTILER_KEY);
  const cfgRef = useRef(null);
  const [pickPlan, setPickPlan] = useState(null);
  const [stOpen, setStOpen] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const backPressRef = useRef(0);
  const menuH = useRef(new Animated.Value(0)).current;
  const menuHRef = useRef(0);
  const [showAcc, setShowAcc] = useState(false);
  const [updInfo, setUpdInfo] = useState(null);
  const [savedAcc, setSavedAcc] = useState(null);
  const twScale = useRef(new Animated.Value(0)).current;
  const twGlow = useRef(new Animated.Value(0)).current;
  const [plan, setPlan] = useState(null);
  const [showPlans, setShowPlans] = useState(false);
  const pfOrigRef = useRef(null);
  const [pfDirty, setPfDirty] = useState(false);
  const pendBusyRef = useRef(false);
  const APK_FALLBACK = 'https://expo.dev/accounts/xusniddinuz/projects/zona/builds/6b5c6264-d4b4-450a-be15-d2c1368c8ec8';
  const NL = String.fromCharCode(10);
  const inviteFriend = async () => {
    try {
      const me = meStats ? meStats.name : 'Men';
      const ha = meStats ? meStats.hectares : 0;
      await Share.share({ message: TX('share_invite', 'ZONA - koʻchada yurib hudud egallash oʻyini!') + NL + NL + me + ' allaqachon ' + ha + ' gektar egalladi.' + NL + 'Qoshil va uning hududini bosib ol!' + NL + NL + (apkRef.current || APK_FALLBACK) });
    } catch (e) {}
  };
  const shareZone = async () => {
    try {
      if (shotRef.current) {
        const uri = await captureRef(shotRef, { format: 'jpg', quality: 0.9 });
        const can = await Sharing.isAvailableAsync();
        if (can) { await Sharing.shareAsync(uri, { dialogTitle: 'Zona' }); return; }
      }
    } catch (e) {}
    try {
      const me = meStats ? meStats.name : 'Men';
      const ha = meStats ? meStats.hectares : 0;
      const zn = meStats ? meStats.zones : 0;
      await Share.share({ message: (TX('share_result', 'ZONA oʻyinida hudud egalladim!').replace('hudud', ha + ' gektar hudud')) + ' (' + zn + ' ta zona)' + NL + NL + (apkRef.current || APK_FALLBACK) });
    } catch (e) {}
  };
  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => {
      if (pathRef.current.length > 1) {
        saveTrack({
          path: pathRef.current,
          dist: distRef.current,
          sec: seconds,
          start: startTimeRef.current,
          at: Date.now(),
        });
      }
    }, 5000);
    return () => clearInterval(id);
  }, [tracking, seconds]);

  useEffect(() => {
    let tm = null;
    loadTrack().then((t) => {
      if (!t || !t.path || t.path.length < 2) return;
      const age = Date.now() - (t.at || 0);
      if (age > 30 * 24 * 3600 * 1000) { clearTrack(); return; }
      const km = ((t.dist || 0) / 1000).toFixed(2);
      tm = setTimeout(() => {
          const resumeNow = () => {
            pathRef.current = t.path;
            distRef.current = t.dist || 0;
            startTimeRef.current = t.start || Date.now();
            lastPointRef.current = Object.assign({}, t.path[t.path.length - 1], { t: (t.at || Date.now()) });
            readIndexRef.current = 0;
            setPath([...t.path]);
            setDistance(t.dist || 0);
            setSeconds(t.sec || 0);
            secRef.current = t.sec || 0;
            lastSaveRef.current = Date.now();
            startTracking(true);
          };

          const age = Date.now() - (t.at || 0);
          if (age < 30 * 60 * 1000) {
            Location.hasServicesEnabledAsync().then((on) => {
              if (on) resumeNow();
              else { clearTrack(); setWarn('Joylashuv oʻchirilgan - START bosib qayta boshlang'); }
            }).catch(() => { resumeNow(); });
            setTimeout(() => say(TX('resumed', 'Yoʻlingiz davom etmoqda'), 'ok'), 900);
          } else {
            Alert.alert(
              'Tugallanmagan yoʻl',
              km + ' km yurgan yoʻlingiz saqlangan. Davom ettirasizmi?',
              [
                { text: 'Yoʻq', style: 'cancel', onPress: () => clearTrack() },
                { text: 'Davom', onPress: resumeNow },
              ]
            );
          }
      }, 2500);
    }).catch(() => {});
    return () => { if (tm) clearTimeout(tm); };
  }, []);

  useEffect(() => {
    const load = () => {
      const u = userRef.current;
      const lc = locRef.current;
      if (u) fetchDaily(u.user_id).then((d) => {
        setDaily((old) => {
          if (d && d.complete && old && !old.complete) sfx('daily');
          return d;
        });
      }).catch(() => {});
      if (lc) fetchAround(lc.latitude, lc.longitude).then((d) => { if (d) setAround(d); }).catch(() => {});
    };
    const t = setTimeout(load, 4000);
    const id = setInterval(load, 60000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);

  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => {
      if (!lastMoveRef.current) return;
      const idle = Date.now() - lastMoveRef.current;
        if (idle > 45000) {
          Location.hasServicesEnabledAsync().then((on) => {
            if (!on) setWarn('Joylashuv (GPS) oʻchirilgan - sozlamalardan yoqing');
            else if (idle > 90000) setWarn('90 soniyadan beri harakat yoʻq - GPS ishlayaptimi?');
          }).catch(() => {});
        } else {
          setWarn((w) => (w && (w.indexOf('harakat yo') >= 0 || w.indexOf('GPS') >= 0)) ? null : w);
        }
    }, 15000);
    return () => clearInterval(id);
  }, [tracking]);

  useEffect(() => {
    if (!tracking) return;
    let sub = null;
    (async () => {
      try {
        const lvl = await Battery.getBatteryLevelAsync();
        if (lvl > 0 && lvl < 0.18) setWarn('Batareya ' + Math.round(lvl * 100) + '% - quvvat tugasa yoʻl saqlanadi');
        sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
          if (batteryLevel > 0 && batteryLevel < 0.12)
            setWarn('Batareya ' + Math.round(batteryLevel * 100) + '% - tez orada ochadi');
        });
      } catch (e) {}
    })();
    return () => { if (sub) sub.remove(); };
  }, [tracking]);

  useEffect(() => {
    if (!daily) return;
    setShowDaily(true);
    const t = setTimeout(() => setShowDaily(false), 10000);
    return () => clearTimeout(t);
  }, [daily && daily.done, daily && daily.streak]);

  useEffect(() => {
    if (!showSearch) return;
    const q = searchQ.trim();
    if (q.length < 2) { setSearchRes([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try { setSearchRes(await suggestPlace(q)); } catch (e) {}
      setSearching(false);
    }, 150);
    return () => clearTimeout(t);
  }, [searchQ, showSearch]);


  const doSearch = async () => {
    const q = searchQ.trim();
    if (q.length < 2) return;
    setSearching(true);
    try {
      const r = await searchPlace(q);
      setSearchRes(r);
      if (r.length === 0) say('Topilmadi - boshqacha yozib koring', 'warn');
    } catch (e) {
      say('Internet yoʻq yoki qidiruv ishlamadi', 'err');
    }
    setSearching(false);
  };

  const goToPlace = async (pl) => {
    let dest = pl;
    if (pl.lat == null && pl.id) {
      try { dest = await placeDetails(pl.id); }
      catch (e) { say('Joy topilmadi', 'err'); return; }
    }
    pl = dest;
    setShowSearch(false);
    setSearchRes([]);
    setSearchQ('');
    followRef.current = false;
    setFollow(false);
    if (followTimerRef.current) clearTimeout(followTimerRef.current);
    if (camRef.current) {
      camRef.current.flyTo({ center: [pl.lon, pl.lat], zoom: 13.5, duration: 900 });
    }
    setTimeout(() => refreshRemote(), 1200);
  };

  useEffect(() => {
    if (!infoZone) return;
    const u = userRef.current;
    if (u && infoZone.user_id && infoZone.user_id !== u.user_id) {
      addView(infoZone.user_id, u.user_id, 'card');
    }
  }, [infoZone]);

  useEffect(() => {
    const load = () => {
      const u = userRef.current;
      if (u) fetchViews(u.user_id).then((d) => { if (d) setMyViews(d); }).catch(() => {});
    };
    const t = setTimeout(load, 3000);
    const id = setInterval(load, 20000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);

  useEffect(() => {
    if (tracking) { setShowHint(false); return; }
    if (zones.length > 0) { setShowHint(false); return; }
    const t = setTimeout(() => setShowHint(true), 2500);
    const t2 = setTimeout(() => setShowHint(false), 17500);
    return () => { clearTimeout(t); clearTimeout(t2); };
  }, [tracking, zones.length]);

  const delMyZones = () => {
    if (!zones.length) { say('Hali zona olmagansiz', 'warn'); return; }
    setShowDelZones(true);
  };

  const delOne = (z) => {
    const u = userRef.current;
    if (!u) return;
    Alert.alert(
      'Zonani oʻchirish',
      (z.area / 10000).toFixed(2) + ' gektar zona ochiriladi. Bu qaytarilmaydi.',
      [
        { text: 'Bekor', style: 'cancel' },
        { text: 'Ochirish', style: 'destructive', onPress: async () => {
          try {
            await deleteOneZone(u.user_id, z.id);
            setZones((old) => {
              const nz = old.filter((q) => q.id !== z.id);
              saveZones(nz);
              zonesCountRef.current = nz.length;
              if (nz.length === 0) setShowDelZones(false);
              return nz;
            });
            setMyZoneImgs((old) => old.filter((q) => q.id !== z.id));
            refreshRemote();
          } catch (e) {
            setZones([]);
        clearZones();
        setMyZoneImgs([]);
        say('Tozalandi', 'ok');
          }
        } },
      ]);
  };


  useEffect(() => {
    if (!tracking) return;
    let off = false;
    const id = setInterval(() => {
      Location.hasServicesEnabledAsync().then((on) => {
        if (!on && !off) {
          off = true;
          setWarn('Joylashuv (GPS) oʻchirilgan - sozlamalardan yoqing');
        } else if (on && off) {
          off = false;
          setWarn(null);
        }
      }).catch(() => {});
    }, 2000);
    return () => clearInterval(id);
  }, [tracking]);

  useEffect(() => {
    AsyncStorage.getItem('zona_queue').then((raw) => {
      if (raw) { try { queueRef.current = JSON.parse(raw) || []; } catch (e) {} }
    }).catch(() => {});

    let busy = false;
    const id = setInterval(async () => {
      if (busy) return;
      if (!queueRef.current.length) return;
      const u = userRef.current;
      if (!u) return;
      busy = true;
      const item = queueRef.current[0];
      try {
        await pushZone(u.user_id, item.loop, item.area, { duration: item.dur, mocked: !!item.mocked });
        queueRef.current = queueRef.current.filter((q) => q !== item);
        AsyncStorage.setItem('zona_queue', JSON.stringify(queueRef.current)).catch(() => {});
        say('Zona serverga yuborildi', 'ok');
        refreshRemote();
      } catch (e) {
        const m = String(e.message || '');
        if (m.indexOf('kichik') >= 0 || m.indexOf('Kam nuqta') >= 0) {
          queueRef.current = queueRef.current.filter((q) => q !== item);
          AsyncStorage.setItem('zona_queue', JSON.stringify(queueRef.current)).catch(() => {});
        }
      }
      busy = false;
    }, 20000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const loadT = () => {
      const u = userRef.current;
      if (u) fetchTasks(u.user_id).then((d) => { if (d && d.daily) setTasks(d); }).catch(() => {});
    };
    const t0 = setTimeout(loadT, 2000);
    const idT = setInterval(loadT, 30000);
    return () => { clearTimeout(t0); clearInterval(idT); };
  }, []);

  const loadBorders = () => {
    const u = userRef.current;
    if (!u) return;
    fetchBorders(u.user_id).then((d) => {
      setBdData(d);
      if (d && d.current) setMyBorder(d.current);
    }).catch(() => {});
  };

  const pickBorder = async (b) => {
    const u = userRef.current;
    if (!u) return;
    if (b.owned) {
      try {
        await setBorder(u.user_id, b.code);
        setBdData((d) => (d ? Object.assign({}, d, { current: b.code }) : d));
        setMyBorder(b.code);
        sfx('ready');
        say('Naqsh tanlandi', 'ok');
      } catch (e) { say('Saqlanmadi', 'err'); }
      return;
    }
    if (b.ad) {
      Alert.alert('Reklama', 'Bu naqsh hozircha ochiq - sinov davri', [
        { text: 'Bekor', style: 'cancel' },
        { text: 'Ochish', onPress: async () => {
          try {
            await unlockBorder(u.user_id, b.code);
            await setBorder(u.user_id, b.code);
            loadBorders();
            sfx('zona');
            say('Naqsh ochildi!', 'ok');
          } catch (e) { say('Xato', 'err'); }
        } },
      ]);
      return;
    }
    if (b.price) {
      say('Toʻlov tizimi tayyorlanmoqda. Telegram orqali yozing.', 'warn');
      return;
    }
    say('Bu naqsh yutuq bilan ochiladi', 'warn');
  };

  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      appActiveRef.current = st === 'active';
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    loadPending().then((l) => setPendCount(l.length)).catch(() => {});
    AsyncStorage.getItem('zona_skipped').then((raw) => {
      if (!raw) return;
      try {
        const arr = JSON.parse(raw) || [];
        const fresh = arr.filter((q) => Date.now() - (q.at || 0) < 6 * 3600 * 1000);
        if (fresh.length) { skippedRef.current = fresh; setSkipCount(fresh.length); }
      } catch (e) {}
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const id = setInterval(async () => {
      if (pendBusyRef.current) return;
      const u = userRef.current;
      if (!u) return;
      let list = [];
      try { list = await loadPending(); } catch (e) { return; }
      if (!list.length) { setPendCount(0); return; }
      pendBusyRef.current = true;
      const item = list[0];
      try {
        await pushZone(u.user_id, item.loop, item.area,
          { duration: item.dur, distance: item.dist, mocked: !!item.mocked });
        const n = await removePending(item.id);
        setPendCount(n);
        setOnline(true);
        say(n > 0 ? ('Zona yuborildi, yana ' + n + ' ta kutmoqda') : 'Barcha zonalar yuborildi', 'ok');
        refreshRemote();
      } catch (e) {
        const m = String(e.message || '');
        if (/Juda tez|Zona juda|Kam nuqta|Juda qisqa|kichik/.test(m)) {
          const n = await removePending(item.id);
          setPendCount(n);
        }
      }
      pendBusyRef.current = false;
    }, 12000);
    return () => clearInterval(id);
  }, []);

  const goToPlayer = async (p) => {
    if (!p || !p.user_id) return;
    try {
      const z = await fetchPlayerZone(p.user_id);
      if (z && z.lat != null) {
        const rM = Math.sqrt((z.area || 10000) / Math.PI);
        const worldM = 40075016 * Math.cos(z.lat * Math.PI / 180);
        let zf = Math.log2(worldM / (rM * 5.2));
        if (!isFinite(zf)) zf = 13;
        const zoomFit = Math.max(8, Math.min(16.5, zf));
        const dl = 360 / Math.pow(2, zoomFit);
        setShowBoard(false);
        setOpenRow(null);
        followRef.current = false;
        setFollow(false);
        setTimeout(() => {
          viewRef.current = { latitude: z.lat, longitude: z.lon, latitudeDelta: dl, longitudeDelta: dl };
          zoomRef.current = dl;
          if (camRef.current) {
            camRef.current.flyTo({ center: [z.lon, z.lat], zoom: zoomFit, duration: 1400 });
          }
          refreshRemote();
          addView(p.user_id, 'card').catch(() => {});
          setTimeout(() => refreshRemote(), 1700);
          setTimeout(() => refreshRemote(), 3200);
        }, 340);
        return;
      }
    } catch (e) {}
    say('Bu oʻyinchida zona yoʻq', 'warn');
  };

  useEffect(() => {
    if (!infoZone || !infoZone.user_id) { setCardPhotos([]); return; }
    fetchDailyPhotos(infoZone.user_id)
      .then((d) => setCardPhotos(d.photos || []))
      .catch(() => setCardPhotos([]));
  }, [infoZone && infoZone.user_id]);

  const bizOk = !plan || plan.plan === 'biz' || plan.plan === 'bizplus';
  const bizPlusOk = !plan || plan.plan === 'bizplus';

  const needPlan = (which) => {
    tap();
    say(which === 'plus' ? 'Biznes+ tarifi kerak' : 'Biznes tarifi kerak', 'warn');
    setTimeout(() => setShowPlans(true), 320);
  };

  useEffect(() => {
    if (meStats && meStats.verified && meStats.contact) {
      setSavedAcc(meStats.contact);
    }
  }, [meStats && meStats.verified, meStats && meStats.contact]);

  useEffect(() => { zonesRef.current = zones; }, [zones]);

  const RMAX = () => { const k = cfgRef.current || cfg; return (k && k.max_radius) || 900000; };
  const RMIN = () => { const k = cfgRef.current || cfg; return (k && k.min_radius) || 1500; };

  const FL = (key, def) => {
    const k = cfgRef.current || cfg;
    if (k && k.flags && typeof k.flags[key] === 'boolean') return k.flags[key];
    return def !== undefined ? def : true;
  };

  const TX = (key, def) => {
    const k = cfgRef.current || cfg;
    if (k && k.texts && k.texts[key]) return k.texts[key];
    return def;
  };

  const loadPlan = () => {
    const u = userRef.current;
    if (!u) return;
    fetchPlan(u.user_id).then(setPlan).catch(() => {});
  };

  const openPay = (planCode) => {
    const k = cfgRef.current || cfg || {};
    const mode = k.pay_mode || 'telegram';
    const nm = planCode === 'biz' ? 'Biznes' : 'Biznes+';
    const u = userRef.current;
    if (mode === 'web' && k.pay_url) {
      const url = k.pay_url
        + (k.pay_url.indexOf('?') >= 0 ? '&' : '?')
        + 'plan=' + encodeURIComponent(planCode)
        + '&user_id=' + encodeURIComponent(u ? u.user_id : '');
      Linking.openURL(url);
      return;
    }
    const tg = k.telegram || 'https://t.me/Xusniddin_uz';
    Linking.openURL(tg);
  };

  const doTrial = async (code) => {
    const u = userRef.current;
    if (!u) return;
    const nm = code === 'biz' ? 'Biznes' : 'Biznes+';
    try {
      const r = await startTrial(u.user_id, code);
      const np = await fetchPlan(u.user_id);
      if (np) setPlan(np);
      setWinInfo({ name: nm, days: r.days || 30, up: !!r.upgraded });
      setShowPlans(false);
      setTimeout(() => {
        setTrialWin(true);
        twScale.setValue(0);
        twGlow.setValue(0);
        Animated.spring(twScale, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
        Animated.loop(Animated.sequence([
          Animated.timing(twGlow, { toValue: 1, duration: 900, useNativeDriver: true }),
          Animated.timing(twGlow, { toValue: 0, duration: 900, useNativeDriver: true }),
        ])).start();
        sfx('zona');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }, 300);
      fetchMe(u.user_id).then(setMeStats).catch(() => {});
    } catch (e) {
      say(String(e.message || 'Xato'), 'err');
    }
  };

  const loadMyPhotos = () => {
    const u = userRef.current;
    if (!u) return;
    fetchDailyPhotos(u.user_id).then(setMyPhotos).catch(() => {});
  };

  const pickDailyPhoto = async () => {
    const u = userRef.current;
    if (!u) return;
    if (myPhotos.left_today <= 0) { say('Bugungi limit tugadi', 'warn'); return; }
    let perm;
    try { perm = await ImagePicker.requestMediaLibraryPermissionsAsync(); } catch (e) { return; }
    if (!perm.granted) { say('Galereyaga ruxsat bering', 'warn'); return; }
    let res;
    try {
      res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true, aspect: [1, 1], quality: 0.85,
      });
    } catch (e) { say('Rasm tanlanmadi', 'err'); return; }
    if (!res || res.canceled) return;
    setPhotoBusy(true);
    try {
      const r = await uploadDailyPhoto(u.user_id, res.assets[0].uri, '');
      say(r.left_today > 0 ? ('Yuklandi - bugun yana ' + r.left_today + ' ta mumkin') : 'Yuklandi', 'ok');
      loadMyPhotos();
    } catch (e) {
      say(String(e.message || 'Yuklanmadi'), 'err');
    }
    setPhotoBusy(false);
  };

  const removeDailyPhoto = (url) => {
    const u = userRef.current;
    if (!u) return;
    Alert.alert('Rasmni ochirish', 'Ishonchingiz komilmi?', [
      { text: 'Bekor', style: 'cancel' },
      { text: 'Ochirish', style: 'destructive', onPress: async () => {
        try { await deleteDailyPhoto(u.user_id, url); loadMyPhotos(); say('Ochirildi', 'ok'); }
        catch (e) { say('Ochirilmadi', 'err'); }
      } },
    ]);
  };

  useEffect(() => {
    const onBack = () => {
      if (menuOpen) { closeMenu(); return true; }
      if (showBoard) { setShowBoard(false); return true; }
      if (showPrem) { closePrem(); return true; }
      if (showPlans) { setShowPlans(false); return true; }
      if (showPhotos) { setShowPhotos(false); return true; }
      if (showTasks) { setShowTasks(false); return true; }
      if (showBorders) { setShowBorders(false); return true; }
      if (mustAuth) return true;
      if (showLogin) { setShowLogin(false); return true; }
      if (showAcc) { setShowAcc(false); return true; }
      if (infoPage) { setInfoPage(null); return true; }
      if (showDelZones) { setShowDelZones(false); return true; }
      if (showSfx) { setShowSfx(false); return true; }
      if (showSearch) { setShowSearch(false); return true; }
      if (showAdmin) { setShowAdmin(false); return true; }
      if (updInfo && !updInfo.force) { setUpdInfo(null); return true; }
      if (updInfo && updInfo.force) return true;
      if (needNick) { setNeedNick(false); setTimeout(() => setAskAuth(true), 250); return true; }
      if (askAuth) return true;
      if (bigPhoto) { setBigPhoto(null); return true; }
      if (infoZone) { setInfoZone(null); return true; }
      if (trialWin) { setTrialWin(false); return true; }

      const now = Date.now();
      if (now - backPressRef.current < 2000) return false;
      backPressRef.current = now;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      say('Chiqish uchun yana bir marta bosing', 'warn');
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [menuOpen, showBoard, showPrem, showPlans, showPhotos, showTasks, showBorders, showLogin, showAcc, needNick, askAuth, mustAuth, infoPage, showDelZones, showSfx, showSearch, showAdmin, updInfo, bigPhoto, infoZone, trialWin]);

  const doLogout = () => {
    Alert.alert(
      'Hisobdan chiqish',
      'Zonalaringiz va sozlamalaringiz serverda saqlanadi. Qayta kirsangiz hammasi joyida boladi.',
      [
        { text: 'Bekor', style: 'cancel' },
        { text: 'Chiqish', style: 'destructive', onPress: async () => {
          try {
            await AsyncStorage.multiRemove(['zona_user', 'zona_device_id', 'zona_zones_v1', 'zona_track_v1']);
          } catch (e) {}
          setSavedAcc(null);
          setMeStats(null);
          setZones([]);
          setRemoteZones([]);
          userRef.current = null;
          setUser(null);
          setMyId(null);
          setPlan(null);
          closeMenu(() => setShowLogin(true));
        } },
      ]
    );
  };

  const bdCount = bdData ? (bdData.borders || []).filter(function (b) { return b.owned; }).length : 0;
  const bdTotal = bdData ? (bdData.borders || []).length : 0;

  const renderCell = (x, ix) => {
    const sc = new Animated.Value(1);
    return (
      <Animated.View key={ix} style={{ width: '48.5%', transform: [{ scale: sc }] }}>
        <TouchableOpacity activeOpacity={0.92}
          onPressIn={() => Animated.spring(sc, { toValue: 0.955, useNativeDriver: true, speed: 40 }).start()}
          onPressOut={() => Animated.spring(sc, { toValue: 1, useNativeDriver: true, speed: 40 }).start()}
          onPress={() => { tap(); x[3](); }}
          style={{
            borderRadius: 18, paddingVertical: 17, paddingHorizontal: 12,
            alignItems: 'center', marginBottom: 9,
            backgroundColor: alpha(x[2], isDark ? 0.14 : 0.10),
          }}>
          <View style={{
            width: 42, height: 42, borderRadius: 15,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: alpha(x[2], isDark ? 0.20 : 0.16),
          }}>
            <Text style={{ fontSize: 19 }}>{x[0]}</Text>
          </View>
          <Text style={{ color: c.textMain, fontSize: 12.5, fontWeight: '700', marginTop: 10 }} numberOfLines={1}>
            {x[1]}
          </Text>
          {x[4] ? (
            <Text style={{ color: x[2], fontSize: 11, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>
              {x[4]}
            </Text>
          ) : (
            <View style={{ height: 3, width: 18, borderRadius: 2, backgroundColor: x[2], marginTop: 8, opacity: 0.8 }} />
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const menuPan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dy) > 6 && Math.abs(g.dx) < 40,
      onPanResponderMove: (e, g) => {
        const base = menuHRef.current;
        const next = Math.max(0, Math.min(1, base - g.dy / 320));
        menuH.setValue(next);
      },
      onPanResponderRelease: (e, g) => {
        const base = menuHRef.current;
        let next = Math.max(0, Math.min(1, base - g.dy / 320));
        if (g.vy < -0.4) next = 1;
        else if (g.vy > 0.4) next = 0;
        else next = next > 0.5 ? 1 : 0;
        menuHRef.current = next;
        Animated.spring(menuH, { toValue: next, friction: 12, tension: 70, useNativeDriver: true }).start();
      },
    })
  ).current;

  const openMenu = () => {
    menuH.setValue(0);
    menuHRef.current = 0;
    setMenuOpen(true);
    Animated.parallel([
      Animated.spring(drawerAnim, { toValue: 0, friction: 11, tension: 62, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };
 
  const closeMenu = (after) => {
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: 900, duration: 240, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      setMenuOpen(false);
      if (after) after();
    });
  };
  const refreshRemote = async () => {
    try {
      if (mapRef.current && mapRef.current.getBounds && mapRef.current.getCenter) {
        const b = await mapRef.current.getBounds();
        const ctr = await mapRef.current.getCenter();
        if (b && ctr) {
          const ne = b.ne || b[0];
          const sw = b.sw || b[1];
          const neLat = (ne && ne[1] !== undefined) ? ne[1] : (ne ? ne.latitude : 0);
          const swLat = (sw && sw[1] !== undefined) ? sw[1] : (sw ? sw.latitude : 0);
          const dLat = Math.abs(neLat - swLat);
          const cLat = (ctr[1] !== undefined) ? ctr[1] : ctr.latitude;
          const cLon = (ctr[0] !== undefined) ? ctr[0] : ctr.longitude;
          if (dLat > 0 && cLat) {
            viewRef.current = { latitude: cLat, longitude: cLon, latitudeDelta: dLat, longitudeDelta: dLat };
            zoomRef.current = dLat;
          }
        }
      }
    } catch (e) {}
    const v = viewRef.current;
    const loc = locRef.current;
    const center = v ? { latitude: v.latitude, longitude: v.longitude } : loc;
    if (!center) return;
    const zd = zoomRef.current || 0;
    const rad = zd > 0
      ? Math.max(Math.min(zd * 111000 * 1.4, RMAX()), RMIN())
      : (v ? Math.max(Math.min(v.latitudeDelta * 111000 * 1.3, RMAX()), RMIN()) : 5000);
    try {
      const list = await fetchZones(center.latitude, center.longitude, rad);
      const mine = userRef.current ? userRef.current.user_id : null;
      setRemoteZones(list.filter((z) => z.user_id !== mine));
      const my = list.filter((z) => z.user_id === mine);
      if (my.length === 0) {
        setZones((old) => {
          if (old && old.length > 0) { clearZones(); setMyZoneImgs([]); }
          return [];
        });
      }
      const atHome = !v || (loc && Math.abs(center.latitude - loc.latitude) < 0.03 && Math.abs(center.longitude - loc.longitude) < 0.03);
      if (atHome) {
        const myHa = my.reduce((t, q) => t + (q.area || 0), 0);
        const oldHa = myHaRef.current || 0;
        const justSaved = Date.now() - (lastZoneAtRef.current || 0) < 60000;
        if (!justSaved && oldHa > 0 && myHa > 0 && myHa < oldHa * 0.80 && (oldHa - myHa) > 2000) {
          sfx('lost');
          Alert.alert('Zonangiz qoʻlga oʻtdi', 'Kimdir zonangizni bosib oldi');
        }
        if (my.length > 0) {
          zonesCountRef.current = my.length;
          myHaRef.current = myHa;
        }
      }
      setMyZoneImgs(my.filter((z) => z.img && z.img_bounds));
      if (atHome && my.length > 0) {
        const mapped = my.map((z) => ({ id: z.id, coords: z.coords, area: z.area }));
        setZones(mapped);
        saveZones(mapped);
      } else if (!atHome && my.length > 0) {
        setZones((old) => {
          const ids = new Set(old.map((o) => o.id));
          const add = my.filter((z) => !ids.has(z.id))
            .map((z) => ({ id: z.id, coords: z.coords, area: z.area }));
          return add.length ? [...old, ...add] : old;
        });
      }
      setOnline(true);
    } catch (e) {
      setOnline(false);
      if (trackingRef.current) setWarn('Internet yoʻq - karta yangilanmayapti');
    }
  };
 
  useEffect(() => {
    const id = setInterval(refreshRemote, 15000);
    const t = setTimeout(refreshRemote, 3000);
    return () => { clearInterval(id); clearTimeout(t); };
  }, []);
 
  const openBoard = async () => {
    setShowBoard(true);
    setBoardLoading(true);
    try {
      const top = await fetchLeaderboard();
      setBoard(top);
      fetchWalkBoard(50).then(setWalkBoard).catch(() => {});
      const lc = locRef.current;
      if (lc) {
        try { setNearBoard(await fetchNearby(lc.latitude, lc.longitude, 30000)); } catch (e) {}
        try { setWeekBoard(await fetchWeekly(lc.latitude, lc.longitude)); } catch (e) {}
      }
      const uu = userRef.current;
      if (uu) {
        try { setMyStats(await fetchStats(uu.user_id)); } catch (e) {}
        try { setMyViews(await fetchViews(uu.user_id)); } catch (e) {}
      }
      const u = userRef.current;
      if (u) {
        const m = await fetchMe(u.user_id);
        setMeStats(m);
        setNameInput(m.name);
      }
    } catch (e) {
      setOnline(false);
    }
    setBoardLoading(false);
  };
 
  const loadAdmin = async (k) => {
    const key = (k || adminKey).trim();
    if (!key) return;
    setAdminLoading(true);
    try {
      const d = await fetchAdmin(key);
      setAdminData(d);
      setAdminKey(key);
      AsyncStorage.setItem('zona_admin_key', key).catch(() => {});
    } catch (e) {
      say('Kalit notoʻgʻri', 'err');
    }
    setAdminLoading(false);
  };

  const openAdmin = async () => {
    setShowAdmin(true);
    try {
      const saved = await AsyncStorage.getItem('zona_admin_key');
      if (saved) { setAdminKey(saved); loadAdmin(saved); }
    } catch (e) {}
  };

  const saveNick = async () => {
    const u = userRef.current;
    if (!u) return;
    const nm = nick.trim();
    if (nm.length < 3) { setNickState('Kamida 3 ta belgi'); return; }
    if (!/^[A-Za-z0-9_]+$/.test(nm)) { setNickState('Faqat harf, raqam va pastki chiziq'); return; }
    setSavingNick(true);
    setNickState('Tekshirilmoqda...');
    try {
      let free = true;
      try { free = await checkName(nm); }
      catch (x) { setNickState('Internet yoʻq - tekshirib boʻlmadi'); setSavingNick(false); return; }
      if (!free) { setNickState('Bu nik band'); setSavingNick(false); return; }
      await setName(u.user_id, nm);
      const m = await fetchMe(u.user_id);
      setMeStats(m);
      setNeedNick(false);
      setNickState('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setNickState(String(e.message || 'Internet yoʻq - qayta urining'));
    }
    setSavingNick(false);
  };

  const saveName = async () => {
    const u = userRef.current;
    if (!u) return;
    const nm = nameInput.trim();
    if (nm.length < 2) {
      say('Kamida 2 ta harf yozing', 'warn');
      return;
    }
    try {
      await setName(u.user_id, nm);
      setEditName(false);
      openBoard();
    } catch (e) {
      say('Ism saqlanmadi - internetni tekshiring', 'err');
    }
  };
 
  const pickAvatar = async () => {
    const u = userRef.current;
    if (!u) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      say('Galereyaga ruxsat bering', 'warn');
      return;
    }
    let res;
    try {
      res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
      });
    } catch (e) { say('Rasm tanlanmadi', 'err'); return; }
    if (!res || res.canceled) return;
 
    setUploading(true);
    try {
      await uploadAvatar(u.user_id, res.assets[0].uri);
      say('Rasm yuborildi - tekshiruvdan oʻtgach koʻrinadi', 'ok');
      openBoard();
    } catch (e) {
      Alert.alert('Rasm yuklanmadi', 'Internet bor-yoʻqligini tekshiring yoki kichikroq rasm tanlang.');
    }
    setUploading(false);
  };
 
  const pickLogo = async () => {
    const u = userRef.current;
    if (!u) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { say('Galereyaga ruxsat bering', 'warn'); return; }
    let res;
    try {
      res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.9,
      });
    } catch (e) { say('Rasm tanlanmadi', 'err'); return; }
    if (!res || res.canceled) return;
    setUploading(true);
    try {
      await uploadLogo(u.user_id, res.assets[0].uri);
      say('Logo qoʻyildi', 'ok');
      const m = await fetchMe(u.user_id);
      setMeStats(m);
    } catch (e) { Alert.alert('Logo yuklanmadi', 'Internet bor-yoʻqligini tekshiring yoki kichikroq rasm tanlang.'); }
    setUploading(false);
  };

  const pickBanner = async () => {
    const u = userRef.current;
    if (!u) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { say('Galereyaga ruxsat bering', 'warn'); return; }
    let res;
    try {
      res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.9,
      });
    } catch (e) { say('Rasm tanlanmadi', 'err'); return; }
    if (!res || res.canceled) return;
    setUploading(true);
    try {
      await uploadBanner(u.user_id, res.assets[0].uri);
      const m = await fetchMe(u.user_id);
      setMeStats(m);
      refreshRemote();
      say('Banner qoʻyildi', 'ok');
    } catch (e) { Alert.alert('Banner yuklanmadi', 'Internet bor-yoʻqligini tekshiring yoki kichikroq rasm tanlang.'); }
    setUploading(false);
  };

  const openPremium = async () => {
    if (!meStats) return;
    loadMyPhotos();
    loadPlan();
    setPfDirty(false);
    setPf({
      zone_name: meStats.zone_name || '',
      zone_color: meStats.zone_color || '',
      phone: meStats.phone || '',
      instagram: meStats.instagram || '',
      address: meStats.address || '',
      work_hours: meStats.work_hours || '',
      promo: meStats.promo || '',
      logo_color: meStats.logo_color || '',
    });
    setShowPrem(true);
    try { setColors(await fetchColors()); } catch (e) {}
  };
 
  const upd = (patch) => { setPfDirty(true); setPf(function (p) { return Object.assign({}, p, patch); }); };

  const closePrem = () => {
    if (!pfDirty) { setShowPrem(false); return; }
    Alert.alert('Saqlanmagan oʻzgarish', 'Oʻzgarishlar saqlanmadi. Chiqasizmi?', [
      { text: 'Qolish', style: 'cancel' },
      { text: 'Chiqish', style: 'destructive', onPress: () => { setPfDirty(false); setShowPrem(false); } },
    ]);
  };

  const savePremium = async () => {
    const u = userRef.current;
    if (!u) return;
    setSavingPf(true);
    try {
      await updateProfile(u.user_id, pf);
      const m = await fetchMe(u.user_id);
      setMeStats(m);
      setShowPrem(false);
      refreshRemote();
    } catch (e) {
      say('Saqlanmadi - internetni tekshiring', 'err');
    }
    setSavingPf(false);
  };
 
  const showToast = (text) => {
    setToast(text);
    toastAnim.setValue(0);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      Animated.delay(2200),
      Animated.timing(toastAnim, { toValue: 0, duration: 350, useNativeDriver: true }),
    ]).start(() => setToast(null));
  };
 
  const processPoint = (lat, lon, accuracy, timestamp, skipLoop) => {
    if (!trackingRef.current) return false;
    if (accuracy && accuracy > 25) {
      if (trackingRef.current && !warnRef.current) {
        warnRef.current = true;
        setWarn('GPS signali kuchsiz (' + Math.round(accuracy) + ' m) - ochiq joyga chiqing');
      }
      return false;
    }
    if (trackingRef.current && warnRef.current) {
      warnRef.current = false;
      setWarn((w) => (w && w.indexOf('GPS signali') === 0) ? null : w);
    }
 
    const pt = { latitude: lat, longitude: lon };
    const prev = lastPointRef.current;
 
    if (!prev) {
      lastPointRef.current = { ...pt, t: timestamp };
      pathRef.current = [pt];
      return true;
    }
 
    const d = distanceM(prev, pt);
    const dt = Math.max((timestamp - prev.t) / 1000, 0.5);
    /* chiziq uchun kichik qadam - silliq chizilsin */
    const needPath = Math.max(MIN_STEP_M, (accuracy || 8) * 0.3);
    if (d < needPath) return false;
    if (d / dt > 70) return false;
 
    lastMoveRef.current = Date.now();
    lastPointRef.current = { ...pt, t: timestamp };
    /* masofa: oxirgi 9 nuqta ortachasi - GPS tebranishi bekor boladi */
    const K = 9;
    distBuf.current.push(pt);
    if (distBuf.current.length > K) distBuf.current.shift();
    if (distBuf.current.length >= K) {
      let sla = 0, slo = 0;
      for (const q of distBuf.current) { sla += q.latitude; slo += q.longitude; }
      const avg = { latitude: sla / K, longitude: slo / K };
      if (!distRefPt.current) distRefPt.current = avg;
      else {
        const dd = distanceM(distRefPt.current, avg);
        if (dd >= Math.max(10, (accuracy || 8) * 0.5)) {
          distRef.current += dd;
          distRefPt.current = avg;
        }
      }
    }

    pathRef.current.push(pt);
 
    if (skipLoop) return true;
    let res = findLoop(pathRef.current);
    if (!res) res = findZoneTouch(pathRef.current, zonesRef.current || []);
    if (res) {
      const smooth = smoothPolygon(res.loop, 3.5);
      const area = polygonAreaM2(smooth);
      if (area >= MIN_AREA_M2) {
        const prev = pendingRef.current;
        const dArea = dismissedAreaRef.current || 0;
        const okShow = !prev ? (dismissedRef.current === 0 || area > dArea * 1.6) : area > prev.area * 1.2;
        if (okShow) {
          pendingRef.current = { loop: smooth, area: area, point: res.point, cutIndex: res.cutIndex, small: !!res.small, perim: res.perim || 0 };
          setPending({ area: area, small: !!res.small, perim: res.perim || 0 });
          sfx('ready');
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
        }
      }
    }
    return true;
  };
 
  useEffect(() => {
    if (pending) {
      pendAnim.setValue(0);
      Animated.spring(pendAnim, { toValue: 1, friction: 7, tension: 55, useNativeDriver: true }).start();
      Animated.loop(Animated.sequence([
        Animated.timing(pendGlow, { toValue: 1, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pendGlow, { toValue: 0, duration: 1100, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])).start();
    } else {
      pendGlow.stopAnimation();
      pendGlow.setValue(0);
    }
  }, [pending]);

  const confirmZone = () => {
    const p = pendingRef.current;
    if (!p || sendingRef.current) return;
    sendingRef.current = true;
    setTimeout(() => { sendingRef.current = false; }, 25000);
    const u = userRef.current;
    const ha = p.area / 10000;
    const newId = Date.now();

    setZones((z) => {
      const nz = [...z, { id: newId, coords: p.loop, area: p.area }];
      saveZones(nz);
      return nz;
    });
    setCelebrate({ ha: ha, cap: 0 });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (!u) {
      /* hisob yoq - zona yoqolmasin, navbatga tushsin */
      const base0 = zoneStartRef.current || startTimeRef.current;
      const dur0 = Math.max(Math.round((Date.now() - base0) / 1000), 1);
      addPending({ id: newId, loop: p.loop, area: p.area, dur: dur0,
        dist: distRef.current || 0, mocked: !!mockedRef.current, at: Date.now() })
        .then((n) => setPendCount(n)).catch(() => {});
      sendingRef.current = false;
      setTimeout(() => say('Zona saqlandi - hisobga kiring', 'warn'), 500);
    }
    if (u) {
      const base = zoneStartRef.current || startTimeRef.current;
      const dur = Math.max(Math.round((Date.now() - base) / 1000), 1);
            sfx(p.area >= 100000 ? 'zona_big' : 'zona');
            setTimeout(() => {
              const uu2 = userRef.current;
              if (uu2) fetchDaily(uu2.user_id).then((d2) => {
                setDaily((old2) => {
                  if (d2 && d2.complete && old2 && !old2.complete) setTimeout(() => sfx('daily'), 300);
                  return d2;
                });
              }).catch(() => {});
            }, p.area >= 100000 ? 9200 : 4500);
      zoneStartRef.current = Date.now();
      pushZone(u.user_id, p.loop, p.area, { duration: dur, distance: distRef.current || 0, mocked: mockedRef.current })
        .then((r) => {
          sendingRef.current = false;
          setOnline(true);
          setTimeout(() => refreshRemote(), 700);
          setTimeout(() => refreshRemote(), 2500);
          setTimeout(() => refreshRemote(), 6000);
          if (r && r.captured > 0) {
            const ha2 = (r.captured_area / 10000).toFixed(2);
            const who = (r.captured_from || []).join(', ');
            setTimeout(() => {
              Alert.alert('Hudud tortib olindi!', ha2 + ' gektar sizga oʻtdi. Kimdan: ' + who);
            }, 600);
          }
        })
        .catch((err) => {
          sendingRef.current = false;
          setOnline(false);
          const hard = /Juda tez|Zona juda|Kam nuqta|Juda qisqa|kichik/.test(String(err.message || ''));
          if (hard) {
            setZones((z) => {
              const nz = z.filter((q) => q.id !== newId);
              saveZones(nz);
              return nz;
            });
            setTimeout(() => say(String(err.message), 'err'), 400);
          } else {
            addPending({ id: newId, loop: p.loop, area: p.area, dur: dur, dist: distRef.current || 0, mocked: !!mockedRef.current, at: Date.now() })
              .then((n) => setPendCount(n)).catch(() => {});
            say('Internet yoʻq - zona saqlandi, keyin yuboriladi', 'warn');
          }
        });
    }

    lastZoneAtRef.current = Date.now();
    const lastPt = pathRef.current[pathRef.current.length - 1];
    const cutAt = (p.cutIndex != null && p.cutIndex >= 0) ? p.cutIndex : 0;
    const tail = pathRef.current.slice(cutAt);
    resetLoopCache();
    /* fon buferi tozalanmasa eski nuqtalar togri chiziq chizadi */
    try { clearBuffer(); } catch (e) {}
    try { clearBgBuffer(); } catch (e) {}
    readIndexRef.current = 0;
    distBuf.current = [];
    distRefPt.current = null;
    pathRef.current = lastPt ? [lastPt] : [];
    pendingRef.current = null;
    setPending(null);
    setPath(smoothPath(pathRef.current));
  };

  const takeSkipped = (list) => {
    if (!list || !list.length) return;
    const u = userRef.current;
    setShowSkipped(false);
    let sent = 0;
    list.forEach(function (z, ix) {
      setTimeout(function () {
        const nid = Date.now() + ix;
        setZones((old) => {
          const nz = [...old, { id: nid, coords: z.loop, area: z.area }];
          saveZones(nz);
          return nz;
        });
        const dur = Math.max(Math.round((Date.now() - (z.at || Date.now() - 600000)) / 1000), 120);
        if (u) {
          pushZone(u.user_id, z.loop, z.area, { duration: dur, distance: 0, mocked: false })
            .then(() => { sent++; setTimeout(() => refreshRemote(), 600); })
            .catch(() => {
              addPending({ id: nid, loop: z.loop, area: z.area, dur: dur, dist: 0, mocked: false, at: Date.now() })
                .then((n) => setPendCount(n)).catch(() => {});
            });
        } else {
          addPending({ id: nid, loop: z.loop, area: z.area, dur: dur, dist: 0, mocked: false, at: Date.now() })
            .then((n) => setPendCount(n)).catch(() => {});
        }
      }, ix * 7000);
    });
    skippedRef.current = [];
    setSkipCount(0);
    sfx('zona');
    say(list.length > 1 ? (list.length + ' ta zona olinmoqda...') : 'Zona olinmoqda...', 'ok');
  };

  const dismissZone = () => {
    const pz = pendingRef.current;
    if (pz && pz.loop && pz.area >= MIN_AREA_M2) {
      const dup = skippedRef.current.some((q) => Math.abs(q.area - pz.area) < pz.area * 0.05);
      if (!dup) {
        skippedRef.current = [...skippedRef.current, { loop: pz.loop, area: pz.area, at: Date.now() }].slice(-8);
        setSkipCount(skippedRef.current.length);
        AsyncStorage.setItem('zona_skipped', JSON.stringify(skippedRef.current)).catch(() => {});
      }
    }
    dismissedAreaRef.current = pendingRef.current ? pendingRef.current.area : 0;
    pendingRef.current = null;
    setPending(null);
    dismissedRef.current = Date.now();
  };

  const flush = () => {
    const pp = pathRef.current;
    setPath(smoothPath(pp));
    setDistance(distRef.current);
    const nw = Date.now();
    const svGap = pathRef.current.length > 4000 ? 30000 : pathRef.current.length > 1500 ? 16000 : 8000;
    if (trackingRef.current && pathRef.current.length > 1 && nw - lastSaveRef.current > svGap) {
      lastSaveRef.current = nw;
      saveTrack({ path: pathRef.current, dist: distRef.current,
        sec: secRef.current, start: startTimeRef.current, at: nw });
    }
    const lastPt = pathRef.current[pathRef.current.length - 1];
    if (mapRef.current && lastPt) {
      const nowc = Date.now();
      if (followRef.current && nowc - lastCamRef.current > 2000) {
        lastCamRef.current = nowc;
        const n2 = pathRef.current.length;
        let hd = headRef.current;
        if (n2 >= 2) {
          const p1 = pathRef.current[n2 - 2];
          const p2 = pathRef.current[n2 - 1];
          const dy = p2.latitude - p1.latitude;
          const dx = (p2.longitude - p1.longitude) * Math.cos(p2.latitude * Math.PI / 180);
          if (Math.abs(dy) > 1e-7 || Math.abs(dx) > 1e-7) {
            let deg = Math.atan2(dx, dy) * 180 / Math.PI;
            if (deg < 0) deg += 360;
            let diff = deg - hd;
            while (diff > 180) diff -= 360;
            while (diff < -180) diff += 360;
            hd = hd + diff * 0.45;
            if (hd < 0) hd += 360;
            if (hd >= 360) hd -= 360;
            headRef.current = hd;
          }
        }
        const sp = speedRef.current || 0;
        const zm = sp > 11 ? 15.5 : sp > 4 ? 16.8 : 17.6;
        setCamHead(hd);
        if (camRef.current) camRef.current.easeTo({ center: [lastPt.longitude, lastPt.latitude], bearing: hd, zoom: zm, pitch: is3D ? 60 : 0, duration: 900 });
      }
    }
  };
 
  useEffect(() => {
    let sub = null;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setError('Joylashuvga ruxsat berilmadi.' + String.fromCharCode(10) + String.fromCharCode(10) + 'Sozlamalar - Ilovalar - Zona - Ruxsatlar - Joylashuv boliminan ruxsat bering, keyin ilovani qayta oching.');
          return;
        }
        const last = await Location.getLastKnownPositionAsync();
        if (last) { setLocation(last.coords); locRef.current = last.coords; }
 
        sub = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.BestForNavigation, timeInterval: 300, distanceInterval: 0 },
          (pos) => {
            setLocation(pos.coords);
            locRef.current = pos.coords;
            if (pos.coords.speed != null && pos.coords.speed >= 0) { speedRef.current = pos.coords.speed; setSpeed(pos.coords.speed); }
            if (pos.mocked) mockedRef.current = true;
            if (false) {
              const nc = Date.now();
              if (nc - lastCamRef.current > 3000) {
                lastCamRef.current = nc;
                if (camRef.current) camRef.current.easeTo({ center: [pos.coords.longitude, pos.coords.latitude], bearing: 0, pitch: is3D ? 60 : 0, duration: 900 });
              }
            }
            if (bgBusyRef.current) {
              liveQRef.current.push({
                latitude: pos.coords.latitude, longitude: pos.coords.longitude,
                accuracy: pos.coords.accuracy, timestamp: pos.timestamp,
              });
            } else {
              const ok = processPoint(
                pos.coords.latitude, pos.coords.longitude,
                pos.coords.accuracy, pos.timestamp
              );
              if (ok) flush();
            }
          }
        );
      } catch (e) {
        setError('Xato: ' + e.message);
      }
    })();
    return () => { if (sub) sub.remove(); };
  }, []);
 
  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(async () => {
      let fresh = [];
      if (pendBgRef.current && pendBgRef.current.length > 0) {
        fresh = pendBgRef.current.slice(0, 1500);
        pendBgRef.current = pendBgRef.current.slice(1500);
      }
      const buf = getBuffer();
      if (fresh.length === 0 && buf.length > readIndexRef.current) {
        fresh = buf.slice(readIndexRef.current);
        readIndexRef.current = buf.length;
      }
      if (fresh.length === 0) {
        try {
          const disk = await loadBgBuffer();
          if (disk.length > 0) {
            const lastT = lastPointRef.current ? (lastPointRef.current.t || 0) : 0;
            fresh = lastT > 0 ? disk.filter((p) => p.timestamp > lastT + 500) : disk;
            if (fresh.length > 0) await clearBgBuffer();
          }
        } catch (e) {}
      }
      if (fresh.length === 0) {
        if (bgBusyRef.current) {
          bgBusyRef.current = false;
          const q = liveQRef.current;
          liveQRef.current = [];
          let ch = false;
          for (const p of q) {
            if (processPoint(p.latitude, p.longitude, p.accuracy, p.timestamp)) ch = true;
          }
          if (ch) flush();
        }
        return;
      }
      bgBusyRef.current = true;
      fresh.sort((a, b) => a.timestamp - b.timestamp);

      if (fresh.length > 1500) {
        pendBgRef.current = fresh.slice(1500).concat(pendBgRef.current || []);
        fresh = fresh.slice(0, 1500);
      }
      let changed = false;
      for (let k = 0; k < fresh.length; k++) {
        const p = fresh[k];
        const last = (k === fresh.length - 1);
        if (processPoint(p.latitude, p.longitude, p.accuracy, p.timestamp, !last)) changed = true;
      }
      if (changed) flush();
    }, 1200);
    return () => clearInterval(id);
  }, [tracking]);
 
  useEffect(() => {
    if (!tracking) return;
    const id = setInterval(() => setSeconds((s) => { secRef.current = s + 1; return s + 1; }), 1000);
    return () => clearInterval(id);
  }, [tracking]);
 
  const startTracking = async (resume) => {
    try {
      const on = await Location.hasServicesEnabledAsync();
      if (!on) {
        Alert.alert('Joylashuv oʻchirilgan', 'Telefon sozlamalaridan joylashuvni (GPS) yoqing va qayta urining.');
        return;
      }
    } catch (e) {}
    let fg;
    try { fg = await Location.requestForegroundPermissionsAsync(); }
    catch (e) { setWarn('Joylashuv ruxsatini olib boʻlmadi'); return; }
    if (fg.status !== 'granted') {
      Alert.alert('Joylashuv ruxsati kerak', 'Zona ishlashi uchun joylashuv kerak. Sozlamalar - Ilovalar - Zona - Ruxsatlar - Joylashuv.');
      return;
    }
    let bg = { status: 'denied' };
    try { bg = await Location.requestBackgroundPermissionsAsync(); } catch (e) {}
    if (bg.status !== 'granted') {
      Alert.alert('Fon rejimi', 'Sozlamalarda "Har doim ruxsat berish" ni tanlang');
      setWarn('Fon rejimi yoʻq - ekranni oʻchirmang');
    }
    try {
      const lvl = await Battery.getBatteryLevelAsync();
      const saver = await Battery.isLowPowerModeEnabledAsync();
      if (saver) setWarn(TX('battery', 'Batareya tejash yoqilgan - GPS uzilishi mumkin'));
      else if (lvl > 0 && lvl < 0.15) setWarn('Batareya ' + Math.round(lvl * 100) + '% - quvvat oling');
    } catch (e) {}
 
    if (!resume) {
      clearBuffer();
      clearBgBuffer();
      readIndexRef.current = 0;
      lastPointRef.current = null;
      distRef.current = 0;
      distRefPt.current = null;
      distBuf.current = [];
    }
    if (!resume) {
      resetLoopCache();
      pathRef.current = [];
      setPath([]);
      setDistance(0);
      setSeconds(0);
    }
 
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 800,
      distanceInterval: 1,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Zona yozmoqda',
          notificationBody: 'Yurgan yoʻlingiz kartada chizilmoqda',
        notificationColor: '#00E5A0',
        killServiceOnDestroy: false,
      },
      pausesUpdatesAutomatically: false,
      });
    } catch (e) {
      setWarn(TX('start_fail', 'Yozuvni boshlab boʻlmadi - GPS sozlamalarini tekshiring'));
      sfx('lost');
      return;
    }
 
    if (!locRef.current) setWarn(TX('gps_wait', 'GPS hali topilmadi - biroz kuting'));
    else {
      setWarn(TX('pocket', 'Telefonni choʻntakka soling - yoʻlingiz yozilaveradi. Vaqti-vaqti bilan ilovaga qarab turing.'));
      setTimeout(() => setWarn((w) => (w && w.indexOf('Telefonni choʻntakka') === 0) ? null : w), 8000);
    }
    startTimeRef.current = Date.now();
    zoneStartRef.current = Date.now();
    lastMoveRef.current = Date.now();
    mockedRef.current = false;
    trackingRef.current = true;
    setTracking(true);
  };
 
  const stopTracking = async () => {
    trackingRef.current = false;
    try {
      const started = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK);
      if (started) await Location.stopLocationUpdatesAsync(LOCATION_TASK);
    } catch (e) {
      console.log('Stop xatosi:', e.message);
    }
    clearBuffer();
    clearBgBuffer();
    readIndexRef.current = 0;
    pendingRef.current = null;
    setPending(null);
    dismissedRef.current = 0;
    lastMoveRef.current = 0;
    setWarn(null);
    setTracking(false);
    if (skippedRef.current.length > 0) {
      setTimeout(() => setShowSkipped(true), 400);
    }
    /* yol ochirilmaydi - keyin davom ettirish mumkin */
    if (pathRef.current.length > 1) {
      saveTrack({ path: pathRef.current, dist: distRef.current,
        sec: secRef.current, start: startTimeRef.current, at: Date.now() });
      setTimeout(() => say(TX('saved', 'Yoʻlingiz saqlandi - START bosib davom eting'), 'ok'), 500);
    } else {
      clearTrack();
    }
    refreshRemote();
  };
 
  const toggleTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (tracking && pendingRef.current) {
      const hh = (pendingRef.current.area / 10000).toFixed(2);
      Alert.alert('Tayyor zona bor',
        hh + ' gektar zona yopilmagan. STOP bossangiz yoʻqoladi.',
        [
          { text: 'Zonani ol', onPress: () => { confirmZone(); setTimeout(stopTracking, 500); } },
          { text: 'Baribir toxtat', style: 'destructive', onPress: () => stopTracking() },
          { text: 'Bekor', style: 'cancel' },
        ]);
      return;
    }
    if (tracking) stopTracking();
    else startTracking();
  };
 
  const centerMap = () => {
    followRef.current = true;
    setFollow(true);
    lastCamRef.current = 0;
    if (followTimerRef.current) clearTimeout(followTimerRef.current);
    if (location && camRef.current) {
      camRef.current.easeTo({ center: [location.longitude, location.latitude], zoom: 16.5, duration: 600 });
    }
  };
 
  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.screenBg }]}>
        <Text style={{ color: c.textMain, fontSize: 15, textAlign: 'center' }}>{error}</Text>

      {splash && (
        <Animated.View style={[styles.splash, { opacity: spFade }]} pointerEvents="none">
          <Animated.View
            style={[styles.spRingOuter, {
              opacity: spLogo.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] }),
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) },
                { rotate: spPulse.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
              ],
            }]}
          />
          <Animated.View
            style={[styles.spRingMid, {
              opacity: spLogo,
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                { rotate: spPulse.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) },
              ],
            }]}
          />
          <Animated.View
            style={[styles.spHalo, {
              opacity: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
              transform: [{ scale: spPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.35, 1] }) }],
            }]}
          />
          <Animated.View
            style={[styles.spCore, {
              opacity: spLogo,
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.1, 1.12, 1] }) },
                { rotate: spLogo.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) },
              ],
            }]}
          />
          <Animated.Text
            style={[styles.spTitle, {
              opacity: spText,
              transform: [{ translateY: spText.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }],
            }]}
          >
            ZONA
          </Animated.Text>
          <Animated.View style={[styles.spLine, { opacity: spText, transform: [{ scaleX: spText }] }]} />
          <Animated.Text
            style={[styles.spSub, {
              opacity: spText.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }),
              transform: [{ translateY: spText.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }]}
          >
            HUDUDINGNI EGALLA
          </Animated.Text>
        </Animated.View>
      )}


      <StatusBar style={c.bar} />
      </View>
    );
  }
 
  if (!location) {
    return (
      <View style={[styles.center, { backgroundColor: c.screenBg }]}>
        <ActivityIndicator size="large" color={c.accent} />
        <Text style={{ color: c.textSub, marginTop: 16, fontSize: 14 }}>
          Suniy yoldosh qidirilmoqda...
        </Text>
      {splash && (
        <Animated.View style={[styles.splash, { opacity: spFade }]} pointerEvents="none">
          <Animated.View
            style={[styles.spRingOuter, {
              opacity: spLogo.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] }),
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) },
                { rotate: spPulse.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
              ],
            }]}
          />
          <Animated.View
            style={[styles.spRingMid, {
              opacity: spLogo,
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                { rotate: spPulse.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) },
              ],
            }]}
          />
          <Animated.View
            style={[styles.spHalo, {
              opacity: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
              transform: [{ scale: spPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.35, 1] }) }],
            }]}
          />
          <Animated.View
            style={[styles.spCore, {
              opacity: spLogo,
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.1, 1.12, 1] }) },
                { rotate: spLogo.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) },
              ],
            }]}
          />
          <Animated.Text
            style={[styles.spTitle, {
              opacity: spText,
              transform: [{ translateY: spText.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }],
            }]}
          >
            ZONA
          </Animated.Text>
          <Animated.View style={[styles.spLine, { opacity: spText, transform: [{ scaleX: spText }] }]} />
          <Animated.Text
            style={[styles.spSub, {
              opacity: spText.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }),
              transform: [{ translateY: spText.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }]}
          >
            HUDUDINGNI EGALLA
          </Animated.Text>
        </Animated.View>
      )}


      <StatusBar style={c.bar} />
      </View>
    );
  }
 
  const acc = location.accuracy ? Math.round(location.accuracy) : null;
  const accColor = acc === null ? c.textSub : acc <= 15 ? c.accent : acc <= 35 ? '#F5A623' : '#FF5C7A';
  const totalHa = zones.reduce((s, z) => s + z.area, 0) / 10000;
  const myId = user ? user.user_id : null;
  const myAvatar = meStats && meStats.avatar && meStats.avatar_ok ? meStats.avatar : null;
  const myColor = meStats && meStats.zone_color ? meStats.zone_color : c.accent;
  const visibleRemote = (() => {
    const arr = remoteZones.slice().sort((a, b) => b.area - a.area);
    // Logolar ustma-ust tushmasin: kattasi qoladi, kichigi yashiriladi
    const minGap = zoomDelta * 0.02;
    const kept = [];
    for (const z of arr) {
      const cz = centerOf(z.coords);
      let clash = false;
      for (const k of kept) {
        const ck = centerOf(k.coords);
        if (Math.abs(cz.latitude - ck.latitude) < minGap &&
            Math.abs(cz.longitude - ck.longitude) < minGap) { clash = true; break; }
      }
      if (!clash) kept.push(z);
      if (kept.length >= 300) break;
    }
    return kept;
  })();

  const myHead = (() => {
    if (location && location.heading != null && location.heading >= 0) return location.heading - camHead;
    return 0;
  })();

  const modeIcon = speed > 11 ? '\uD83D\uDE97' : speed > 4 ? '\uD83D\uDEB2' : '\uD83D\uDEB6';
 
  return (
    <View ref={shotRef} collapsable={false} style={[styles.container, { backgroundColor: c.screenBg }]}>
      <MapLibreGL.Map
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        mapStyle={'https://api.maptiler.com/maps/' + (isDark ? 'streets-v4-dark' : 'streets-v4') + '/style.json?key=' + mapKey}
        logoEnabled={false}
        attributionEnabled={false}
        compassEnabled={false}
        onRegionIsChanging={(e) => {
          if (!e || !e.properties || !e.geometry) return;
          const z = e.properties.zoomLevel;
          const cc = e.geometry.coordinates;
          viewRef.current = { latitude: cc[1], longitude: cc[0], latitudeDelta: 360 / Math.pow(2, z) };
          setZoomDelta(360 / Math.pow(2, z));
        }}
        onRegionDidChange={(e) => {
          const n = e && e.nativeEvent;
          if (!n || !n.center) return;
          const cc = n.center;
          const la = Array.isArray(cc) ? cc[1] : cc.latitude;
          const lo = Array.isArray(cc) ? cc[0] : cc.longitude;
          const dl = 360 / Math.pow(2, n.zoom);
          viewRef.current = { latitude: la, longitude: lo, latitudeDelta: dl, longitudeDelta: dl };
          zoomRef.current = dl;
          setZoomDelta(dl);
          if (n.userInteraction) {
            followRef.current = false;
            setFollow(false);
            if (followTimerRef.current) clearTimeout(followTimerRef.current);
            if (trackingRef.current) {
              followTimerRef.current = setTimeout(() => { followRef.current = true; setFollow(true); lastCamRef.current = 0; }, 10000);
            }
          }
          if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
          moveTimerRef.current = setTimeout(() => refreshRemote(), 500);
        }}
      >
        <MapLibreGL.Camera
          ref={camRef}
          followUserLocation={follow && !tracking}
          followUserMode="normal"
          followZoomLevel={16.5}
          defaultSettings={{
            centerCoordinate: [location.longitude, location.latitude],
            zoomLevel: 16.5,
            pitch: 60,
          }}
        />


        {visibleRemote.slice().sort((a, b) => (b.area || 0) - (a.area || 0)).slice(0, 25).map((z) => (
          z.img ? <ZoneImage key={'ri' + z.id} id={z.id} url={z.img} bounds={z.img_bounds} /> : null
        ))}

        {myZoneImgs.slice(0, 15).map((z) => (
          <ZoneImage key={'mi' + z.id} id={'my' + z.id} url={z.img} bounds={z.img_bounds} />
        ))}

        <ZonesBatch
          items={visibleRemote}
          onPick={(zid) => {
            const z = visibleRemote.find((q) => q.id === zid);
            if (!z) return;
            tap();
            setInfoZone(z);
            addView(z.user_id, 'card').catch(() => {});
          }}
        />


        <ZonesBatch
          sid="myb"
          lineW={3}
          items={zones.map((z) => ({
            id: z.id, coords: z.coords, color: myColor,
            img: myZoneImgs.some((q) => q.id === z.id) ? 1 : null,
          }))}
          onPick={(zid) => {
            const z = zones.find((q) => q.id === zid);
            if (!z) return;
            tap();
            setInfoZone(Object.assign({}, meStats || {}, { area: z.area, coords: z.coords, views: myViews ? myViews.all.unique : 0 }));
          }}
        />





        {path.length > 1 ? (
          <PathLine coords={path} color={speed > 11 ? "#F5A623" : myColor} width={8} />
        ) : null}
        {zones.slice().sort((a, b) => (b.area || 0) - (a.area || 0)).slice(0, 5).map((z) => (
          <ZoneBorder key={'zb' + z.id} id={z.id} coords={z.coords} color={myColor} area={z.area} active={true} zoom={zoomDelta} code={myBorder} />
        ))}

        {visibleRemote.filter((z) => z.border_style && z.border_style !== 'simple_1').slice(0, 6).map((z) => (
          <ZoneBorder key={'rb' + z.id} id={'r' + z.id} coords={z.coords} color={z.zone_color || z.color || '#888888'} area={z.area} active={true} zoom={zoomDelta} code={z.border_style} />
        ))}

        <ZoneLogos items={[
          ...visibleRemote.filter((z) => z.logo || z.avatar).map((z) => ({ id: z.id, coords: z.coords, url: z.logo || z.avatar, area: z.area })),
          ...((meStats && (meStats.logo || meStats.avatar)) ? zones.map((z) => ({ id: 'my' + z.id, coords: z.coords, url: meStats.logo || meStats.avatar, area: z.area })) : []),
        ]} />

        <MeDot lat={location ? location.latitude : null} lon={location ? location.longitude : null} color={myColor} />


      </MapLibreGL.Map>
 
      <View style={[styles.topPanel, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: c.textMain }]}>
            {(distance / 1000).toFixed(2)}
          </Text>
          <Text style={[styles.statLabel, { color: c.textSub }]}>KM</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: c.panelBorder }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: c.textMain }]}>{fmtTime(seconds)}</Text>
          <Text style={[styles.statLabel, { color: c.textSub }]}>VAQT</Text>
        </View>
        <View style={[styles.divider, { backgroundColor: c.panelBorder }]} />
        <View style={styles.statBox}>
          <Text style={[styles.statValue, { color: c.accent }]}>{totalHa.toFixed(2)}</Text>
          <Text style={[styles.statLabel, { color: c.textSub }]}>GEKTAR</Text>
        </View>
      </View>
 
      <View style={[styles.gpsChip, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}>
        <View style={[styles.gpsDot, { backgroundColor: accColor }]} />
        <Text style={{ color: c.textSub, fontSize: 11, letterSpacing: 1 }}>
          {'GPS ' + (acc !== null ? acc + ' m' : '...') + ' / ' + zones.length + ' zona / ' + (online ? 'online' : 'offline') + (queueRef.current.length ? '  navbat: ' + queueRef.current.length : '')}
        </Text>
      </View>
      {tasks ? (
        <TouchableOpacity
          style={[styles.taskBtn, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}
          onPress={() => { tap(); setShowTasks(true); }}
          activeOpacity={0.8}
        >
          <Text style={{ fontSize: 17 }}>{'\uD83C\uDFAF'}</Text>
        </TouchableOpacity>
      ) : null}

      <TouchableOpacity
        style={[styles.searchBtn, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}
        onPress={() => setShowSearch(true)}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 17 }}>{'\uD83D\uDD0D'}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.menuBtn, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}
        onPress={openMenu}
        activeOpacity={0.8}
      >
        <View style={[styles.burgerLine, { backgroundColor: c.textMain }]} />
        <View style={[styles.burgerLine, { backgroundColor: c.textMain, marginTop: 4 }]} />
        <View style={[styles.burgerLine, { backgroundColor: c.textMain, marginTop: 4 }]} />
      </TouchableOpacity>
 
      {toast && (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: c.accent,
              opacity: toastAnim,
              transform: [{
                translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }),
              }],
            },
          ]}
        >
          <Text style={[styles.toastText, { color: c.accentInk }]}>{toast}</Text>
          <Text style={[styles.toastSub, { color: c.accentInk }]}>Zona egallandi</Text>
        </Animated.View>
      )}
 
      <TouchableOpacity
        style={[styles.themeQuick, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}
        onPress={() => {
          const n3 = !is3D;
          setIs3D(n3);
          if (mapRef.current) {
            if (camRef.current) camRef.current.easeTo({ pitch: n3 ? 60 : 0, duration: 700 });
          }
        }}
        activeOpacity={0.8}
      >
        <Text style={{ fontSize: 13, fontWeight: '900', color: is3D ? c.accent : c.textSub }}>{is3D ? '3D' : '2D'}</Text>
      </TouchableOpacity>


      <TouchableOpacity
        style={[styles.locateBtn, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}
        onPress={centerMap}
        activeOpacity={0.8}
      >
        <View style={[styles.locateRing, { borderColor: c.accent }]} />
      </TouchableOpacity>
 
      {warn ? (
        <TouchableOpacity onPress={() => setWarn(null)} activeOpacity={0.8}
          style={[styles.warnBox, { backgroundColor: (warn && warn.indexOf('Telefonni cho') === 0) ? 'rgba(0,201,138,0.95)' : 'rgba(245,166,35,0.95)' }]}>
          <Text style={{ fontSize: 14 }}>{'\u26A0\uFE0F'}</Text>
          <Text style={{ color: '#1A1200', fontSize: 12, fontWeight: '600', marginLeft: 8, flex: 1 }}>{warn}</Text>
          <Text style={{ color: '#1A1200', fontSize: 15, opacity: 0.5, marginLeft: 6 }}>{'\u2715'}</Text>
        </TouchableOpacity>
      ) : null}

      {pending && tracking ? (
        <Animated.View
          style={[
            styles.pendBox,
            {
              backgroundColor: c.sheetBg,
              borderColor: c.accent,
              opacity: pendAnim,
              transform: [
                { translateY: pendAnim.interpolate({ inputRange: [0, 1], outputRange: [60, 0] }) },
                { scale: pendAnim.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1] }) },
              ],
            },
          ]}
        >
          <Animated.View
            style={[
              styles.pendGlow,
              {
                backgroundColor: c.accent,
                opacity: pendGlow.interpolate({ inputRange: [0, 1], outputRange: [0.06, 0.18] }),
              },
            ]}
          />

          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
            <Animated.View
              style={[
                styles.pendDot,
                {
                  backgroundColor: c.accent,
                  transform: [{ scale: pendGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.35] }) }],
                },
              ]}
            />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={{ color: pending.small ? '#F5A623' : c.textSub, fontSize: 9, letterSpacing: 2, fontWeight: '700' }}>{pending.small ? 'ZONA JUDA KICHIK' : 'ZONA TAYYOR'}</Text>
              <Text style={{ color: pending.small ? '#F5A623' : c.accent, fontSize: 26, fontWeight: '900', letterSpacing: -1, marginTop: 2 }}>
                {(pending.area / 10000).toFixed(2) + ' ga'}
              </Text>
            </View>
          </View>

          {pending.small ? (
            <Text style={{ color: c.textSub, fontSize: 11, marginBottom: 10, lineHeight: 16 }}>
              {'Kattaroq zona uchun yana ' + Math.max(Math.round(60 - (pending.perim || 0)), 5) + '' + ' metr yuring'}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row' }}>
            <Press onPress={confirmZone} haptic={false}
              style={[styles.pendBtn, { backgroundColor: c.accent, flex: 1.4, marginRight: 8, shadowColor: c.accent, shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 6 }]}>
              <Text style={{ color: c.accentInk, fontWeight: '900', fontSize: 13, letterSpacing: 1 }}>{pending.small ? 'BARIBIR OL' : 'YOPISH'}</Text>
            </Press>
            <Press onPress={dismissZone}
              style={[styles.pendBtn, { borderWidth: 1.5, borderColor: c.panelBorder, flex: 1 }]}>
              <Text style={{ color: c.textSub, fontWeight: '700', fontSize: 13, letterSpacing: 1 }}>DAVOM</Text>
            </Press>
          </View>
        </Animated.View>
      ) : null}


      {showHint && !warn ? (
        <FadeIn style={styles.hintBox}>
          <View style={[styles.hintInner, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}>
            <TouchableOpacity
              onPress={() => { tap(); setShowHint(false); }}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              style={{ position: 'absolute', top: 8, right: 10, width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: c.textSub, fontSize: 17, fontWeight: '600' }}>{'\u00D7'}</Text>
            </TouchableOpacity>
            <Text style={{ fontSize: 26, marginBottom: 8 }}>{'\uD83D\uDC63'}</Text>
            <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '800', marginBottom: 6 }}>Birinchi zonangizni oling</Text>
            <Text style={{ color: c.textSub, fontSize: 12.5, lineHeight: 19, textAlign: 'center' }}>
              START bosing, koʻchada yuring va boshlangan joyingizga qayting.
            </Text>
            <Text style={{ color: c.textSub, fontSize: 11, marginTop: 10, opacity: 0.7 }}>Ichkarisidagi hudud sizniki boʻladi</Text>
          </View>
        </FadeIn>
      ) : null}

      {pendCount > 0 ? (
        <View style={[styles.infoChip, { backgroundColor: alpha('#F5A623', 0.16), borderColor: alpha('#F5A623', 0.5) }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 13 }}>{'\u23F3'}</Text>
            <Text style={{ color: '#F5A623', fontSize: 11, marginLeft: 6, fontWeight: '700' }}>
              {pendCount + (pendCount === 1 ? ' ta zona yuborilmoqda' : ' ta zona yuborilmoqda')}
            </Text>
          </View>
        </View>
      ) : null}

      {!tracking && daily && !warn && showDaily ? (
        <View style={[styles.infoChip, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={{ fontSize: 13 }}>{daily.complete ? "\u2705" : "\uD83C\uDFAF"}</Text>
            <Text style={{ color: c.textMain, fontSize: 11, marginLeft: 6, fontWeight: "600" }}>{daily.complete ? "Bugungi maqsad bajarildi! Seriya davom etmoqda" : ("Bugun 1 gektar oling - seriya davom etadi  (" + daily.done + " / 1)")}</Text>
            {daily.streak > 0 ? (<View style={[styles.streakTag, { backgroundColor: alpha("#F5A623", 0.18) }]}><Text style={{ color: "#F5A623", fontSize: 10, fontWeight: "800" }}>{"\uD83D\uDD25 " + daily.streak}</Text></View>) : null}
          </View>
          {around && around.nearest ? (<Text style={{ color: c.textSub, fontSize: 10, marginTop: 5 }}>{"Yaqinda " + around.count + " zona, eng yaqini " + around.nearest.meters + " m"}</Text>) : null}
        </View>
      ) : null}

      <View style={styles.bottomArea}>
        {tracking && (
          <View style={[styles.modeChip, { backgroundColor: c.panelBg, borderColor: c.panelBorder }]}>
            <Text style={{ fontSize: 15 }}>{modeIcon}</Text>
            <Text style={{ color: c.textSub, fontSize: 12, marginLeft: 7 }}>
              {(speed * 3.6).toFixed(1) + ' km/soat'}
            </Text>
            {speed > 11 && (
              <Text style={{ color: '#F5A623', fontSize: 11, marginLeft: 8, fontWeight: '700' }}>x0.1</Text>
            )}
          </View>
        )}
 
        <TouchableOpacity
          style={[
            styles.startBtn,
            {
              backgroundColor: tracking ? c.stop : c.accent,
              shadowColor: tracking ? c.stop : c.accent,
            },
          ]}
          onPress={toggleTracking}
          activeOpacity={0.85}
        >
          <Text style={[styles.startText, { color: tracking ? c.stopInk : c.accentInk }]}>
            {tracking ? 'STOP' : 'START'}
          </Text>
        </TouchableOpacity>
      </View>
 
      {menuOpen && (
        <View style={StyleSheet.absoluteFill}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.55)', opacity: fadeAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => closeMenu()} />
          </Animated.View>

          <Animated.View
            style={{
              position: 'absolute', left: 0, right: 0, bottom: 0,
              height: SCREEN_H * 0.97,
              backgroundColor: c.sheetBg,
              borderTopLeftRadius: 28, borderTopRightRadius: 28,
              transform: [{ translateY: Animated.add(drawerAnim, menuH.interpolate({ inputRange: [0, 1], outputRange: [SCREEN_H * 0.17, 0] })) }],
            }}
          >
            <View {...menuPan.panHandlers}>
              <View style={{ alignItems: 'center', paddingTop: 13, paddingBottom: 9 }}>
                <View style={{ width: 42, height: 4.5, borderRadius: 3, backgroundColor: c.panelBorder }} />
              </View>

            <TouchableOpacity activeOpacity={0.85}
              onPress={() => { tap(); if (savedAcc || (meStats && meStats.verified)) closeMenu(() => setShowAcc(true)); else closeMenu(() => setShowLogin(true)); }}
              style={{
                marginHorizontal: 16, marginBottom: 4,
                borderRadius: 20, padding: 16,
                backgroundColor: alpha(myColor, isDark ? 0.13 : 0.09),
              }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <View style={{
                  width: 56, height: 56, borderRadius: 28, overflow: 'hidden',
                  borderWidth: 2.5, borderColor: myColor,
                  backgroundColor: alpha(myColor, 0.18),
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {myAvatar
                    ? <Image source={{ uri: myAvatar }} style={{ width: '100%', height: '100%' }} />
                    : <Text style={{ color: myColor, fontSize: 22, fontWeight: '900' }}>
                        {String((meStats && meStats.name) || '?').charAt(0).toUpperCase()}
                      </Text>}
                </View>

                <View style={{ flex: 1, marginLeft: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ color: c.textMain, fontSize: 17.5, fontWeight: '900' }} numberOfLines={1}>
                      {(meStats && meStats.name) || 'Oʻyinchi'}
                    </Text>
                    {(savedAcc || (meStats && meStats.verified)) ? (
                      <Text style={{ fontSize: 11, marginLeft: 6 }}>{'\u2705'}</Text>
                    ) : null}
                  </View>
                  <Text style={{ color: c.textSub, fontSize: 11.5, marginTop: 4 }} numberOfLines={1}>
                    {(savedAcc || (meStats && meStats.contact)) || 'Hisob saqlanmagan'}
                  </Text>
                </View>

                <View style={{
                  width: 30, height: 30, borderRadius: 15,
                  alignItems: 'center', justifyContent: 'center',
                  backgroundColor: alpha(myColor, 0.16),
                }}>
                  <Text style={{ color: myColor, fontSize: 16 }}>{'\u203A'}</Text>
                </View>
              </View>

              {plan && plan.plan !== 'free' ? (
                <View style={{
                  flexDirection: 'row', alignItems: 'center', marginTop: 13,
                  paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(myColor, 0.15),
                }}>
                  <Text style={{ fontSize: 12, marginRight: 7 }}>{'\u2B50'}</Text>
                  <Text style={{ color: '#F5A623', fontSize: 12, fontWeight: '800' }}>{plan.name}</Text>
                  {plan.days_left > 0 ? (
                    <Text style={{ color: c.textSub, fontSize: 11, marginLeft: 8 }}>
                      {plan.days_left + ' kun qoldi'}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', paddingHorizontal: 20, paddingBottom: 14 }}>
              {[
                [meStats ? ('+' + (myStats ? myStats.today.hectares : '0')) : '-', 'BUGUN', c.accent],
                [tasks ? String(tasks.streak) : '0', 'SERIYA', '#F5A623'],
                [meStats ? ('#' + meStats.rank) : '-', 'OʻRIN', '#4CC9F0'],
              ].map(function (x, ix) {
                return (
                  <View key={ix} style={{
                    flex: 1, alignItems: 'center', paddingVertical: 11,
                    backgroundColor: c.rowBg, borderRadius: 13,
                    marginRight: ix < 2 ? 8 : 0,
                  }}>
                    <Text style={{ color: x[2], fontSize: 16, fontWeight: '900' }} numberOfLines={1}>{x[0]}</Text>
                    <Text style={{ color: c.textSub, fontSize: 8, letterSpacing: 0.7, marginTop: 3 }}>{x[1]}</Text>
                  </View>
                );
              })}
            </View>

            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ paddingHorizontal: 16 }}
              contentContainerStyle={{ paddingBottom: 80 }}>

              <Text style={styles.mSec}>OʻYIN</Text>
              <View style={styles.mGrid}>
                {[
                  ['\uD83C\uDFC6', 'Reyting', '#00E5A0', () => closeMenu(openBoard), meStats ? ('#' + meStats.rank) : null],
                  FL('borders') ? ['\u2728', 'Naqshlar', '#00E5A0', () => { loadBorders(); closeMenu(() => setShowBorders(true)); }, bdTotal ? (bdCount + ' / ' + bdTotal) : null] : null,
                  ['\uD83D\uDCC7', 'Kartochkam', '#00E5A0', () => { const z0 = zones[0]; if (!z0) { say('Avval zona oling', 'warn'); return; } closeMenu(() => setInfoZone(Object.assign({}, meStats || {}, { area: z0.area, coords: z0.coords }))); }, null],
                  ['\uD83D\uDCE4', 'Ulashish', '#00E5A0', () => closeMenu(shareZone), null],
                ].filter(Boolean).map(function (x, ix) { return renderCell(x, ix); })}
              </View>

              <Text style={styles.mSec}>BIZNES</Text>
              <View style={styles.mGrid}>
                {[
                  ['\u2B50', 'Tarif', '#F5A623', () => { loadPlan(); closeMenu(() => setShowPlans(true)); }, plan && plan.plan !== 'free' ? plan.name : null],
                  ['\u2699\uFE0F', 'Sozlamalar', '#F5A623', () => closeMenu(openPremium), null],
                  ['\uD83D\uDCF8', 'Rasmlar', '#F5A623', () => { loadMyPhotos(); closeMenu(() => setShowPhotos(true)); }, myPhotos.left_today > 0 ? (myPhotos.left_today + ' ta') : 'limit'],
                  FL('invite') ? ['\uD83D\uDC65', 'Taklif', '#F5A623', () => closeMenu(inviteFriend), null] : null,
                ].filter(Boolean).map(function (x, ix) { return renderCell(x, ix); })}
              </View>

              <Text style={styles.mSec}>SOZLAMA</Text>
              <View style={styles.mGrid}>
                {[
                  [isDark ? '\u2600\uFE0F' : '\uD83C\uDF19', isDark ? 'Kunduzgi' : 'Tungi', '#4CC9F0', () => { setIsDark(!isDark); }, null],
                  [soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07', soundOn ? 'Ovoz yoniq' : 'Ovoz oʻchiq', '#4CC9F0', () => { const n = !soundOn; setSoundOnState(n); setSoundOn(n); }, null],
                  ['\uD83C\uDFAC', 'Qoʻllanma', '#4CC9F0', () => closeMenu(() => setShowIntro(true)), null],
                  ['\uD83D\uDCD6', 'Qanday oʻynash', '#4CC9F0', () => closeMenu(() => setInfoPage('how')), null],
                ].filter(Boolean).map(function (x, ix) { return renderCell(x, ix); })}
              </View>

              <View style={{ height: 14 }} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[
                  ['Biz haqimizda', () => closeMenu(() => setInfoPage('about'))],
                  ['Maxfiylik', () => closeMenu(() => setInfoPage('privacy'))],
                  ['Xato haqida', () => closeMenu(() => Linking.openURL((cfg && cfg.telegram) || 'https://t.me/Xusniddin_uz'))],
                ].map(function (x, ix) {
                  return (
                    <TouchableOpacity key={ix} onPress={() => { tap(); x[1](); }} style={{ paddingHorizontal: 11, paddingVertical: 7 }}>
                      <Text style={{ color: c.textSub, fontSize: 12 }}>{x[0]}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 10 }}>
                <TouchableOpacity onPress={() => { tap(); closeMenu(delMyZones); }} activeOpacity={0.8}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingHorizontal: 15, paddingVertical: 9, borderRadius: 11,
                    borderWidth: 1, borderColor: alpha('#FF4D6D', 0.32),
                    backgroundColor: alpha('#FF4D6D', 0.07),
                    marginHorizontal: 5,
                  }}>
                  <Text style={{ fontSize: 11, marginRight: 6 }}>{'\uD83D\uDDD1\uFE0F'}</Text>
                  <Text style={{ color: '#FF4D6D', fontSize: 11.5, fontWeight: '600' }}>Zonalarni oʻchirish</Text>
                </TouchableOpacity>
                {(savedAcc || (meStats && meStats.verified)) ? (
                  <TouchableOpacity onPress={() => { tap(); closeMenu(doLogout); }} activeOpacity={0.8}
                    style={{
                      flexDirection: 'row', alignItems: 'center',
                      paddingHorizontal: 15, paddingVertical: 9, borderRadius: 11,
                      borderWidth: 1, borderColor: alpha('#FF4D6D', 0.32),
                      backgroundColor: alpha('#FF4D6D', 0.07),
                      marginHorizontal: 5,
                    }}>
                    <Text style={{ fontSize: 11, marginRight: 6 }}>{'\uD83D\uDEAA'}</Text>
                    <Text style={{ color: '#FF4D6D', fontSize: 11.5, fontWeight: '600' }}>Chiqish</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </ScrollView>
          </Animated.View>
        </View>
      )}
 
      <Modal visible={showBoard} animationType="slide" transparent={true}
             onRequestClose={() => setShowBoard(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowBoard(false)}>
            <Text style={[styles.sheetTitle, { color: c.textMain }]}>Reyting</Text>



          <ScrollView showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={boardLoading} onRefresh={openBoard} tintColor={c.accent} />}>
 
            {meStats && (
              <View style={[styles.meCard, { backgroundColor: alpha(c.accent, 0.12), borderColor: alpha(c.accent, 0.35) }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                  <TouchableOpacity onPress={pickAvatar} activeOpacity={0.7}>
                    <View style={[styles.avatarBig, { borderColor: c.accent, backgroundColor: alpha(c.accent, 0.15) }]}>
                      {uploading ? (
                        <ActivityIndicator color={c.accent} />
                      ) : meStats.avatar ? (
                        <Image source={{ uri: meStats.avatar }} style={styles.avatarBigImg} />
                      ) : (
                        <Text style={{ fontSize: 20 }}>{'\uD83D\uDCF7'}</Text>
                      )}
                    </View>
                  </TouchableOpacity>
 
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    {editName ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <TextInput
                          value={nameInput}
                          onChangeText={setNameInput}
                          style={[styles.input, { color: c.textMain, borderColor: c.panelBorder }]}
                          placeholder="Ismingiz"
                          placeholderTextColor={c.textSub}
                          maxLength={20}
                          autoFocus
                        />
                        <TouchableOpacity onPress={saveName} style={[styles.saveBtn, { backgroundColor: c.accent }]}>
                          <Text style={{ color: c.accentInk, fontWeight: '700', fontSize: 13 }}>OK</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <TouchableOpacity onPress={() => setEditName(true)} activeOpacity={0.7}>
                        <Text style={[styles.meName, { color: c.textMain }]}>{meStats.name}</Text>
                      </TouchableOpacity>
                    )}
                    {meStats.avatar && !meStats.avatar_ok && (
                      <Text style={{ color: '#F5A623', fontSize: 11, marginTop: 3 }}>Rasm tekshiruvda</Text>
                    )}
                    {!meStats.avatar && (
                      <Text style={{ color: c.textSub, fontSize: 11, marginTop: 3 }}>Rasm qo'ying</Text>
                    )}
                  </View>
                </View>
 
                <View style={styles.meRow}>
                  <View style={styles.meBox}>
                    <Text style={[styles.meVal, { color: c.accent }]}>{meStats.rank}</Text>
                    <Text style={[styles.meLbl, { color: c.textSub }]}>O'RIN</Text>
                  </View>
                  <View style={styles.meBox}>
                    <Text style={[styles.meVal, { color: c.textMain }]}>{meStats.hectares}</Text>
                    <Text style={[styles.meLbl, { color: c.textSub }]}>GEKTAR</Text>
                  </View>
                  <View style={styles.meBox}>
                    <Text style={[styles.meVal, { color: c.textMain }]}>{meStats.zones}</Text>
                    <Text style={[styles.meLbl, { color: c.textSub }]}>ZONA</Text>
                  </View>
                </View>
              {!myStats ? (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(c.accent, 0.15) }}>
                  <Skel w={'34%'} h={9} r={5} mb={10} />
                  <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                    <Skel w={0} flex={1} h={38} r={10} mr={7} />
                    <Skel w={0} flex={1} h={38} r={10} mr={7} />
                    <Skel w={0} flex={1} h={38} r={10} />
                  </View>
                  <Skel w={'100%'} h={44} r={10} />
                </View>
              ) : null}

              {myStats ? (
                <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(c.accent, 0.15) }}>
                  <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 1.5, marginBottom: 11 }}>STATISTIKA</Text>

                  <View style={{ flexDirection: 'row', marginBottom: 9 }}>
                    <View style={{ flex: 1, backgroundColor: alpha(c.accent, 0.12), borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginRight: 8 }}>
                      <Text style={{ color: c.accent, fontSize: 19, fontWeight: '900' }}>{'+' + myStats.today.hectares}</Text>
                      <Text style={{ color: c.textSub, fontSize: 8.5, letterSpacing: 0.8, marginTop: 3 }}>BUGUN</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: c.rowBg, borderRadius: 14, paddingVertical: 13, alignItems: 'center', marginRight: 8 }}>
                      <Text style={{ color: c.textMain, fontSize: 19, fontWeight: '900' }}>{'+' + myStats.week.hectares}</Text>
                      <Text style={{ color: c.textSub, fontSize: 8.5, letterSpacing: 0.8, marginTop: 3 }}>HAFTA</Text>
                    </View>
                    <View style={{ flex: 1, backgroundColor: c.rowBg, borderRadius: 14, paddingVertical: 13, alignItems: 'center' }}>
                      <Text style={{ color: c.textMain, fontSize: 19, fontWeight: '900' }}>{'+' + myStats.month.hectares}</Text>
                      <Text style={{ color: c.textSub, fontSize: 8.5, letterSpacing: 0.8, marginTop: 3 }}>OY</Text>
                    </View>
                  </View>

                  {stOpen ? (
                    <View>
                      <View style={{ backgroundColor: c.rowBg, borderRadius: 16, padding: 14, marginBottom: 9 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 62 }}>
                          {myStats.days.map(function (d, ix) {
                            const mx = Math.max.apply(null, myStats.days.concat([0.1]));
                            const hh = Math.max((d / mx) * 56, 3);
                            const isLast = ix === myStats.days.length - 1;
                            return (
                              <View key={ix} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
                                {d > 0 ? (
                                  <Text style={{ color: isLast ? c.accent : c.textSub, fontSize: 8, fontWeight: '700', marginBottom: 3 }}>
                                    {d >= 10 ? Math.round(d) : d.toFixed(1)}
                                  </Text>
                                ) : null}
                                <View style={{ width: '58%', height: hh, borderRadius: 5, backgroundColor: d > 0 ? (isLast ? c.accent : alpha(c.accent, 0.45)) : alpha(c.textSub, 0.14) }} />
                              </View>
                            );
                          })}
                        </View>
                        <View style={{ flexDirection: 'row', marginTop: 7 }}>
                          {(myStats.labels || ['', '', '', '', '', '', '']).map(function (lb, ix) {
                            return (
                              <View key={ix} style={{ flex: 1, alignItems: 'center' }}>
                                <Text style={{ color: ix === 6 ? c.accent : c.textSub, fontSize: 9, fontWeight: ix === 6 ? '800' : '600' }}>{lb}</Text>
                              </View>
                            );
                          })}
                        </View>
                      </View>

                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                        {[
                          ['\uD83D\uDC5F', (myStats.km != null ? myStats.km : 0) + ' km', 'YURILGAN'],
                          ['\uD83D\uDDFA', (myStats.biggest != null ? myStats.biggest : 0) + ' ga', 'ENG KATTA'],
                          ['\uD83D\uDCCA', (myStats.avg != null ? myStats.avg : 0) + ' ga', 'ORTACHA'],
                          ['\uD83D\uDCC5', String(myStats.active_days != null ? myStats.active_days : 0), 'FAOL KUN'],
                          ['\u2694\uFE0F', (myStats.week.taken || 0) + ' ga', 'OLINGAN'],
                          ['\uD83D\uDEE1', (myStats.lost != null ? myStats.lost : 0) + ' ga', 'YOQOTILGAN'],
                        ].map(function (x, ix) {
                          return (
                            <View key={ix} style={{ width: '31.5%', backgroundColor: c.rowBg, borderRadius: 13, paddingVertical: 11, alignItems: 'center', marginBottom: 8 }}>
                              <Text style={{ fontSize: 13 }}>{x[0]}</Text>
                              <Text style={{ color: c.textMain, fontSize: 13, fontWeight: '800', marginTop: 4 }} numberOfLines={1}>{x[1]}</Text>
                              <Text style={{ color: c.textSub, fontSize: 7.5, letterSpacing: 0.5, marginTop: 2 }}>{x[2]}</Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ) : null}

                  <TouchableOpacity onPress={function () { tap(); setStOpen(!stOpen); }} activeOpacity={0.8}
                    style={{ paddingVertical: 11, alignItems: 'center', borderRadius: 12, backgroundColor: alpha(c.textSub, 0.08) }}>
                    <Text style={{ color: c.textSub, fontSize: 11.5, fontWeight: '700' }}>
                      {stOpen ? 'Yigish \u25B2' : 'Batafsil \u25BC'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
            )}

            <View style={{ flexDirection: 'row', marginBottom: 10 }}>
              <TouchableOpacity onPress={() => setBoardMode('near')}
                style={[styles.aTab, { backgroundColor: boardMode === 'near' ? c.accent : c.rowBg, flex: 1, alignItems: 'center' }]}>
                <Text style={{ color: boardMode === 'near' ? c.accentInk : c.textSub, fontSize: 12, fontWeight: '700' }}>ATROFDA</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBoardMode('week')}
                style={[styles.aTab, { backgroundColor: boardMode === 'week' ? c.accent : c.rowBg, flex: 1, alignItems: 'center' }]}>
                <Text style={{ color: boardMode === 'week' ? c.accentInk : c.textSub, fontSize: 12, fontWeight: '700' }}>HAFTA</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setBoardMode('all')}
                style={[styles.aTab, { backgroundColor: boardMode === 'all' ? c.accent : c.rowBg, flex: 1, alignItems: 'center', marginRight: 0 }]}>
                <Text style={{ color: boardMode === 'all' ? c.accentInk : c.textSub, fontSize: 12, fontWeight: '700' }}>UMUMIY</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => { setBoardMode('walk'); if (!walkBoard.length) fetchWalkBoard(50).then(setWalkBoard).catch(() => {}); }}
                style={[styles.aTab, { backgroundColor: boardMode === 'walk' ? c.accent : c.rowBg, flex: 1, alignItems: 'center' }]}>
                <Text style={{ color: boardMode === 'walk' ? c.accentInk : c.textSub, fontSize: 12, fontWeight: '700' }}>PIYODA</Text>
              </TouchableOpacity>
            </View>

            {boardLoading ? (
              <SkelList n={6} bg={c.rowBg} />
            ) : (
              <View style={{ marginTop: 6 }}>

                {(boardMode === 'near' ? nearBoard : boardMode === 'week' ? weekBoard : board).length === 0 ? (
                  <Empty
                    icon={boardMode === 'near' ? '\uD83D\uDCCD' : boardMode === 'walk' ? '\uD83D\uDC5F' : boardMode === 'week' ? '\uD83D\uDCC5' : '\uD83C\uDFC6'}
                    title={boardMode === 'near' ? 'Atrofda hech kim yoʻq' : boardMode === 'walk' ? 'Piyoda reyting boʻsh' : boardMode === 'week' ? 'Bu haftada hali hech kim' : 'Reyting bosh'}
                    text={boardMode === 'near' ? '30 km atrofda hali oʻyinchi yoʻq. Birinchi boʻlib zona oling!' : boardMode === 'week' ? 'Bu hafta hali hech kim zona olmadi. Birinchi boling!' : 'Hali hech kim zona olmadi. Siz birinchi bolishingiz mumkin.'}
                    accent={c.accent} textMain={c.textMain} textSub={c.textSub} rowBg={c.rowBg}
                  />
                ) : null}
                {(boardMode === 'near' ? nearBoard : boardMode === 'week' ? weekBoard : boardMode === 'walk' ? walkBoard : board).map((p, i) => {
                  const me = p.user_id === myId;
                  const ha = Number(p.hectares) || 0;
                  const haTxt = ha >= 1000 ? (ha / 1000).toFixed(1) + 'k' : ha.toFixed(ha < 10 ? 2 : 1);
                  const medal = i === 0 ? '\uD83E\uDD47' : i === 1 ? '\uD83E\uDD48' : i === 2 ? '\uD83E\uDD49' : null;
                  const top3 = i < 3;
                  const op = openRow === p.user_id;
                  return (
                    <View key={p.user_id} style={{
                      borderRadius: 16, marginBottom: 7, overflow: 'hidden',
                      backgroundColor: me ? alpha(c.accent, 0.14) : (top3 ? alpha(p.color || '#888', 0.07) : c.rowBg),
                      borderWidth: op ? 1.5 : (top3 ? 1 : 0),
                      borderColor: op ? (p.color || c.accent) : alpha(p.color || '#888', 0.3),
                    }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: top3 ? 12 : 9, paddingHorizontal: 11 }}>
                        <TouchableOpacity activeOpacity={0.75}
                          onPress={() => { tap(); setOpenRow(op ? null : p.user_id); }}
                          style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                          <View style={{ width: 26, alignItems: 'center' }}>
                            {medal ? <Text style={{ fontSize: 16 }}>{medal}</Text>
                              : <Text style={{ color: c.textSub, fontSize: 12.5, fontWeight: '700' }}>{i + 1}</Text>}
                          </View>
                          <View style={{
                            width: top3 ? 38 : 32, height: top3 ? 38 : 32, borderRadius: top3 ? 19 : 16,
                            marginLeft: 8, marginRight: 10, overflow: 'hidden',
                            borderWidth: 2, borderColor: p.color || '#888',
                            backgroundColor: alpha(p.color || '#888', 0.18),
                            alignItems: 'center', justifyContent: 'center',
                          }}>
                            {p.pic ? <Image source={{ uri: p.pic }} style={{ width: '100%', height: '100%' }} />
                              : <Text style={{ color: p.color || '#888', fontSize: top3 ? 15 : 13, fontWeight: '900' }}>{(p.name || '?').charAt(0).toUpperCase()}</Text>}
                          </View>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                              <Text style={{ color: c.textMain, fontSize: top3 ? 14.5 : 13.5, fontWeight: me ? '900' : '700' }} numberOfLines={1}>
                                {p.zone_name || p.name}
                              </Text>
                              {p.premium ? <Text style={{ fontSize: 11, marginLeft: 4 }}>{'\u2B50'}</Text> : null}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <Text style={{ color: c.textSub, fontSize: 10.5 }}>{(p.zones || 0) + ' zona'}</Text>
                              {p.streak > 0 ? <Text style={{ color: '#F5A623', fontSize: 10, marginLeft: 7 }}>{'\uD83D\uDD25 ' + p.streak}</Text> : null}
                              {me ? <Text style={{ color: c.accent, fontSize: 10, marginLeft: 7, fontWeight: '800' }}>SIZ</Text> : null}
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginRight: 8 }}>
                            <Text style={{ color: me ? c.accent : c.textMain, fontSize: top3 ? 16 : 14, fontWeight: '800' }}>{haTxt}</Text>
                            <Text style={{ color: c.textSub, fontSize: 8.5, letterSpacing: 0.6 }}>GEKTAR</Text>
                          </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => { tap(); goToPlayer(p); }}
                          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                          style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: alpha(p.color || '#888', 0.16) }}>
                          <Text style={{ fontSize: 15 }}>{'\uD83D\uDCCD'}</Text>
                        </TouchableOpacity>
                      </View>

                      {op ? (
                        <FadeIn style={{ paddingHorizontal: 13, paddingBottom: 12, paddingTop: 2 }}>
                          <View style={{ height: 1, backgroundColor: alpha(p.color || '#888', 0.25), marginBottom: 10 }} />
                          <View style={{ flexDirection: 'row' }}>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 1 }}>OYINCHI</Text>
                              <Text style={{ color: c.textMain, fontSize: 13, fontWeight: '700', marginTop: 2 }} numberOfLines={1}>{p.name}</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 1 }}>ORTACHA</Text>
                              <Text style={{ color: c.textMain, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                                {p.zones ? (ha / p.zones).toFixed(1) + ' ga' : '-'}
                              </Text>
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 1 }}>NAQSH</Text>
                              <Text style={{ color: p.color || c.textMain, fontSize: 13, fontWeight: '700', marginTop: 2 }}>
                                {p.border_style ? String(p.border_style).split('_')[0] : 'oddiy'}
                              </Text>
                            </View>
                          </View>
                          <TouchableOpacity onPress={() => { tap(); goToPlayer(p); }} activeOpacity={0.8}
                            style={{ marginTop: 11, paddingVertical: 12, borderRadius: 12, alignItems: 'center', backgroundColor: alpha(p.color || c.accent, 0.18) }}>
                            <Text style={{ color: p.color || c.accent, fontSize: 12.5, fontWeight: '800', letterSpacing: 0.5 }}>KARTADA KORISH</Text>
                          </TouchableOpacity>
                        </FadeIn>
                      ) : null}
                    </View>
                  );
                })}
                {(boardMode === 'near' ? nearBoard : boardMode === 'week' ? weekBoard : board).length === 0 && (
                  <Text style={{ color: c.textSub, textAlign: 'center', marginTop: 20 }}>
                    Hali hech kim zona olmagan
                  </Text>
                )}
                <View style={{ height: 30 }} />
              </View>
            )}
            <View style={{ height: 20 }} />
          </ScrollView>

            <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setShowBoard(false)}>
              <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
            </TouchableOpacity>
        </Sheet>
      </Modal>
      <Modal visible={showPrem} animationType="slide" transparent={true}
 
             onRequestClose={closePrem}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowPrem(false)}>
            <Text style={[styles.sheetTitle, { color: c.textMain }]}>Premium sozlamalar</Text>
 
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {plan ? (
                <TouchableOpacity activeOpacity={0.85}
                  onPress={() => { tap(); setShowPlans(true); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: plan.plan === 'free' ? c.rowBg : alpha('#F5A623', 0.13),
                    borderRadius: 16, padding: 14, marginBottom: 16,
                    borderWidth: 1,
                    borderColor: plan.plan === 'free' ? c.panelBorder : alpha('#F5A623', 0.32),
                  }}>
                  <Text style={{ fontSize: 20, marginRight: 11 }}>
                    {plan.plan === 'free' ? '\u25CB' : '\u2B50'}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{
                      color: plan.plan === 'free' ? c.textMain : '#F5A623',
                      fontSize: 14, fontWeight: '800',
                    }}>
                      {plan.name + ' tarifi'}
                    </Text>
                    <Text style={{ color: c.textSub, fontSize: 11, marginTop: 3 }}>
                      {plan.trial && plan.days_left > 0
                        ? ('\uD83C\uDF81 Bepul davr - ' + plan.days_left + ' kun qoldi')
                        : plan.days_left > 0
                          ? (plan.days_left + ' kun qoldi')
                          : plan.plan === 'free'
                            ? 'Biznes tarifida logo va banner kartada koʻrinadi'
                            : 'Barcha imkoniyatlar ochiq'}
                    </Text>
                  </View>
                  <Text style={{ color: c.textSub, fontSize: 17 }}>{'\u203A'}</Text>
                </TouchableOpacity>
              ) : null}

              <View style={{ backgroundColor: c.rowBg, borderRadius: 18, padding: 14, marginBottom: 18 }}>
                <Text style={{ color: c.textSub, fontSize: 9.5, letterSpacing: 1, marginBottom: 11 }}>KARTOCHKANGIZ SHUNDAY KOʻRINADI</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{
                    width: 46, height: 46, borderRadius: 23, overflow: 'hidden',
                    borderWidth: 2.5, borderColor: pf.logo_color || pf.zone_color || c.accent,
                    backgroundColor: alpha(pf.zone_color || c.accent, 0.16),
                    alignItems: 'center', justifyContent: 'center',
                  }}>
                    {meStats && meStats.logo ? (
                      <Image source={{ uri: meStats.logo }} style={{ width: '100%', height: '100%' }} />
                    ) : (
                      <Text style={{ color: pf.zone_color || c.accent, fontSize: 19, fontWeight: '900' }}>
                        {String(pf.zone_name || (meStats && meStats.name) || '?').charAt(0).toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '900' }} numberOfLines={1}>
                      {pf.zone_name || (meStats && meStats.name) || 'Zona nomi'}
                    </Text>
                    <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }} numberOfLines={1}>
                      {pf.address || 'Manzil kiritilmagan'}
                    </Text>
                  </View>
                </View>
                {pf.promo ? (
                  <View style={{ backgroundColor: alpha('#F5A623', 0.16), borderRadius: 10, paddingVertical: 8, paddingHorizontal: 11, marginTop: 10 }}>
                    <Text style={{ color: '#F5A623', fontSize: 12, fontWeight: '700' }} numberOfLines={1}>{pf.promo}</Text>
                  </View>
                ) : null}
              </View>

              <View style={{ flexDirection: 'row', marginBottom: 18 }}>
                {[
                  ['look',  'Koʻrinish', '\uD83C\uDFA8', '#00E5A0',
                    [!!(meStats && meStats.logo), !!(meStats && meStats.banner), !!pf.zone_color, !!pf.logo_color]],
                  ['info',  'Aloqa', '\uD83D\uDCDE', '#4CC9F0',
                    [!!pf.zone_name, !!pf.phone, !!pf.instagram, !!pf.address, !!pf.work_hours]],
                  ['promo', 'Aksiya', '\uD83C\uDF81', '#F5A623',
                    [!!pf.promo]],
                ].map(function (x, ix) {
                  const on = pfTab === x[0];
                  const filled = x[4].filter(Boolean).length;
                  const total = x[4].length;
                  const full = filled === total;
                  return (
                    <TouchableOpacity key={x[0]} onPress={() => { tap(); setPfTab(x[0]); }} activeOpacity={0.85}
                      style={{
                        flex: 1, paddingVertical: 13, borderRadius: 15,
                        marginRight: ix < 2 ? 8 : 0,
                        alignItems: 'center',
                        backgroundColor: on ? alpha(x[3], 0.18) : c.rowBg,
                        borderWidth: on ? 1.5 : 1,
                        borderColor: on ? x[3] : 'transparent',
                      }}>
                      <Text style={{ fontSize: 18, opacity: on ? 1 : 0.45 }}>{x[2]}</Text>
                      <Text style={{
                        color: on ? x[3] : c.textSub,
                        fontSize: 11.5, fontWeight: on ? '800' : '600', marginTop: 5,
                      }}>
                        {x[1]}
                      </Text>
                      <View style={{ flexDirection: 'row', marginTop: 6 }}>
                        {x[4].map(function (ok, di) {
                          return (
                            <View key={di} style={{
                              width: 5, height: 5, borderRadius: 3, marginHorizontal: 1.5,
                              backgroundColor: ok ? (full ? '#00E5A0' : x[3]) : alpha(c.textSub, 0.3),
                            }} />
                          );
                        })}
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {pfTab === 'look' ? (
                <View>
                  <Text style={[styles.fLabel, { color: c.textSub, marginTop: 0 }]}>PROFIL RASMI</Text>
                  <TouchableOpacity onPress={pickAvatar} activeOpacity={0.8}
                    style={[styles.logoPick, { borderColor: c.panelBorder }]}>
                    {meStats && (meStats.avatar || meStats.logo) ? (
                      <Image source={{ uri: meStats.avatar || meStats.logo }} style={styles.logoPreview} />
                    ) : (
                      <View style={[styles.logoPreview, { backgroundColor: alpha(c.accent, 0.12), alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 22 }}>+</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: c.textMain, fontWeight: '700', fontSize: 14 }}>
                        {meStats && (meStats.avatar || meStats.logo) ? 'Almashtirish' : 'Rasm yuklash'}
                      </Text>
                      <Text style={{ color: c.textSub, fontSize: 11, marginTop: 3 }}>
                        Kartada, reytingda va kartochkada chiqadi
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <Text style={[styles.fLabel, { color: c.textSub }]}>BANNER</Text>
                  <TouchableOpacity onPress={() => { if (bizOk) pickBanner(); else needPlan('biz'); }} activeOpacity={0.8}
                    style={[styles.logoPick, { borderColor: c.panelBorder, opacity: bizOk ? 1 : 0.55 }]}>
                    {meStats && meStats.banner ? (
                      <Image source={{ uri: meStats.banner }} style={styles.logoPreview} />
                    ) : (
                      <View style={[styles.logoPreview, { backgroundColor: alpha(c.accent, 0.12), alignItems: 'center', justifyContent: 'center' }]}>
                        <Text style={{ fontSize: 22 }}>{bizOk ? '+' : '\uD83D\uDD12'}</Text>
                      </View>
                    )}
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={{ color: c.textMain, fontWeight: '700', fontSize: 14 }}>
                        {meStats && meStats.banner ? 'Bannerni almashtirish' : 'Banner yuklash'}
                      </Text>
                      <Text style={{ color: c.textSub, fontSize: 11, marginTop: 3 }}>
                        Butun zona yuzasini qoplaydi
                      </Text>
                    </View>
                    {!bizOk ? (
                      <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: alpha('#4CC9F0', 0.16) }}>
                        <Text style={{ color: '#4CC9F0', fontSize: 9, fontWeight: '800' }}>BIZNES</Text>
                      </View>
                    ) : null}
                  </TouchableOpacity>

                  <Text style={[styles.fLabel, { color: c.textSub }]}>ZONA RANGI</Text>
                  <View style={[styles.colorBox, { backgroundColor: c.rowBg, borderColor: c.panelBorder }]}>
                    <View style={styles.colorRow}>
                      {colors.map((col) => (
                        <TouchableOpacity key={col} onPress={() => upd({ zone_color: col })} activeOpacity={0.7}
                          style={[styles.colorDot, { backgroundColor: col, shadowColor: col,
                            borderWidth: pf.zone_color === col ? 3.5 : 0, borderColor: '#FFFFFF' }]}>
                          {pf.zone_color === col ? (
                            <View style={styles.colorTick}>
                              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>{'\u2713'}</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <Text style={[styles.fLabel, { color: c.textSub }]}>LOGO HALQASI</Text>
                  <View style={[styles.colorBox, { backgroundColor: c.rowBg, borderColor: c.panelBorder }]}>
                    <View style={styles.colorRow}>
                      {colors.map((col) => (
                        <TouchableOpacity key={'lc' + col} onPress={() => upd({ logo_color: col })} activeOpacity={0.7}
                          style={[styles.colorDot, { backgroundColor: col, shadowColor: col,
                            borderWidth: pf.logo_color === col ? 3.5 : 0, borderColor: '#FFFFFF' }]}>
                          {pf.logo_color === col ? (
                            <View style={styles.colorTick}>
                              <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '900' }}>{'\u2713'}</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              ) : null}

              {pfTab === 'info' ? (
                <View>
                  <Text style={[styles.fLabel, { color: c.textSub, marginTop: 0 }]}>ZONA NOMI</Text>
                  <TextInput value={pf.zone_name} onChangeText={(t) => upd({ zone_name: t })}
                    style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                    placeholder="Doʻkon, kafe yoki ismingiz" placeholderTextColor={c.textSub} maxLength={40} />

                  <Text style={[styles.fLabel, { color: c.textSub }]}>TELEFON</Text>
                  <TextInput value={pf.phone} onChangeText={(t) => upd({ phone: t })}
                    style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                    placeholder="+998 __ ___ __ __" placeholderTextColor={c.textSub}
                    keyboardType="phone-pad" maxLength={20} />
                  <Text style={{ color: c.textSub, fontSize: 10.5, marginTop: 5 }}>Kartochkada tugma boʻlib chiqadi</Text>

                  <Text style={[styles.fLabel, { color: c.textSub }]}>INSTAGRAM</Text>
                  <TextInput value={pf.instagram} onChangeText={(t) => upd({ instagram: t })}
                    style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                    placeholder="username" placeholderTextColor={c.textSub}
                    autoCapitalize="none" maxLength={30} />

                  <Text style={[styles.fLabel, { color: c.textSub }]}>MANZIL</Text>
                  <TextInput value={pf.address} onChangeText={(t) => upd({ address: t })}
                    style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                    placeholder="Koʻcha, uy raqami" placeholderTextColor={c.textSub} maxLength={80} />

                  <Text style={[styles.fLabel, { color: c.textSub }]}>ISH VAQTI</Text>
                  <TextInput value={pf.work_hours} onChangeText={(t) => upd({ work_hours: t })}
                    style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                    placeholder="09:00 - 21:00" placeholderTextColor={c.textSub} maxLength={40} />
                </View>
              ) : null}

              {pfTab === 'promo' ? (
                <View>
                  <Text style={[styles.fLabel, { color: c.textSub, marginTop: 0 }]}>AKSIYA MATNI</Text>
                  <TextInput value={pf.promo} onChangeText={(t) => upd({ promo: t })}
                    style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                    placeholder="Masalan: Kofe 2+1" placeholderTextColor={c.textSub} maxLength={60} />
                  <Text style={{ color: c.textSub, fontSize: 11, marginTop: 7, lineHeight: 16 }}>
                    Kartochkangiz tepasida sariq ramkada chiqadi. Qisqa va aniq yozing.
                  </Text>

                  <TouchableOpacity onPress={() => { setShowPrem(false); setTimeout(() => { loadMyPhotos(); setShowPhotos(true); }, 320); }}
                    activeOpacity={0.8}
                    style={{ flexDirection: 'row', alignItems: 'center', marginTop: 18,
                      backgroundColor: c.rowBg, borderRadius: 14, padding: 14 }}>
                    <Text style={{ fontSize: 20, marginRight: 12 }}>{'\uD83D\uDCF8'}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: c.textMain, fontSize: 13.5, fontWeight: '700' }}>Bugungi rasmlar</Text>
                      <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }}>Tovar yoki taom rasmi</Text>
                    </View>
                    <Text style={{ color: c.textSub, fontSize: 17 }}>{'\u203A'}</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TouchableOpacity onPress={savePremium} disabled={savingPf}
                style={[styles.saveBig, { backgroundColor: c.accent, opacity: savingPf ? 0.6 : 1 }]}>
                {savingPf ? <ActivityIndicator color={c.accentInk} />
                  : <Text style={{ color: c.accentInk, fontWeight: '800', fontSize: 15 }}>SAQLASH</Text>}
              </TouchableOpacity>
              <View style={{ height: 360 }} />
            </ScrollView>
 
            <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]}
                              onPress={closePrem}>
              <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
            </TouchableOpacity>
        </Sheet>
      </Modal>
 
      <Modal visible={trialWin} animationType="fade" transparent={true}
        onRequestClose={() => setTrialWin(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center', padding: 30 }}>
          <Animated.View style={{
            alignItems: 'center',
            transform: [{ scale: twScale }],
            opacity: twScale,
          }}>
            <Animated.View style={{
              width: 118, height: 118, borderRadius: 59,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: 'rgba(245,166,35,0.18)',
              borderWidth: 2.5, borderColor: '#F5A623',
              shadowColor: '#F5A623', shadowRadius: 26, shadowOpacity: 0.9,
              shadowOffset: { width: 0, height: 0 },
              transform: [{
                scale: twGlow.interpolate({ inputRange: [0, 1], outputRange: [1, 1.09] }),
              }],
            }}>
              <Text style={{ fontSize: 54 }}>{'\uD83C\uDF81'}</Text>
            </Animated.View>

            <Text style={{ color: '#F5A623', fontSize: 27, fontWeight: '900', marginTop: 22, letterSpacing: 0.5 }}>
              30 KUN BEPUL
            </Text>
            <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700', marginTop: 8 }}>
              Biznes+ ochildi
            </Text>
            <Text style={{ color: '#8A96A3', fontSize: 13, marginTop: 12, textAlign: 'center', lineHeight: 20 }}>
              Logo, banner, aksiya va kunlik rasmlar{'\n'}endi kartada koʻrinadi
            </Text>

            <View style={{ marginTop: 24, width: '100%' }}>
              {[
                ['\uD83D\uDDBC', 'Banner va logo kartada'],
                ['\uD83D\uDCF8', (myPhotos.limit || 1) + ' ta rasm kuniga'],
                ['\uD83C\uDF81', 'Aksiya banneri'],
                ['\uD83D\uDCDE', 'Telefon va Instagram'],
              ].map(function (x, ix) {
                return (
                  <View key={ix} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 15, marginRight: 11 }}>{x[0]}</Text>
                    <Text style={{ color: '#C8D2DC', fontSize: 13 }}>{x[1]}</Text>
                  </View>
                );
              })}
            </View>

            <TouchableOpacity onPress={() => { tap(); setTrialWin(false); setTimeout(() => openPremium(), 320); }}
              activeOpacity={0.85}
              style={{ marginTop: 20, paddingVertical: 16, paddingHorizontal: 44, borderRadius: 16, backgroundColor: '#F5A623' }}>
              <Text style={{ color: '#0B0F14', fontSize: 14.5, fontWeight: '900' }}>SOZLASHNI BOSHLASH</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => { tap(); setTrialWin(false); }}
              style={{ marginTop: 12, paddingVertical: 10 }}>
              <Text style={{ color: '#8A96A3', fontSize: 13 }}>Keyinroq</Text>
            </TouchableOpacity>
          </Animated.View>
        </View>
      </Modal>

      <Modal visible={showAcc} animationType="slide" transparent={true}
        onRequestClose={() => setShowAcc(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowAcc(false)}>
          <Text style={[styles.sheetTitle, { color: c.textMain }]}>Hisobim</Text>

          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', paddingVertical: 18 }}>
              <View style={{
                width: 74, height: 74, borderRadius: 37, overflow: 'hidden',
                borderWidth: 2.5, borderColor: c.accent,
                backgroundColor: alpha(c.accent, 0.14),
                alignItems: 'center', justifyContent: 'center',
              }}>
                {meStats && (meStats.avatar || meStats.logo) ? (
                  <Image source={{ uri: meStats.avatar || meStats.logo }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Text style={{ color: c.accent, fontSize: 28, fontWeight: '900' }}>
                    {String((meStats && meStats.name) || '?').charAt(0).toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={{ color: c.textMain, fontSize: 18, fontWeight: '900', marginTop: 12 }}>
                {(meStats && meStats.name) || 'Oyinchi'}
              </Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                <Text style={{ fontSize: 11, marginRight: 5 }}>{'\u2705'}</Text>
                <Text style={{ color: c.textSub, fontSize: 12.5 }}>{savedAcc || (meStats && meStats.contact) || ''}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: alpha('#00E5A0', 0.10), borderRadius: 16, padding: 14, marginBottom: 14,
              borderWidth: 1, borderColor: alpha('#00E5A0', 0.25) }}>
              <Text style={{ color: '#00E5A0', fontSize: 13, fontWeight: '800' }}>Hisob himoyalangan</Text>
              <Text style={{ color: c.textSub, fontSize: 11.5, marginTop: 5, lineHeight: 17 }}>
                Telefonni almashtirsangiz yoki ilovani qayta ornatsangiz,
                shu manzil bilan kirib hamma narsani tiklaysiz.
              </Text>
            </View>

            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              {[
                ['\uD83D\uDDFA', meStats ? (meStats.hectares + ' ga') : '-', 'HUDUD'],
                ['\uD83D\uDCCD', meStats ? String(meStats.zones) : '-', 'ZONA'],
                ['\uD83C\uDFC6', meStats ? ('#' + meStats.rank) : '-', 'ORIN'],
              ].map(function (x, ix) {
                return (
                  <View key={ix} style={{ width: '31.5%', backgroundColor: c.rowBg, borderRadius: 14,
                    paddingVertical: 13, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14 }}>{x[0]}</Text>
                    <Text style={{ color: c.textMain, fontSize: 14, fontWeight: '800', marginTop: 5 }} numberOfLines={1}>{x[1]}</Text>
                    <Text style={{ color: c.textSub, fontSize: 8, letterSpacing: 0.6, marginTop: 3 }}>{x[2]}</Text>
                  </View>
                );
              })}
            </View>

            {plan ? (
              <TouchableOpacity activeOpacity={0.85}
                onPress={() => { setShowAcc(false); setTimeout(() => { loadPlan(); setShowPlans(true); }, 300); }}
                style={{ flexDirection: 'row', alignItems: 'center', marginTop: 14,
                  backgroundColor: c.rowBg, borderRadius: 14, padding: 14 }}>
                <Text style={{ fontSize: 17, marginRight: 11 }}>{plan.plan === 'free' ? '\u25CB' : '\u2B50'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.textMain, fontSize: 13.5, fontWeight: '700' }}>{plan.name + ' tarifi'}</Text>
                  <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }}>
                    {plan.days_left > 0 ? (plan.days_left + ' kun qoldi') : 'Tariflarni koʻrish'}
                  </Text>
                </View>
                <Text style={{ color: c.textSub, fontSize: 17 }}>{'\u203A'}</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity onPress={() => { setShowAcc(false); setTimeout(doLogout, 300); }}
              activeOpacity={0.85}
              style={{ marginTop: 14, paddingVertical: 14, borderRadius: 14, alignItems: 'center',
                borderWidth: 1, borderColor: alpha('#FF4D6D', 0.35) }}>
              <Text style={{ color: '#FF4D6D', fontSize: 13, fontWeight: '700' }}>Hisobdan chiqish</Text>
            </TouchableOpacity>

            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]}
            onPress={() => setShowAcc(false)}>
            <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
          </TouchableOpacity>
        </Sheet>
      </Modal>

      <Modal visible={!!updInfo} animationType="fade" transparent={false}
        onRequestClose={() => { if (updInfo && !updInfo.force) setUpdInfo(null); }}>
        <View style={{ flex: 1, backgroundColor: '#070B10', justifyContent: 'center', paddingHorizontal: 30 }}>
          <Text style={{ fontSize: 46, textAlign: 'center', marginBottom: 22 }}>{'\uD83D\uDE80'}</Text>
          <Text style={{ color: '#fff', fontSize: 23, fontWeight: '900', textAlign: 'center' }}>
            {(updInfo && updInfo.text) || 'Yangi versiya chiqdi'}
          </Text>
          <Text style={{ color: '#6E7B88', fontSize: 13.5, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
            {(updInfo && updInfo.note) || 'Yangi imkoniyatlar va tuzatishlar'}
          </Text>

          <TouchableOpacity activeOpacity={0.85}
            onPress={() => {
              const u = (updInfo && updInfo.url) || apkRef.current || APK_FALLBACK;
              Linking.openURL(u).catch(() => {});
            }}
            style={{ backgroundColor: '#00E5A0', borderRadius: 30, paddingVertical: 17, alignItems: 'center', marginTop: 34 }}>
            <Text style={{ color: '#04140E', fontSize: 14.5, fontWeight: '900', letterSpacing: 0.5 }}>YANGILASH</Text>
          </TouchableOpacity>

          {updInfo && !updInfo.force ? (
            <TouchableOpacity onPress={() => setUpdInfo(null)}
              style={{ paddingVertical: 16, alignItems: 'center', marginTop: 6 }}>
              <Text style={{ color: '#4E5A66', fontSize: 13 }}>Keyinroq</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: '#33404D', fontSize: 11.5, textAlign: 'center', marginTop: 20 }}>
              Davom etish uchun yangilash shart
            </Text>
          )}
        </View>
      </Modal>

      <Modal visible={showSkipped} animationType="slide" transparent={true}
        onRequestClose={() => setShowSkipped(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowSkipped(false)}>
          <Text style={[styles.sheetTitle, { color: c.textMain }]}>Yopilmagan zonalar</Text>
          <Text style={{ color: c.textSub, fontSize: 12.5, marginBottom: 14, lineHeight: 18 }}>
            Yo{'\u02BB'}l davomida {skippedRef.current.length} ta zona topilgan edi.
            Ularni hozir olishingiz mumkin.
          </Text>

          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 320 }}>
            {skippedRef.current.map(function (z, ix) {
              return (
                <TouchableOpacity key={ix} activeOpacity={0.85}
                  onPress={() => { tap(); takeSkipped([z]); }}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    backgroundColor: c.rowBg, borderRadius: 14,
                    padding: 14, marginBottom: 8,
                  }}>
                  <Text style={{ fontSize: 19, marginRight: 12 }}>{'\uD83D\uDCCD'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '800' }}>
                      {(z.area / 10000).toFixed(2)} gektar
                    </Text>
                    <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }}>
                      {z.loop.length} nuqta
                    </Text>
                  </View>
                  <Text style={{ color: c.accent, fontSize: 12.5, fontWeight: '700' }}>OLISH</Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {skippedRef.current.length > 1 ? (
            <TouchableOpacity activeOpacity={0.85}
              onPress={() => { tap(); takeSkipped(skippedRef.current); }}
              style={{
                backgroundColor: c.accent, borderRadius: 15,
                paddingVertical: 16, alignItems: 'center', marginTop: 6,
              }}>
              <Text style={{ color: c.accentInk, fontSize: 14.5, fontWeight: '900' }}>
                HAMMASINI OLISH ({skippedRef.current.length})
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]}
            onPress={() => { skippedRef.current = []; setSkipCount(0); AsyncStorage.removeItem('zona_skipped').catch(() => {}); setShowSkipped(false); }}>
            <Text style={{ color: c.textSub, fontSize: 14 }}>Kerak emas</Text>
          </TouchableOpacity>
        </Sheet>
      </Modal>

      <Login
        force={mustAuth}
        visible={showLogin || mustAuth}
        onClose={() => {
          setShowLogin(false);
          if (meStats && meStats.name && meStats.name.indexOf('Oyinchi') === 0 && !meStats.verified) {
            setTimeout(() => setAskAuth(true), 280);
          }
        }}
        onDone={(r) => {
          setShowLogin(false);
          setMustAuth(false);
          setAskAuth(false);
          setNeedNick(!!r.new);
          setSavedAcc(r.contact);
          const u = { user_id: r.user_id, name: r.name };
          userRef.current = u;
          setUser(u);
          setMyId(r.user_id);
          sfx('zona');
          say(r.new ? 'Hisob yaratildi!' : 'Xush kelibsiz!', 'ok');
          fetchMe(r.user_id).then(setMeStats).catch(() => {});
          loadPlan();
          refreshRemote();
        }}
      />

      <Modal visible={showPlans} animationType="slide" transparent={true}
        onRequestClose={() => setShowPlans(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowPlans(false)}>
          <Text style={[styles.sheetTitle, { color: c.textMain }]}>Tariflar</Text>

          {plan && plan.trial && plan.days_left > 0 ? (
            <View style={{
              backgroundColor: alpha('#F5A623', 0.14), borderRadius: 16,
              padding: 14, marginBottom: 16,
              borderWidth: 1, borderColor: alpha('#F5A623', 0.3),
            }}>
              <Text style={{ color: '#F5A623', fontSize: 14, fontWeight: '800' }}>
                {'\uD83C\uDF81  Bepul davr faol'}
              </Text>
              <Text style={{ color: c.textSub, fontSize: 12, marginTop: 5 }}>
                {'Biznes+ imkoniyatlari ' + plan.days_left + ' kun ochiq'}
              </Text>
            </View>
          ) : null}

          <ScrollView showsVerticalScrollIndicator={false}>
            {plan && plan.plans ? plan.plans.map(function (p) {
              const cur = plan.plan === p.code;
              const col = p.code === 'free' ? '#7A8794' : p.code === 'biz' ? '#4CC9F0' : '#F5A623';
              const RK = { free: 0, biz: 1, bizplus: 2 };
              const up = RK[p.code] > RK[plan.plan];
              const free30 = up && plan.trial_available;
              const sel = up && pickPlan === p.code;
              const best = p.code === 'bizplus';
              return (
                <TouchableOpacity key={p.code} activeOpacity={up ? 0.9 : 1}
                  onPress={() => { if (up) { tap(); setPickPlan(p.code); } }}
                  style={{
                    backgroundColor: sel ? alpha(col, 0.16) : c.rowBg,
                    borderRadius: 20, marginBottom: 12, overflow: 'hidden',
                    borderWidth: sel ? 2 : 1,
                    borderColor: sel ? col : (cur ? alpha(col, 0.5) : 'transparent'),
                  }}>

                  {best && free30 ? (
                    <View style={{ backgroundColor: col, paddingVertical: 5, alignItems: 'center' }}>
                      <Text style={{ color: '#0B0F14', fontSize: 9.5, fontWeight: '900', letterSpacing: 1 }}>
                        ENG KOʻP TANLANADI
                      </Text>
                    </View>
                  ) : null}

                  <View style={{ padding: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <Text style={{ color: col, fontSize: 16.5, fontWeight: '900' }}>{p.name}</Text>
                          {cur ? (
                            <View style={{ marginLeft: 9, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8, backgroundColor: alpha(col, 0.22) }}>
                              <Text style={{ color: col, fontSize: 9, fontWeight: '900' }}>SIZDA</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'baseline', marginTop: 7 }}>
                          {p.price === 0 ? (
                            <Text style={{ color: c.textMain, fontSize: 22, fontWeight: '900' }}>Bepul</Text>
                          ) : free30 ? (
                            <>
                              <Text style={{ color: col, fontSize: 22, fontWeight: '900' }}>0</Text>
                              <Text style={{ color: c.textSub, fontSize: 13, fontWeight: '700', textDecorationLine: 'line-through', marginLeft: 10 }}>
                                {(p.price / 1000) + ' 000'}
                              </Text>
                              <Text style={{ color: c.textSub, fontSize: 11, marginLeft: 5 }}>{'soʻm/oy'}</Text>
                            </>
                          ) : (
                            <>
                              <Text style={{ color: c.textMain, fontSize: 22, fontWeight: '900' }}>{(p.price / 1000) + ' 000'}</Text>
                              <Text style={{ color: c.textSub, fontSize: 11, marginLeft: 6 }}>{'soʻm/oy'}</Text>
                            </>
                          )}
                        </View>

                        {free30 ? (
                          <Text style={{ color: col, fontSize: 11.5, fontWeight: '800', marginTop: 5 }}>
                            {'\uD83C\uDF81  30 kun bepul, keyin ' + (p.price / 1000) + ' 000'}
                          </Text>
                        ) : null}
                      </View>

                      {up ? (
                        <View style={{
                          width: 26, height: 26, borderRadius: 13, marginTop: 3,
                          borderWidth: 2, borderColor: sel ? col : alpha(c.textSub, 0.35),
                          backgroundColor: sel ? col : 'transparent',
                          alignItems: 'center', justifyContent: 'center',
                        }}>
                          {sel ? <Text style={{ color: '#0B0F14', fontSize: 13, fontWeight: '900' }}>{'\u2713'}</Text> : null}
                        </View>
                      ) : null}
                    </View>

                    <View style={{ height: 1, backgroundColor: alpha(c.textSub, 0.13), marginVertical: 13 }} />

                    {p.feats.map(function (f, fi) {
                      return (
                        <View key={fi} style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 7 }}>
                          <Text style={{ color: col, fontSize: 11, marginRight: 9, marginTop: 1 }}>{'\u2713'}</Text>
                          <Text style={{ color: c.textSub, fontSize: 12.5, flex: 1, lineHeight: 18 }}>{f}</Text>
                        </View>
                      );
                    })}
                  </View>
                </TouchableOpacity>
              );
            }) : null}

            {(function () {
              if (!plan) return null;
              const RK2 = { free: 0, biz: 1, bizplus: 2 };
              const canUp = pickPlan && RK2[pickPlan] > RK2[plan.plan];
              const nm = pickPlan === 'biz' ? 'Biznes' : 'Biznes+';

              const anyUp = RK2['bizplus'] > RK2[plan.plan];
              if (!pickPlan && anyUp) {
                return (
                  <View style={{ paddingVertical: 16, borderRadius: 17, alignItems: 'center',
                    backgroundColor: alpha(c.textSub, 0.10), borderWidth: 1, borderColor: alpha(c.textSub, 0.2) }}>
                    <Text style={{ color: c.textSub, fontSize: 13, fontWeight: '700' }}>
                      Yuqoridan tarifni tanlang
                    </Text>
                  </View>
                );
              }

              if (plan.trial_available && canUp) {
                return (
                  <TouchableOpacity onPress={() => { tap(); doTrial(pickPlan); }} activeOpacity={0.85}
                    style={{ paddingVertical: 17, borderRadius: 17, alignItems: 'center', backgroundColor: '#F5A623' }}>
                    <Text style={{ color: '#0B0F14', fontSize: 15, fontWeight: '900' }}>
                      {'\uD83C\uDF81  30 KUN BEPUL BOSHLASH'}
                    </Text>
                    <Text style={{ color: 'rgba(11,15,20,0.72)', fontSize: 11, fontWeight: '700', marginTop: 4 }}>
                      {nm + ' - karta talab qilinmaydi'}
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (canUp) {
                return (
                  <TouchableOpacity onPress={() => { tap(); openPay(pickPlan); }} activeOpacity={0.85}
                    style={{ paddingVertical: 16, borderRadius: 17, alignItems: 'center', backgroundColor: c.accent }}>
                    <Text style={{ color: c.accentInk, fontSize: 14.5, fontWeight: '900' }}>
                      {nm.toUpperCase() + ' ULASH'}
                    </Text>
                    <Text style={{ color: alpha(c.accentInk, 0.7), fontSize: 11, marginTop: 3 }}>
                      Telegram orqali bogʻlaning
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (plan.trial && plan.days_left > 0) {
                return (
                  <TouchableOpacity activeOpacity={0.85}
                    onPress={() => { tap(); setShowPlans(false); setTimeout(() => openPremium(), 320); }}
                    style={{ paddingVertical: 16, borderRadius: 17, alignItems: 'center',
                      backgroundColor: alpha('#F5A623', 0.16),
                      borderWidth: 1.5, borderColor: alpha('#F5A623', 0.4) }}>
                    <Text style={{ color: '#F5A623', fontSize: 14.5, fontWeight: '900' }}>
                      {'\uD83C\uDF81  SINOV FAOL - SOZLASH'}
                    </Text>
                    <Text style={{ color: c.textSub, fontSize: 11.5, marginTop: 4 }}>
                      {plan.days_left + ' kun qoldi'}
                    </Text>
                  </TouchableOpacity>
                );
              }

              if (plan.plan !== 'free') {
                return (
                  <TouchableOpacity activeOpacity={0.85}
                    onPress={() => { tap(); setShowPlans(false); setTimeout(() => openPremium(), 320); }}
                    style={{ paddingVertical: 16, borderRadius: 17, alignItems: 'center',
                      backgroundColor: alpha(c.accent, 0.14) }}>
                    <Text style={{ color: c.accent, fontSize: 14, fontWeight: '900' }}>SOZLASH</Text>
                    {plan.days_left > 0 ? (
                      <Text style={{ color: c.textSub, fontSize: 11, marginTop: 3 }}>
                        {plan.days_left + ' kun qoldi'}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              }

              return null;
            })()}

            <Text style={{ color: c.textSub, fontSize: 11, textAlign: 'center', marginTop: 14, lineHeight: 16 }}>
              Hozircha barcha imkoniyatlar bepul ochiq.
              Tariflar keyinroq ishga tushadi.
            </Text>
            <View style={{ height: 20 }} />
          </ScrollView>

          <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]}
            onPress={() => setShowPlans(false)}>
            <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
          </TouchableOpacity>
        </Sheet>
      </Modal>

      <Modal visible={showPhotos} animationType="slide" transparent={true}
        onRequestClose={() => setShowPhotos(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowPhotos(false)}>
          <Text style={[styles.sheetTitle, { color: c.textMain }]}>Bugungi rasmlar</Text>

          <Text style={{ color: c.textSub, fontSize: 12, lineHeight: 18, marginBottom: 16 }}>
            Har kuni yangi rasm yuklang - tovar, taom yoki aksiya.
            Ular zonangiz kartochkasida koʻrinadi va 7 kun saqlanadi.
          </Text>

          {meStats && !meStats.premium ? (
            <View style={{ backgroundColor: alpha('#F5A623', 0.12), borderRadius: 14, padding: 14, marginBottom: 14 }}>
              <Text style={{ color: '#F5A623', fontSize: 13, fontWeight: '700' }}>Premium kerak</Text>
              <Text style={{ color: c.textSub, fontSize: 11.5, marginTop: 5, lineHeight: 16 }}>
                Bu imkoniyat biznes zonalari uchun. Premium sozlamalardan yoqing.
              </Text>
            </View>
          ) : null}

          <TouchableOpacity onPress={pickDailyPhoto} activeOpacity={0.85}
            disabled={photoBusy || myPhotos.left_today <= 0}
            style={{
              paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 16,
              backgroundColor: myPhotos.left_today > 0 ? c.accent : alpha(c.textSub, 0.12),
            }}>
            {photoBusy ? (
              <ActivityIndicator color={c.accentInk} />
            ) : (
              <Text style={{
                color: myPhotos.left_today > 0 ? c.accentInk : c.textSub,
                fontSize: 14.5, fontWeight: '800',
              }}>
                {myPhotos.left_today > 0
                  ? ('RASM YUKLASH  (' + myPhotos.left_today + ' ta qoldi)')
                  : 'BUGUNGI LIMIT TUGADI'}
              </Text>
            )}
          </TouchableOpacity>

          {myPhotos.photos.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Text style={{ fontSize: 34, opacity: 0.4 }}>{'📷'}</Text>
              <Text style={{ color: c.textSub, fontSize: 12.5, marginTop: 10 }}>Hali rasm yoʻq</Text>
            </View>
          ) : (
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={{ color: c.textSub, fontSize: 10, letterSpacing: 0.8, marginBottom: 9 }}>
                {'YUKLANGAN  ' + myPhotos.photos.length}
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                {myPhotos.photos.map((ph, ix) => (
                  <TouchableOpacity key={ix} activeOpacity={0.85}
                    onPress={() => setBigPhoto(ph.url)}
                    onLongPress={() => removeDailyPhoto(ph.url)}
                    style={{ width: '31.5%', aspectRatio: 1, borderRadius: 14, overflow: 'hidden', marginBottom: 9 }}>
                    <Image source={{ uri: ph.url }} style={{ width: '100%', height: '100%' }} />
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={{ color: c.textSub, fontSize: 10.5, textAlign: 'center', marginTop: 4 }}>
                Oʻchirish uchun rasmni bosib turing
              </Text>
              <View style={{ height: 20 }} />
            </ScrollView>
          )}

          <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]}
            onPress={() => setShowPhotos(false)}>
            <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
          </TouchableOpacity>
        </Sheet>
      </Modal>

      <Modal visible={!!bigPhoto} animationType="fade" transparent={true}
        onRequestClose={() => setBigPhoto(null)}>
        <TouchableOpacity activeOpacity={1} onPress={() => setBigPhoto(null)}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.92)', alignItems: 'center', justifyContent: 'center' }}>
          {bigPhoto ? (
            <Image source={{ uri: bigPhoto }} style={{ width: '92%', height: '70%', borderRadius: 18 }} resizeMode="contain" />
          ) : null}
          <Text style={{ color: '#8A96A3', fontSize: 12, marginTop: 18 }}>Yopish uchun bosing</Text>
        </TouchableOpacity>
      </Modal>

      <Modal visible={!!infoZone} animationType="fade" transparent={true}
             onRequestClose={() => setInfoZone(null)}>
        <View style={styles.cardWrap}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1}
                            onPress={() => setInfoZone(null)} />
          {infoZone ? (
                <View style={[styles.card, { backgroundColor: c.sheetBg, paddingTop: 0, overflow: 'hidden' }]}>

                  <View style={{ height: 5, backgroundColor: infoZone.zone_color || infoZone.color || c.accent }} />

                  <View style={{ paddingHorizontal: 18, paddingTop: 16 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <View style={{
                        width: 52, height: 52, borderRadius: 26, overflow: 'hidden',
                        borderWidth: 2.5, borderColor: infoZone.zone_color || infoZone.color || c.accent,
                        backgroundColor: alpha(infoZone.zone_color || infoZone.color || c.accent, 0.16),
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {infoZone.logo || infoZone.avatar ? (
                          <Image source={{ uri: infoZone.logo || infoZone.avatar }} style={{ width: '100%', height: '100%' }} />
                        ) : (
                          <Text style={{ color: infoZone.zone_color || infoZone.color || c.accent, fontSize: 22, fontWeight: '900' }}>
                            {String(infoZone.zone_name || infoZone.name || '?').charAt(0).toUpperCase()}
                          </Text>
                        )}
                      </View>

                      <View style={{ flex: 1, marginLeft: 13 }}>
                        <Text style={{ color: c.textMain, fontSize: 17.5, fontWeight: '900' }} numberOfLines={1}>
                          {infoZone.zone_name || infoZone.name || 'Oyinchi'}
                        </Text>
                        {infoZone.zone_name && infoZone.name ? (
                          <Text style={{ color: c.textSub, fontSize: 11.5, marginTop: 2 }} numberOfLines={1}>
                            {infoZone.name}
                          </Text>
                        ) : null}
                      </View>

                      {infoZone.views != null ? (
                        <View style={{ alignItems: 'center' }}>
                          <Text style={{ color: c.textMain, fontSize: 14, fontWeight: '800' }}>{infoZone.views}</Text>
                          <Text style={{ color: c.textSub, fontSize: 8.5, letterSpacing: 0.5 }}>KORISH</Text>
                        </View>
                      ) : null}
                    </View>

                    <View style={{
                      flexDirection: 'row', marginTop: 15, marginBottom: 4,
                      backgroundColor: alpha(infoZone.zone_color || infoZone.color || c.accent, 0.10),
                      borderRadius: 14, paddingVertical: 12,
                    }}>
                      <View style={{ flex: 1, alignItems: 'center' }}>
                        <Text style={{ color: infoZone.zone_color || infoZone.color || c.accent, fontSize: 20, fontWeight: '900' }}>
                          {(infoZone.area / 10000).toFixed(2)}
                        </Text>
                        <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 0.8 }}>GEKTAR</Text>
                      </View>
                      {infoZone.border_style ? (
                        <View style={{ flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: alpha(c.textSub, 0.18) }}>
                          <Text style={{ color: c.textMain, fontSize: 13, fontWeight: '800', marginTop: 3 }} numberOfLines={1}>
                            {String(infoZone.border_style).split('_')[0]}
                          </Text>
                          <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 0.8, marginTop: 3 }}>NAQSH</Text>
                        </View>
                      ) : null}
                    </View>

                    {cardPhotos.length > 0 ? (
                      <View style={{ marginTop: 13 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                          <Text style={{ fontSize: 12, marginRight: 6 }}>{'\uD83D\uDCF8'}</Text>
                          <Text style={{ color: c.textSub, fontSize: 10, letterSpacing: 0.8 }}>BUGUNGI RASMLAR</Text>
                        </View>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                          {cardPhotos.map((ph, ix) => (
                            <TouchableOpacity key={ix} activeOpacity={0.85}
                              onPress={() => setBigPhoto(ph.url)}
                              style={{ marginRight: 8, borderRadius: 13, overflow: 'hidden' }}>
                              <Image source={{ uri: ph.url }} style={{ width: 96, height: 96 }} />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    ) : null}

                    {infoZone.promo ? (
                      <View style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: alpha('#F5A623', 0.16), borderRadius: 13,
                        paddingVertical: 11, paddingHorizontal: 13, marginTop: 10,
                        borderWidth: 1, borderColor: alpha('#F5A623', 0.32),
                      }}>
                        <Text style={{ fontSize: 15, marginRight: 9 }}>{'\uD83C\uDF81'}</Text>
                        <Text style={{ color: '#F5A623', fontWeight: '800', fontSize: 13, flex: 1 }}>{infoZone.promo}</Text>
                      </View>
                    ) : null}

                    {infoZone.address || infoZone.work_hours ? (
                      <View style={{ marginTop: 12 }}>
                        {infoZone.address ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                            <Text style={{ fontSize: 12, marginRight: 8 }}>{'\uD83D\uDCCD'}</Text>
                            <Text style={{ color: c.textMain, fontSize: 12.5, flex: 1 }}>{infoZone.address}</Text>
                          </View>
                        ) : null}
                        {infoZone.work_hours ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={{ fontSize: 12, marginRight: 8 }}>{'\uD83D\uDD52'}</Text>
                            <Text style={{ color: c.textMain, fontSize: 12.5, flex: 1 }}>{infoZone.work_hours}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : null}

                    {infoZone.phone ? (
                      <TouchableOpacity onPress={() => {
                        const u2 = userRef.current;
                        if (u2 && infoZone.user_id) addView(infoZone.user_id, 'call');
                        Linking.openURL('tel:' + infoZone.phone);
                      }}
                        style={{ marginTop: 13, paddingVertical: 14, borderRadius: 14, alignItems: 'center', backgroundColor: c.accent }}>
                        <Text style={{ color: c.accentInk, fontWeight: '800', fontSize: 14.5 }}>{'\uD83D\uDCDE  ' + infoZone.phone}</Text>
                      </TouchableOpacity>
                    ) : null}

                    <View style={{ flexDirection: 'row', marginTop: 9 }}>
                      {infoZone.instagram ? (
                        <TouchableOpacity onPress={() => {
                          const u3 = userRef.current;
                          if (u3 && infoZone.user_id) addView(infoZone.user_id, 'insta');
                          Linking.openURL('https://instagram.com/' + infoZone.instagram);
                        }}
                          style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: c.panelBorder, marginRight: 8 }}>
                          <Text style={{ color: c.textMain, fontSize: 12.5, fontWeight: '600' }}>{'\uD83D\uDCF7  Instagram'}</Text>
                        </TouchableOpacity>
                      ) : null}
                      <TouchableOpacity onPress={() => {
                        const ct = centerOf(infoZone.coords);
                        Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=' + ct.latitude + ',' + ct.longitude);
                      }}
                        style={{ flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: c.panelBorder }}>
                        <Text style={{ color: c.textMain, fontSize: 12.5, fontWeight: '600' }}>{'\uD83E\uDDED  Yoʻl'}</Text>
                      </TouchableOpacity>
                    </View>


                    <TouchableOpacity onPress={() => {
                      const ct = centerOf(infoZone.coords);
                      setInfoZone(null);
                      followRef.current = false;
                      setFollow(false);
                      setTimeout(() => {
                        if (camRef.current) camRef.current.flyTo({ center: [ct.longitude, ct.latitude], zoom: 15.5, duration: 1100 });
                      }, 280);
                    }}
                      style={{ marginTop: 9, paddingVertical: 13, borderRadius: 13, alignItems: 'center', backgroundColor: alpha(c.accent, 0.14) }}>
                      <Text style={{ color: c.accent, fontSize: 13, fontWeight: '800' }}>KARTADA KOʻRSAT</Text>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setInfoZone(null)}
                      style={{ marginTop: 8, marginBottom: 16, paddingVertical: 12, alignItems: 'center' }}>
                      <Text style={{ color: c.textSub, fontSize: 13.5 }}>Yopish</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>
      </Modal>
 
      <Modal visible={!!infoPage} animationType="slide" transparent={true} onRequestClose={() => setInfoPage(null)}>
        <View style={styles.modalWrap}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setInfoPage(null)} />
          <View style={[styles.sheet, { backgroundColor: c.sheetBg }]}>
            <View style={[styles.handle, { backgroundColor: c.panelBorder }]} />
            <Text style={[styles.sheetTitle, { color: c.textMain }]}>
              {infoPage === 'rules' ? 'Qanday oʻynash' : infoPage === 'about' ? 'Biz haqimizda' : 'Maxfiylik siyosati'}
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {infoPage === 'rules' ? (
                <View>
                  <Text style={[styles.pgH, { color: c.accent }]}>Asosiy qoida</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>START tugmasini bosing va biror hududni piyoda aylanib chiqing. Boshlagan jo'yingizga qaytsangiz, ichkaridagi maydon sizning zonangizga aylanadi.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Zona bosib olish</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Birovning zonasini kesib o'tsangiz, kesilgan bo'lak sizga o'tadi. To'liq o'rab olsangiz - hammasi sizniki bo'ladi.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Harakat turlari</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Piyoda va velosipedda to'liq maydon beriladi. Mashinada yurilsa maydon 10 barobar kam hisoblanadi - bu piyoda yurganlarning mehnatini qadrlash uchun.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Maslahatlar</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>GPS aniqligi yashil bo'lganda boshlang. Ochiq havoda aniqlik yaxshiroq. Ekranni o'chirsangiz ham yozuv davom etadi - telefonni cho'ntakka solib yuraverishingiz mumkin.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Halollik</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Soxta GPS ilovalari aniqlanadi va zona berilmaydi. Juda tez harakat ham rad etiladi.</Text>
                </View>
              ) : infoPage === 'about' ? (
                <View>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Zona - O'zbekistonda yaratilgan GPS o'yin. Maqsad: odamlarni ko'chaga chiqarish, harakatlantirish va o'z mahallasiga qiziqtirish.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>G'oya</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Har kim o'z hududini egallaydi. Ko'p yurgan ko'p hudud oladi. Mahalla, qishloq, tuman - hammasi o'yin maydoni.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Biznes uchun</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Do'kon yoki kafe egasi o'zining hududiga logo va kontaktlarini qo'yishi mumkin. Premium tarif haqida biz bilan bog'laning.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Aloqa</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Telegram: @Xusniddin_uz</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Instagram: @xs.xusniddin</Text>
                  <Text style={[styles.pgT, { color: c.textSub }]}>Versiya 1.4 (29.07.2026)</Text>
                </View>
              ) : (
                <View>
                  <Text style={[styles.pgH, { color: c.accent }]}>Qanday ma'lumot yig'iladi</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Ilova faqat joylashuv (GPS) ma'lumotlarini yig'adi. Bu o'yin ishlashi uchun zarur - yurgan yo'lingizni chizish va zona hisoblash uchun.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Fon rejimi</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Siz START bosganingizdan keyin, ekran ochiq bo'lsa ham joylashuv yoziladi. Bu yo'lingiz uzilmasligi uchun kerak. STOP bosganingizda yozuv to'xtaydi.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Ma'lumot qayerda saqlanadi</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Zonalaringiz bizning serverimizda saqlanadi. Ism va rasm faqat siz kiritganingizda saqlanadi. Telefon raqami, kontaktlar yoki boshqa shaxsiy ma'lumotlar yig'ilmaydi.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>Kimga beriladi</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Ma'lumotlaringiz uchinchi shaxslarga sotilmaydi va berilmaydi. Boshqa o'yinchilar faqat sizning zonangiz, ismingiz va rasmingizni ko'radi.</Text>
                  <Text style={[styles.pgH, { color: c.accent }]}>O'chirish</Text>
                  <Text style={[styles.pgT, { color: c.textMain }]}>Ma'lumotlaringizni o'chirish uchun biz bilan bog'laning: Telegram @Xusniddin_uz</Text>
                </View>
              )}
              <View style={{ height: 30 }} />
            </ScrollView>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setInfoPage(null)}>
              <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showDelZones} animationType="slide" transparent={true} onRequestClose={() => setShowDelZones(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowDelZones(false)}>
            <Text style={[styles.sheetTitle, { color: c.textMain }]}>Qaysi zonani o'chirasiz?</Text>
            <Text style={{ color: c.textSub, fontSize: 12, marginBottom: 14, lineHeight: 18 }}>
              O'chirilgan zona qaytarilmaydi va gektaringiz kamayadi.
            </Text>
            <ScrollView showsVerticalScrollIndicator={false}>
              {zones.slice().sort((a, b) => b.area - a.area).map((z, ix) => (
                <TouchableOpacity key={z.id} onPress={() => delOne(z)} activeOpacity={0.7}
                  style={[styles.aRow, { backgroundColor: c.rowBg }]}>
                  <View style={[styles.dot, { backgroundColor: myColor }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '700' }}>{(z.area / 10000).toFixed(2) + ' gektar'}</Text>
                    <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }}>{(ix + 1) + '-zona'}</Text>
                  </View>
                  <Text style={{ fontSize: 18 }}>{'\uD83D\uDDD1\uFE0F'}</Text>
                </TouchableOpacity>
              ))}
              <View style={{ height: 24 }} />
            </ScrollView>
            <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setShowDelZones(false)}>
              <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
            </TouchableOpacity>
        </Sheet>
      </Modal>

      <Modal visible={showBorders} animationType="slide" transparent={true} onRequestClose={() => setShowBorders(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowBorders(false)}>
          <Text style={[styles.sheetTitle, { color: c.textMain }]}>Chegara naqshi</Text>
          {!bdData ? <SkelList n={4} bg={c.rowBg} /> : (
          <ScrollView showsVerticalScrollIndicator={false}
            scrollEventThrottle={120}
            onScroll={(e) => { if (!e || !e.nativeEvent) return; const yy = e.nativeEvent.contentOffset.y; const hh = e.nativeEvent.layoutMeasurement.height; setBdView({ y: yy, h: hh }); }}
            onLayout={(e) => { if (e && e.nativeEvent && e.nativeEvent.layout) { const hh = e.nativeEvent.layout.height; setBdView((v) => Object.assign({}, v, { h: hh })); } }}>
            {bdData.packs.map((p) => {
              const list = bdData.borders.filter((b) => b.pack === p.code);
              if (!list.length) return null;
              const rank = p.rank || 1;
              const card = rank >= 5 ? "#120C04" : rank === 4 ? "#0D0716" : rank === 3 ? "#04120E" : rank === 2 ? "#08130A" : "#0E1116";
              const label = p.how === "free" ? "BEPUL" : p.how === "task" ? "YUTUQ" : p.how === "ad" ? "REKLAMA" : "PULLIK";
              return (
                <View key={p.code} style={{ marginBottom: 26 }} onLayout={(e) => { if (e && e.nativeEvent && e.nativeEvent.layout) p._top = e.nativeEvent.layout.y; }}>

                  <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 4 }}>
                    <View style={{ width: 3, height: 20, borderRadius: 2, backgroundColor: p.col, marginRight: 9 }} />
                    <Text style={{ color: c.textMain, fontSize: 16, fontWeight: "900", letterSpacing: 0.2 }}>{p.name}</Text>
                    <View style={{ marginLeft: 9, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, backgroundColor: alpha(p.col, 0.16) }}>
                      <Text style={{ color: p.col, fontSize: 9, fontWeight: "800", letterSpacing: 0.4 }}>{label}</Text>
                    </View>
                  </View>
                  <Text style={{ color: c.textSub, fontSize: 11.5, marginLeft: 12, marginBottom: 12 }}>{p.hint}</Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" }}>
                    {list.map((b) => {
                      const on = bdData.current === b.code;
                      return (
                        <TouchableOpacity key={b.code} activeOpacity={0.85}
                          onLayout={(e) => { if (e && e.nativeEvent && e.nativeEvent.layout) b._y = e.nativeEvent.layout.y; }}
                          onPress={() => { tap(); pickBorder(b); }}
                          style={{
                            width: "48%", alignItems: "center",
                            paddingVertical: rank >= 4 ? 20 : 15, marginBottom: 11,
                            borderRadius: 20,
                            backgroundColor: card,
                            borderWidth: on ? 2 : 1,
                            borderColor: on ? c.accent : alpha(p.col, rank >= 4 ? 0.5 : 0.2),
                            shadowColor: p.col,
                            shadowOpacity: rank >= 4 ? 0.5 : 0,
                            shadowRadius: rank >= 4 ? 16 : 0,
                            shadowOffset: { width: 0, height: 5 },
                            elevation: rank >= 4 ? 8 : 0,
                            opacity: b.owned ? 1 : 0.75,
                          }}>
                          <BorderPreview code={b.code} size={rank >= 4 ? 94 : 78} locked={!b.owned}
                            live={bdVisible(b, p, bdView)} />
                          <Text style={{ color: "#FFFFFF", fontSize: 12.5, fontWeight: "800", marginTop: 8 }}>{b.name}</Text>
                          {b.owned ? (
                            <Text style={{ color: on ? c.accent : "#8A96A3", fontSize: 10, marginTop: 4, fontWeight: on ? "900" : "500", letterSpacing: on ? 0.5 : 0 }}>
                              {on ? "TANLANGAN" : "Ochiq"}
                            </Text>
                          ) : (
                            <View style={{ flexDirection: "row", alignItems: "center", marginTop: 4 }}>
                              <Text style={{ fontSize: 9, marginRight: 4 }}>{"\uD83D\uDD12"}</Text>
                              <Text style={{ color: "#8A96A3", fontSize: 10 }}>
                                {b.price ? (b.price / 100).toFixed(0) + " 000" : b.ad ? "Reklama" : "Yutuq"}
                              </Text>
                            </View>
                          )}
                          {b.tier >= 3 ? (
                            <View style={{ marginTop: 6, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6, backgroundColor: alpha(p.col, 0.14) }}>
                              <Text style={{ color: p.col, fontSize: 8, letterSpacing: 0.4, fontWeight: "700" }}>UZOQDAN KO'RINADI</Text>
                            </View>
                          ) : null}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              );
            })}
            <View style={{ height: 24 }} />
          </ScrollView>
          )}
          <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setShowBorders(false)}>
            <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
          </TouchableOpacity>
        </Sheet>
      </Modal>



      <Modal visible={showTasks} animationType="slide" transparent={true} onRequestClose={() => setShowTasks(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowTasks(false)}>
          {!tasks ? <SkelList n={5} bg={c.rowBg} /> : (
          <ScrollView showsVerticalScrollIndicator={false}>

            <View style={{
              backgroundColor: alpha('#F5A623', 0.12), borderRadius: 20,
              paddingVertical: 18, paddingHorizontal: 16, marginBottom: 18,
              borderWidth: 1, borderColor: alpha('#F5A623', 0.3),
            }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 34 }}>{'\uD83D\uDD25'}</Text>
                <View style={{ marginLeft: 12, flex: 1 }}>
                  <Text style={{ color: '#F5A623', fontSize: 28, fontWeight: '900', lineHeight: 32 }}>
                    {tasks.streak}
                  </Text>
                  <Text style={{ color: c.textSub, fontSize: 11.5 }}>
                    {tasks.streak === 0 ? 'Seriya boshlanmagan' : 'kun ketma-ket'}
                  </Text>
                </View>
                {tasks.best_streak > 0 ? (
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ color: c.textMain, fontSize: 16, fontWeight: '800' }}>{tasks.best_streak}</Text>
                    <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 0.5 }}>REKORD</Text>
                  </View>
                ) : null}
              </View>
              <Text style={{ color: c.textSub, fontSize: 11, marginTop: 10, lineHeight: 16 }}>
                Har kuni kamida 1 gektar oling - seriya uzilmaydi
              </Text>
            </View>

            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
              <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '900' }}>Bugungi vazifalar</Text>
              <View style={{ marginLeft: 9, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9, backgroundColor: alpha(c.accent, 0.16) }}>
                <Text style={{ color: c.accent, fontSize: 10.5, fontWeight: '800' }}>{tasks.done_count + ' / ' + tasks.daily.length}</Text>
              </View>
            </View>

            {tasks.daily.map((t) => {
              const pct = Math.min(100, Math.round((t.now / (t.goal || 1)) * 100));
              const qoldi = Math.max(0, (t.goal || 0) - (t.now || 0));
              return (
                <View key={t.code} style={{
                  backgroundColor: t.done ? alpha(c.accent, 0.10) : c.rowBg,
                  borderRadius: 16, padding: 14, marginBottom: 9,
                  borderWidth: t.done ? 1 : 0, borderColor: alpha(c.accent, 0.3),
                }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={{ fontSize: 19, marginRight: 11, opacity: t.done ? 1 : 0.5 }}>{t.icon}</Text>
                    <Text style={{ color: c.textMain, fontSize: 14, fontWeight: '700', flex: 1 }}>{t.name}</Text>
                    {t.done ? (
                      <Text style={{ color: c.accent, fontSize: 11.5, fontWeight: '800' }}>BAJARILDI</Text>
                    ) : (
                      <Text style={{ color: c.textSub, fontSize: 11.5, fontWeight: '700' }}>{pct + '%'}</Text>
                    )}
                  </View>
                  <View style={{ height: 7, borderRadius: 4, backgroundColor: alpha(c.textSub, 0.15), marginTop: 10, overflow: 'hidden' }}>
                    <View style={{ height: 7, borderRadius: 4, width: pct + '%', backgroundColor: t.done ? c.accent : alpha(c.accent, 0.55) }} />
                  </View>
                  <Text style={{ color: c.textSub, fontSize: 11, marginTop: 7 }}>
                    {t.done ? ('Tayyor - ' + t.goal + ' ' + (t.unit || '')) : ('Yana ' + (qoldi % 1 === 0 ? qoldi : qoldi.toFixed(1)) + ' ' + (t.unit || '') + ' kerak')}
                  </Text>
                </View>
              );
            })}

            {(function () {
              const ochiq = tasks.achievements.filter((a) => a.done);
              const yopiq = tasks.achievements.filter((a) => !a.done);
              const keyingi = yopiq.slice(0, 3);
              return (
                <View style={{ marginTop: 20 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '900' }}>Yutuqlar</Text>
                    <View style={{ marginLeft: 9, paddingHorizontal: 9, paddingVertical: 3, borderRadius: 9, backgroundColor: alpha('#F5A623', 0.16) }}>
                      <Text style={{ color: '#F5A623', fontSize: 10.5, fontWeight: '800' }}>{tasks.ach_done + ' / ' + tasks.achievements.length}</Text>
                    </View>
                  </View>

                  {keyingi.length ? (
                    <Text style={{ color: c.textSub, fontSize: 10.5, letterSpacing: 0.8, marginBottom: 8 }}>KEYINGI MAQSAD</Text>
                  ) : null}
                  {keyingi.map((a) => (
                    <View key={a.code} style={{
                      flexDirection: 'row', alignItems: 'center',
                      backgroundColor: c.rowBg, borderRadius: 14, padding: 12, marginBottom: 8,
                    }}>
                      <Text style={{ fontSize: 20, marginRight: 11, opacity: 0.35 }}>{a.icon}</Text>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMain, fontSize: 13.5, fontWeight: '700' }}>{a.name}</Text>
                        <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }}>{a.desc}</Text>
                        {a.reward ? (
                          <TouchableOpacity activeOpacity={0.7}
                            onPress={() => { tap(); setShowRw(showRw === a.code ? null : a.code); }}
                            style={{ flexDirection: 'row', alignItems: 'center', marginTop: 7,
                              alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 6,
                              borderRadius: 10, backgroundColor: alpha(c.accent, 0.12) }}>
                            <Text style={{ fontSize: 11, marginRight: 5 }}>{'\uD83C\uDF81'}</Text>
                            <Text style={{ color: c.accent, fontSize: 10.5, fontWeight: '700' }}>
                              {a.reward.name}
                            </Text>
                            <Text style={{ color: c.accent, fontSize: 9, marginLeft: 6, opacity: 0.7 }}>
                              {showRw === a.code ? '\u25B2' : '\u25BC'}
                            </Text>
                          </TouchableOpacity>
                        ) : null}
                        {a.reward && showRw === a.code ? (
                          <FadeIn style={{ alignItems: 'center', marginTop: 10, paddingVertical: 12,
                            borderRadius: 14, backgroundColor: '#0E1116' }}>
                            <BorderPreview code={a.reward.code} size={72} locked={!a.done} live={true} />
                            <Text style={{ color: '#FFFFFF', fontSize: 11.5, fontWeight: '700', marginTop: 7 }}>
                              {a.reward.name}
                            </Text>
                            <Text style={{ color: '#8A96A3', fontSize: 10, marginTop: 3 }}>
                              {a.done ? 'Ochilgan' : 'Yutuqni bajaring'}
                            </Text>
                          </FadeIn>
                        ) : null}
                      </View>
                    </View>
                  ))}

                  {ochiq.length ? (
                    <Text style={{ color: c.textSub, fontSize: 10.5, letterSpacing: 0.8, marginTop: 14, marginBottom: 8 }}>QOLGA KIRITILGAN</Text>
                  ) : null}
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                    {ochiq.map((a) => (
                      <View key={a.code} style={{
                        flexDirection: 'row', alignItems: 'center',
                        backgroundColor: alpha(c.accent, 0.12), borderRadius: 13,
                        paddingHorizontal: 11, paddingVertical: 8, marginRight: 7, marginBottom: 7,
                        borderWidth: 1, borderColor: alpha(c.accent, 0.25),
                      }}>
                        <Text style={{ fontSize: 14, marginRight: 6 }}>{a.icon}</Text>
                        <Text style={{ color: c.textMain, fontSize: 11.5, fontWeight: '700' }}>{a.name}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              );
            })()}

            <View style={{ height: 24 }} />
          </ScrollView>
          )}
          <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setShowTasks(false)}>
            <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
          </TouchableOpacity>
        </Sheet>
      </Modal>

      <Modal visible={showSfx} animationType="slide" transparent={true} onRequestClose={() => setShowSfx(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowSfx(false)}>
          <Text style={[styles.sheetTitle, { color: c.textMain }]}>Ovozlarni sinash</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {[['ready','Halqa yopilganda'],['zona','Zona olinganda'],['zona_big','Katta zona'],['lost','Zona qoʻlga oʻtganda'],['daily','Kunlik vazifa'],['start','START'],['stop','STOP']].map(([k, l]) => (
              <TouchableOpacity key={k} onPress={() => sfx(k)} activeOpacity={0.7}
                style={[styles.aRow, { backgroundColor: c.rowBg, paddingVertical: 16 }]}>
                <Text style={{ fontSize: 20, marginRight: 14 }}>{'\u25B6'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '700' }}>{l}</Text>
                  <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }}>{k + '.mp3'}</Text>
                </View>
              </TouchableOpacity>
            ))}
            <View style={{ height: 24 }} />
          </ScrollView>
          <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setShowSfx(false)}>
            <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
          </TouchableOpacity>
        </Sheet>
      </Modal>

      <Modal visible={showSearch} animationType="slide" transparent={true} onRequestClose={() => setShowSearch(false)}>
        <View style={[styles.modalWrap, { justifyContent: 'flex-start', paddingTop: 70 }]}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setShowSearch(false)} />
          <View style={[styles.sheet, { backgroundColor: c.sheetBg }]}>
            <View style={[styles.handle, { backgroundColor: c.panelBorder }]} />
            <Text style={[styles.sheetTitle, { color: c.textMain }]}>Joy qidirish</Text>

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <TextInput
                value={searchQ}
                onChangeText={setSearchQ}
                onSubmitEditing={doSearch}
                returnKeyType="search"
                style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder, flex: 1, marginRight: 8 }]}
                placeholder="Joy nomi yoki manzil"
                placeholderTextColor={c.textSub}
                autoFocus
              />
              <TouchableOpacity onPress={doSearch} disabled={searching}
                style={[styles.pendBtn, { backgroundColor: c.accent, paddingHorizontal: 20, opacity: searching ? 0.6 : 1 }]}>
                {searching ? <ActivityIndicator color={c.accentInk} /> : <Text style={{ color: c.accentInk, fontWeight: '800', fontSize: 13 }}>QIDIR</Text>}
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {searchRes.map((pl, ix) => (
                <TouchableOpacity key={ix} onPress={() => goToPlace(pl)} activeOpacity={0.7}
                  style={[styles.aRow, { backgroundColor: c.rowBg }]}>
                  <Text style={{ fontSize: 17, marginRight: 10 }}>{'\uD83D\uDCCD'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: c.textMain, fontSize: 14, fontWeight: '600' }}>{pl.name}</Text>
                    <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }} numberOfLines={1}>{pl.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
              <View style={{ height: 300 }} />
            </ScrollView>

            <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setShowSearch(false)}>
              <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showAdmin} animationType="slide" transparent={true} onRequestClose={() => setShowAdmin(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowAdmin(false)}>
            <Text style={[styles.sheetTitle, { color: c.textMain }]}>Admin</Text>

            {!adminData ? (
              <View style={{ paddingBottom: 300 }}>
                <TextInput value={adminKey} onChangeText={setAdminKey}
                  style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                  placeholder="Kalit" placeholderTextColor={c.textSub}
                  autoCapitalize="none" secureTextEntry />
                <View style={{ height: 8 }} />
                <TouchableOpacity onPress={() => loadAdmin()} disabled={adminLoading}
                  style={[styles.saveBig, { backgroundColor: c.accent, opacity: adminLoading ? 0.6 : 1 }]}>
                  {adminLoading ? <ActivityIndicator color={c.accentInk} /> : <Text style={{ color: c.accentInk, fontWeight: '800' }}>KIRISH</Text>}
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 12 }}>
                  {[['online','HOZIR'],['today_users','BUGUN'],['new_today','YANGI'],['users','JAMI'],['zones','ZONA'],['hectares','GEKTAR'],['new_week','HAFTA+'],['today','BUGUN ZONA']].map(([k,l]) => (
                    <View key={k} style={[styles.aStat, { backgroundColor: alpha(c.accent, 0.1) }]}>
                      <Text style={{ color: c.accent, fontSize: 17, fontWeight: '800' }}>{String(adminData.stats[k])}</Text>
                      <Text style={{ color: c.textSub, fontSize: 8, letterSpacing: 1 }}>{l}</Text>
                    </View>
                  ))}
                </View>

                {adminData.online.length > 0 ? (
                  <View style={{ marginBottom: 12 }}>
                    <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 1, marginBottom: 6 }}>{'HOZIR FAOL (' + adminData.online.length + ')'}</Text>
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                      {adminData.online.map((o, ix) => (
                        <View key={ix} style={[styles.aChip, { backgroundColor: c.rowBg }]}>
                          <View style={[styles.dot, { backgroundColor: o.color || c.accent }]} />
                          <Text style={{ color: c.textMain, fontSize: 12 }}>{o.name}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                ) : null}

                <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                  {[['live','Jonli'],['users','Foyd'],['zones','Zona'],['sus','Shubha']].map(([k,l]) => (
                    <TouchableOpacity key={k} onPress={() => setAdminTab(k)}
                      style={[styles.aTab, { backgroundColor: adminTab === k ? c.accent : c.rowBg }]}>
                      <Text style={{ color: adminTab === k ? c.accentInk : c.textSub, fontSize: 11, fontWeight: '700' }}>{l}</Text>
                    </TouchableOpacity>
                  ))}
                  <TouchableOpacity onPress={() => loadAdmin()} style={[styles.aTab, { backgroundColor: c.rowBg }]}>
                    <Text style={{ color: c.textSub, fontSize: 11 }}>{'\u21BB'}</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                  {adminTab === 'live' ? (adminData.activity.length ? adminData.activity.map((a, ix) => (
                    <View key={ix} style={[styles.aRow, { backgroundColor: c.rowBg }]}>
                      <View style={[styles.dot, { backgroundColor: a.color || c.accent }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMain, fontSize: 13, fontWeight: '600' }}>{a.name + '  +' + a.hectares + ' ga' + (a.mode === 'avto' ? '  (avto)' : '')}</Text>
                        {a.captured > 0 ? <Text style={{ color: '#FF4D6D', fontSize: 11, marginTop: 2 }}>{a.captured + ' ga tortib oldi' + (a.victim ? ' - ' + a.victim : '')}</Text> : null}
                        <Text style={{ color: c.textSub, fontSize: 10, marginTop: 2 }}>{a.when}</Text>
                      </View>
                    </View>
                  )) : <Text style={{ color: c.textSub, padding: 20, textAlign: 'center' }}>Harakat yo'q</Text>)
                  : adminTab === 'users' ? adminData.users.map((u) => (
                    <View key={u.id} style={[styles.aRow, { backgroundColor: c.rowBg }]}>
                      <View style={[styles.dot, { backgroundColor: u.color || c.accent }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMain, fontSize: 13, fontWeight: '600' }}>{u.name + (u.premium ? '  PRO' : '')}</Text>
                        <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }}>{u.hectares + ' ga  -  ' + u.zones + ' zona  -  ' + u.seen}</Text>
                      </View>
                      {u.avatar ? <Image source={{ uri: u.avatar }} style={styles.aImg} /> : null}
                      {u.logo ? <Image source={{ uri: u.logo }} style={styles.aImg} /> : null}
                    </View>
                  ))
                  : adminTab === 'zones' ? adminData.zones.map((zz) => (
                    <View key={zz.id} style={[styles.aRow, { backgroundColor: c.rowBg }]}>
                      <View style={[styles.dot, { backgroundColor: zz.color || c.accent }]} />
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMain, fontSize: 13 }}>{zz.name + '  ' + zz.hectares + ' ga'}</Text>
                        <Text style={{ color: c.textSub, fontSize: 10, marginTop: 2 }}>{zz.when}</Text>
                      </View>
                    </View>
                  ))
                  : (adminData.suspicious.length ? adminData.suspicious.map((sx, ix) => (
                    <View key={ix} style={[styles.aRow, { backgroundColor: alpha('#F5A623', 0.1) }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={{ color: c.textMain, fontSize: 13, fontWeight: '600' }}>{sx.name}</Text>
                        <Text style={{ color: '#F5A623', fontSize: 11, marginTop: 2 }}>{sx.reason + '  ' + sx.hectares}</Text>
                      </View>
                    </View>
                  )) : <Text style={{ color: c.textSub, padding: 20, textAlign: 'center' }}>Shubhali yo'q</Text>)}
                  <View style={{ height: 24 }} />
                </ScrollView>
              </View>
            )}

            <TouchableOpacity onPress={() => { setShowAdmin(false); setTimeout(() => setShowSfx(true), 350); }} activeOpacity={0.7}
              style={[styles.aRow, { backgroundColor: c.rowBg, marginTop: 10 }]}>
              <Text style={{ fontSize: 18, marginRight: 12 }}>{'\uD83C\uDFB5'}</Text>
              <Text style={{ color: c.textMain, fontSize: 14, fontWeight: '600' }}>Ovozlarni sinash</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setShowAdmin(false)}>
              <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
            </TouchableOpacity>
        </Sheet>
      </Modal>

      <Modal visible={askAuth} animationType="fade" transparent={true}
        onRequestClose={() => {}}>
        <View style={{ flex: 1, backgroundColor: '#070B10', justifyContent: 'center', paddingHorizontal: 30 }}>
          <Text style={{ fontSize: 44, textAlign: 'center', marginBottom: 20 }}>{'\uD83D\uDC4B'}</Text>
          <Text style={{ color: '#fff', fontSize: 24, fontWeight: '900', textAlign: 'center' }}>
            Xush kelibsiz
          </Text>
          <Text style={{ color: '#6E7B88', fontSize: 13.5, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
            Avval Zonada o'ynaganmisiz?{'\n'}Hisobingizga kiring - hamma narsa joyida qoladi.
          </Text>

          <TouchableOpacity activeOpacity={0.85}
            onPress={() => {
              tap();
              AsyncStorage.setItem('zona_asked_auth', '1').catch(() => {});
              setAskAuth(false);
              setTimeout(() => setShowLogin(true), 280);
            }}
            style={{ backgroundColor: '#00E5A0', borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginTop: 32 }}>
            <Text style={{ color: '#04140E', fontSize: 15, fontWeight: '900', letterSpacing: 0.8 }}>HISOBIMGA KIRISH</Text>
          </TouchableOpacity>

          <TouchableOpacity activeOpacity={0.85}
            onPress={() => {
              tap();
              AsyncStorage.setItem('zona_asked_auth', '1').catch(() => {});
              setAskAuth(false);
              setTimeout(() => setNeedNick(true), 280);
            }}
            style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center', marginTop: 12,
              borderWidth: 1, borderColor: '#1B2530' }}>
            <Text style={{ color: '#C8D2DC', fontSize: 14, fontWeight: '700' }}>YANGI BOSHLASH</Text>
          </TouchableOpacity>

          <Text style={{ color: '#3A4652', fontSize: 11, textAlign: 'center', marginTop: 20, lineHeight: 16 }}>
            Keyinroq ham kirishingiz mumkin.{'\n'}Menyudan "Hisobni saqlash" ni bosing.
          </Text>
        </View>
      </Modal>

      <Modal visible={needNick} animationType="fade" transparent={true} onRequestClose={() => {}}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={styles.introWrap}>
          <View style={[styles.introCard, { backgroundColor: c.sheetBg }]}>
            <View style={[styles.introDot, { backgroundColor: c.accent }]} />
                <TouchableOpacity
                  onPress={() => { tap(); setNeedNick(false); setTimeout(() => setAskAuth(true), 250); }}
                  hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                  style={{ position: 'absolute', top: 12, left: 14, zIndex: 5, padding: 6 }}>
                  <Text style={{ color: c.textSub, fontSize: 21 }}>{'\u2039'}</Text>
                </TouchableOpacity>
            <Text style={[styles.introTitle, { color: c.textMain }]}>Nik tanlang</Text>
            <Text style={[styles.pgT, { color: c.textSub, marginBottom: 14 }]}>Bu nom reytingda va zonangizda korinadi. Har bir nik yagona - boshqa hech kim uni ololmaydi.</Text>
            <TextInput
              value={nick}
              onChangeText={(t) => { setNick(t); setNickState(''); }}
              style={[styles.fInput, { color: c.textMain, borderColor: nickState && nickState !== 'Tekshirilmoqda...' ? '#FF4D6D' : c.panelBorder, fontSize: 17 }]}
              placeholder="Foydalanuvchi nomi"
              placeholderTextColor={c.textSub}
              autoCapitalize="none"
              maxLength={20}
            />
            {nickState ? (
              <Text style={{ color: nickState === 'Tekshirilmoqda...' ? c.textSub : '#FF4D6D', fontSize: 12, marginTop: 8 }}>{nickState}</Text>
            ) : null}
            <TouchableOpacity onPress={saveNick} disabled={savingNick}
              style={[styles.introBtn, { backgroundColor: c.accent, opacity: savingNick ? 0.6 : 1 }]}>
              {savingNick ? <ActivityIndicator color={c.accentInk} /> : <Text style={{ color: c.accentInk, fontWeight: '800', fontSize: 15 }}>SAQLASH</Text>}
            </TouchableOpacity>
          </View>
        </View>
        </KeyboardAvoidingView>
      </Modal>

      {celebrate ? (
        <Celebrate hectares={celebrate.ha} captured={celebrate.cap} onDone={() => setCelebrate(null)} />
      ) : null}

      {showIntro && !needNick && !askAuth ? (
        <Onboard onDone={() => { AsyncStorage.setItem('zona_intro_v14', '1').catch(() => {}); setShowIntro(false); }} />
      ) : null}

      {splash && (
        <Animated.View style={[styles.splash, { opacity: spFade }]} pointerEvents="none">
          <Animated.View
            style={[styles.spRingOuter, {
              opacity: spLogo.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0.5, 1] }),
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0.65, 1] }) },
                { rotate: spPulse.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
              ],
            }]}
          />
          <Animated.View
            style={[styles.spRingMid, {
              opacity: spLogo,
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0.8, 1] }) },
                { rotate: spPulse.interpolate({ inputRange: [0, 1], outputRange: ['360deg', '0deg'] }) },
              ],
            }]}
          />
          <Animated.View
            style={[styles.spHalo, {
              opacity: spLogo.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
              transform: [{ scale: spPulse.interpolate({ inputRange: [0, 0.5, 1], outputRange: [1, 1.35, 1] }) }],
            }]}
          />
          <Animated.View
            style={[styles.spCore, {
              opacity: spLogo,
              transform: [
                { scale: spLogo.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0.1, 1.12, 1] }) },
                { rotate: spLogo.interpolate({ inputRange: [0, 1], outputRange: ['-45deg', '0deg'] }) },
              ],
            }]}
          />
          <Animated.Text
            style={[styles.spTitle, {
              opacity: spText,
              transform: [{ translateY: spText.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }],
            }]}
          >
            ZONA
          </Animated.Text>
          <Animated.View style={[styles.spLine, { opacity: spText, transform: [{ scaleX: spText }] }]} />
          <Animated.Text
            style={[styles.spSub, {
              opacity: spText.interpolate({ inputRange: [0, 0.6, 1], outputRange: [0, 0, 1] }),
              transform: [{ translateY: spText.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }],
            }]}
          >
            HUDUDINGNI EGALLA
          </Animated.Text>
        </Animated.View>
      )}

      <Toast
        msg={toast2 ? toast2.msg : null}
        kind={toast2 ? toast2.kind : 'info'}
        bg={isDark ? '#1A222C' : '#1E2630'}
        onDone={() => setToast2(null)}
      />


      <StatusBar style={c.bar} />
    </View>
  );
}
 
const styles = StyleSheet.create({
  hintBox: { position: 'absolute', top: 190, left: 24, right: 24, alignItems: 'center' },
  hintInner: { paddingHorizontal: 22, paddingVertical: 20, borderRadius: 22, borderWidth: 1, alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  warnBox: { position: 'absolute', top: 148, left: 16, right: 16, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 11, borderRadius: 14, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 12, shadowOffset: { width: 0, height: 4 }, elevation: 8 },
  pendBox: { position: 'absolute', bottom: 175, left: 16, right: 16, padding: 16, borderRadius: 20, borderWidth: 1.5, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 16, shadowOffset: { width: 0, height: 6 }, elevation: 10 },
  pendBtn: { paddingVertical: 13, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  pendGlow: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 20 },
  pendDot: { width: 14, height: 14, borderRadius: 7 },

  streakTag: { marginLeft: 'auto', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  infoChip: { position: 'absolute', top: 148, left: 16, right: 16, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1 },

  stCell: { flex: 1, alignItems: 'center' },

  aStat: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginRight: 8, marginBottom: 8, alignItems: 'center', minWidth: 62 },
  aChip: { flexDirection: 'row', alignItems: 'center', borderRadius: 16, paddingHorizontal: 10, paddingVertical: 5, marginRight: 6, marginBottom: 6 },
  aTab: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 10, marginRight: 6 },
  aRow: { flexDirection: 'row', alignItems: 'center', padding: 11, borderRadius: 12, marginBottom: 6 },
  aImg: { width: 34, height: 34, borderRadius: 10, marginLeft: 6 },

  pgH: { fontSize: 13, fontWeight: '800', letterSpacing: 1, marginTop: 18, marginBottom: 6 },
  pgT: { fontSize: 14, lineHeight: 22 },

  introWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.6)', padding: 24 },
  introCard: { width: '100%', borderRadius: 26, padding: 24 },
  introDot: { width: 42, height: 42, borderRadius: 16, marginBottom: 16 },
  introTitle: { fontSize: 24, fontWeight: '900', marginBottom: 16, letterSpacing: -0.5 },
  introTxt: { fontSize: 14, lineHeight: 24, marginBottom: 4 },
  introWarn: { padding: 14, borderRadius: 14, marginTop: 16 },
  introBtn: { marginTop: 20, paddingVertical: 15, borderRadius: 18, alignItems: 'center' },

  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#070B10',
    alignItems: 'center', justifyContent: 'center',
    zIndex: 999,
  },
  spRingOuter: {
    position: 'absolute', width: 230, height: 230, borderRadius: 115,
    borderWidth: 1, borderColor: 'rgba(0,229,160,0.16)', marginTop: -70,
    borderStyle: 'dashed',
  },
  spRingMid: {
    position: 'absolute', width: 152, height: 152, borderRadius: 76,
    borderWidth: 1.5, borderColor: 'rgba(0,229,160,0.35)', marginTop: -70,
    borderTopColor: 'rgba(0,229,160,0.9)', borderRightColor: 'rgba(0,229,160,0.05)',
  },
  spHalo: {
    position: 'absolute', width: 120, height: 120, borderRadius: 60,
    backgroundColor: 'rgba(0,229,160,0.22)', marginTop: -70,
  },
  spCore: {
    position: 'absolute', width: 66, height: 66, borderRadius: 26,
    backgroundColor: '#00E5A0', marginTop: -70,
    shadowColor: '#00E5A0', shadowOpacity: 1, shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 }, elevation: 24,
  },
  spTitle: {
    color: '#FFFFFF', fontSize: 44, fontWeight: '900', marginTop: 140, letterSpacing: 14,
  },
  spLine: {
    width: 70, height: 3, borderRadius: 2,
    backgroundColor: '#00E5A0', marginTop: 18,
  },
  spSub: {
    color: '#5A6874', fontSize: 10, letterSpacing: 5, marginTop: 18, fontWeight: '600',
  },

  container: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 30 },
 
  topPanel: {
    position: 'absolute', top: 58, left: 66, right: 66,
    flexDirection: 'row', borderRadius: 18, borderWidth: 1, paddingVertical: 10,
  },
  statBox: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: 17, fontWeight: '700' },
  statLabel: { fontSize: 8, letterSpacing: 1.5, marginTop: 2 },
  divider: { width: 1, marginVertical: 6 },
 
  gpsChip: {
    position: 'absolute', top: 112, alignSelf: 'center',
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 5,
    borderRadius: 12, borderWidth: 1,
  },
  gpsDot: { width: 7, height: 7, borderRadius: 4, marginRight: 7 },
 
  taskBtn: { position: 'absolute', right: 16, top: 110, width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  taskDot: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  searchBtn: { position: 'absolute', right: 16, top: 58, width: 48, height: 48, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  menuBtn: {
    position: 'absolute', left: 16, top: 58,
    width: 48, height: 48, borderRadius: 20, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  burgerLine: { width: 18, height: 2, borderRadius: 1 },
 
  toast: {
    position: 'absolute', bottom: 175, alignSelf: 'center',
    paddingHorizontal: 32, paddingVertical: 18, borderRadius: 24,
    alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 }, elevation: 10,
  },
  toastText: { fontSize: 34, fontWeight: '900', letterSpacing: -1 },
  toastSub: { fontSize: 10, letterSpacing: 3, marginTop: 3, opacity: 0.85, fontWeight: '700' },
 
  meWrap: { alignItems: 'center', justifyContent: 'center', width: 80, height: 80 },
  meGlow: { position: 'absolute', width: 76, height: 76, borderRadius: 38 },
  meDisc: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#FFFFFF', shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 10 },
  meArrowTxt: { color: '#FFFFFF', fontSize: 18, transform: [{ rotate: '-90deg' }], marginTop: -1 },

  nameTag: { marginTop: 3, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 7, maxWidth: 90 },
  nameTxt: { color: '#FFFFFF', fontSize: 9, fontWeight: '800' },
  markWrap: { width: 110, height: 72, alignItems: 'center', justifyContent: 'flex-start' },
  miniLogo: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FFFFFF' },
 
  avatarBig: {
    width: 54, height: 54, borderRadius: 27, borderWidth: 2,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
  },
  avatarBigImg: { width: '100%', height: '100%' },
 
  themeQuick: {
    position: 'absolute', right: 18, bottom: 240,
    width: 40, height: 40, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5,
  },
  locateBtn: {
    position: 'absolute', right: 18, bottom: 185,
    width: 48, height: 48, borderRadius: 21, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  locateRing: { width: 13, height: 13, borderRadius: 7, borderWidth: 3 },
 
  startDot: {
    width: 16, height: 16, borderRadius: 8,
    borderWidth: 4, backgroundColor: '#FFFFFF',
  },
 
  bottomArea: { position: 'absolute', bottom: 52, left: 0, right: 0, alignItems: 'center' },
  modeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 18, borderWidth: 1, marginBottom: 14,
  },
  startBtn: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: 'center', justifyContent: 'center',
    shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 0 }, elevation: 12,
  },
  startText: { fontSize: 15, fontWeight: '800', letterSpacing: 1.5 },
 
  drawer: {
    position: 'absolute', top: 0, bottom: 0, left: 0,
    paddingTop: 56, elevation: 16,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16,
    shadowOffset: { width: 4, height: 0 },
  },
  drawerHead: { paddingHorizontal: 20, paddingBottom: 18 },
  drawerAvatar: {
    width: 60, height: 60, borderRadius: 26, borderWidth: 2.5,
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 10,
  },
  drawerName: { fontSize: 18, fontWeight: '800' },
  premTag: {
    alignSelf: 'flex-start', marginTop: 8,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8,
  },
  drawerSep: { height: 1, marginHorizontal: 20 },
  mSec: { color: '#7A8794', fontSize: 9.5, letterSpacing: 1.6, marginTop: 16, marginBottom: 10, marginLeft: 4, fontWeight: '700' },
  mGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  mCell: { width: '48.5%', borderRadius: 16, paddingVertical: 17, alignItems: 'center', marginBottom: 9 },
  mCellTxt: { fontSize: 12.5, fontWeight: '600', marginTop: 7 },
  mBadge: { position: 'absolute', top: 8, right: 10, paddingHorizontal: 7, paddingVertical: 2.5, borderRadius: 7 },
  drawerItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 15, paddingHorizontal: 20,
  },
  drawerTxt: { fontSize: 15, fontWeight: '600' },
 
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    borderTopLeftRadius: 30, borderTopRightRadius: 30,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 24, shadowOffset: { width: 0, height: -6 }, elevation: 24,
    paddingHorizontal: 18, paddingTop: 10, paddingBottom: 18,
    maxHeight: '82%',
  },
  handle: { width: 42, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 12 },
  sheetTitle: { fontSize: 22, fontWeight: '800', marginBottom: 14 },
 
  meCard: { borderRadius: 18, borderWidth: 1, padding: 14, marginBottom: 12 },
  meName: { fontSize: 17, fontWeight: '700' },
  meRow: { flexDirection: 'row' },
  meBox: { flex: 1, alignItems: 'center' },
  meVal: { fontSize: 19, fontWeight: '800' },
  meLbl: { fontSize: 9, letterSpacing: 1.5, marginTop: 2 },
  input: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 8, fontSize: 15, marginRight: 8,
  },
  saveBtn: { paddingHorizontal: 18, paddingVertical: 14, borderRadius: 12 },
 
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 11, paddingHorizontal: 12,
    borderRadius: 14, marginBottom: 6,
  },
  rank: { width: 26, fontSize: 14, fontWeight: '700' },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600' },
  rowHa: { fontSize: 13 },
 
  fLabel: { fontSize: 10, letterSpacing: 1.5, marginTop: 14, marginBottom: 6 },
  fInput: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap' },
  colorDot: { width: 30, height: 30, borderRadius: 15, marginRight: 8, marginBottom: 8, shadowOpacity: 0.35, shadowRadius: 5, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  colorBox: { borderRadius: 16, padding: 12, borderWidth: 1, marginTop: 6 },
  colorTick: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
  logoPick: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderRadius: 14, padding: 10 },
  logoPreview: { width: 52, height: 52, borderRadius: 22 },
  saveBig: { marginTop: 20, paddingVertical: 14, borderRadius: 16, alignItems: 'center' },
 
  cardWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', borderRadius: 24, padding: 20, overflow: 'hidden' },
  cardBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 5 },
  cardTitle: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  viewBadge: { position: 'absolute', top: 16, right: 16, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  cardSub: { fontSize: 12, marginTop: 4, marginBottom: 12 },
  promoBox: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, marginBottom: 12 },
  cardRow: { fontSize: 14, marginBottom: 8 },
  cardBtn: { paddingVertical: 13, borderRadius: 14, alignItems: 'center', marginTop: 8 },
  cardBtnOutline: { paddingVertical: 13, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginTop: 8 },
 
  closeBtn: {
    marginTop: 8, paddingVertical: 12, borderRadius: 16,
    borderWidth: 1, alignItems: 'center',
  },
});
 































































































































































































































































































































































































































































































