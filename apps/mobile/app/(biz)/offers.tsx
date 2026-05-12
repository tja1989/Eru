import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizOfferItem } from '@eru/shared';

export default function BizOffersOwner() {
  const [items, setItems] = useState<BizOfferItem[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [pointsCost, setPointsCost] = useState('');
  const [cashValue, setCashValue] = useState('');
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    bizService.getOffers()
      .then((res) => { setItems(res.items); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  async function submit() {
    if (saving) return;
    const points = Number(pointsCost);
    const cash = Number(cashValue);
    if (!title.trim() || !Number.isFinite(points) || !Number.isFinite(cash)) {
      Alert.alert('Missing fields', 'Title, points cost, and cash value are required');
      return;
    }
    setSaving(true);
    try {
      await bizService.createOffer({
        type: 'local',
        title: title.trim(),
        pointsCost: points,
        cashValue: cash,
        validFrom: new Date().toISOString(),
        validUntil: new Date(Date.now() + 30 * 86400_000).toISOString(),
      });
      setTitle(''); setPointsCost(''); setCashValue('');
      setCreating(false);
      load();
    } catch (err) {
      Alert.alert('Create failed', err instanceof Error ? err.message : 'Try again later');
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={styles.container}>
      {loading && !items ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.g400} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!creating ? (
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setCreating(true)}>
              <Text style={styles.btnPrimaryText}>+ New offer</Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>New offer</Text>
              <TextInput style={styles.input} placeholder="Offer title" value={title} onChangeText={setTitle} />
              <TextInput style={styles.input} placeholder="Points cost" value={pointsCost} onChangeText={(v) => setPointsCost(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
              <TextInput style={styles.input} placeholder="Cash value (₹)" value={cashValue} onChangeText={(v) => setCashValue(v.replace(/[^0-9]/g, ''))} keyboardType="numeric" />
              <View style={styles.actions}>
                <TouchableOpacity style={styles.btnGhost} onPress={() => setCreating(false)} disabled={saving}>
                  <Text style={styles.btnGhostText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.btnPrimary} onPress={submit} disabled={saving}>
                  <Text style={styles.btnPrimaryText}>{saving ? 'Saving…' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {(items ?? []).map((o) => (
            <View key={o.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.offerTitle}>{o.title}</Text>
                {o.isActive ? (
                  <Text style={styles.activeTag}>ACTIVE</Text>
                ) : (
                  <Text style={styles.inactiveTag}>INACTIVE</Text>
                )}
              </View>
              <Text style={styles.offerMeta}>{o.pointsCost} pts · ₹{o.cashValue}</Text>
            </View>
          ))}

          {(items?.length ?? 0) === 0 && !creating ? (
            <Text style={styles.empty}>No offers yet</Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.lg, gap: spacing.md, paddingBottom: spacing.xxxl },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  card: { backgroundColor: colors.card, padding: spacing.lg, borderRadius: radius.md, borderWidth: 1, borderColor: colors.g100, gap: spacing.sm },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  offerTitle: { fontSize: 15, fontWeight: '700', color: colors.g800, flex: 1 },
  offerMeta: { fontSize: 12, color: colors.g500 },
  activeTag: { fontSize: 10, fontWeight: '700', color: colors.green },
  inactiveTag: { fontSize: 10, fontWeight: '700', color: colors.g400 },

  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, padding: spacing.md, fontSize: 14, color: colors.g800, backgroundColor: '#fff' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm },

  btnPrimary: { backgroundColor: colors.blue, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm, alignSelf: 'flex-start' },
  btnPrimaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  btnGhost: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.g200 },
  btnGhostText: { color: colors.g700, fontSize: 13, fontWeight: '700' },

  empty: { fontSize: 14, color: colors.g400, fontStyle: 'italic', textAlign: 'center', marginTop: spacing.xl },
});
