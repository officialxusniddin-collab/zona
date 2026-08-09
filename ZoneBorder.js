import React, { useEffect, useRef, useState } from 'react';
import { GeoJSONSource, Layer } from '@maplibre/maplibre-react-native';

function a(hex, op) {
  const h = (hex || '#00E5A0').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + op + ')';
}

function bright(hex, amt) {
  const h = (hex || '#00E5A0').replace('#', '');
  let r = parseInt(h.substring(0, 2), 16);
  let g = parseInt(h.substring(2, 4), 16);
  let b = parseInt(h.substring(4, 6), 16);
  r = Math.round(r + (255 - r) * amt);
  g = Math.round(g + (255 - g) * amt);
  b = Math.round(b + (255 - b) * amt);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

function rnd(i, j) {
  const v = Math.sin(i * 127.1 + j * 311.7) * 43758.5453;
  return v - Math.floor(v);
}

export function levelOf(areaM2) {
  const ha = (areaM2 || 0) / 10000;
  if (ha < 1) return 0;
  if (ha < 10) return 1;
  if (ha < 50) return 2;
  if (ha < 200) return 3;
  return 4;
}

/* ── CHAQMOQ SHAKLI: ko'ndalang siljish, burchakli sinishlar ── */
function boltAmp(n, K, seed, amp) {
  const ctrl = new Array(K);
  for (let i = 0; i < K; i++) ctrl[i] = (rnd(i, seed) * 2 - 1) * amp;
  const arr = new Array(n);
  for (let i = 0; i < n; i++) {
    const f = (i / n) * K;
    const i0 = Math.floor(f) % K;
    const i1 = (i0 + 1) % K;
    const fr = f - Math.floor(f);
    arr[i] = ctrl[i0] + (ctrl[i1] - ctrl[i0]) * fr;
  }
  return arr;
}

function blendAmp(n, K, s0, s1, mix, amp) {
  const A = boltAmp(n, K, s0, amp);
  const B = boltAmp(n, K, s1, amp);
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = A[i] + (B[i] - A[i]) * mix;
  return arr;
}

function offsetPerp(pts, amps) {
  const n = pts.length;
  const out = new Array(n);
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    const cosL = Math.cos(p.latitude * Math.PI / 180) || 1;
    let dx = (q.longitude - p.longitude) * cosL;
    let dy = q.latitude - p.latitude;
    const len = Math.sqrt(dx * dx + dy * dy) || 1e-9;
    dx /= len; dy /= len;
    const m = amps[i];
    out[i] = [
      p.longitude - (dy * m) / cosL,
      p.latitude + dx * m,
    ];
  }
  out.push(out[0]);
  return out;
}

function lineOf(cs) {
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'LineString', coordinates: cs },
  };
}

/* [tashqi, tana, yadro] */
const PAL = [
  ['#00FF41', '#7BFF9C', '#EAFFF0'],
  ['#7B2CFF', '#B884FF', '#F2E8FF'],
  ['#FF2E00', '#FFB800', '#FFF6D0'],
  ['#1E5AFF', '#86B4FF', '#FFFFFF'],
  ['#00D9FF', '#8FEEFF', '#F2FDFF'],
  ['#FF0080', '#FF80C4', '#FFE6F4'],
  ['#B4FF00', '#DEFF85', '#F8FFE2'],
  ['#FF8A00', '#FFD24A', '#FFF4D8'],
  ['#00FFD5', '#8CFFEC', '#EEFFFC'],
  ['#C77DFF', '#EBD1FF', '#FBF4FF'],
  ['#5A6672', '#98A4B0', '#E8EEF4'],
  ['#00A878', '#5FD9B4', '#E6FFF6'],
  ['#3A9AD9', '#8CCBF0', '#EAF7FF'],
];

export const BY_CODE = {
  simple_1: { pal: 10, mode: 'still',  amp: 0,   K: 6,  flow: 0, tier: 1 },
  simple_2: { pal: 11, mode: 'still',  amp: 0,   K: 6,  flow: 0, tier: 1 },
  simple_3: { pal: 12, mode: 'still',  amp: 0,   K: 4,  flow: 0, tier: 1 },

  energy_1: { pal: 0,  mode: 'strike', hold: 3, amp: 1.0, K: 9,  flow: 0, tier: 1 },
  energy_2: { pal: 6,  mode: 'flow',   hold: 6, amp: 0.5, K: 6,  flow: 1, tier: 1 },
  energy_3: { pal: 8,  mode: 'flow',   hold: 7, amp: 0.6, K: 8,  flow: 1, tier: 2 },
  energy_4: { pal: 0,  mode: 'strike', hold: 2, amp: 1.3, K: 12, flow: 0, tier: 3 },

  nature_1: { pal: 4,  mode: 'flow',   hold: 9, amp: 0.9, K: 5,  flow: 1, tier: 2 },
  nature_2: { pal: 2,  mode: 'flow',   hold: 5, amp: 1.0, K: 11, flow: 1, tier: 3 },
  nature_3: { pal: 5,  mode: 'flow',   hold: 8, amp: 0.5, K: 7,  flow: 1, tier: 2 },

  neon_1:   { pal: 8,  mode: 'flow',   hold: 11, amp: 0.45, K: 5, flow: 1, tier: 2 },
  neon_2:   { pal: 1,  mode: 'flow',   hold: 6,  amp: 0.7,  K: 6, flow: 1, tier: 3 },
  neon_3:   { pal: 9,  mode: 'flow',   hold: 7,  amp: 0.9,  K: 8, flow: 1, tier: 3 },

  legend_1: { pal: 7,  mode: 'strike', hold: 2,  amp: 1.6,  K: 7, flow: 0, tier: 3 },

  energy_5: { pal: 10, mode: 'flow',   hold: 8,  amp: 0.35, K: 6,  flow: 1, tier: 1 },
  energy_6: { pal: 0,  mode: 'flow',   hold: 7,  amp: 0.75, K: 5,  flow: 1, tier: 2 },
  energy_7: { pal: 6,  mode: 'strike', hold: 4,  amp: 0.85, K: 9,  flow: 0, tier: 2 },
  energy_8: { pal: 6,  mode: 'still',  amp: 0,   K: 6,  flow: 0, tier: 1 },

  nature_4: { pal: 3,  mode: 'flow',   hold: 10, amp: 1.0,  K: 4,  flow: 1, tier: 2 },
  nature_5: { pal: 0,  mode: 'flow',   hold: 12, amp: 0.4,  K: 7,  flow: 1, tier: 2 },
  nature_6: { pal: 7,  mode: 'flow',   hold: 6,  amp: 1.2,  K: 10, flow: 1, tier: 3 },

  neon_4:   { pal: 3,  mode: 'flow',   hold: 7,  amp: 0.5,  K: 5,  flow: 1, tier: 2 },
  neon_5:   { pal: 5,  mode: 'strike', hold: 3,  amp: 0.8,  K: 8,  flow: 0, tier: 3 },
  neon_6:   { pal: 12, mode: 'flow',   hold: 9,  amp: 0.6,  K: 6,  flow: 1, tier: 3 },
  neon_7:   { pal: 4,  mode: 'strike', hold: 3,  amp: 0.9,  K: 12, flow: 0, tier: 3 },

  legend_2: { pal: 2,  mode: 'strike', hold: 2,  amp: 1.5,  K: 8,  flow: 0, tier: 3 },
  legend_3: { pal: 7,  mode: 'strike', hold: 3,  amp: 1.2,  K: 7,  flow: 0, tier: 3 },
  legend_4: { pal: 2,  mode: 'strike', hold: 2,  amp: 1.7,  K: 6,  flow: 0, tier: 3 },
  legend_5: { pal: 1,  mode: 'flow',   hold: 5,  amp: 0.9,  K: 7,  flow: 1, tier: 3 },
  legend_6: { pal: 8,  mode: 'strike', hold: 2,  amp: 1.4,  K: 9,  flow: 0, tier: 3 },
  legend_7: { pal: 7,  mode: 'flow',   hold: 4,  amp: 0.7,  K: 5,  flow: 1, tier: 3 },
  legend_8: { pal: 10, mode: 'strike', hold: 2,  amp: 1.8,  K: 5,  flow: 0, tier: 3 },
  legend_9: { pal: 7,  mode: 'strike', hold: 2,  amp: 1.6,  K: 8,  flow: 0, tier: 3 },
};

const CFG = [
  { name: '1. Yashil chaqmoq',  pal: 0, mode: 'strike', hold: 3,  amp: 1.0, K: 9,  flow: 0, tier: 1 },
  { name: '2. Binafsha oqim',   pal: 1, mode: 'flow',   hold: 9,  amp: 1.3, K: 6,  flow: 1, tier: 3 },
  { name: '3. Olov',            pal: 2, mode: 'flow',   hold: 5,  amp: 0.9, K: 11, flow: 1, tier: 3 },
  { name: '4. Oq chaqmoq',      pal: 3, mode: 'strike', hold: 2,  amp: 1.2, K: 12, flow: 0, tier: 3 },
  { name: '5. Muz razryad',     pal: 4, mode: 'strike', hold: 5,  amp: 0.7, K: 14, flow: 0, tier: 2 },
  { name: '6. Pushti energiya', pal: 5, mode: 'flow',   hold: 7,  amp: 1.0, K: 7,  flow: 1, tier: 2 },
  { name: '7. Lime razryad',    pal: 6, mode: 'strike', hold: 3,  amp: 0.8, K: 10, flow: 0, tier: 1 },
  { name: '8. Oltin chaqmoq',   pal: 7, mode: 'strike', hold: 4,  amp: 1.1, K: 8,  flow: 0, tier: 3 },
  { name: '9. Neon oqim',       pal: 8, mode: 'flow',   hold: 11, amp: 0.6, K: 5,  flow: 1, tier: 2 },
  { name: '10. Sehr oqim',      pal: 9, mode: 'flow',   hold: 8,  amp: 1.1, K: 8,  flow: 1, tier: 3 },
];

export const NAMES = CFG.map((x) => x.name);

/* qalinlik zoomga qarab: uzoqdan ingichka, yaqindan qalin */
function zw(w) {
  return ['interpolate', ['linear'], ['zoom'],
    11, w * 0.12,
    14, w * 0.35,
    16, w * 0.70,
    18, w,
    20, w * 1.15];
}

export default function ZoneBorder({ id, coords, color, area, active, zoom, code, onName }) {
  const [tick, setTick] = useState(0);
  const tm = useRef(null);

  const still = code ? ((BY_CODE[code] || {}).mode === 'still') : false;

  useEffect(() => {
    if (!active || still) return;
    let stop = false;
    const step = () => {
      if (stop) return;
      setTick((t) => t + 1);
      tm.current = setTimeout(step, 65);
    };
    tm.current = setTimeout(step, 65);
    return () => { stop = true; clearTimeout(tm.current); };
  }, [active, still]);

  const auto = Math.floor(tick / 154) % CFG.length;
  const sid = code ? -1 : auto;
  useEffect(() => { if (onName && !code) onName(auto); }, [auto, code]);

  if (!coords || coords.length < 5) return null;

  /* daraja bo'yicha ko'rinish masofasi */
  const cfx = code ? (BY_CODE[code] || BY_CODE.simple_1) : CFG[sid];
  const tier = cfx.tier || 1;
  const maxZoom = tier >= 3 ? 0.25 : tier === 2 ? 0.08 : 0.03;
  if ((zoom || 0) > maxZoom) return null;

  /* zona ekranda juda kichik bolsa naqsh chizilmaydi */
  if (zoom && area) {
    const mpp = 156543.03 * Math.cos(40.9 * Math.PI / 180) * zoom / 360;
    const rM = Math.sqrt(area / Math.PI);
    const px = (2 * rM) / mpp;
    if (px < 75) return null;
  }

  const cf = cfx;
  const P = PAL[cf.pal];
  const cOut = P[0], cBody = P[1], cCore = P[2];

  const lv = levelOf(area);
  const n = coords.length;
  const t = tick;
  const sd = 'zb_' + id;

  /* siljish kattaligi (gradus) */
  const base = (0.000020 + lv * 0.0000080) * cf.amp;

  let amps;
  if (cf.mode === 'still') {
    amps = new Array(n).fill(0);
  } else if (cf.mode === 'strike') {
    amps = boltAmp(n, cf.K, Math.floor(t / cf.hold), base);
  } else {
    const f = t / cf.hold;
    const s0 = Math.floor(f);
    const mx = f - s0;
    amps = blendAmp(n, cf.K, s0, s0 + 1, mx * mx * (3 - 2 * mx), base);
  }
  const bolt = offsetPerp(coords, amps);

  /* ikkinchi ingichka razryad */
  let amps2;
  if (cf.mode === 'still') {
    amps2 = new Array(n).fill(0);
  } else if (cf.mode === 'strike') {
    amps2 = boltAmp(n, cf.K + 5, Math.floor(t / (cf.hold + 2)) + 77, base * 0.55);
  } else {
    const f2 = t / (cf.hold * 1.6);
    const t0 = Math.floor(f2);
    const mx2 = f2 - t0;
    amps2 = blendAmp(n, cf.K + 4, t0 + 77, t0 + 78, mx2 * mx2 * (3 - 2 * mx2), base * 0.55);
  }
  const bolt2 = offsetPerp(coords, amps2);

  /* miltillash */
  const fl = cf.mode === 'still' ? 1 : cf.mode === 'strike'
    ? 0.72 + rnd(Math.floor(t / 2), 5) * 0.28
    : 0.86 + Math.sin(t * 0.14) * 0.14;

  const wHaze = 30 + lv * 13;
  const wGlow = 15 + lv * 7;
  const wBody = 6 + lv * 2.8;
  const wCore = 2.0 + lv * 0.8;

  /* oqim gradienti */
  const ph = (t * 0.030) % 1;
  const grad = () => {
    const raw = [];
    const push = (x, col) => { raw.push([Math.max(0, Math.min(1, x)), col]); };
    push(0, a(cBody, 0.35));
    push(ph - 0.22, a(cBody, 0.35));
    push(ph - 0.10, a(cBody, 0.75));
    push(ph, bright(cBody, 0.65));
    push(ph + 0.03, a(cBody, 0.45));
    push(1, a(cBody, 0.35));
    raw.sort((x, y) => x[0] - y[0]);
    const pts = [];
    for (const r of raw) {
      if (pts.length === 0) { pts.push(r); continue; }
      if (r[0] > pts[pts.length - 1][0] + 0.0009) pts.push(r);
    }
    if (pts.length < 2) return a(cBody, 0.6);
    if (pts[0][0] > 0) pts.unshift([0, pts[0][1]]);
    const s = ['interpolate', ['linear'], ['line-progress']];
    for (const p of pts) { s.push(p[0]); s.push(p[1]); }
    return s;
  };

  return (
    <>
      {/* asosiy chaqmoq */}
      <GeoJSONSource id={sd} data={lineOf(bolt)} lineMetrics={true}>
        {/* 1) eng keng gaz */}
        <Layer id={sd + '_h1'} type="line" beforeId="logoLay"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': cOut,
            'line-width': zw(wHaze),
            'line-opacity': 0.055 * fl,
            'line-blur': wHaze * 0.9,
          }} />

        {/* 2) o'rta porlash */}
        <Layer id={sd + '_h2'} type="line" beforeId="logoLay"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': cOut,
            'line-width': zw(wGlow),
            'line-opacity': 0.18 * fl,
            'line-blur': wGlow * 0.65,
          }} />

        {/* 3) yaqin porlash */}
        <Layer id={sd + '_h3'} type="line" beforeId="logoLay"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': cOut,
            'line-width': zw(wGlow * 0.5),
            'line-opacity': 0.35 * fl,
            'line-blur': wGlow * 0.25,
          }} />

        {/* 4) tana */}
        {cf.flow ? (
          <Layer id={sd + '_b'} type="line" beforeId="logoLay"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-width': zw(wBody),
              'line-blur': 1.6,
              'line-gradient': grad(),
            }} />
        ) : (
          <Layer id={sd + '_b'} type="line" beforeId="logoLay"
            layout={{ 'line-cap': 'round', 'line-join': 'round' }}
            paint={{
              'line-color': cBody,
              'line-width': zw(wBody),
              'line-opacity': 0.8 * fl,
              'line-blur': 1.6,
            }} />
        )}

        {/* 5) yadro - deyarli oq */}
        <Layer id={sd + '_c'} type="line" beforeId="logoLay"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': cCore,
            'line-width': zw(wCore),
            'line-opacity': 0.97,
          }} />
      </GeoJSONSource>

      {/* ikkinchi razryad */}
      <GeoJSONSource id={sd + '_2'} data={lineOf(bolt2)}>
        <Layer id={sd + '_2g'} type="line" beforeId="logoLay"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': cOut,
            'line-width': zw(wGlow * 0.4),
            'line-opacity': 0.16 * fl,
            'line-blur': wGlow * 0.3,
          }} />
        <Layer id={sd + '_2b'} type="line" beforeId="logoLay"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': cBody,
            'line-width': zw(wBody * 0.45),
            'line-opacity': 0.32 * fl,
            'line-blur': 1.2,
          }} />
        <Layer id={sd + '_2c'} type="line" beforeId="logoLay"
          layout={{ 'line-cap': 'round', 'line-join': 'round' }}
          paint={{
            'line-color': cCore,
            'line-width': zw(wCore * 0.55),
            'line-opacity': 0.55 * fl,
          }} />
      </GeoJSONSource>
    </>
  );
}


















