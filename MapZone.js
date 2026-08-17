import React from 'react';
import { View, Image } from 'react-native';
import { GeoJSONSource, ImageSource, Images, Layer } from '@maplibre/maplibre-react-native';

export function toPolygon(coords) {
  const ring = coords.map((p) => [p.longitude, p.latitude]);
  if (ring.length) {
    const f = ring[0], l = ring[ring.length - 1];
    if (f[0] !== l[0] || f[1] !== l[1]) ring.push(f);
  }
  return {
    type: 'Feature',
    properties: {},
    geometry: { type: 'Polygon', coordinates: [ring] },
  };
}

export function toLine(coords) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: coords.map((p) => [p.longitude, p.latitude]),
    },
  };
}

function a(hex, op) {
  const h = (hex || '#00E5A0').replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + op + ')';
}

function zw(w) {
  return ['interpolate', ['linear'], ['zoom'],
    11, w * 0.5,
    14, w * 0.75,
    16, w,
    20, w * 1.4];
}

export function ZoneShape({ id, coords, color, fillOp, lineW, onPress }) {
  if (!coords || coords.length < 3) return null;
  const sid = 'zs_' + id;
  return (
    <GeoJSONSource id={sid} data={toPolygon(coords)} onPress={onPress}>
      <Layer
        id={'zf_' + id}
        type="fill"
        beforeId="meHalo"
        paint={{ 'fill-color': a(color, fillOp === undefined ? 0.22 : fillOp) }}
      />
      <Layer
        id={'zl_' + id}
        type="line"
        beforeId="meHalo"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': color || '#00E5A0',
          'line-width': zw(lineW || 2),
        }}
      />
    </GeoJSONSource>
  );
}

export function PathLine({ coords, color, width }) {
  if (!coords || coords.length < 2) return null;
  return (
    <GeoJSONSource id="pathSrc" data={toLine(coords)}>
      <Layer
        id="pathLay"
        type="line"
        beforeId="meHalo"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': color || '#00E5A0',
          'line-width': zw(width || 8),
        }}
      />
    </GeoJSONSource>
  );
}
/* Zona ustidagi banner rasmi */
export function ZoneImage({ id, url, bounds }) {
  if (!url || !bounds) return null;
  const b = bounds;
  /* bounds: [[lat1, lon1], [lat2, lon2]] -> [tl, tr, br, bl] */
  const lat1 = b[0][0], lon1 = b[0][1];
  const lat2 = b[1][0], lon2 = b[1][1];
  const north = Math.max(lat1, lat2);
  const south = Math.min(lat1, lat2);
  const west = Math.min(lon1, lon2);
  const east = Math.max(lon1, lon2);

  return (
    <ImageSource
      id={'img_' + id}
      coordinates={[
        [west, north],
        [east, north],
        [east, south],
        [west, south],
      ]}
      url={url}
    >
      <Layer id={'imgl_' + id} type="raster" beforeId="meHalo" paint={{ 'raster-opacity': 1 }} />
    </ImageSource>
  );
}
/* Zona burchagidagi logo/avatar */
export function ZoneLogo({ id, coords, url, size }) {
  if (!url || !coords || coords.length < 3) return null;
  /* eng shimoli-g'arbiy nuqta */
  let best = coords[0];
  let bs = -1e18;
  for (const p of coords) {
    const s = p.latitude - p.longitude;
    if (s > bs) { bs = s; best = p; }
  }
  const w = size || 26;
  return (
    <ViewAnnotation id={"va_" + id} coordinate={[best.longitude, best.latitude]} anchor="center">
      <View style={{
        width: w + 4, height: w + 4, borderRadius: (w + 4) / 2,
        backgroundColor: '#FF0000', alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
      }}>
        <Image source={{ uri: url }} style={{ width: w, height: w, borderRadius: w / 2 }} />
      </View>
    </ViewAnnotation>
  );
}
/* Barcha logolar bitta qatlamda - tez ishlaydi */
export function ZoneLogos({ items }) {
  if (!items || items.length === 0) return null;

  const imgs = {};
  const feats = [];

  for (const it of items) {
    if (!it.url || !it.coords || it.coords.length < 3) continue;
    let cx = 0, cy = 0;
    for (const p of it.coords) { cx += p.latitude; cy += p.longitude; }
    cx /= it.coords.length; cy /= it.coords.length;
    let best = it.coords[0];
    let bs = -1e18;
    for (const p of it.coords) {
      const s = p.latitude - p.longitude;
      if (s > bs) { bs = s; best = p; }
    }
    let dLat = 0, dLon = 0;
    for (const p of it.coords) {
      dLat = Math.max(dLat, Math.abs(p.latitude - cx));
      dLon = Math.max(dLon, Math.abs(p.longitude - cy));
    }
    best = { latitude: cx, longitude: cy };
    /* URL dagi ?v= qismi kalitga qoshiladi - rasm yangilanganda ID ham ozgaradi */
    let _ver = '';
    try {
      const _q = String(it.url || '').split('?v=')[1];
      if (_q) _ver = '_' + _q;
    } catch (e) {}
    const key = 'lg_' + it.id + _ver;
    imgs[key] = it.url;
    feats.push({
      type: 'Feature',
      id: it.id,
      properties: { icon: key, ar: it.area || 0 },
      geometry: { type: 'Point', coordinates: [best.longitude, best.latitude] },
    });
  }

  if (feats.length === 0) return null;

  return (
    <>
      <Images images={imgs} />
      <GeoJSONSource id="logoSrc" data={{ type: 'FeatureCollection', features: feats }}>
        <Layer
          id="logoLay"
          type="symbol"
          layout={{
            'icon-image': ['get', 'icon'],
            'icon-size': 0.10,
            'icon-offset': [0, -14],
            /* uzoqlashganda faqat kattalari korinadi */
            'icon-allow-overlap': false,
            'icon-ignore-placement': false,
            'symbol-sort-key': ['-', 0, ['get', 'ar']],
          }}
        />
      </GeoJSONSource>
    </>
  );
}
/* O'z joylashuvim - logolar ostida turadi */
export function MeDot({ lat, lon, heading, color, tracking }) {
  if (lat == null || lon == null) return null;
  const col = color || '#00E5A0';
  const pt = {
    type: 'Feature',
    properties: { k: 'dot' },
    geometry: { type: 'Point', coordinates: [lon, lat] },
  };
  const data = { type: 'FeatureCollection', features: [pt] };
  return (
    <GeoJSONSource id="meSrc" data={data}>
      <Layer
        id="meHalo"
        type="circle"
        paint={{
          'circle-radius': 26,
          'circle-color': col,
          'circle-opacity': 0.20,
          'circle-blur': 0.9,
        }}
      />
      <Layer
        id="meRing"
        type="circle"
        paint={{
          'circle-radius': 11,
          'circle-color': '#FFFFFF',
          'circle-opacity': 1,
          'circle-stroke-width': 1.2,
          'circle-stroke-color': 'rgba(0,0,0,0.10)',
        }}
      />
      <Layer
        id="meCore"
        type="circle"
        paint={{
          'circle-radius': 7.5,
          'circle-color': col,
          'circle-stroke-width': 1.5,
          'circle-stroke-color': 'rgba(255,255,255,0.45)',
        }}
      />
    </GeoJSONSource>
  );
}
/* Barcha begona zonalar bitta qatlamda - 300 zona uchun ham tez */
/* Teshikli zonani ajratish: kesik orqali ulangan halqani ikkiga bolamiz */
function splitRings(pts) {
  const n = pts.length;
  if (n < 12) return [pts];
  const holes = [];
  let cur = pts.slice();
  for (let pass = 0; pass < 4; pass++) {
    const seen = new Map();
    let found = null;
    for (let i = 0; i < cur.length; i++) {
      const k = cur[i][0].toFixed(7) + ',' + cur[i][1].toFixed(7);
      if (seen.has(k)) {
        const a = seen.get(k);
        const len = i - a;
        if (len >= 5 && (cur.length - len) >= 6) { found = [a, i]; break; }
      } else {
        seen.set(k, i);
      }
    }
    if (!found) break;
    holes.push(cur.slice(found[0], found[1]));
    cur = cur.slice(0, found[0]).concat(cur.slice(found[1] + 1));
  }
  if (holes.length === 0) return [pts];
  return [cur].concat(holes);
}

function ptIn(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    if (((yi > y) !== (yj > y)) && (x < ((xj - xi) * (y - yi)) / ((yj - yi) || 1e-12) + xi)) inside = !inside;
  }
  return inside;
}

export function ZonesBatch({ items, onPick, sid, lineW }) {
  if (!items || items.length === 0) return null;

  const feats = [];
  for (const z of items) {
    if (!z.coords || z.coords.length < 3) continue;
    const raw = z.coords.map((p) => [p.longitude, p.latitude]);
    const parts = splitRings(raw);
    const rings = parts.map((r) => {
      const rr = r.slice();
      const f = rr[0], l = rr[rr.length - 1];
      if (f[0] !== l[0] || f[1] !== l[1]) rr.push(f);
      return rr;
    });
    feats.push({
      type: 'Feature',
      id: z.id,
      properties: {
        zid: z.id,
        col: z.zone_color || z.color || '#888888',
        fop: (z.img && z.img_full) ? 0 : 0.22,
      },
      geometry: { type: 'Polygon', coordinates: rings },
    });
  }
  if (feats.length === 0) return null;

  return (
    <GeoJSONSource
      id={sid || "zbatch"}
      data={{ type: 'FeatureCollection', features: feats }}
      onPress={(e) => {
        if (!onPick) return;
        const nv = (e && e.nativeEvent) ? e.nativeEvent : null;
        const pl = nv && (nv.payload || nv);
        let feats = (pl && pl.features) || (e && e.features) || null;
        if (!feats && pl && pl.properties) feats = [pl];
        if (!feats || !feats.length) return;
        let cx = null, cy = null;
        const ll = (nv && nv.lngLat) || (pl && pl.lngLat) || null;
        if (ll && ll.length === 2) { cx = ll[0]; cy = ll[1]; }
        else if (ll && ll.longitude !== undefined) { cx = ll.longitude; cy = ll.latitude; }
        else {
          const gg = pl && pl.geometry;
          if (gg && gg.coordinates && gg.coordinates.length === 2) { cx = gg.coordinates[0]; cy = gg.coordinates[1]; }
        }
        for (const ft of feats) {
          const pr = ft.properties || {};
          if (!pr.zid) continue;
          const co = ft.geometry && ft.geometry.coordinates;
          if (cx != null && co && co.length > 1) {
            let inHole = false;
            for (let ri = 1; ri < co.length; ri++) {
              if (ptIn(cx, cy, co[ri])) { inHole = true; break; }
            }
            if (inHole) continue;
          }
          onPick(pr.zid);
          return;
        }
      }}
      hitbox={{ top: 6, right: 6, bottom: 6, left: 6 }}
    >
      <Layer
        id={(sid || "zb") + "Fill"}
        type="fill"
        beforeId="meHalo"
        paint={{
          'fill-color': ['get', 'col'],
          'fill-opacity': ['get', 'fop'],
        }}
      />
      <Layer
        id={(sid || "zb") + "Line"}
        type="line"
        beforeId="meHalo"
        layout={{ 'line-cap': 'round', 'line-join': 'round' }}
        paint={{
          'line-color': ['get', 'col'],
          'line-width': zw(lineW || 2),
        }}
      />
    </GeoJSONSource>
  );
}
























