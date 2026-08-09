import React, { useEffect, useRef, useState } from 'react';
import { Polyline } from 'react-native-maps';

/* ── yordamchilar ── */
function a(hex, op) {
  const h = (hex || '#00E5A0').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + op + ')';
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

/* Chegara bo'ylab har nuqta uchun KO'NDALANG siljish qiymati.
   Nazorat nuqtalari orasida chiziqli interpolatsiya -> burchakli sinishlar. */
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

/* Ikki zarba orasida silliq o'tish (oqim uslubi uchun) */
function blendAmp(n, K, s0, s1, mix, amp) {
  const A = boltAmp(n, K, s0, amp);
  const B = boltAmp(n, K, s1, amp);
  const arr = new Array(n);
  for (let i = 0; i < n; i++) arr[i] = A[i] + (B[i] - A[i]) * mix;
  return arr;
}

/* Nuqtalarni o'z yo'nalishiga KO'NDALANG suradi */
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
    out[i] = {
      latitude: p.latitude + dx * m,
      longitude: p.longitude - (dy * m) / cosL,
    };
  }
  return out;
}

function sliceRing(rg, from, len) {
  const n = rg.length;
  const p = [];
  for (let k = 0; k <= len; k++) p.push(rg[(from + k) % n]);
  return p;
}

/* ── ranglar: [tashqi porlash, tana, yadro] ── */
const PAL = [
  ['#00FF41', '#7BFF9C', '#EAFFF0'],
  ['#7B2CFF', '#B884FF', '#F2E8FF'],
  ['#FF2E00', '#FFB800', '#FFF6D0'],
  ['#FF8A00', '#FFD24A', '#FFF4D8'],
  ['#1E5AFF', '#86B4FF', '#FFFFFF'],
  ['#00D9FF', '#8FEEFF', '#F2FDFF'],
  ['#FF0080', '#FF80C4', '#FFE6F4'],
  ['#B4FF00', '#DEFF85', '#F8FFE2'],
  ['#00FFD5', '#8CFFEC', '#EEFFFC'],
  ['#FF4D00', '#FF9A5C', '#FFE8D8'],
];

/* Har uslub: qanday harakat qiladi */
const CFG = [
  { name: '1. Yashil chaqmoq',  pal: 0, mode: 'strike', hold: 3, amp: 1.0, K: 9,  br: 1.0, sp: 1.0 },
  { name: '2. Binafsha oqim',   pal: 1, mode: 'flow',   hold: 9, amp: 1.3, K: 6,  br: 0.2, sp: 0.5 },
  { name: '3. Olov',            pal: 2, mode: 'flow',   hold: 5, amp: 0.9, K: 11, br: 0.5, sp: 1.2 },
  { name: '4. Oltin chaqmoq',   pal: 3, mode: 'strike', hold: 4, amp: 1.1, K: 8,  br: 1.2, sp: 0.9 },
  { name: '5. Oq chaqmoq',      pal: 4, mode: 'strike', hold: 2, amp: 1.2, K: 12, br: 1.5, sp: 1.3 },
  { name: '6. Muz razryad',     pal: 5, mode: 'strike', hold: 5, amp: 0.7, K: 14, br: 0.8, sp: 1.0 },
  { name: '7. Pushti energiya', pal: 6, mode: 'flow',   hold: 7, amp: 1.0, K: 7,  br: 0.4, sp: 0.8 },
  { name: '8. Lime razryad',    pal: 7, mode: 'strike', hold: 3, amp: 0.8, K: 10, br: 1.0, sp: 1.1 },
  { name: '9. Neon oqim',       pal: 8, mode: 'flow',   hold: 11, amp: 0.6, K: 5, br: 0.0, sp: 0.6 },
  { name: '10. Lava oqimi',     pal: 9, mode: 'flow',   hold: 8, amp: 1.1, K: 8,  br: 0.3, sp: 0.7 },
];

export const NAMES = CFG.map((x) => x.name);

export default function ZoneBorder({ coords, color, area, active, zIndex, onName }) {
  const [tick, setTick] = useState(0);
  const tm = useRef(null);

  useEffect(() => {
    if (!active) return;
    let stop = false;
    const step = () => {
      if (stop) return;
      setTick((t) => t + 1);
      tm.current = setTimeout(step, 60);
    };
    tm.current = setTimeout(step, 60);
    return () => { stop = true; clearTimeout(tm.current); };
  }, [active]);

  const sid = Math.floor(tick / 167) % CFG.length;
  useEffect(() => { if (onName) onName(sid); }, [sid]);

  if (!coords || coords.length < 5) return null;

  const cf = CFG[sid];
  const P = PAL[cf.pal];
  const cOut = P[0], cBody = P[1], cCore = P[2];

  const lv = levelOf(area);
  const n = coords.length;
  const z = zIndex || 5;
  const out = [];

  /* siljish kattaligi: gradusda. Zona kattalashgani sari kengroq */
  const base = (0.000022 + lv * 0.0000085) * cf.amp;

  /* asosiy shakl */
  let amps;
  if (cf.mode === 'strike') {
    const s = Math.floor(tick / cf.hold);
    amps = boltAmp(n, cf.K, s, base);
  } else {
    const f = tick / cf.hold;
    const s0 = Math.floor(f);
    const mix = f - s0;
    const sm = mix * mix * (3 - 2 * mix);
    amps = blendAmp(n, cf.K, s0, s0 + 1, sm, base);
  }
  const bolt = offsetPerp(coords, amps);

  /* ikkinchi, ingichkaroq razryad - boshqa ritmda */
  let amps2;
  if (cf.mode === 'strike') {
    amps2 = boltAmp(n, cf.K + 5, Math.floor(tick / (cf.hold + 2)) + 77, base * 0.55);
  } else {
    const f2 = tick / (cf.hold * 1.6);
    const t0 = Math.floor(f2);
    const mx = f2 - t0;
    amps2 = blendAmp(n, cf.K + 4, t0 + 77, t0 + 78, mx * mx * (3 - 2 * mx), base * 0.55);
  }
  const bolt2 = offsetPerp(coords, amps2);

  /* miltillash: chaqmoqda keskin, oqimda yumshoq */
  const fl = cf.mode === 'strike'
    ? 0.72 + rnd(Math.floor(tick / 2), 5) * 0.28
    : 0.86 + Math.sin(tick * 0.14) * 0.14;

  const wHaze = 26 + lv * 11;
  const wGlow = 13 + lv * 6;
  const wBody = 5.5 + lv * 2.6;
  const wCore = 1.9 + lv * 0.75;

  /* ── QATLAMLAR ── */

  /* 1) eng keng gaz */
  out.push(<Polyline key="h1" coordinates={bolt}
    strokeColor={a(cOut, 0.055 * fl)} strokeWidth={wHaze}
    lineCap="round" lineJoin="round" zIndex={z} />);

  /* 2) o'rta porlash */
  out.push(<Polyline key="h2" coordinates={bolt}
    strokeColor={a(cOut, 0.15 * fl)} strokeWidth={wGlow}
    lineCap="round" lineJoin="round" zIndex={z + 1} />);

  /* 3) yaqin porlash */
  out.push(<Polyline key="h3" coordinates={bolt}
    strokeColor={a(cOut, 0.32 * fl)} strokeWidth={wGlow * 0.55}
    lineCap="round" lineJoin="round" zIndex={z + 2} />);

  /* 4) tana */
  out.push(<Polyline key="bd" coordinates={bolt}
    strokeColor={a(cBody, 0.75 * fl)} strokeWidth={wBody}
    lineCap="round" lineJoin="round" zIndex={z + 3} />);

  /* 5) ikkinchi razryad */
  out.push(<Polyline key="b2" coordinates={bolt2}
    strokeColor={a(cBody, 0.30 * fl)} strokeWidth={wBody * 0.5}
    lineCap="round" lineJoin="round" zIndex={z + 3} />);
  out.push(<Polyline key="b2c" coordinates={bolt2}
    strokeColor={a(cCore, 0.45 * fl)} strokeWidth={wCore * 0.6}
    lineCap="round" lineJoin="round" zIndex={z + 4} />);

  /* 6) yadro - deyarli oq */
  out.push(<Polyline key="cr" coordinates={bolt}
    strokeColor={a(cCore, 0.97)} strokeWidth={wCore}
    lineCap="round" lineJoin="round" zIndex={z + 6} />);

  if (!active) return <>{out}</>;

  /* 7) yadro qalinligi joy-joyda o'zgaradi - tirik ko'rinadi */
  const segN = 14;
  const segL = Math.max(2, Math.floor(n / segN));
  for (let s = 0; s < segN; s++) {
    const r = rnd(s, Math.floor(tick / 3));
    if (r < 0.55) continue;
    out.push(<Polyline key={'tk_' + s} coordinates={sliceRing(bolt, s * segL, segL)}
      strokeColor={a(cCore, 0.9)} strokeWidth={wCore + r * (1.6 + lv * 0.5)}
      lineCap="round" lineJoin="round" zIndex={z + 7} />);
  }

  /* 8) shoxlar */
  if (cf.br > 0) {
    const nb = Math.round((3 + lv * 2) * cf.br);
    const g = Math.floor(tick / Math.max(2, cf.hold));
    for (let i = 0; i < nb; i++) {
      const r = rnd(i, g);
      if (r < 0.42) continue;
      const pos = Math.floor(rnd(i, g + 31) * n);
      const len = 2 + Math.floor(rnd(i, g + 13) * 3);
      const dir = rnd(i, g + 7) > 0.5 ? 1 : -1;
      const grow = base * (2.2 + r * 4.5) * dir;

      const pts = [bolt[pos]];
      for (let k = 1; k <= len; k++) {
        const idx = (pos + k) % n;
        const p = coords[idx];
        const q = coords[(idx + 1) % n];
        const cosL = Math.cos(p.latitude * Math.PI / 180) || 1;
        let dx = (q.longitude - p.longitude) * cosL;
        let dy = q.latitude - p.latitude;
        const L = Math.sqrt(dx * dx + dy * dy) || 1e-9;
        dx /= L; dy /= L;
        const m = amps[idx] + grow * (k / len);
        pts.push({
          latitude: p.latitude + dx * m,
          longitude: p.longitude - (dy * m) / cosL,
        });
      }
      out.push(<Polyline key={'brg_' + i} coordinates={pts}
        strokeColor={a(cOut, 0.28 * fl)} strokeWidth={3.5 + r * 2}
        lineCap="round" lineJoin="round" zIndex={z + 4} />);
      out.push(<Polyline key={'brb_' + i} coordinates={pts}
        strokeColor={a(cBody, 0.55 * fl)} strokeWidth={1.6 + r * 1.2}
        lineCap="round" lineJoin="round" zIndex={z + 5} />);
      out.push(<Polyline key={'brc_' + i} coordinates={pts}
        strokeColor={a(cCore, 0.8)} strokeWidth={0.9}
        lineCap="round" lineJoin="round" zIndex={z + 6} />);
    }
  }

  /* 9) yorqin tugunlar */
  if (cf.sp > 0) {
    const nh = Math.round((4 + lv * 2) * cf.sp);
    for (let i = 0; i < nh; i++) {
      const life = (tick * 0.19 + i * 2.13) % 6.283;
      const bl = Math.pow(Math.max(0, Math.sin(life)), 5);
      if (bl < 0.18) continue;
      const pos = Math.floor(rnd(i, Math.floor(tick / 9)) * n);
      out.push(<Polyline key={'hg_' + i} coordinates={sliceRing(bolt, pos, 1)}
        strokeColor={a(cOut, bl * 0.4)} strokeWidth={wBody + bl * (9 + lv * 3)}
        lineCap="round" lineJoin="round" zIndex={z + 5} />);
      out.push(<Polyline key={'hc_' + i} coordinates={sliceRing(bolt, pos, 1)}
        strokeColor={a(cCore, 0.95)} strokeWidth={wCore + bl * (3 + lv)}
        lineCap="round" lineJoin="round" zIndex={z + 7} />);
    }
  }

  return <>{out}</>;
}