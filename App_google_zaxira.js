import { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, ActivityIndicator, Alert, Animated, Modal, ScrollView, TextInput, Image, Linking, Dimensions, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Easing } from 'react-native';
import MapView, { Polyline, Marker, Polygon, Overlay } from 'react-native-maps';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import * as Battery from 'expo-battery';
import { Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Onboard from './Onboard';
import Celebrate from './Celebrate';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import { LOCATION_TASK, getBuffer, clearBuffer, loadBgBuffer, clearBgBuffer } from './locationTask';
import { distanceM, polygonAreaM2, findLoop, smoothPolygon, resetLoopCache } from './geo';
import ErrorBoundary from './ErrorBoundary';
import ZoneBorder, { NAMES } from './ZoneBorder';
import { initSfx, sfx, isSoundOn, setSoundOn } from './sfx';
import { Press, Skel, SkelRow, SkelList, SkelCard, SkelStats, FadeIn, Sheet, Empty, Toast, tap, tapMed, tapOk, tapErr } from './ui';
import { saveZones, loadZones, clearZones, saveTrack, loadTrack, clearTrack } from './storage';
import { ensureUser, pushZone, fetchZones, fetchLeaderboard, fetchMe, setName, uploadAvatar, updateProfile, fetchColors, uploadLogo, uploadBanner, checkName, fetchAdmin, savePushToken, fetchNearby, fetchWeekly, fetchStats, fetchDaily, fetchAround, deleteMyZones, searchPlace, suggestPlace, placeDetails, addView, fetchViews, deleteOneZone, fetchTasks } from './api';
 
const MIN_AREA_M2 = 60;
const MIN_STEP_M = 2;
const SCREEN_W = Dimensions.get('window').width;
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
  const [bStyle, setBStyle] = useState(0);
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

  const say = (msg, kind) => {
    setToast2({ msg: msg, kind: kind || 'info', id: Date.now() });
    if (kind === 'ok') tapOk();
    else if (kind === 'err') tapErr();
    else tap();
  };

  const mapRef = useRef(null);
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
  const warnRef = useRef(false);
  const sendingRef = useRef(false);
  const zoneStartRef = useRef(0);
  const secRef = useRef(0);
  const lastMoveRef = useRef(0);
  const lastSaveRef = useRef(0);
  const pendBgRef = useRef([]);
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
  const [trackLogo, setTrackLogo] = useState(true);
  const [warn, setWarn] = useState(null);
  const moveTimerRef = useRef(null);
  const pendingRef = useRef(null);
  const dismissedRef = useRef(0);
  const dismissedAreaRef = useRef(0);
  const toastAnim = useRef(new Animated.Value(0)).current;
  const drawerAnim = useRef(new Animated.Value(-DRAWER_W)).current;
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
          if (m && m.name && m.name.indexOf('Oyinchi') === 0) setNeedNick(true);
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

  const APK_URL = 'https://expo.dev/accounts/xusniddinuz/projects/zona/builds/a811373f-5657-4859-aa99-c833a36e9dbb';
  const NL = String.fromCharCode(10);
  const inviteFriend = async () => {
    try {
      const me = meStats ? meStats.name : 'Men';
      const ha = meStats ? meStats.hectares : 0;
      await Share.share({ message: 'ZONA - kochada yurib hudud egallash oyini!' + NL + NL + me + ' allaqachon ' + ha + ' gektar egalladi.' + NL + 'Qoshil va uning hududini bosib ol!' + NL + NL + APK_URL });
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
      await Share.share({ message: 'ZONA oyinida ' + ha + ' gektar hudud egalladim! (' + zn + ' ta zona)' + NL + NL + APK_URL });
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
    loadTrack().then((t) => {
      if (!t || !t.path || t.path.length < 2) return;
      const age = Date.now() - (t.at || 0);
      if (age > 30 * 24 * 3600 * 1000) { clearTrack(); return; }
      const km = ((t.dist || 0) / 1000).toFixed(2);
      setTimeout(() => {
        Alert.alert(
          'Tugallanmagan yol',
        km + ' km yurgan yolingiz saqlangan. Davom ettirasizmi?',
          [
            { text: 'Yoq', style: 'cancel', onPress: () => clearTrack() },
            { text: 'Davom', onPress: () => {
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
            } },
          ]
        );
      }, 2500);
    }).catch(() => {});
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
      if (lc) fetchAround(lc.latitude, lc.longitude).then(setAround).catch(() => {});
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
          if (!on) setWarn('Joylashuv (GPS) ochirilgan - sozlamalardan yoqing');
          else if (idle > 90000) setWarn('90 soniyadan beri harakat yoq - GPS ishlayaptimi?');
        }).catch(() => {});
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
        if (lvl > 0 && lvl < 0.18) setWarn('Batareya ' + Math.round(lvl * 100) + '% - quvvat tugasa yol saqlanadi');
        sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
          if (batteryLevel > 0 && batteryLevel < 0.12)
            setWarn('Batareya ' + Math.round(batteryLevel * 100) + '% - tez orada ochadi');
        });
      } catch (e) {}
    })();
    return () => { if (sub) sub.remove(); };
  }, [tracking]);

  useEffect(() => {
    setTrackLogo(true);
    const t = setTimeout(() => setTrackLogo(false), 4000);
    return () => clearTimeout(t);
  }, [remoteZones.length, zones.length]);

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
      say('Internet yoq yoki qidiruv ishlamadi', 'err');
    }
    setSearching(false);
  };

  const goToPlace = async (pl) => {
    let dest = pl;
    if (pl.id && pl.lat == null) {
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
    if (mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: pl.lat, longitude: pl.lon,
        latitudeDelta: 0.02, longitudeDelta: 0.02,
      }, 900);
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
      if (u) fetchViews(u.user_id).then(setMyViews).catch(() => {});
    };
    const t = setTimeout(load, 3000);
    const id = setInterval(load, 5000);
    return () => { clearTimeout(t); clearInterval(id); };
  }, []);

  useEffect(() => {
    if (tracking) { setShowHint(false); return; }
    if (zones.length > 0) { setShowHint(false); return; }
    const t = setTimeout(() => setShowHint(true), 2500);
    return () => clearTimeout(t);
  }, [tracking, zones.length]);

  const delMyZones = () => {
    if (!zones.length) { say('Hali zona olmagansiz', 'warn'); return; }
    setShowDelZones(true);
  };

  const delOne = (z) => {
    const u = userRef.current;
    if (!u) return;
    Alert.alert(
      'Zonani ochirish',
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
            say(String(e.message || 'Ochirilmadi'), 'err');
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
          setWarn('Joylashuv (GPS) ochirilgan - sozlamalardan yoqing');
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
        await pushZone(u.user_id, item.loop, item.area, { duration: item.dur, mocked: false });
        queueRef.current = queueRef.current.filter((q) => q !== item);
        AsyncStorage.setItem('zona_queue', JSON.stringify(queueRef.current)).catch(() => {});
        say('Navbatdagi zona yuborildi', 'ok');
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
      if (u) fetchTasks(u.user_id).then(setTasks).catch(() => {});
    };
    const t0 = setTimeout(loadT, 2000);
    const idT = setInterval(loadT, 30000);
    return () => { clearTimeout(t0); clearInterval(idT); };
  }, []);

  const openMenu = () => {
    setMenuOpen(true);
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  };
 
  const closeMenu = (after) => {
    Animated.parallel([
      Animated.timing(drawerAnim, { toValue: -DRAWER_W, duration: 240, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 0, duration: 240, useNativeDriver: true }),
    ]).start(() => {
      setMenuOpen(false);
      if (after) after();
    });
  };
  const refreshRemote = async () => {
    const v = viewRef.current;
    const loc = locRef.current;
    const center = v ? { latitude: v.latitude, longitude: v.longitude } : loc;
    if (!center) return;
    const rad = v ? Math.max(Math.min(v.latitudeDelta * 111000 * 1.3, 900000), 1500) : 5000;
    try {
      const list = await fetchZones(center.latitude, center.longitude, rad);
      const mine = userRef.current ? userRef.current.user_id : null;
      setRemoteZones(list.filter((z) => z.user_id !== mine));
      const my = list.filter((z) => z.user_id === mine);
      const atHome = !v || (loc && Math.abs(center.latitude - loc.latitude) < 0.03 && Math.abs(center.longitude - loc.longitude) < 0.03);
      if (atHome) {
        const myHa = my.reduce((t, q) => t + (q.area || 0), 0);
        const oldHa = myHaRef.current || 0;
        if (oldHa > 0 && myHa > 0 && myHa < oldHa * 0.92) {
          sfx('lost');
          Alert.alert('Zonangiz qolga otdi', 'Kimdir zonangizni bosib oldi');
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
      if (trackingRef.current) setWarn('Server bilan aloqa yoq - zonalar yangilanmayapti');
    }
  };
 
  useEffect(() => {
    const id = setInterval(refreshRemote, 8000);
    const t = setTimeout(refreshRemote, 3000);
    return () => { clearInterval(id); clearTimeout(t); };
  }, []);
 
  const openBoard = async () => {
    setShowBoard(true);
    setBoardLoading(true);
    try {
      const top = await fetchLeaderboard();
      setBoard(top);
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
      Alert.alert('Xato', String(e.message || 'Kalit notogri'));
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
    if (!/^[A-Za-z0-9_]+$/.test(nm)) { setNickState('Faqat harf, raqam va _'); return; }
    setSavingNick(true);
    setNickState('Tekshirilmoqda...');
    try {
      let free = true;
      try { free = await checkName(nm); }
      catch (x) { setNickState('Internet yoq - tekshirib bolmadi'); setSavingNick(false); return; }
      if (!free) { setNickState('Bu nik band'); setSavingNick(false); return; }
      await setName(u.user_id, nm);
      const m = await fetchMe(u.user_id);
      setMeStats(m);
      setNeedNick(false);
      setNickState('');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } catch (e) {
      setNickState(String(e.message || 'Internet yoq - qayta urining'));
    }
    setSavingNick(false);
  };

  const saveName = async () => {
    const u = userRef.current;
    if (!u) return;
    const nm = nameInput.trim();
    if (nm.length < 2) {
      Alert.alert('Ism qisqa', 'Kamida 2 ta harf yozing');
      return;
    }
    try {
      await setName(u.user_id, nm);
      setEditName(false);
      openBoard();
    } catch (e) {
      Alert.alert('Xato', 'Ism saqlanmadi');
    }
  };
 
  const pickAvatar = async () => {
    const u = userRef.current;
    if (!u) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Ruxsat kerak', 'Galereyaga ruxsat bering');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (res.canceled) return;
 
    setUploading(true);
    try {
      await uploadAvatar(u.user_id, res.assets[0].uri);
      Alert.alert('Yuborildi', 'Rasm tekshiruvdan otgach zonalaringizda korinadi');
      openBoard();
    } catch (e) {
      Alert.alert('Rasm yuklanmadi', 'Internet bor-yoqligini tekshiring yoki kichikroq rasm tanlang.');
    }
    setUploading(false);
  };
 
  const pickLogo = async () => {
    const u = userRef.current;
    if (!u) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Ruxsat kerak', 'Galereyaga ruxsat bering'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.9,
    });
    if (res.canceled) return;
    setUploading(true);
    try {
      await uploadLogo(u.user_id, res.assets[0].uri);
      Alert.alert('Yuborildi', 'Logo qoyildi');
      const m = await fetchMe(u.user_id);
      setMeStats(m);
    } catch (e) { Alert.alert('Logo yuklanmadi', String(e.message || '') + String.fromCharCode(10) + 'Internet bor-yoqligini tekshiring yoki kichikroq rasm tanlang.'); }
    setUploading(false);
  };

  const pickBanner = async () => {
    const u = userRef.current;
    if (!u) return;
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { Alert.alert('Ruxsat kerak', 'Galereyaga ruxsat bering'); return; }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false, quality: 0.9,
    });
    if (res.canceled) return;
    setUploading(true);
    try {
      await uploadBanner(u.user_id, res.assets[0].uri);
      const m = await fetchMe(u.user_id);
      setMeStats(m);
      refreshRemote();
      Alert.alert('Tayyor', 'Banner zonangizga qoyildi');
    } catch (e) { Alert.alert('Banner yuklanmadi', String(e.message || '') + String.fromCharCode(10) + 'Internet bor-yoqligini tekshiring yoki kichikroq rasm tanlang.'); }
    setUploading(false);
  };

  const openPremium = async () => {
    if (!meStats) return;
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
 
  const processPoint = (lat, lon, accuracy, timestamp) => {
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
    if (d < MIN_STEP_M) return false;
    if (d / dt > 70) return false;
 
    lastMoveRef.current = Date.now();
    lastPointRef.current = { ...pt, t: timestamp };
    distRef.current += d;

    pathRef.current = [...pathRef.current, pt];
 
    const res = findLoop(pathRef.current);
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
            }, 4200);
      zoneStartRef.current = Date.now();
      pushZone(u.user_id, p.loop, p.area, { duration: dur, mocked: mockedRef.current })
        .then((r) => {
          sendingRef.current = false;
          setOnline(true);
          if (r && r.captured > 0) {
            const ha2 = (r.captured_area / 10000).toFixed(2);
            const who = (r.captured_from || []).join(', ');
            setTimeout(() => {
              Alert.alert('Hudud tortib olindi!', ha2 + ' gektar sizga otdi. Kimdan: ' + who);
            }, 600);
          }
          refreshRemote();
        })
        .catch((err) => {
          sendingRef.current = false;
          setOnline(false);
              if (queueRef.current.length < 20) queueRef.current.push({ loop: p.loop, area: p.area, dur: dur });
              AsyncStorage.setItem('zona_queue', JSON.stringify(queueRef.current)).catch(() => {});
              setWarn('Internet yoq - zona navbatda, aloqa kelganda yuboriladi');
          setZones((z) => {
            const nz = z.filter((q) => q.id !== newId);
            saveZones(nz);
            return nz;
          });
          setTimeout(() => Alert.alert('Zona qabul qilinmadi', String(err.message || 'Xato')), 400);
        });
    }

    const lastPt = pathRef.current[pathRef.current.length - 1];
    const cutAt = (p.cutIndex != null && p.cutIndex >= 0) ? p.cutIndex : 0;
    const tail = pathRef.current.slice(cutAt);
    resetLoopCache();
    pathRef.current = tail.length >= 2 ? [tail[0], lastPt] : (lastPt ? [lastPt] : []);
    pendingRef.current = null;
    setPending(null);
    setPath([...pathRef.current]);
  };

  const dismissZone = () => {
    dismissedAreaRef.current = pendingRef.current ? pendingRef.current.area : 0;
    pendingRef.current = null;
    setPending(null);
    dismissedRef.current = Date.now();
  };

  const flush = () => {
    const pp = pathRef.current;
    setPath(pp.length > 900 ? pp.slice(-900) : [...pp]);
    setDistance(distRef.current);
    const nw = Date.now();
    if (trackingRef.current && pathRef.current.length > 1 && nw - lastSaveRef.current > 8000) {
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
        mapRef.current.animateCamera({ center: lastPt, heading: hd, zoom: zm, pitch: is3D ? 60 : 0 }, { duration: 900 });
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
            if (!trackingRef.current && followRef.current && mapRef.current) {
              const nc = Date.now();
              if (nc - lastCamRef.current > 3000) {
                lastCamRef.current = nc;
                mapRef.current.animateCamera({
                  center: { latitude: pos.coords.latitude, longitude: pos.coords.longitude },
                  heading: 0, pitch: is3D ? 60 : 0,
                }, { duration: 900 });
              }
            }
            const ok = processPoint(
              pos.coords.latitude, pos.coords.longitude,
              pos.coords.accuracy, pos.timestamp
            );
            if (ok) flush();
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
        fresh = pendBgRef.current.slice(0, 400);
        pendBgRef.current = pendBgRef.current.slice(400);
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
      if (fresh.length === 0) return;
      fresh.sort((a, b) => a.timestamp - b.timestamp);
      if (fresh.length > 400) {
        pendBgRef.current = fresh.slice(400).concat(pendBgRef.current || []);
        fresh = fresh.slice(0, 400);
      }
      let changed = false;
      for (const p of fresh) {
        if (processPoint(p.latitude, p.longitude, p.accuracy, p.timestamp)) changed = true;
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
        Alert.alert('Joylashuv ochirilgan', 'Telefon sozlamalaridan joylashuvni (GPS) yoqing va qayta urining.');
        return;
      }
    } catch (e) {}
    const fg = await Location.requestForegroundPermissionsAsync();
    if (fg.status !== 'granted') {
      Alert.alert('Joylashuv ruxsati kerak', 'Zona ishlashi uchun joylashuv kerak. Sozlamalar - Ilovalar - Zona - Ruxsatlar - Joylashuv.');
      return;
    }
    const bg = await Location.requestBackgroundPermissionsAsync();
    if (bg.status !== 'granted') {
      Alert.alert('Fon rejimi', 'Sozlamalarda "Har doim ruxsat berish" ni tanlang');
      setWarn('Fon rejimi yoq - ekranni ochirmang');
    }
    try {
      const lvl = await Battery.getBatteryLevelAsync();
      const saver = await Battery.isLowPowerModeEnabledAsync();
      if (saver) setWarn('Batareya tejash yoqilgan - GPS uzilishi mumkin');
      else if (lvl > 0 && lvl < 0.15) setWarn('Batareya ' + Math.round(lvl * 100) + '% - quvvat oling');
    } catch (e) {}
 
    if (!resume) {
      clearBuffer();
      clearBgBuffer();
      readIndexRef.current = 0;
      lastPointRef.current = null;
      distRef.current = 0;
    }
    if (!resume) {
      resetLoopCache();
      pathRef.current = [];
      setPath([]);
      setDistance(0);
      setSeconds(0);
    }
 
    await Location.startLocationUpdatesAsync(LOCATION_TASK, {
      accuracy: Location.Accuracy.BestForNavigation,
      timeInterval: 800,
      distanceInterval: 1,
      showsBackgroundLocationIndicator: true,
      foregroundService: {
        notificationTitle: 'Zona yozmoqda',
          notificationBody: 'Yurgan yolingiz kartada chizilmoqda',
        notificationColor: '#00E5A0',
      },
      pausesUpdatesAutomatically: false,
    });
 
    if (!locRef.current) setWarn('GPS hali topilmadi - biroz kuting');
    else {
      setWarn('Telefonni chontakka soling - yolingiz yozilaveradi. Vaqti-vaqti bilan ilovaga qarab turing.');
      setTimeout(() => setWarn((w) => (w && w.indexOf('Telefonni chontakka') === 0) ? null : w), 8000);
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
    clearTrack();
    refreshRemote();
  };
 
  const toggleTracking = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    if (tracking && pendingRef.current) {
      const hh = (pendingRef.current.area / 10000).toFixed(2);
      Alert.alert('Tayyor zona bor',
        hh + ' gektar zona yopilmagan. STOP bossangiz yoqoladi.',
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
    if (location && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.003,
        longitudeDelta: 0.003,
      }, 600);
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

      {zoomDelta < 0.02 && zones.length > 0 ? (
        <View style={{ position: 'absolute', bottom: 240, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{NAMES[bStyle]}</Text>
        </View>
      ) : null}

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

      {zoomDelta < 0.02 && zones.length > 0 ? (
        <View style={{ position: 'absolute', bottom: 240, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{NAMES[bStyle]}</Text>
        </View>
      ) : null}

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
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        key={isDark ? 'dark' : 'light'}
        customMapStyle={isDark ? DARK_MAP : LIGHT_MAP}
        initialRegion={{
          latitude: location.latitude,
          longitude: location.longitude,
          latitudeDelta: 0.003,
          longitudeDelta: 0.003,
        }}
        showsUserLocation={true}
        showsMyLocationButton={false}
        showsCompass={false}
        toolbarEnabled={false}
        onPanDrag={() => {
          if (followRef.current) { followRef.current = false; setFollow(false); }
          if (followTimerRef.current) clearTimeout(followTimerRef.current);
          followTimerRef.current = setTimeout(() => { followRef.current = true; setFollow(true); lastCamRef.current = 0; }, 10000);
        }}
        onRegionChangeComplete={(rg) => {
          setZoomDelta(rg.latitudeDelta);
          const old = viewRef.current;
          viewRef.current = rg;
          const moved = !old || Math.abs(old.latitude - rg.latitude) > rg.latitudeDelta * 0.3
            || Math.abs(old.longitude - rg.longitude) > rg.longitudeDelta * 0.3
            || Math.abs(old.latitudeDelta - rg.latitudeDelta) > old.latitudeDelta * 0.3;
          if (moved) {
            if (moveTimerRef.current) clearTimeout(moveTimerRef.current);
            moveTimerRef.current = setTimeout(() => { refreshRemote(); }, 500);
          }
        }}
      >
        {visibleRemote.map((z) => (
          <Polygon
            key={z.id}
            coordinates={z.coords}
            fillColor={z.img ? 'rgba(0,0,0,0)' : alpha(z.zone_color || z.color, 0.22)}
            strokeColor={z.zone_color || z.color || '#888888'}
            strokeWidth={2}
            zIndex={1}
            tappable={true}
            onPress={() => setInfoZone(z)}
          />
        ))}
 
        {visibleRemote.filter((z) => z.img && z.img_bounds).map((z) => {
          return <Overlay key={'ov' + z.id} image={{ uri: z.img }} bounds={z.img_bounds} zIndex={0} />;
        })}

        {visibleRemote.filter((z) => z.logo || z.avatar).map((z) => (
          <Marker
            key={'mk' + z.id}
            coordinate={cornerOf(z.coords)}
            tracksViewChanges={trackLogo}
            zIndex={Math.round(z.area / 100)}
            image={{ uri: z.logo || z.avatar, width: 22, height: 22 }}
          />
        ))}
 
        {zones.map((z) => (
          <Polygon
            key={z.id}
            coordinates={z.coords}
            fillColor={myZoneImgs.some((q) => q.id === z.id) ? 'rgba(0,0,0,0)' : (meStats && meStats.zone_color ? alpha(meStats.zone_color, 0.25) : c.zoneFill)}
            strokeColor={zoomDelta < 0.02 ? 'rgba(0,0,0,0)' : myColor}
            strokeWidth={3}
            zIndex={20}
            tappable={true}
            onPress={() => setInfoZone(Object.assign({}, meStats || {}, { area: z.area, coords: z.coords, views: myViews ? myViews.all.unique : 0 }))}
          />
        ))}

        {zoomDelta < 0.02 ? zones.map((z) => (
          <ZoneBorder
            key={'zb' + z.id}
            coords={z.coords}
            color={myColor}
            area={z.area}
            active={true}
            zIndex={25}
            onName={setBStyle}
            onStyle={setBStyle}
          />
        )) : null}
 
        {myZoneImgs.map((z) => {
          return <Overlay key={'myov' + z.id} image={{ uri: z.img }} bounds={z.img_bounds} zIndex={10} />;
        })}
        {(meStats && (meStats.logo || meStats.avatar)) ? zones.map((z) => (

          <Marker
            key={'mymk' + z.id}
            coordinate={cornerOf(z.coords)}
            tracksViewChanges={trackLogo}
            zIndex={Math.round(z.area / 100)}
            image={{ uri: meStats.logo || meStats.avatar, width: 22, height: 22 }}
          />
        )) : null}
 

        {path.length > 1 && (
          <Polyline
            coordinates={path}
            strokeColor={speed > 11 ? '#F5A623' : myColor}
            strokeWidth={8}
            lineCap="round"
            lineJoin="round"
            zIndex={100}
          />
        )}
        {path.length > 0 && (
          <Marker coordinate={path[0]} anchor={{ x: 0.5, y: 0.5 }}>
            <View style={[styles.startDot, { borderColor: myColor }]} />
          </Marker>
        )}
      </MapView>
 
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
            mapRef.current.animateCamera({ pitch: n3 ? 60 : 0 }, { duration: 700 });
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
          style={[styles.warnBox, { backgroundColor: 'rgba(245,166,35,0.95)' }]}>
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
            <Text style={{ fontSize: 26, marginBottom: 8 }}>{'\uD83D\uDC63'}</Text>
            <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '800', marginBottom: 6 }}>Birinchi zonangizni oling</Text>
            <Text style={{ color: c.textSub, fontSize: 12.5, lineHeight: 19, textAlign: 'center' }}>
              START bosing, kochada yuring va boshlangan jo'yingizga qayting.
            </Text>
            <Text style={{ color: c.textSub, fontSize: 11, marginTop: 10, opacity: 0.7 }}>Ichkarisidagi hudud sizniki bo'ladi</Text>
          </View>
        </FadeIn>
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
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.45)', opacity: fadeAnim }]}>
            <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={() => closeMenu()} />
          </Animated.View>
 
          <Animated.View
            style={[
              styles.drawer,
              { backgroundColor: c.sheetBg, width: DRAWER_W, transform: [{ translateX: drawerAnim }] },
            ]}
          >
            <View style={styles.drawerHead}>
              <View style={[styles.drawerAvatar, { borderColor: myColor, backgroundColor: alpha(myColor, 0.15) }]}>
                {myAvatar
                  ? <Image source={{ uri: myAvatar }} style={{ width: '100%', height: '100%' }} />
                  : <Text style={{ fontSize: 22 }}>{'\uD83D\uDC64'}</Text>}
              </View>
              <Text style={[styles.drawerName, { color: c.textMain }]} numberOfLines={1}>
                {meStats ? meStats.name : 'Oyinchi'}
              </Text>
              <Text style={{ color: c.textSub, fontSize: 12, marginTop: 2 }}>
                {meStats ? (meStats.hectares + ' gektar  -  ' + meStats.zones + ' zona') : ''}
              </Text>
              {meStats && meStats.premium && (
                <View style={[styles.premTag, { backgroundColor: alpha(c.accent, 0.18) }]}>
                  <Text style={{ color: c.accent, fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>PREMIUM</Text>
                </View>
              )}
            </View>
 
            <View style={[styles.drawerSep, { backgroundColor: c.panelBorder }]} />
            <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }}>
 
            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(inviteFriend)} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\uD83D\uDC65'}</Text>
              <Text style={[styles.drawerTxt, { color: c.accent }]}>Dostni taklif qilish</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(shareZone)} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\uD83D\uDCE4'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>Natijamni ulashish</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(openBoard)} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\uD83C\uDFC6'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>Reyting</Text>
            </TouchableOpacity>
 
            {meStats && meStats.premium && (
              <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(openPremium)} activeOpacity={0.7}>
                <Text style={{ fontSize: 19, width: 32 }}>{'\u2699\uFE0F'}</Text>
                <Text style={[styles.drawerTxt, { color: c.textMain }]}>Premium sozlamalar</Text>
              </TouchableOpacity>
            )}
 
            {meStats && meStats.premium && zones.length > 0 && (
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => closeMenu(() => setInfoZone(Object.assign({}, meStats, { area: zones[0].area, coords: zones[0].coords, views: myViews ? myViews.all.unique : 0 })))}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 19, width: 32 }}>{'\uD83D\uDCC7'}</Text>
                <Text style={[styles.drawerTxt, { color: c.textMain }]}>Kartochkam</Text>
              </TouchableOpacity>
            )}
 
            <TouchableOpacity style={styles.drawerItem} onPress={() => setIsDark(!isDark)} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{isDark ? '\u2600\uFE0F' : '\uD83C\uDF19'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>{isDark ? 'Kunduzgi rejim' : 'Tungi rejim'}</Text>
            </TouchableOpacity>
 
            <TouchableOpacity style={styles.drawerItem} onPress={() => { const n = !soundOn; setSoundOnState(n); setSoundOn(n); if (n) sfx('ready'); }} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{soundOn ? '\uD83D\uDD0A' : '\uD83D\uDD07'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>{soundOn ? 'Ovoz yoqilgan' : 'Ovoz ochirilgan'}</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(() => setShowIntro(true))} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\uD83C\uDFAC'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>Qo'llanmani ko'rish</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(() => setInfoPage('rules'))} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\uD83D\uDCD6'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>Qanday o'ynash</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(() => setInfoPage('about'))} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\u2139\uFE0F'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>Biz haqimizda</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(() => Linking.openURL('https://t.me/Xusniddin_uz'))} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\uD83D\uDCAC'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>Xato haqida xabar berish</Text>
            </TouchableOpacity>


            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(() => setInfoPage('privacy'))} onLongPress={() => closeMenu(openAdmin)} delayLongPress={3000} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\uD83D\uDD12'}</Text>
              <Text style={[styles.drawerTxt, { color: c.textMain }]}>Maxfiylik siyosati</Text>
            </TouchableOpacity>
            <View style={[styles.drawerSep, { backgroundColor: c.panelBorder, marginTop: 8, marginBottom: 8 }]} />
            <TouchableOpacity style={styles.drawerItem} onPress={() => closeMenu(delMyZones)} activeOpacity={0.7}>
              <Text style={{ fontSize: 19, width: 32 }}>{'\uD83D\uDDD1\uFE0F'}</Text>
              <Text style={[styles.drawerTxt, { color: '#FF4D6D' }]}>Zonani o'chirish</Text>
            </TouchableOpacity>


 
            <View style={{ height: 20 }} />
            </ScrollView>
            <View style={[styles.drawerSep, { backgroundColor: c.panelBorder }]} />
            <Text style={{ color: c.textSub, fontSize: 11, textAlign: 'center', paddingVertical: 14 }}>
              ZONA  v1.4  -  29.07
            </Text>
          </Animated.View>
        </View>
      )}
 
      <Modal visible={showBoard} animationType="slide" transparent={true}
             onRequestClose={() => setShowBoard(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowBoard(false)}>
            <Text style={[styles.sheetTitle, { color: c.textMain }]}>Reyting</Text>
 
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
                    <Text style={[styles.meLbl, { color: c.textSub }]}>ORIN</Text>
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
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(c.accent, 0.2) }}>
                    <Skel w={'34%'} h={9} r={5} mb={10} />
                    <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                      <Skel w={0} flex={1} h={38} r={10} mr={7} />
                      <Skel w={0} flex={1} h={38} r={10} mr={7} />
                      <Skel w={0} flex={1} h={38} r={10} mr={7} />
                      <Skel w={0} flex={1} h={38} r={10} />
                    </View>
                    <Skel w={'100%'} h={44} r={10} />
                  </View>
                ) : null}
                {myStats ? (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: alpha(c.accent, 0.2) }}>
                    <Text style={{ color: c.textSub, fontSize: 9, letterSpacing: 1.5, marginBottom: 8 }}>STATISTIKA</Text>
                    <View style={{ flexDirection: 'row', marginBottom: 10 }}>
                      <View style={styles.stCell}>
                        <Text style={{ color: c.accent, fontSize: 15, fontWeight: '800' }}>{'+' + myStats.today.hectares}</Text>
                        <Text style={{ color: c.textSub, fontSize: 8, letterSpacing: 1 }}>BUGUN</Text>
                      </View>
                      <View style={styles.stCell}>
                        <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '800' }}>{'+' + myStats.week.hectares}</Text>
                        <Text style={{ color: c.textSub, fontSize: 8, letterSpacing: 1 }}>HAFTA</Text>
                      </View>
                      <View style={styles.stCell}>
                        <Text style={{ color: c.textMain, fontSize: 15, fontWeight: '800' }}>{'+' + myStats.month.hectares}</Text>
                        <Text style={{ color: c.textSub, fontSize: 8, letterSpacing: 1 }}>OY</Text>
                      </View>
                      <View style={styles.stCell}>
                        <Text style={{ color: '#FF4D6D', fontSize: 15, fontWeight: '800' }}>{myStats.week.taken}</Text>
                        <Text style={{ color: c.textSub, fontSize: 8, letterSpacing: 1 }}>TORTIB</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: 44 }}>
                      {myStats.days.map((d, ix) => {
                        const mx = Math.max.apply(null, myStats.days.concat([0.1]));
                        const hh = Math.max((d / mx) * 40, 3);
                        return (
                          <View key={ix} style={{ flex: 1, alignItems: 'center' }}>
                            <View style={{ width: '62%', height: hh, borderRadius: 4, backgroundColor: d > 0 ? c.accent : alpha(c.textSub, 0.25) }} />
                          </View>
                        );
                      })}
                    </View>
                    <Text style={{ color: c.textSub, fontSize: 8, textAlign: 'center', marginTop: 4 }}>OXIRGI 7 KUN</Text>
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
            </View>

            {boardLoading ? (
              <SkelList n={6} bg={c.rowBg} />
            ) : (
              <ScrollView style={{ marginTop: 6 }} showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={boardLoading} onRefresh={openBoard} tintColor={c.accent} colors={[c.accent]} progressBackgroundColor={c.sheetBg} />}>
                {(boardMode === 'near' ? nearBoard : boardMode === 'week' ? weekBoard : board).length === 0 ? (
                  <Empty
                    icon={boardMode === 'near' ? '\uD83D\uDCCD' : boardMode === 'week' ? '\uD83D\uDCC5' : '\uD83C\uDFC6'}
                    title={boardMode === 'near' ? 'Atrofda hech kim yoq' : boardMode === 'week' ? 'Bu haftada hali hech kim' : 'Reyting bosh'}
                    text={boardMode === 'near' ? '30 km atrofda hali oyinchi yoq. Birinchi bolib zona oling!' : boardMode === 'week' ? 'Bu hafta hali hech kim zona olmadi. Birinchi boling!' : 'Hali hech kim zona olmadi. Siz birinchi bolishingiz mumkin.'}
                    accent={c.accent} textMain={c.textMain} textSub={c.textSub} rowBg={c.rowBg}
                  />
                ) : null}
                {(boardMode === 'near' ? nearBoard : boardMode === 'week' ? weekBoard : board).map((p, i) => (
                  <View key={p.user_id}
                        style={[styles.row, { backgroundColor: p.user_id === myId ? alpha(c.accent, 0.1) : c.rowBg }]}>
                    <Text style={[styles.rank, { color: i < 3 ? c.accent : c.textSub }]}>{i + 1}</Text>
                    <View style={[styles.dot, { backgroundColor: p.color }]} />
                    <Text style={[styles.rowName, { color: c.textMain }]} numberOfLines={1}>{p.name}</Text>
                    <Text style={[styles.rowHa, { color: c.textSub }]}>{p.hectares + ' ga'}</Text>
                  </View>
                ))}
                {(boardMode === 'near' ? nearBoard : boardMode === 'week' ? weekBoard : board).length === 0 && (
                  <Text style={{ color: c.textSub, textAlign: 'center', marginTop: 20 }}>
                    Hali hech kim zona olmagan
                  </Text>
                )}
                <View style={{ height: 30 }} />
              </ScrollView>
            )}
            <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]} onPress={() => setShowBoard(false)}>
              <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
            </TouchableOpacity>
        </Sheet>
      </Modal>
      <Modal visible={showPrem} animationType="slide" transparent={true}
 
             onRequestClose={() => setShowPrem(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowPrem(false)}>
            <Text style={[styles.sheetTitle, { color: c.textMain }]}>Premium sozlamalar</Text>
 
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={[styles.fLabel, { color: c.textSub }]}>ZONA LOGOSI</Text>
              <TouchableOpacity onPress={pickLogo} activeOpacity={0.8}
                style={[styles.logoPick, { borderColor: c.panelBorder }]}>
                {meStats && meStats.logo ? (
                  <Image source={{ uri: meStats.logo }} style={styles.logoPreview} />
                ) : (
                  <View style={[styles.logoPreview, { backgroundColor: alpha(c.accent, 0.12), alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 22 }}>+</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: c.textMain, fontWeight: '600', fontSize: 14 }}>
                    {meStats && meStats.logo ? 'Logoni almashtirish' : 'Logo yuklash'}
                  </Text>
                  <Text style={{ color: meStats && meStats.logo && !meStats.logo_ok ? '#F5A623' : c.textSub, fontSize: 11, marginTop: 3 }}>
                    {'Uzoqdan korinadigan kichik belgi'}
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={[styles.fLabel, { color: c.textSub }]}>ZONA BANNERI</Text>
              <TouchableOpacity onPress={pickBanner} activeOpacity={0.8}
                style={[styles.logoPick, { borderColor: c.panelBorder }]}>
                {meStats && meStats.banner ? (
                  <Image source={{ uri: meStats.banner }} style={styles.logoPreview} />
                ) : (
                  <View style={[styles.logoPreview, { backgroundColor: alpha(c.accent, 0.12), alignItems: 'center', justifyContent: 'center' }]}>
                    <Text style={{ fontSize: 22 }}>+</Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={{ color: c.textMain, fontWeight: '600', fontSize: 14 }}>
                    {meStats && meStats.banner ? 'Bannerni almashtirish' : 'Banner yuklash'}
                  </Text>
                  <Text style={{ color: c.textSub, fontSize: 11, marginTop: 3 }}>
                    Zona yuzasiga to'liq yotadi
                  </Text>
                </View>
              </TouchableOpacity>

              <Text style={[styles.fLabel, { color: c.textSub }]}>ZONA NOMI</Text>
              <TextInput value={pf.zone_name} onChangeText={(t) => setPf({ ...pf, zone_name: t })}
                style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                placeholder="Masalan: Xusniddin do'koni" placeholderTextColor={c.textSub} maxLength={40} />
 
              <Text style={[styles.fLabel, { color: c.textSub }]}>TELEFON</Text>
              <TextInput value={pf.phone} onChangeText={(t) => setPf({ ...pf, phone: t })}
                style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                placeholder="+998 90 123 45 67" placeholderTextColor={c.textSub}
                keyboardType="phone-pad" maxLength={20} />
 
              <Text style={[styles.fLabel, { color: c.textSub }]}>INSTAGRAM</Text>
              <TextInput value={pf.instagram} onChangeText={(t) => setPf({ ...pf, instagram: t })}
                style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                placeholder="username" placeholderTextColor={c.textSub}
                autoCapitalize="none" maxLength={30} />
 
              <Text style={[styles.fLabel, { color: c.textSub }]}>MANZIL</Text>
              <TextInput value={pf.address} onChangeText={(t) => setPf({ ...pf, address: t })}
                style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                placeholder="Kocha, uy" placeholderTextColor={c.textSub} maxLength={80} />
 
              <Text style={[styles.fLabel, { color: c.textSub }]}>ISH VAQTI</Text>
              <TextInput value={pf.work_hours} onChangeText={(t) => setPf({ ...pf, work_hours: t })}
                style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                placeholder="09:00 - 21:00" placeholderTextColor={c.textSub} maxLength={40} />
 
              <Text style={[styles.fLabel, { color: c.textSub }]}>AKSIYA</Text>
              <TextInput value={pf.promo} onChangeText={(t) => setPf({ ...pf, promo: t })}
                style={[styles.fInput, { color: c.textMain, borderColor: c.panelBorder }]}
                placeholder="Bugun 20% chegirma" placeholderTextColor={c.textSub} maxLength={60} />

              <Text style={[styles.fLabel, { color: c.textSub }]}>ZONA RANGI</Text>
              <View style={[styles.colorBox, { backgroundColor: c.rowBg, borderColor: c.panelBorder }]}>
              <View style={styles.colorRow}>
                {colors.map((col) => (
                  <TouchableOpacity key={col} onPress={() => setPf({ ...pf, zone_color: col })} activeOpacity={0.7}
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

              <Text style={[styles.fLabel, { color: c.textSub }]}>LOGO HALQASI RANGI</Text>
              <View style={[styles.colorBox, { backgroundColor: c.rowBg, borderColor: c.panelBorder }]}>
              <View style={styles.colorRow}>
                {colors.map((col) => (
                  <TouchableOpacity key={'lc' + col} onPress={() => setPf({ ...pf, logo_color: col })} activeOpacity={0.7}
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
 
              <TouchableOpacity onPress={savePremium} disabled={savingPf}
                style={[styles.saveBig, { backgroundColor: c.accent, opacity: savingPf ? 0.6 : 1 }]}>
                {savingPf ? <ActivityIndicator color={c.accentInk} />
                  : <Text style={{ color: c.accentInk, fontWeight: '800', fontSize: 15 }}>SAQLASH</Text>}
              </TouchableOpacity>
              <View style={{ height: 360 }} />
            </ScrollView>
 
            <TouchableOpacity style={[styles.closeBtn, { borderColor: c.panelBorder }]}
                              onPress={() => setShowPrem(false)}>
              <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
            </TouchableOpacity>
        </Sheet>
      </Modal>
 
      <Modal visible={!!infoZone} animationType="fade" transparent={true}
             onRequestClose={() => setInfoZone(null)}>
        <View style={styles.cardWrap}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1}
                            onPress={() => setInfoZone(null)} />
          {infoZone ? (
            <View style={[styles.card, { backgroundColor: c.sheetBg }]}>
              <View style={[styles.cardBar, { backgroundColor: infoZone.zone_color || infoZone.color || '#888888' }]} />
              <Text style={[styles.cardTitle, { color: c.textMain }]}>
                {infoZone.zone_name || infoZone.name || 'Oyinchi'}
              </Text>
              {infoZone.views != null ? (
                <View style={[styles.viewBadge, { backgroundColor: alpha(c.accent, 0.14) }]}>
                  <Text style={{ color: c.accent, fontSize: 11, fontWeight: '700' }}>{'\uD83D\uDC41 ' + infoZone.views}</Text>
                </View>
              ) : null}
              <Text style={[styles.cardSub, { color: c.textSub }]}>
                {(infoZone.area / 10000).toFixed(2) + ' gektar'}
              </Text>
 
              {infoZone.promo ? (
                <View style={[styles.promoBox, { backgroundColor: alpha(c.accent, 0.15) }]}>
                  <Text style={{ color: c.accent, fontWeight: '700', fontSize: 13 }}>{infoZone.promo}</Text>
                </View>
              ) : null}
 
              {infoZone.address ? (
                <Text style={[styles.cardRow, { color: c.textMain }]}>{'Manzil: ' + infoZone.address}</Text>
              ) : null}
              {infoZone.work_hours ? (
                <Text style={[styles.cardRow, { color: c.textMain }]}>{'Ish vaqti: ' + infoZone.work_hours}</Text>
              ) : null}
 
              {infoZone.phone ? (
                <TouchableOpacity onPress={() => {
                    const u2 = userRef.current;
                    if (u2 && infoZone.user_id) addView(infoZone.user_id, u2.user_id, 'call');
                    Linking.openURL('tel:' + infoZone.phone);
                  }}
                  style={[styles.cardBtn, { backgroundColor: c.accent }]}>
                  <Text style={{ color: c.accentInk, fontWeight: '700' }}>{infoZone.phone}</Text>
                </TouchableOpacity>
              ) : null}
 
              {infoZone.instagram ? (
                <TouchableOpacity onPress={() => {
                    const u3 = userRef.current;
                    if (u3 && infoZone.user_id) addView(infoZone.user_id, u3.user_id, 'insta');
                    Linking.openURL('https://instagram.com/' + infoZone.instagram);
                  }}
                  style={[styles.cardBtnOutline, { borderColor: c.panelBorder }]}>
                  <Text style={{ color: c.textMain }}>{'Instagram: @' + infoZone.instagram}</Text>
                </TouchableOpacity>
              ) : null}
 
              <TouchableOpacity
                onPress={() => {
                  const ct = centerOf(infoZone.coords);
                  Linking.openURL('https://www.google.com/maps/dir/?api=1&destination=' + ct.latitude + ',' + ct.longitude);
                }}
                style={[styles.cardBtnOutline, { borderColor: c.panelBorder }]}>
                <Text style={{ color: c.textMain }}>Yol korsat</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  const ct = centerOf(infoZone.coords);
                  setInfoZone(null);
                  if (mapRef.current) {
                    mapRef.current.animateToRegion({ latitude: ct.latitude, longitude: ct.longitude, latitudeDelta: 0.004, longitudeDelta: 0.004 }, 800);
                  }
                }}
                style={[styles.cardBtnOutline, { borderColor: c.accent }]}>
                <Text style={{ color: c.accent, fontWeight: '700' }}>Kartada korsat</Text>
              </TouchableOpacity>
 
              <TouchableOpacity onPress={() => setInfoZone(null)}
                style={[styles.closeBtn, { borderColor: c.panelBorder }]}>
                <Text style={{ color: c.textSub, fontSize: 14 }}>Yopish</Text>
              </TouchableOpacity>
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
              {infoPage === 'rules' ? 'Qanday oynash' : infoPage === 'about' ? 'Biz haqimizda' : 'Maxfiylik siyosati'}
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

      <Modal visible={showTasks} animationType="slide" transparent={true} onRequestClose={() => setShowTasks(false)}>
        <Sheet bg={c.sheetBg} border={c.panelBorder} onClose={() => setShowTasks(false)}>
          {!tasks ? <SkelList n={5} bg={c.rowBg} /> : (
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={{ alignItems: 'center', marginBottom: 18 }}>
              <Text style={{ fontSize: 40 }}>{'\uD83D\uDD25'}</Text>
              <Text style={{ color: c.textMain, fontSize: 30, fontWeight: '900', marginTop: 4 }}>{tasks.streak}</Text>
              <Text style={{ color: c.textSub, fontSize: 12, letterSpacing: 1 }}>KUNLIK SERIYA</Text>
              {tasks.best_streak > tasks.streak ? (
                <Text style={{ color: c.textSub, fontSize: 11, marginTop: 4 }}>{'Eng yaxshi: ' + tasks.best_streak + ' kun'}</Text>
              ) : null}
            </View>

            <Text style={[styles.pgH, { color: c.accent, marginTop: 0 }]}>{'BUGUNGI VAZIFALAR  ' + tasks.daily_done + '/' + tasks.daily_total}</Text>
            {tasks.daily.map((t) => (
              <View key={t.code} style={[styles.aRow, { backgroundColor: c.rowBg, paddingVertical: 14 }]}>
                <Text style={{ fontSize: 20, marginRight: 12, opacity: t.done ? 1 : 0.45 }}>{t.icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.textMain, fontSize: 14, fontWeight: '700' }}>{t.name}</Text>
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: alpha(c.textSub, 0.18), marginTop: 8, overflow: 'hidden' }}>
                    <View style={{ height: 6, borderRadius: 3, backgroundColor: t.done ? c.accent : alpha(c.accent, 0.6), width: Math.min(100, (t.now / t.goal) * 100) + '%' }} />
                  </View>
                  <Text style={{ color: c.textSub, fontSize: 11, marginTop: 5 }}>{t.now + ' / ' + t.goal + ' ' + t.unit}</Text>
                </View>
                <Text style={{ fontSize: 17, marginLeft: 8 }}>{t.done ? '\u2705' : ''}</Text>
              </View>
            ))}

            <Text style={[styles.pgH, { color: c.accent }]}>{'YUTUQLAR  ' + tasks.ach_done + '/' + tasks.ach_total}</Text>
            {tasks.achievements.map((a) => (
              <View key={a.code} style={[styles.aRow, { backgroundColor: c.rowBg, paddingVertical: 13, opacity: a.done ? 1 : 0.5 }]}>
                <Text style={{ fontSize: 22, marginRight: 12 }}>{a.done ? a.icon : '\uD83D\uDD12'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.textMain, fontSize: 14, fontWeight: '700' }}>{a.name}</Text>
                  <Text style={{ color: c.textSub, fontSize: 11, marginTop: 2 }}>{a.desc}</Text>
                </View>
                {a.done ? <Text style={{ fontSize: 15 }}>{'\u2705'}</Text> : null}
              </View>
            ))}
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
            {[['ready','Halqa yopilganda'],['zona','Zona olinganda'],['zona_big','Katta zona'],['lost','Zona qolga otganda'],['daily','Kunlik vazifa'],['start','START'],['stop','STOP']].map(([k, l]) => (
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
                placeholder="Masalan: Namangan Buramatut"
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
                  placeholder="admin kalit" placeholderTextColor={c.textSub}
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
                  )) : <Text style={{ color: c.textSub, padding: 20, textAlign: 'center' }}>Harakat yoq</Text>)
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
                  )) : <Text style={{ color: c.textSub, padding: 20, textAlign: 'center' }}>Shubhali yoq</Text>)}
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

      <Modal visible={needNick} animationType="fade" transparent={true} onRequestClose={() => {}}>
        <View style={styles.introWrap}>
          <View style={[styles.introCard, { backgroundColor: c.sheetBg }]}>
            <View style={[styles.introDot, { backgroundColor: c.accent }]} />
            <Text style={[styles.introTitle, { color: c.textMain }]}>Nik tanlang</Text>
            <Text style={[styles.pgT, { color: c.textSub, marginBottom: 14 }]}>Bu nom reytingda va zonangizda korinadi. Har bir nik yagona - boshqa hech kim uni ololmaydi.</Text>
            <TextInput
              value={nick}
              onChangeText={(t) => { setNick(t); setNickState(''); }}
              style={[styles.fInput, { color: c.textMain, borderColor: nickState && nickState !== 'Tekshirilmoqda...' ? '#FF4D6D' : c.panelBorder, fontSize: 17 }]}
              placeholder="masalan: Xurshid_uz"
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
      </Modal>

      {celebrate ? (
        <Celebrate hectares={celebrate.ha} captured={celebrate.cap} onDone={() => setCelebrate(null)} />
      ) : null}

      {showIntro && !needNick ? (
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

      {zoomDelta < 0.02 && zones.length > 0 ? (
        <View style={{ position: 'absolute', bottom: 240, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.78)', paddingHorizontal: 18, paddingVertical: 9, borderRadius: 14 }}>
          <Text style={{ color: '#FFFFFF', fontSize: 13, fontWeight: '700' }}>{NAMES[bStyle]}</Text>
        </View>
      ) : null}

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
  aTab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, marginRight: 6 },
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
 
  taskBtn: { position: 'absolute', right: 16, top: 110, width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  taskDot: { position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  searchBtn: { position: 'absolute', right: 16, top: 58, width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  menuBtn: {
    position: 'absolute', left: 16, top: 58,
    width: 40, height: 40, borderRadius: 20, borderWidth: 1,
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
    width: 42, height: 42, borderRadius: 21, borderWidth: 1,
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
    paddingHorizontal: 14, paddingVertical: 8,
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
  saveBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12 },
 
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
 
















































































































































































































































































































































































