import React, { useEffect, useState } from 'react';
import Svg, { Path, Circle, G } from 'react-native-svg';
import { View } from 'react-native';

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

/* umumiy soat */
let CLOCK = 0;
const SUBS = new Set();
let timer = null;
function ensureClock() {
  if (timer) return;
  timer = setInterval(() => {
    CLOCK++;
    SUBS.forEach((fn) => fn(CLOCK));
  }, 70);
}

/*
  mode:
   still  - qimirlamaydi
   breath - sekin nafas
   wave   - silliq to'lqin
   strike - keskin chaqmoq (sakraydi)
   flow   - oqim + yuguruvchi nuqta
   spin   - aylanuvchi yoy
   burst  - davriy portlash
   storm  - kuchli chaqmoq + shoxlar + uchqun
*/
export const PREVIEW = {
  simple_1: { c: ['#5A6672', '#98A4B0', '#E8EEF4'], mode: 'still',  amp: 0,    K: 6,  sp: 1 },
  simple_2: { c: ['#00A878', '#5FD9B4', '#E6FFF6'], mode: 'still',  amp: 0,    K: 6,  sp: 1 },
  simple_3: { c: ['#3A9AD9', '#8CCBF0', '#EAF7FF'], mode: 'still',  amp: 0,    K: 4,  sp: 1 },

  energy_1: { c: ['#00FF41', '#7BFF9C', '#EAFFF0'], mode: 'strike', amp: 1.0,  K: 9,  sp: 1.0 },
  energy_2: { c: ['#8AFF00', '#C4FF6B', '#F4FFE0'], mode: 'spin',   amp: 0.45, K: 6,  sp: 1.4 },
  energy_3: { c: ['#00FFA8', '#7BFFD4', '#EAFFF7'], mode: 'burst',  amp: 0.55, K: 8,  sp: 0.8 },
  energy_4: { c: ['#2BFF6B', '#9AFFC0', '#EDFFF4'], mode: 'storm',  amp: 1.3,  K: 12, sp: 1.6 },

  nature_1: { c: ['#00C8FF', '#8CE4FF', '#EAFAFF'], mode: 'wave',   amp: 0.85, K: 5,  sp: 0.7 },
  nature_2: { c: ['#FF7A00', '#FFC26B', '#FFF2DC'], mode: 'flow',   amp: 1.0,  K: 11, sp: 1.3 },
  nature_3: { c: ['#FF3DA6', '#FF94CE', '#FFE8F4'], mode: 'breath', amp: 0.5,  K: 7,  sp: 0.9 },

  neon_1:   { c: ['#00FFE0', '#7BFFF0', '#EAFFFC'], mode: 'flow',   amp: 0.45, K: 5,  sp: 1.8 },
  neon_2:   { c: ['#8A2BFF', '#C08CFF', '#F2E8FF'], mode: 'spin',   amp: 0.7,  K: 6,  sp: 2.2 },
  neon_3:   { c: ['#FF00C8', '#FF7BE4', '#FFEAF9'], mode: 'burst',  amp: 0.9,  K: 8,  sp: 1.5 },

  legend_1: { c: ['#FF4500', '#FFC400', '#FFFBE0'], mode: 'storm',  amp: 1.6,  K: 7,  sp: 2.4 },
  energy_5: { c: ['#C0C8D0', '#E8EEF4', '#FFFFFF'], mode: 'spin',   amp: 0.35, K: 6,  sp: 1.2 },
  energy_6: { c: ['#00E070', '#7BFFB8', '#EAFFF2'], mode: 'wave',   amp: 0.75, K: 5,  sp: 1.0 },
  energy_7: { c: ['#3CFF00', '#9FFF6B', '#F0FFE4'], mode: 'burst',  amp: 0.85, K: 9,  sp: 1.1 },
  energy_8: { c: ['#7BFF41', '#B8FF8C', '#F2FFE8'], mode: 'still',  amp: 0,    K: 6,  sp: 1 },

  nature_4: { c: ['#0088FF', '#6BC4FF', '#E4F4FF'], mode: 'wave',   amp: 1.0,  K: 4,  sp: 0.6 },
  nature_5: { c: ['#2E8B2E', '#7BC47B', '#EAF7EA'], mode: 'breath', amp: 0.4,  K: 7,  sp: 0.8 },
  nature_6: { c: ['#D9A441', '#F0D08C', '#FFF6E4'], mode: 'flow',   amp: 1.2,  K: 10, sp: 1.4 },

  neon_4:   { c: ['#0066FF', '#7BAAFF', '#E8F0FF'], mode: 'flow',   amp: 0.5,  K: 5,  sp: 1.7 },
  neon_5:   { c: ['#FF1744', '#FF7B96', '#FFE8ED'], mode: 'burst',  amp: 0.8,  K: 8,  sp: 1.6 },
  neon_6:   { c: ['#E8F0FF', '#FFFFFF', '#FFFFFF'], mode: 'spin',   amp: 0.6,  K: 6,  sp: 2.0 },
  neon_7:   { c: ['#7BE8FF', '#C4F4FF', '#F2FDFF'], mode: 'strike', amp: 0.9,  K: 12, sp: 1.5 },

  legend_2: { c: ['#8B0000', '#FF4500', '#FFD0B0'], mode: 'storm',  amp: 1.5,  K: 8,  sp: 2.2 },
  legend_3: { c: ['#FFD700', '#FFF0A0', '#FFFEF0'], mode: 'burst',  amp: 1.2,  K: 7,  sp: 1.8 },
  legend_4: { c: ['#FF3D00', '#FF9E4A', '#FFF0E0'], mode: 'storm',  amp: 1.7,  K: 6,  sp: 2.5 },
  legend_5: { c: ['#6A00FF', '#B87BFF', '#F0E4FF'], mode: 'spin',   amp: 0.9,  K: 7,  sp: 2.4 },
  legend_6: { c: ['#00FFC8', '#8CFFE4', '#EAFFFA'], mode: 'storm',  amp: 1.4,  K: 9,  sp: 2.6 },
  legend_7: { c: ['#FF8C00', '#FFC46B', '#FFF4E4'], mode: 'flow',   amp: 0.7,  K: 5,  sp: 2.8 },
  legend_8: { c: ['#4A4A6A', '#9A9AC4', '#EAEAF4'], mode: 'storm',  amp: 1.8,  K: 5,  sp: 2.0 },
  legend_9: { c: ['#FFB800', '#FFE47B', '#FFFBE8'], mode: 'storm',  amp: 1.6,  K: 8,  sp: 2.7 },
};

function ringPath(cx, cy, R, N, amps) {
  let d = '';
  for (let i = 0; i < N; i++) {
    const t = (i / N) * Math.PI * 2;
    const r = R + (amps ? amps[i] : 0);
    const x = cx + Math.cos(t) * r;
    const y = cy + Math.sin(t) * r;
    d += (i === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  return d + 'Z';
}

function arcPath(cx, cy, R, from, span, N, amps) {
  let d = '';
  for (let k = 0; k <= N; k++) {
    const f = from + (k / N) * span;
    const idx = Math.floor(((f % (Math.PI * 2)) / (Math.PI * 2)) * (amps ? amps.length : 1));
    const r = R + (amps ? amps[idx] || 0 : 0);
    const x = cx + Math.cos(f) * r;
    const y = cy + Math.sin(f) * r;
    d += (k === 0 ? 'M' : 'L') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
  }
  return d;
}

function boltAmp(N, K, seed, amp) {
  const ctrl = new Array(K);
  for (let i = 0; i < K; i++) ctrl[i] = (rnd(i, seed) * 2 - 1) * amp;
  const arr = new Array(N);
  for (let i = 0; i < N; i++) {
    const f = (i / N) * K;
    const i0 = Math.floor(f) % K;
    const i1 = (i0 + 1) % K;
    const fr = f - Math.floor(f);
    arr[i] = ctrl[i0] + (ctrl[i1] - ctrl[i0]) * fr;
  }
  return arr;
}

export default function BorderPreview({ code, size, locked, live }) {
  const [tick, setTick] = useState(CLOCK);
  const S = size || 78;
  const on = live !== false;

  useEffect(() => {
    if (!on) return;
    ensureClock();
    const fn = (v) => setTick(v);
    SUBS.add(fn);
    return () => {
      SUBS.delete(fn);
      if (SUBS.size === 0 && timer) { clearInterval(timer); timer = null; }
    };
  }, [on]);

  const cf = PREVIEW[code] || PREVIEW.simple_1;
  const cOut = cf.c[0], cBody = cf.c[1], cCore = cf.c[2];
  const N = 34;
  const cx = S / 2, cy = S / 2;
  const R0 = S * 0.30;
  const t = tick * (cf.sp || 1);
  const op = locked ? 0.34 : 1;
  const px = cf.amp * S * 0.055;

  let amps = null;
  let R = R0;
  let glowW = S * 0.16;
  let bodyW = S * 0.042;
  let coreW = S * 0.014;
  let fl = 1;
  const extra = [];

  /* ── STILL ── */
  if (cf.mode === 'still') {
    glowW = S * 0.09;
  }

  /* ── BREATH ── */
  if (cf.mode === 'breath') {
    const br = (Math.sin(t * 0.055) + 1) / 2;
    R = R0 * (0.93 + br * 0.10);
    glowW = S * (0.10 + br * 0.13);
    bodyW = S * (0.032 + br * 0.022);
    if (px > 0) amps = boltAmp(N, cf.K, 0, px * 0.5);
  }

  /* ── WAVE ── */
  if (cf.mode === 'wave') {
    amps = new Array(N);
    for (let i = 0; i < N; i++) {
      amps[i] = Math.sin((i / N) * Math.PI * 2 * 3 + t * 0.10) * px
              + Math.sin((i / N) * Math.PI * 2 * 5 - t * 0.07) * px * 0.5;
    }
    glowW = S * 0.13;
  }

  /* ── STRIKE ── */
  if (cf.mode === 'strike') {
    amps = boltAmp(N, cf.K, Math.floor(t / 4), px);
    fl = 0.66 + rnd(Math.floor(t / 2), 5) * 0.34;
    glowW = S * 0.17 * fl;
  }

  /* ── FLOW ── */
  if (cf.mode === 'flow') {
    const f = t / 10;
    const s0 = Math.floor(f);
    const mx = f - s0;
    const sm = mx * mx * (3 - 2 * mx);
    const A = boltAmp(N, cf.K, s0, px);
    const B = boltAmp(N, cf.K, s0 + 1, px);
    amps = A.map((v, i) => v + (B[i] - v) * sm);
    const ang = (t * 0.10) % (Math.PI * 2);
    extra.push(
      <Circle key="dot" cx={cx + Math.cos(ang) * R0} cy={cy + Math.sin(ang) * R0}
        r={S * 0.045} fill={cCore} opacity={op} />
    );
    extra.push(
      <Circle key="dotg" cx={cx + Math.cos(ang) * R0} cy={cy + Math.sin(ang) * R0}
        r={S * 0.10} fill={a(cOut, 0.35)} opacity={op} />
    );
  }

  /* ── SPIN ── */
  if (cf.mode === 'spin') {
    if (px > 0) amps = boltAmp(N, cf.K, Math.floor(t / 14), px * 0.6);
    glowW = S * 0.10;
    const head = (t * 0.11) % (Math.PI * 2);
    for (let s = 0; s < 3; s++) {
      const sp = 0.55 - s * 0.15;
      extra.push(
        <Path key={'sp' + s}
          d={arcPath(cx, cy, R0, head - sp, sp, 10, amps)}
          fill="none" stroke={a(cBody, (0.75 - s * 0.2))}
          strokeWidth={S * (0.05 - s * 0.012)} strokeLinecap="round" opacity={op} />
      );
    }
    extra.push(
      <Circle key="sh" cx={cx + Math.cos(head) * R0} cy={cy + Math.sin(head) * R0}
        r={S * 0.05} fill={cCore} opacity={op} />
    );
  }

  /* ── BURST ── */
  if (cf.mode === 'burst') {
    const cyc = (t % 42) / 42;
    let f = 0;
    if (cyc < 0.08) f = cyc / 0.08;
    else if (cyc < 0.42) f = 1 - (cyc - 0.08) / 0.34;
    R = R0 * (0.90 + f * 0.26);
    glowW = S * (0.08 + f * 0.24);
    bodyW = S * (0.030 + f * 0.030);
    fl = 0.55 + f * 0.45;
    if (px > 0) amps = boltAmp(N, cf.K, Math.floor(t / 42), px * (0.4 + f));
    if (f > 0.35) {
      extra.push(
        <Path key="ripple" d={ringPath(cx, cy, R0 * (1.15 + f * 0.5), N, null)}
          fill="none" stroke={a(cOut, (1 - f) * 0.5)}
          strokeWidth={S * 0.02} opacity={op} />
      );
    }
  }

  /* ── STORM ── */
  if (cf.mode === 'storm') {
    amps = boltAmp(N, cf.K, Math.floor(t / 3), px);
    fl = 0.55 + rnd(Math.floor(t / 2), 9) * 0.45;
    glowW = S * 0.22 * fl;
    bodyW = S * 0.050;

    /* ikkinchi razryad */
    const a2 = boltAmp(N, cf.K + 5, Math.floor(t / 4) + 31, px * 0.55);
    extra.push(
      <Path key="b2" d={ringPath(cx, cy, R0 * 0.94, N, a2)}
        fill="none" stroke={a(cBody, 0.45 * fl)}
        strokeWidth={S * 0.022} strokeLinecap="round" opacity={op} />
    );

    /* uchqunlar */
    const g = Math.floor(t / 5);
    for (let i = 0; i < 5; i++) {
      const r1 = rnd(i, g);
      if (r1 < 0.45) continue;
      const ang = rnd(i, g + 17) * Math.PI * 2;
      const rr = R0 * (1.0 + rnd(i, g + 3) * 0.30);
      extra.push(
        <Circle key={'sp' + i} cx={cx + Math.cos(ang) * rr} cy={cy + Math.sin(ang) * rr}
          r={S * (0.018 + r1 * 0.030)} fill={cCore} opacity={op * (0.5 + r1 * 0.5)} />
      );
    }
  }

  const d = ringPath(cx, cy, R, N, amps);

  return (
    <View style={{ width: S, height: S }}>
      <Svg width={S} height={S}>
        <Path d={d} fill="none" stroke={a(cOut, 0.13 * fl * op)}
          strokeWidth={glowW} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} fill="none" stroke={a(cOut, 0.30 * fl * op)}
          strokeWidth={glowW * 0.5} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} fill="none" stroke={a(cBody, 0.88 * fl * op)}
          strokeWidth={bodyW} strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} fill="none" stroke={a(cCore, 0.97 * op)}
          strokeWidth={coreW} strokeLinecap="round" strokeLinejoin="round" />
        <G>{extra}</G>
      </Svg>
    </View>
  );
}
