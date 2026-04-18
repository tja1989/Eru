import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Offer } from '@/services/offersService';

type Props = { offer: Offer; onClaim: (id: string) => void; claimed?: boolean };

export function OfferCard({ offer, onClaim, claimed = false }: Props) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{offer.title}</Text>
        <Text style={styles.cost}>🪙 {offer.pointsCost}</Text>
      </View>
      {offer.business && (
        <Text style={styles.sub}>{offer.business.name} · {offer.business.pincode}</Text>
      )}
      {offer.description && <Text style={styles.desc}>{offer.description}</Text>}
      <TouchableOpacity
        disabled={claimed}
        onPress={() => onClaim(offer.id)}
        style={[styles.btn, claimed && styles.btnClaimed]}
      >
        <Text style={styles.btnText}>{claimed ? 'Claimed ✓' : 'Claim'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 16, fontWeight: '700', color: '#262626', flex: 1 },
  cost: { fontWeight: '700', color: '#10B981' },
  sub: { color: '#737373', marginTop: 4, fontSize: 12 },
  desc: { color: '#262626', marginTop: 8 },
  btn: {
    marginTop: 12,
    backgroundColor: '#E8792B',
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
  },
  btnClaimed: { backgroundColor: '#DBDBDB' },
  btnText: { color: '#fff', fontWeight: '700' },
});
