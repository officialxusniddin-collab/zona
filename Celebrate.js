import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Easing, Dimensions } from 'react-native';

const W = Dimensions.get('window').width;
const H = Dimensions.get('window').height;

const COLORS = ['#00E5A0', '#FFD700', '#FF6BD6', '#00B4FF', '#FFB020', '#7B5CFF'];

function Confetti({ i, run }) {
  const v = useRef(new Animated.Value(0)).current;
  const [cfg] = useState(() => ({
    x: Math.random() * W,
    delay: Math.random() * 350,
    size: 6 + Math.random() * 8,
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    spin: Math.random() > 0.5 ? 1 : -1,
    drift: (Math.random() - 0.5) * 120,
    dur: 1600 + Math.random() * 900,
  }));

  useEffect(() => {
    if (!run) return;
    v.setValue(0);
    Animated.timing(v, {
      toValue: 1, duration: cfg.dur, delay: cfg.delay,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
  }, [run]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        left: cfg.x,
        top: -20,
        width: cfg.size,
        height: cfg.size * 1.6,
        borderRadius: 2,
        backgroundColor: cfg.color,
        opacity: v.interpolate({ inputRange: [0, 0.75, 1], outputRange: [1, 1, 0] }),
        transform: [
          { translateY: v.interpolate({ inputRange: [0, 1], outputRange: [0, H * 0.8] }) },
          { translateX: v.interpolate({ inputRange: [0, 1], outputRange: [0, cfg.drift] }) },
          { rotate: v.interpolate({ inputRange: [0, 1], outputRange: ['0deg', (cfg.spin * 720) + 'deg'] }) },
        ],
      }}
    />
  );
}

export default function Celebrate({ hectares, captured, onDone }) {
  const pop = useRef(new Animated.Value(0)).current;
  const wave1 = useRef(new Animated.Value(0)).current;
  const wave2 = useRef(new Animated.Value(0)).current;
  const fade = useRef(new Animated.Value(1)).current;
  const count = useRef(new Animated.Value(0)).current;
  const [num, setNum] = useState('0.00');

  useEffect(() => {
    const id = count.addListener(({ value }) => {
      setNum((value * hectares).toFixed(2));
    });

    Animated.parallel([
      Animated.spring(pop, { toValue: 1, friction: 5, tension: 70, useNativeDriver: true }),
      Animated.timing(count, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(wave1, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
      Animated.sequence([
        Animated.delay(220),
        Animated.timing(wave2, { toValue: 1, duration: 900, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      ]),
    ]).start();

    const t = setTimeout(() => {
      Animated.timing(fade, { toValue: 0, duration: 450, useNativeDriver: true }).start(() => onDone());
    }, 2600);

    return () => { count.removeListener(id); clearTimeout(t); };
  }, []);

  const waveStyle = (v) => ({
    position: 'absolute',
    width: 160, height: 160, borderRadius: 80,
    borderWidth: 3, borderColor: '#00E5A0',
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 3.2] }) }],
  });

  return (
    <Animated.View style={[s.wrap, { opacity: fade }]} pointerEvents="none">
      {Array.from({ length: 26 }).map((_, i) => <Confetti key={i} i={i} run={true} />)}

      <Animated.View style={waveStyle(wave1)} />
      <Animated.View style={waveStyle(wave2)} />

      <Animated.View style={[s.badge, {
        opacity: pop,
        transform: [
          { scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }) },
        ],
      }]}>
        <Text style={s.plus}>+</Text>
        <Text style={s.num}>{num}</Text>
        <Text style={s.unit}>GEKTAR</Text>
      </Animated.View>

      <Animated.Text style={[s.label, {
        opacity: pop,
        transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) }],
      }]}>
        ZONA EGALLANDI
      </Animated.Text>

      {captured > 0 ? (
        <Animated.Text style={[s.cap, {
          opacity: pop,
          transform: [{ translateY: pop.interpolate({ inputRange: [0, 1], outputRange: [30, 0] }) }],
        }]}>
          {'+' + captured.toFixed(2) + ' ga raqibdan tortib olindi'}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(4,10,16,0.72)',
    zIndex: 9998,
  },
  badge: { alignItems: 'center' },
  plus: { color: '#00E5A0', fontSize: 26, fontWeight: '900', marginBottom: -8 },
  num: { color: '#FFFFFF', fontSize: 68, fontWeight: '900', letterSpacing: -3 },
  unit: { color: '#00E5A0', fontSize: 12, fontWeight: '800', letterSpacing: 6, marginTop: -4 },
  label: { color: '#7A8794', fontSize: 11, fontWeight: '700', letterSpacing: 4, marginTop: 26 },
  cap: { color: '#FF6BD6', fontSize: 13, fontWeight: '700', marginTop: 14 },
});