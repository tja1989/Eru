import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';

type Action = { key: string; emoji: string; label: string };

const ACTIONS: Action[] = [
  { key: 'all', emoji: '\u{1F6D2}', label: 'Shop' },
  { key: 'local', emoji: '\u{1F3EA}', label: 'Local' },
  { key: 'giftcard', emoji: '\u{1F381}', label: 'Gift Cards' },
  { key: 'recharge', emoji: '\u{1F4F1}', label: 'Recharge' },
  { key: 'donate', emoji: '\u{1F49D}', label: 'Donate' },
];

export function WalletQuickActions() {
  const router = useRouter();
  return (
    <View style={styles.row}>
      {ACTIONS.map((a) => (
        <TouchableOpacity
          key={a.key}
          testID={`wallet-action-${a.key}`}
          onPress={() => router.push({ pathname: '/redeem', params: { type: a.key } })}
          style={styles.btn}
        >
          <Text style={styles.emoji}>{a.emoji}</Text>
          <Text style={styles.label}>{a.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    marginVertical: 8,
  },
  btn: { alignItems: 'center', flex: 1 },
  emoji: { fontSize: 22 },
  label: { fontSize: 11, marginTop: 4, color: '#262626' },
});
