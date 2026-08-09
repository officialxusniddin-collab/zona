import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, Easing, Pressable, PanResponder, Dimensions } from 'react-native';
import * as Haptics from 'expo-haptics';

const WIN_H = Dimensions.get('window').height;

export const tap = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
};
export const tapMed = () => {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
};
export const tapOk = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
};
export const tapErr = () => {
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
};

export function Press({ children, onPress, style, scale = 0.96, haptic = true, disabled }) {
  const s = useRef(new Animated.Value(1)).current;
  const down = () => {
    if (haptic) tap();
    Animated.spring(s, { toValue: scale, useNativeDriver: true, speed: 50, bounciness: 0 }).start();
  };
  const up = () => {
    Animated.spring(s, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 8 }).start();
  };
  return (
    <Pressable onPressIn={down} onPressOut={up} onPress={onPress} disabled={disabled}>
      <Animated.View style={[style, { transform: [{ scale: s }], opacity: disabled ? 0.55 : 1 }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

export function Skel({ w, h, r = 10, mt = 0, mb = 0, mr = 0, flex, bg = '#8A96A3' }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(a, { toValue: 0, duration: 900, useNativeDriver: true }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <Animated.View
      style={{
        width: w, height: h, borderRadius: r,
        marginTop: mt, marginBottom: mb, marginRight: mr,
        flex: flex,
        backgroundColor: bg,
        opacity: a.interpolate({ inputRange: [0, 1], outputRange: [0.10, 0.22] }),
      }}
    />
  );
}

export function SkelRow({ bg }) {
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'center',
      paddingVertical: 12, paddingHorizontal: 14,
      borderRadius: 16, marginBottom: 8, backgroundColor: bg,
    }}>
      <Skel w={34} h={34} r={17} mr={12} />
      <View style={{ flex: 1 }}>
        <Skel w={'62%'} h={13} r={7} />
        <Skel w={'38%'} h={10} r={5} mt={7} />
      </View>
      <Skel w={46} h={16} r={8} />
    </View>
  );
}

export function SkelList({ n = 5, bg }) {
  return (
    <View>
      {Array.from({ length: n }).map((_, i) => <SkelRow key={i} bg={bg} />)}
    </View>
  );
}

export function SkelCard({ bg }) {
  return (
    <View style={{ padding: 4 }}>
      <Skel w={64} h={64} r={32} />
      <Skel w={'55%'} h={19} r={9} mt={14} />
      <Skel w={'34%'} h={12} r={6} mt={8} />
      <View style={{ height: 14 }} />
      <Skel w={'100%'} h={11} r={6} mt={6} />
      <Skel w={'82%'} h={11} r={6} mt={8} />
      <Skel w={'68%'} h={11} r={6} mt={8} />
      <View style={{ height: 16 }} />
      <Skel w={'100%'} h={44} r={14} />
    </View>
  );
}

export function SkelStats({ bg }) {
  return (
    <View>
      <View style={{ flexDirection: 'row', marginBottom: 12 }}>
        <Skel w={0} flex={1} h={70} r={16} mr={9} />
        <Skel w={0} flex={1} h={70} r={16} mr={9} />
        <Skel w={0} flex={1} h={70} r={16} />
      </View>
      <Skel w={'42%'} h={12} r={6} mt={8} mb={10} />
      <Skel w={'100%'} h={130} r={18} />
      <Skel w={'42%'} h={12} r={6} mt={18} mb={10} />
      <SkelRow bg={bg} />
      <SkelRow bg={bg} />
    </View>
  );
}

export function FadeIn({ children, delay = 0, from = 14, style }) {
  const a = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(a, {
      toValue: 1, duration: 380, delay, useNativeDriver: true,
    }).start();
  }, []);
  return (
    <Animated.View style={[style, {
      opacity: a,
      transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [from, 0] }) }],
    }]}>
      {children}
    </Animated.View>
  );
}

export function Empty({ icon, title, text, action, actionText, accent, textMain, textSub, rowBg }) {
  const a = useRef(new Animated.Value(0)).current;
  const f = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(a, { toValue: 1, duration: 500, useNativeDriver: true }).start();
    Animated.loop(Animated.sequence([
      Animated.timing(f, { toValue: 1, duration: 2200, useNativeDriver: true }),
      Animated.timing(f, { toValue: 0, duration: 2200, useNativeDriver: true }),
    ])).start();
  }, []);

  return (
    <Animated.View style={{
      alignItems: 'center', justifyContent: 'center',
      paddingVertical: 44, paddingHorizontal: 26,
      opacity: a,
      transform: [{ translateY: a.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) }],
    }}>
      <Animated.View style={{
        width: 92, height: 92, borderRadius: 46,
        backgroundColor: rowBg,
        alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
        transform: [{ translateY: f.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }],
      }}>
        <Text style={{ fontSize: 40 }}>{icon}</Text>
      </Animated.View>

      <Text style={{
        color: textMain, fontSize: 17, fontWeight: '800',
        textAlign: 'center', marginBottom: 8,
      }}>{title}</Text>

      <Text style={{
        color: textSub, fontSize: 13, lineHeight: 20,
        textAlign: 'center', maxWidth: 280,
      }}>{text}</Text>

      {action ? (
        <Press onPress={action} style={{
          marginTop: 22, paddingHorizontal: 26, paddingVertical: 13,
          borderRadius: 15, backgroundColor: accent,
        }}>
          <Text style={{ color: '#04150F', fontWeight: '800', fontSize: 13 }}>
            {actionText}
          </Text>
        </Press>
      ) : null}
    </Animated.View>
  );
}

export function Toast({ msg, kind, bg, onDone }) {
  const y = useRef(new Animated.Value(90)).current;

  useEffect(() => {
    if (!msg) return;
    Animated.spring(y, { toValue: 0, useNativeDriver: true, speed: 14, bounciness: 6 }).start();
    const t = setTimeout(function () {
      Animated.timing(y, { toValue: 90, duration: 260, useNativeDriver: true })
        .start(function () { if (onDone) onDone(); });
    }, 2600);
    return function () { clearTimeout(t); };
  }, [msg]);

  if (!msg) return null;

  var col = '#5A6672';
  var ic = 'i';
  if (kind === 'ok') { col = '#00C88A'; ic = 'OK'; }
  else if (kind === 'err') { col = '#FF4D6D'; ic = '!'; }
  else if (kind === 'warn') { col = '#F5A623'; ic = '!'; }

  return (
    <Animated.View style={{
      position: 'absolute', left: 18, right: 18, bottom: 110,
      transform: [{ translateY: y }],
      zIndex: 999,
    }}>
      <View style={{
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: bg,
        paddingHorizontal: 16, paddingVertical: 14,
        borderRadius: 18,
        shadowColor: '#000', shadowOpacity: 0.28, shadowRadius: 18,
        shadowOffset: { width: 0, height: 8 }, elevation: 14,
        borderLeftWidth: 4, borderLeftColor: col,
      }}>
        <View style={{
          width: 26, height: 26, borderRadius: 13,
          backgroundColor: col,
          alignItems: 'center', justifyContent: 'center',
          marginRight: 12,
        }}>
          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '900' }}>{ic}</Text>
        </View>
        <Text style={{ color: '#F2F6FA', fontSize: 13.5, flex: 1, lineHeight: 19 }}>{msg}</Text>
      </View>
    </Animated.View>
  );
}

export function Sheet({ children, onClose, bg, border }) {
  const H = WIN_H;
  const y = useRef(new Animated.Value(0)).current;
  const cur = useRef(0);

  useEffect(() => {
    const id = y.addListener(({ value }) => { cur.current = value; });
    return () => y.removeListener(id);
  }, []);

  const snapTo = (v, cb) => {
    Animated.spring(y, { toValue: v, useNativeDriver: true, speed: 16, bounciness: 2 }).start(cb);
  };

  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 2,
    onPanResponderGrant: () => { y.setOffset(cur.current); y.setValue(0); },
    onPanResponderMove: (_, g) => {
      if (g.dy < 0 && cur.current <= 0) y.setValue(g.dy * 0.18);
      else y.setValue(g.dy);
    },
    onPanResponderRelease: (_, g) => {
      y.flattenOffset();
      const pos = cur.current;
      const fast = g.vy > 1.1;
      if (fast || pos > H * 0.55) snapTo(H, () => { if (onClose) onClose(); });
      else if (pos > H * 0.22) snapTo(H * 0.45);
      else snapTo(0);
    },
  })).current;

  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: '#000',
        opacity: y.interpolate({ inputRange: [0, H], outputRange: [0.55, 0], extrapolate: 'clamp' }),
      }} />
      <Animated.View style={{
        flex: 1, backgroundColor: bg,
        borderTopLeftRadius: 30, borderTopRightRadius: 30,
        transform: [{ translateY: y }],
      }}>
        <View {...pan.panHandlers} style={{ paddingTop: 44, paddingBottom: 14, alignItems: 'center' }}>
          <View style={{ width: 52, height: 6, borderRadius: 3, backgroundColor: border }} />
        </View>
        <View style={{ flex: 1, paddingHorizontal: 18, paddingBottom: 18 }}>
          {children}
        </View>
      </Animated.View>
    </View>
  );
}