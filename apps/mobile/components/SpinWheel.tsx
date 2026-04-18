import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

type Props = { spinning: boolean; onSpin: () => void };

export function SpinWheel({ spinning, onSpin }: Props) {
  return (
    <View testID="spin-wheel" style={styles.root}>
      <View style={styles.circle}><Text style={styles.emoji}>🎡</Text></View>
      <TouchableOpacity
        disabled={spinning}
        onPress={() => { if (!spinning) onSpin(); }}
        style={[styles.btn, spinning && styles.btnDisabled]}
      >
        <Text style={styles.btnText}>{spinning ? 'Spinning…' : 'Spin now'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center', padding: 20 },
  circle: { width: 200, height: 200, borderRadius: 100, borderWidth: 4, borderColor: '#E8792B', alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emoji: { fontSize: 72 },
  btn: { backgroundColor: '#E8792B', paddingVertical: 12, paddingHorizontal: 48, borderRadius: 24 },
  btnDisabled: { backgroundColor: '#DBDBDB' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
