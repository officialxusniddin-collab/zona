import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Keyboard, Modal,
  KeyboardAvoidingView, Platform, ScrollView, Linking,
} from 'react-native';
import { authSend, authVerify } from './api';

const AC = '#00C98A';
const BG = '#FFFFFF';
const CARD = '#FFFFFF';
const LINE = '#E2E8ED';
const SUB = '#7A8794';
const BOT = 'ZonaAppbot';

export default function Login({ visible, onClose, onDone, force }) {
  const [mode, setMode] = useState(0);
  const [step, setStep] = useState(1);
  const [contact, setContact] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [known, setKnown] = useState(false);
  const [via, setVia] = useState('email');
  const [left, setLeft] = useState(0);
  const fade = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(24)).current;

  useEffect(() => {
    if (!visible) return;
    setMode(0); setStep(1); setCode(''); setErr(''); setBusy(false);
    anim();
  }, [visible]);

  const anim = () => {
    fade.setValue(0); slide.setValue(24);
    Animated.parallel([
      Animated.timing(fade, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(slide, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  useEffect(() => { anim(); }, [mode, step]);

  useEffect(() => {
    if (left <= 0) return;
    const t = setTimeout(() => setLeft(left - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  useEffect(() => {
    if (step === 2 && code.length === 6 && !busy) verify();
  }, [code]);

  const send = async () => {
    const v = contact.trim();
    if (v.length < 5) { setErr('Toʻldiring'); return; }
    setBusy(true); setErr('');
    Keyboard.dismiss();
    try {
      const r = await authSend(v);
      setKnown(!!r.known);
      setVia(r.kind);
      setStep(2);
      setLeft(60);
      if (r.kind === 'phone') {
        setTimeout(function () {
          Linking.openURL('https://t.me/' + BOT).catch(function () {});
        }, 700);
      }
    } catch (e) {
      setErr(String(e.message || 'Xato'));
    }
    setBusy(false);
  };

  const verify = async () => {
    if (code.trim().length !== 6) return;
    setBusy(true); setErr('');
    Keyboard.dismiss();
    try {
      const r = await authVerify(contact.trim(), code.trim());
      onDone(r);
    } catch (e) {
      setErr(String(e.message || 'Kod notoʻgʻri'));
      setCode('');
    }
    setBusy(false);
  };

  const back = () => {
    if (step === 2) { setStep(1); setCode(''); setErr(''); return; }
    if (mode !== 0) { setMode(0); setContact(''); setErr(''); return; }
    if (!force) onClose();
  };

  return (
    <Modal visible={visible} animationType="fade" transparent={false} onRequestClose={back}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={s.wrap}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', paddingHorizontal: 26 }}
          keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {(mode !== 0 || step === 2) ? (
            <TouchableOpacity style={s.back} onPress={back} hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}>
              <Text style={{ color: SUB, fontSize: 23 }}>{'\u2039'}</Text>
            </TouchableOpacity>
          ) : null}

          <Animated.View style={{ opacity: fade, transform: [{ translateY: slide }] }}>

            {mode === 0 ? (
              <View>
                <Text style={s.hero}>Hududni{'\n'}egallang</Text>
                <Text style={s.tag}>Yurgan yoʻlingiz — sizning hududingiz</Text>

                <View style={{ height: 40 }} />

                <TouchableOpacity activeOpacity={0.85} disabled
                  style={[s.big, { backgroundColor: CARD, borderColor: LINE, opacity: 0.45 }]}>
                  <Text style={{ fontSize: 16, marginRight: 11 }}>{'\uD83C\uDF10'}</Text>
                  <Text style={[s.bigTxt, { color: '#A8B4C0' }]}>Google orqali</Text>
                  <View style={s.soon}><Text style={s.soonTxt}>tez orada</Text></View>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.85} onPress={() => { setMode(1); setContact(''); }}
                  style={[s.big, { backgroundColor: AC, borderColor: AC }]}>
                  <Text style={{ fontSize: 15, marginRight: 11 }}>{'\u2709\uFE0F'}</Text>
                  <Text style={[s.bigTxt, { color: '#FFFFFF' }]}>Email orqali</Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.85} onPress={() => { setMode(2); setContact('+998'); }}
                  style={[s.big, { backgroundColor: CARD, borderColor: LINE }]}>
                  <Text style={{ fontSize: 15, marginRight: 11 }}>{'\uD83D\uDCF1'}</Text>
                  <Text style={[s.bigTxt, { color: '#0B1015' }]}>Telefon</Text>
                </TouchableOpacity>
                <Text style={{ color: '#98A4B0', fontSize: 11, textAlign: 'center', marginTop: -6, marginBottom: 14 }}>
                  Kod Telegram botga keladi
                </Text>

                <Text style={s.legal}>
                  Davom etish orqali foydalanish shartlariga rozilik bildirasiz
                </Text>
              </View>

            ) : step === 1 ? (
              <View>
                <Text style={s.emoji}>{mode === 1 ? '\u2709\uFE0F' : '\uD83D\uDCF1'}</Text>
                <Text style={s.title}>{mode === 1 ? 'Email manzilingiz' : 'Telefon raqamingiz'}</Text>
                <Text style={s.sub}>
                  {mode === 1 ? 'Kirish kodi shu manzilga keladi' : 'Kod Telegram botga yuboriladi'}
                </Text>

                <TextInput
                  value={contact}
                  onChangeText={(t) => { setContact(t); setErr(''); }}
                  placeholder={mode === 1 ? 'siz@mail.com' : '+998 90 123 45 67'}
                  placeholderTextColor="#B4BEC8"
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType={mode === 1 ? 'email-address' : 'phone-pad'}
                  style={[s.input, err ? { borderColor: '#FF4D6D' } : null]}
                  maxLength={60}
                  autoFocus
                  onSubmitEditing={send}
                  returnKeyType="go"
                />

                {err ? <Text style={s.err}>{err}</Text> : null}

                <TouchableOpacity onPress={send} disabled={busy} activeOpacity={0.85}
                  style={[s.btn, { opacity: busy ? 0.55 : 1 }]}>
                  {busy ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={s.btnTxt}>Kod yuborish</Text>}
                </TouchableOpacity>
              </View>

            ) : (
              <View>
                <Text style={s.emoji}>{via === 'phone' ? '\u2708\uFE0F' : '\u2709\uFE0F'}</Text>
                <Text style={s.title}>Kodni kiriting</Text>
                <Text style={s.sub}>
                  {via === 'phone'
                    ? 'Telegram botda \"Raqamni yuborish\" tugmasini bosing'
                    : contact}
                </Text>

                <TextInput
                  value={code}
                  onChangeText={(t) => { setCode(t.replace(/[^0-9]/g, '').slice(0, 6)); setErr(''); }}
                  placeholder="------"
                  placeholderTextColor="#C8D2DC"
                  keyboardType="number-pad"
                  style={[s.input, s.codeInput, err ? { borderColor: '#FF4D6D' } : null]}
                  maxLength={6}
                  autoFocus
                />

                {err ? <Text style={s.err}>{err}</Text> : null}

                <TouchableOpacity onPress={verify} disabled={busy || code.length !== 6} activeOpacity={0.85}
                  style={[s.btn, { opacity: (busy || code.length !== 6) ? 0.45 : 1 }]}>
                  {busy ? <ActivityIndicator color="#FFFFFF" />
                    : <Text style={s.btnTxt}>{known ? 'Kirish' : 'Tasdiqlash'}</Text>}
                </TouchableOpacity>

                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <TouchableOpacity onPress={left > 0 ? null : send} disabled={left > 0}>
                    <Text style={[s.link, left > 0 ? { color: '#C8D2DC' } : null]}>
                      {left > 0 ? ('Qayta yuborish · ' + left) : 'Qayta yuborish'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {via === 'phone' ? (
                  <TouchableOpacity activeOpacity={0.85}
                    onPress={() => Linking.openURL('https://t.me/' + BOT).catch(function () {})}
                    style={[s.big, { backgroundColor: CARD, borderColor: LINE, marginTop: 18 }]}>
                    <Text style={{ fontSize: 15, marginRight: 10 }}>{'\u2708\uFE0F'}</Text>
                    <Text style={[s.bigTxt, { color: '#0B1015' }]}>Botni ochish</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </Animated.View>
        </ScrollView>

        {!force && mode === 0 ? (
          <TouchableOpacity onPress={onClose} style={{ paddingVertical: 20, alignItems: 'center' }}>
            <Text style={{ color: '#98A4B0', fontSize: 13 }}>Keyinroq</Text>
          </TouchableOpacity>
        ) : <View style={{ height: 26 }} />}
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, backgroundColor: BG },
  back: { position: 'absolute', top: 6, left: 0, zIndex: 5, padding: 8 },
  hero: { color: '#0B1015', fontSize: 34, fontWeight: '900', textAlign: 'center', letterSpacing: -1.4, lineHeight: 37 },
  tag: { color: SUB, fontSize: 13.5, textAlign: 'center', marginTop: 13, letterSpacing: 0.1, lineHeight: 19 },
  big: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderRadius: 32, paddingVertical: 18, marginBottom: 12, borderWidth: 1.5,
  },
  bigTxt: { fontSize: 14.5, fontWeight: '600', letterSpacing: 0.1 },
  soon: { position: 'absolute', right: 16, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 7, backgroundColor: '#EEF2F5' },
  soonTxt: { color: '#98A4B0', fontSize: 9, fontWeight: '600', letterSpacing: 0 },
  emoji: { fontSize: 40, textAlign: 'center', marginBottom: 18 },
  title: { color: '#0B1015', fontSize: 22, fontWeight: '800', textAlign: 'center', letterSpacing: -0.4 },
  sub: { color: SUB, fontSize: 13.5, textAlign: 'center', marginTop: 10, lineHeight: 20 },
  input: {
    backgroundColor: CARD, borderRadius: 15, paddingHorizontal: 17, paddingVertical: 15,
    color: '#0B1015', fontSize: 16, borderWidth: 1.5, borderColor: LINE, marginTop: 26,
    fontWeight: '500',
  },
  codeInput: { textAlign: 'center', fontSize: 30, letterSpacing: 14, fontWeight: '800', paddingVertical: 19 },
  btn: { backgroundColor: AC, borderRadius: 32, paddingVertical: 18, alignItems: 'center', marginTop: 16,
    shadowColor: AC, shadowOpacity: 0.28, shadowRadius: 14, shadowOffset: { width: 0, height: 6 }, elevation: 4 },
  btnTxt: { color: '#FFFFFF', fontWeight: '700', fontSize: 15, letterSpacing: 0.2 },
  err: { color: '#FF4D6D', fontSize: 12.5, marginTop: 10, textAlign: 'center' },
  link: { color: AC, fontSize: 13.5, fontWeight: '600', letterSpacing: 0.1 },
  legal: { color: '#A8B4C0', fontSize: 11.5, textAlign: 'center', marginTop: 22, paddingHorizontal: 16, lineHeight: 17 },
});