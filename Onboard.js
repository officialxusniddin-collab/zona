import { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated, Easing, Dimensions, PanResponder } from 'react-native';

const W = Dimensions.get('window').width;
const AC = '#00E5A0';
const BG = '#070B10';

function Slide1({ run }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) return;
    a.setValue(0); b.setValue(0);
    Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 700, easing: Easing.bezier(0.16, 1, 0.3, 1), useNativeDriver: true }),
      Animated.timing(b, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
    Animated.loop(Animated.sequence([
      Animated.timing(b, { toValue: 1.02, duration: 1200, useNativeDriver: true }),
      Animated.timing(b, { toValue: 1, duration: 1200, useNativeDriver: true }),
    ])).start();
  }, [run]);
  return (
    <View style={s.stage}>
      <Animated.View style={[s.ring, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.5, 1] }) }] }]} />
      <Animated.View style={[s.core, { opacity: a, transform: [{ scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }] }]} />
    </View>
  );
}

function Slide2({ run }) {
  const p = useRef(new Animated.Value(0)).current;
  const fill = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) return;
    p.setValue(0); fill.setValue(0);
    Animated.sequence([
      Animated.timing(p, { toValue: 1, duration: 2200, easing: Easing.linear, useNativeDriver: true }),
      Animated.timing(fill, { toValue: 1, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [run]);
  const R = 78;
  return (
    <View style={s.stage}>
      <Animated.View style={[s.zoneFill, {
        opacity: fill,
        transform: [{ scale: fill.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
      }]} />
      <View style={s.zoneRing} />
      <Animated.View style={[s.walker, {
        transform: [
          { rotate: p.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
          { translateY: -R },
        ],
      }]} />
    </View>
  );
}

function Slide3({ run }) {
  const a = useRef(new Animated.Value(0)).current;
  const g = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) return;
    a.setValue(0);
    Animated.spring(a, { toValue: 1, friction: 5, tension: 60, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(g, { toValue: 1, duration: 1000, useNativeDriver: true }),
      Animated.timing(g, { toValue: 0, duration: 1000, useNativeDriver: true }),
    ])).start();
  }, [run]);
  return (
    <View style={s.stage}>
      <View style={[s.zoneFill, { opacity: 0.9 }]} />
      <View style={s.zoneRing} />
      <Animated.View style={[s.glowRing, {
        opacity: g.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] }),
        transform: [{ scale: g.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }) }],
      }]} />
      <Animated.View style={[s.avatar, {
        opacity: a,
        transform: [
          { scale: a.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) },
          { rotate: a.interpolate({ inputRange: [0, 1], outputRange: ['-40deg', '0deg'] }) },
        ],
      }]}>
        <Text style={{ fontSize: 30 }}>{'\uD83D\uDC64'}</Text>
      </Animated.View>
    </View>
  );
}

function Slide4({ run }) {
  const c = useRef(new Animated.Value(0)).current;
  const r1 = useRef(new Animated.Value(0)).current;
  const r2 = useRef(new Animated.Value(0)).current;
  const r3 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) return;
    [c, r1, r2, r3].forEach((x) => x.setValue(0));
    Animated.stagger(180, [
      Animated.spring(c, { toValue: 1, friction: 7, useNativeDriver: true }),
      Animated.timing(r1, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(r2, { toValue: 1, duration: 350, useNativeDriver: true }),
      Animated.timing(r3, { toValue: 1, duration: 350, useNativeDriver: true }),
    ]).start();
  }, [run]);
  const row = (v, txt, col) => (
    <Animated.View style={{
      opacity: v,
      transform: [{ translateX: v.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
      backgroundColor: col || 'rgba(255,255,255,0.06)',
      paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, marginTop: 7,
    }}>
      <Text style={{ color: col ? '#04140E' : '#C8D2DC', fontSize: 12, fontWeight: col ? '800' : '600' }}>{txt}</Text>
    </Animated.View>
  );
  return (
    <View style={s.stage}>
      <Animated.View style={[s.card, {
        opacity: c,
        transform: [{ scale: c.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
      }]}>
        <View style={{ height: 4, backgroundColor: AC, borderRadius: 2, width: 40, marginBottom: 10 }} />
        <Text style={{ color: '#fff', fontSize: 16, fontWeight: '800' }}>Sizning do'koningiz</Text>
        <Text style={{ color: '#5F6B78', fontSize: 11, marginTop: 2 }}>2.4 gektar</Text>
        {row(r1, 'Bugun 20% chegirma', AC)}
        {row(r2, '+998 __ ___ __ __')}
        {row(r3, 'Instagram: @sahifangiz')}
      </Animated.View>
    </View>
  );
}

function Slide5({ run }) {
  const cut = useRef(new Animated.Value(0)).current;
  const flip = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (!run) return;
    cut.setValue(0); flip.setValue(0);
    Animated.sequence([
      Animated.timing(cut, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(flip, { toValue: 1, duration: 700, useNativeDriver: true }),
    ]).start();
  }, [run]);
  return (
    <View style={s.stage}>
      <Animated.View style={{
        position: 'absolute', width: 150, height: 110, borderRadius: 14,
        borderWidth: 2.5, borderColor: '#FF4D6D',
        backgroundColor: flip.interpolate({ inputRange: [0, 1], outputRange: ['rgba(255,77,109,0.25)', 'rgba(0,229,160,0.25)'] }),
      }} />
      <Animated.View style={{
        position: 'absolute', width: 3, height: 190, backgroundColor: AC,
        borderRadius: 2,
        transform: [
          { rotate: '28deg' },
          { translateX: cut.interpolate({ inputRange: [0, 1], outputRange: [-110, 60] }) },
        ],
        shadowColor: AC, shadowOpacity: 0.9, shadowRadius: 12, elevation: 8,
      }} />
      <Animated.Text style={{
        position: 'absolute', bottom: 8, color: AC, fontSize: 13, fontWeight: '800',
        opacity: flip,
      }}>+1.2 gektar sizga oʻtdi</Animated.Text>
    </View>
  );
}

const PAGES = [
  { comp: Slide1, title: 'ZONA', sub: 'Yurgan yoʻlingiz - sizning hududingiz' },
  { comp: Slide2, title: 'Aylanib chiqing', sub: 'START bosing, koʻchada aylaning va boshlagan joyingizga qayting. Ichkarisi sizniki boʻladi.' },
  { comp: Slide5, title: 'Raqobat qiling', sub: 'Birovning zonasidan kesib oʻtsangiz, oʻsha boʻlak sizga oʻtadi. Oʻz hududingizni himoya qiling.' },
  { comp: Slide3, title: 'Oʻzingizni koʻrsating', sub: 'Zonangizda rasmingiz koʻrinadi. Doʻkon yoki xizmatingiz boʻlsa - telefon va manzilni ham qoʻshing.' },
  { comp: Slide4, title: 'Tayyormisiz?', sub: 'Birinchi zonangizni oling. Hovlini aylanish ham yetarli.' },
];

export default function Onboard({ onDone }) {
  const [i, setI] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;
  const txt = useRef(new Animated.Value(0)).current;
  const busy = useRef(false);

  useEffect(() => {
    txt.setValue(0);
    Animated.timing(txt, { toValue: 1, duration: 500, delay: 200, useNativeDriver: true }).start();
  }, [i]);

  const go = (n) => {
    if (busy.current) return;
    if (n < 0 || n >= PAGES.length) return;
    if (n === i) return;
    busy.current = true;
    Animated.timing(fade, { toValue: 0, duration: 160, useNativeDriver: true }).start(() => {
      setI(n);
      Animated.timing(fade, { toValue: 1, duration: 240, useNativeDriver: true }).start(() => {
        busy.current = false;
      });
    });
  };

  const next = () => {
    if (i >= PAGES.length - 1) { onDone(); return; }
    go(i + 1);
  };

  const pan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 18 && Math.abs(g.dy) < 60,
      onPanResponderRelease: (e, g) => {
        if (g.dx < -45) { setI((p) => (p < PAGES.length - 1 ? p + 1 : p)); }
        else if (g.dx > 45) { setI((p) => (p > 0 ? p - 1 : p)); }
      },
    })
  ).current;

  const P = PAGES[i];
  const C = P.comp;
  const last = i >= PAGES.length - 1;

  return (
    <View style={s.wrap} {...pan.panHandlers}>
      {i > 0 ? (
        <TouchableOpacity style={s.back} onPress={() => go(i - 1)} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: '#4E5A66', fontSize: 20 }}>{'\u2039'}</Text>
        </TouchableOpacity>
      ) : null}

      {!last ? (
        <TouchableOpacity style={s.skip} onPress={onDone} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
          <Text style={{ color: '#4E5A66', fontSize: 12.5 }}>Oʻtkazish</Text>
        </TouchableOpacity>
      ) : null}

      <Animated.View style={{ flex: 1, opacity: fade, alignItems: 'center', justifyContent: 'center' }}>
        <C run={true} key={i} />

        <Animated.Text style={[s.title, {
          opacity: txt,
          transform: [{ translateY: txt.interpolate({ inputRange: [0, 1], outputRange: [14, 0] }) }],
        }]}>{P.title}</Animated.Text>

        <Animated.Text style={[s.sub, {
          opacity: txt,
          transform: [{ translateY: txt.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
        }]}>{P.sub}</Animated.Text>
      </Animated.View>

      <View style={s.dots}>
        {PAGES.map((_, k) => (
          <TouchableOpacity key={k} onPress={() => go(k)} hitSlop={{ top: 14, bottom: 14, left: 6, right: 6 }}>
            <View style={[s.dot, k === i ? s.dotOn : null]} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity style={[s.btn, last ? s.btnLast : null]} onPress={next} activeOpacity={0.85}>
        <Text style={s.btnTxt}>{last ? 'BOSHLAYMIZ' : 'KEYINGI'}</Text>
      </TouchableOpacity>

      {!last ? (
        <Text style={s.hint}>Surib koʻring</Text>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFillObject, backgroundColor: BG, paddingTop: 60, paddingBottom: 40, zIndex: 9999 },
  skip: { position: 'absolute', top: 52, right: 20, zIndex: 2, padding: 8 },
  stage: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginBottom: 30 },
  ring: { position: 'absolute', width: 190, height: 190, borderRadius: 95, borderWidth: 1.5, borderColor: 'rgba(0,229,160,0.35)' },
  core: { width: 74, height: 74, borderRadius: 28, backgroundColor: AC, shadowColor: AC, shadowOpacity: 1, shadowRadius: 40, elevation: 20 },
  zoneRing: { position: 'absolute', width: 156, height: 156, borderRadius: 78, borderWidth: 3, borderColor: AC },
  zoneFill: { position: 'absolute', width: 156, height: 156, borderRadius: 78, backgroundColor: 'rgba(0,229,160,0.28)' },
  walker: { position: 'absolute', width: 15, height: 15, borderRadius: 8, backgroundColor: '#fff', borderWidth: 3, borderColor: AC },
  glowRing: { position: 'absolute', width: 110, height: 110, borderRadius: 55, backgroundColor: AC },
  avatar: { width: 66, height: 66, borderRadius: 24, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  card: { width: 230, backgroundColor: '#121A24', borderRadius: 18, padding: 16 },
  title: { color: '#fff', fontSize: 26, fontWeight: '900', letterSpacing: -0.5, textAlign: 'center' },
  sub: { color: '#6E7B88', fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20, paddingHorizontal: 34 },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 20 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#26313D', marginHorizontal: 4 },
  dotOn: { width: 22, backgroundColor: AC },
  btn: { marginHorizontal: 30, backgroundColor: AC, paddingVertical: 16, borderRadius: 18, alignItems: 'center', shadowColor: AC, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 },
  back: { position: 'absolute', top: 50, left: 18, zIndex: 2, padding: 8 },
  btnLast: { backgroundColor: '#00E5A0' },
  hint: { color: '#2E3A46', fontSize: 10.5, textAlign: 'center', marginTop: 10, marginBottom: -4 },
  btnTxt: { color: '#04140E', fontWeight: '900', fontSize: 15, letterSpacing: 1.5 },
});


