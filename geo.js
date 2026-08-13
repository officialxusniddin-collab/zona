export function distanceM(a, b) {
  const R = 6371000;
  const dLat = (b.latitude - a.latitude) * Math.PI / 180;
  const dLon = (b.longitude - a.longitude) * Math.PI / 180;
  const la1 = a.latitude * Math.PI / 180;
  const la2 = b.latitude * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function toXY(p, ref) {
  const x = (p.longitude - ref.longitude) * 111320 * Math.cos(ref.latitude * Math.PI / 180);
  const y = (p.latitude - ref.latitude) * 110540;
  return { x, y };
}

export function polygonAreaM2(points) {
  if (!points || points.length < 3) return 0;
  const ref = points[0];
  const pts = points.map((p) => toXY(p, ref));
  let sum = 0;
  for (let i = 0; i < pts.length; i++) {
    const j = (i + 1) % pts.length;
    sum += pts[i].x * pts[j].y - pts[j].x * pts[i].y;
  }
  return Math.abs(sum) / 2;
}

function intersect(p1, p2, p3, p4) {
  const x1 = p1.longitude, y1 = p1.latitude;
  const x2 = p2.longitude, y2 = p2.latitude;
  const x3 = p3.longitude, y3 = p3.latitude;
  const x4 = p4.longitude, y4 = p4.latitude;
  const den = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(den) < 1e-12) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / den;
  const u = ((x1 - x3) * (y1 - y2) - (y1 - y3) * (x1 - x2)) / den;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return { longitude: x1 + t * (x2 - x1), latitude: y1 + t * (y2 - y1) };
}

// Halqa yopilishi uchun eng kam yurilgan masofa (metr)
const MIN_LOOP_PERIM = 60;
// Boshlanish nuqtasidan eng kam uzoqlashish (metr)
let MIN_AWAY = 30;
let CLOSE_DIST = 18;
let MIN_AREA = 500;
let MIN_PERIM = 85;
let SHAPE_RATIO = 0.16;

export function setGeoConfig(g) {
  if (!g) return;
  if (typeof g.min_away === 'number') MIN_AWAY = g.min_away;
  if (typeof g.close_dist === 'number') CLOSE_DIST = g.close_dist;
  if (typeof g.min_area === 'number') MIN_AREA = g.min_area;
  if (typeof g.min_perim === 'number') MIN_PERIM = g.min_perim;
  if (typeof g.shape_ratio === 'number') SHAPE_RATIO = g.shape_ratio;
}

// Hisoblarni eslab qolish (har nuqta uchun bir marta)
let awayCache = [];
export function resetLoopCache() { awayCache = []; }

/* GPS shovqinini yumshatish - shakl tekshiruvi uchun */
function smoothForTest(pts) {
  let r = pts;
  for (let k = 0; k < 3; k++) {
    const n = r.length;
    if (n < 5) break;
    const out = new Array(n);
    out[0] = r[0];
    out[n - 1] = r[n - 1];
    for (let i = 1; i < n - 1; i++) {
      const a = r[i - 1], b = r[i], c = r[i + 1];
      out[i] = {
        latitude: a.latitude * 0.3 + b.latitude * 0.4 + c.latitude * 0.3,
        longitude: a.longitude * 0.3 + b.longitude * 0.4 + c.longitude * 0.3,
      };
    }
    r = out;
  }
  return r;
}

function shapeOk(loop) {
  const sm = smoothForTest(loop);
  let per = 0;
  for (let i = 1; i < sm.length; i++) per += distanceM(sm[i - 1], sm[i]);
  per += distanceM(sm[sm.length - 1], sm[0]);
  const ar = polygonAreaM2(sm);
  /* soxta halqa (bir joyda turish) - kichik maydon */
  if (ar < MIN_AREA) return false;
  /* juda qisqa halqa */
  if (per < MIN_PERIM) return false;
  /* orqaga qaytish - maydon deyarli nol */
  return ar >= ((per * per) / (4 * Math.PI)) * SHAPE_RATIO;
}

export function findLoop(fullPath, minPoints = 6, closeDist) {
  if (closeDist == null) closeDist = CLOSE_DIST;
  /* tez harakatda nuqtalar siyrak tushadi - yopilish masofasi kengayadi */
  try {
    const nn = fullPath.length;
    if (nn >= 4) {
      let sd = 0;
      for (let q = nn - 3; q < nn; q++) sd += distanceM(fullPath[q - 1], fullPath[q]);
      const spdClose = sd / 3;
      if (spdClose > closeDist) closeDist = Math.min(spdClose * 1.5, 60);
    }
  } catch (e) {}
  // Juda uzun yo'lda faqat oxirgi qismni tekshiramiz (tezlik uchun)
  const path = fullPath;
  const off = 0;
  const n = path.length;
  if (n < minPoints + 2) return null;

  // Yo'l bo'ylab yig'ma masofa
  const cum = new Array(n);
  cum[0] = 0;
  for (let i = 1; i < n; i++) cum[i] = cum[i - 1] + distanceM(path[i - 1], path[i]);
  const total = cum[n - 1];

  // Umumiy yurilgan masofa yetarli emas
  if (total < 40) return null;

  const end = path[n - 1];

  // 1) Yaqinlik: faqat yetarlicha uzoq yurilgan nuqtalar tekshiriladi
  let bestI = -1, bestD = 1e9;
  for (let i = 0; i <= n - 1 - minPoints; i++) {
    // shu nuqtadan hozirgacha yurilgan masofa
    const walked = cum[n - 1] - cum[i];
    if (walked < 40) break;

    // yo'l shu nuqtadan haqiqatan uzoqlashganmi
    if (awayCache[i] === undefined) {
      let away = 0;
      const stop = n - 1;
      for (let j = i + 1; j < stop; j++) {
        const d = distanceM(path[i], path[j]);
        if (d > away) away = d;
        if (away >= MIN_AWAY) break;
      }
      if (away >= MIN_AWAY) awayCache[i] = 1;
      else if (stop >= n - 1) awayCache[i] = 0;
    }
    if (awayCache[i] !== 1) continue;

    const dd = distanceM(path[i], end);
    if (dd <= closeDist && dd < bestD) { bestD = dd; bestI = i; }
  }

  // Eng katta maydon beradigan variantni tanlaymiz
  if (bestI >= 0) {
    let bA = polygonAreaM2([...path.slice(bestI, n), path[bestI]]);
    for (let i = 0; i < bestI; i++) {
      if (cum[n - 1] - cum[i] < 40) break;
      if (distanceM(path[i], end) > closeDist) continue;
      const a2 = polygonAreaM2([...path.slice(i, n), path[i]]);
      if (a2 > bA) { bA = a2; bestI = i; }
    }
  }
  if (bestI >= 0) {
    const loop = [...path.slice(bestI, n), path[bestI]];
    // Haqiqiy halqa: maydon perimetrga mos kelishi kerak
    // To'g'ri chiziq -> maydon ~0. Aylana -> maydon = P^2/(4*pi)
    if (!shapeOk(loop)) return null;
    if (loop.length >= minPoints) {
      const per = cum[n - 1] - cum[bestI];
      return { loop, cutIndex: off + bestI, point: path[bestI], perim: per, small: per < MIN_LOOP_PERIM };
    }
  }

  // 2) Aniq kesishish
  const a = path[n - 2], b = path[n - 1];
  for (let i = 0; i <= n - 3 - minPoints; i++) {
    if (cum[n - 1] - cum[i] < 40) break;
    const x = intersect(a, b, path[i], path[i + 1]);
    if (x) {
      const loop = [x, ...path.slice(i + 1, n - 1), x];
      if (loop.length < minPoints) continue;
      if (!shapeOk(loop)) continue;
      const per2 = cum[n - 1] - cum[i];
      return { loop, cutIndex: off + i, point: x, perim: per2, small: per2 < MIN_LOOP_PERIM };
    }
  }

  return null;
}

export function smoothLast(path) {
  const n = path.length;
  if (n < 3) return path[n - 1];
  const a = path[n - 3], b = path[n - 2], c = path[n - 1];
  return {
    latitude: (a.latitude * 0.2 + b.latitude * 0.3 + c.latitude * 0.5),
    longitude: (a.longitude * 0.2 + b.longitude * 0.3 + c.longitude * 0.5),
  };
}






// -- Polygon silliqlash --
// 1) Douglas-Peucker: ortiqcha nuqtalar olib tashlanadi (shakl saqlanadi)
function perpDist(p, a, b) {
  const x = p.longitude, y = p.latitude;
  const x1 = a.longitude, y1 = a.latitude;
  const x2 = b.longitude, y2 = b.latitude;
  const dx = x2 - x1, dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-18) return distanceM(p, a);
  let t = ((x - x1) * dx + (y - y1) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return distanceM(p, { longitude: x1 + t * dx, latitude: y1 + t * dy });
}

function rdp(pts, tol) {
  if (pts.length < 3) return pts.slice();
  let maxD = 0, idx = 0;
  const a = pts[0], b = pts[pts.length - 1];
  for (let i = 1; i < pts.length - 1; i++) {
    const d = perpDist(pts[i], a, b);
    if (d > maxD) { maxD = d; idx = i; }
  }
  if (maxD <= tol) return [a, b];
  const left = rdp(pts.slice(0, idx + 1), tol);
  const right = rdp(pts.slice(idx), tol);
  return left.slice(0, -1).concat(right);
}

// 2) Chaikin: burchaklarni yumshatish (bir marta - realistik qoladi)
function chaikin(pts) {
  const n = pts.length;
  if (n < 4) return pts.slice();
  const out = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], q = pts[(i + 1) % n];
    out.push({
      latitude: p.latitude * 0.75 + q.latitude * 0.25,
      longitude: p.longitude * 0.75 + q.longitude * 0.25,
    });
    out.push({
      latitude: p.latitude * 0.25 + q.latitude * 0.75,
      longitude: p.longitude * 0.25 + q.longitude * 0.75,
    });
  }
  return out;
}

export function smoothPolygon(loop, tolM) {
  if (!loop || loop.length < 5) return loop;
  // yopilish nuqtasini olib tashlaymiz
  let pts = loop.slice();
  const first = pts[0], last = pts[pts.length - 1];
  if (distanceM(first, last) < 1) pts = pts.slice(0, -1);

  // GPS titrashiga qarab dopusk (2-6 metr)
  const tol = tolM || 3.5;
  let simp = rdp(pts, tol);

  // juda kam nuqta qolsa - asl holatga qaytamiz
  if (simp.length < 4) simp = pts;

  // burchaklarni yumshatamiz
  let sm = chaikin(simp);

  // nuqta juda ko'p bo'lsa qisqartiramiz
  if (sm.length > 140) sm = rdp(sm, tol * 0.6);

  sm.push(sm[0]);
  return sm;
}



















/* Nuqta ko'pburchak ichidami */
function ptInPoly(pt, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const yi = poly[i].latitude, xi = poly[i].longitude;
    const yj = poly[j].latitude, xj = poly[j].longitude;
    if (((yi > pt.latitude) !== (yj > pt.latitude)) &&
        (pt.longitude < ((xj - xi) * (pt.latitude - yi)) / ((yj - yi) || 1e-12) + xi)) {
      inside = !inside;
    }
  }
  return inside;
}

/* Yo'l o'z zonasidan chiqib, yana o'z zonasiga qaytdimi?
   Qaytaradi: { loop, cutIndex, area } yoki null */
export function findZoneTouch(path, myZones) {
  if (!path || path.length < 10) return null;
  if (!myZones || myZones.length === 0) return null;

  const n = path.length;
  const last = path[n - 1];

  /* oxirgi nuqta biror zonamning ichidami */
  let inZone = null;
  for (const z of myZones) {
    if (!z.coords || z.coords.length < 3) continue;
    if (ptInPoly(last, z.coords)) { inZone = z; break; }
  }
  if (!inZone) return null;

  /* orqaga yurib, zonadan chiqqan joyni topamiz */
  let exitAt = -1;
  for (let i = n - 2; i >= 0; i--) {
    if (!ptInPoly(path[i], inZone.coords)) { continue; }
    /* bu nuqta ham ichida - demak shu yerdan chiqqan */
    exitAt = i;
    break;
  }
  if (exitAt < 0) return null;

  /* chiqqandan keyin yetarlicha yurganmi */
  let walked = 0;
  for (let i = exitAt + 1; i < n; i++) walked += distanceM(path[i - 1], path[i]);
  if (walked < 120) return null;

  const loop = path.slice(exitAt, n);
  if (loop.length < 8) return null;
  if (!shapeOk(loop)) return null;

  return { loop: [...loop, loop[0]], cutIndex: exitAt, point: path[exitAt], perim: walked, zoneId: inZone.id };
}
