import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, msg: '', showDetail: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, msg: String(error && error.message ? error.message : error) };
  }

  componentDidCatch(error, info) {
    console.log('ILOVA XATOSI:', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, msg: '', showDetail: false });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <View style={{
        flex: 1, backgroundColor: '#0B0F14',
        alignItems: 'center', justifyContent: 'center', padding: 30,
      }}>
        <View style={{
          width: 88, height: 88, borderRadius: 44,
          backgroundColor: 'rgba(255,77,109,0.12)',
          alignItems: 'center', justifyContent: 'center', marginBottom: 24,
        }}>
          <Text style={{ fontSize: 38 }}>{'\u26A0\uFE0F'}</Text>
        </View>

        <Text style={{
          color: '#FFFFFF', fontSize: 20, fontWeight: '800',
          textAlign: 'center', marginBottom: 10,
        }}>
          Kutilmagan xatolik
        </Text>

        <Text style={{
          color: '#7A8794', fontSize: 14, lineHeight: 21,
          textAlign: 'center', maxWidth: 300, marginBottom: 8,
        }}>
          Ilovada xatolik yuz berdi. Zonalaringiz saqlangan - yo'qolmaydi.
        </Text>

        <Text style={{
          color: '#7A8794', fontSize: 13, lineHeight: 20,
          textAlign: 'center', maxWidth: 300,
        }}>
          Quyidagi tugmani bosing yoki ilovani qayta oching.
        </Text>

        <TouchableOpacity
          onPress={this.reset}
          activeOpacity={0.85}
          style={{
            marginTop: 28, paddingHorizontal: 40, paddingVertical: 15,
            borderRadius: 16, backgroundColor: '#00E5A0',
          }}
        >
          <Text style={{ color: '#04140E', fontWeight: '900', fontSize: 15, letterSpacing: 1 }}>
            QAYTA URINISH
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => this.setState({ showDetail: !this.state.showDetail })}
          style={{ marginTop: 22, padding: 10 }}
        >
          <Text style={{ color: '#4A5560', fontSize: 12 }}>
            {this.state.showDetail ? 'Yashirish' : 'Batafsil'}
          </Text>
        </TouchableOpacity>

        {this.state.showDetail ? (
          <ScrollView style={{
            maxHeight: 160, width: '100%',
            backgroundColor: 'rgba(255,255,255,0.04)',
            borderRadius: 12, padding: 14, marginTop: 6,
          }}>
            <Text style={{ color: '#7A8794', fontSize: 11, lineHeight: 17 }}>
              {this.state.msg}
            </Text>
          </ScrollView>
        ) : null}

        <Text style={{ color: '#3A424C', fontSize: 11, marginTop: 20 }}>
          Muammo takrorlansa: Telegram @Xusniddin_uz
        </Text>
      </View>
    );
  }
}