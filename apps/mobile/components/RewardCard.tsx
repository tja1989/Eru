import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import type { Reward } from '@/services/rewardsService';

type Props = { reward: Reward; onUse: (id: string) => void };

function daysUntil(iso: string): number {
  const diff = new Date(iso).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function expiryLabel(reward: Reward): string {
  if (reward.status === 'used') return 'Used';
  if (reward.status === 'expired') return 'Expired';
  const days = daysUntil(reward.expiresAt);
  return `Expires in ${days}d`;
}

export function RewardCard({ reward, onUse }: Props) {
  const badgeText = reward.status.toUpperCase();
  const isActive = reward.status === 'active';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{reward.offer.title}</Text>
        <View style={[styles.badge, !isActive && styles.badgeDim]}>
          <Text style={styles.badgeText}>{badgeText}</Text>
        </View>
      </View>

      <Text style={styles.expiry}>{expiryLabel(reward)}</Text>

      <View style={styles.qrWrap} testID="reward-qr">
        <QRCode value={reward.claimCode} size={160} />
      </View>

      <Text style={styles.code}>{reward.claimCode}</Text>

      {isActive && (
        <TouchableOpacity style={styles.btn} onPress={() => onUse(reward.id)}>
          <Text style={styles.btnText}>Use at store</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#262626', flex: 1, paddingRight: 8 },
  badge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeDim: { backgroundColor: '#8E8E8E' },
  badgeText: { color: '#fff', fontWeight: '700', fontSize: 11, letterSpacing: 0.5 },
  expiry: { color: '#737373', marginTop: 6, fontSize: 12 },
  qrWrap: { alignItems: 'center', marginVertical: 14, backgroundColor: '#fff', padding: 8 },
  code: { textAlign: 'center', fontWeight: '700', color: '#262626', letterSpacing: 1 },
  btn: {
    marginTop: 12,
    backgroundColor: '#E8792B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnText: { color: '#fff', fontWeight: '700' },
});
