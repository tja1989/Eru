import React, { useEffect, useState } from 'react';
import { View, Text, Switch, StyleSheet } from 'react-native';
import { userService } from '../services/userService';
import { colors, spacing, radius } from '../constants/theme';

interface Props {
  initialValue: boolean;
}

export function WatchlistNotifyToggle({ initialValue }: Props) {
  const [enabled, setEnabled] = useState(initialValue);
  const [busy, setBusy] = useState(false);

  // Keep local state in sync if the parent re-fetches and passes a new value.
  useEffect(() => setEnabled(initialValue), [initialValue]);

  async function handleToggle(next: boolean) {
    setEnabled(next);
    setBusy(true);
    try {
      await userService.updateSettings({ notifyWatchlistOffers: next });
    } catch {
      setEnabled(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.label}>Get notified when followed stores drop offers</Text>
        <Text style={styles.sub}>One push per new live deal.</Text>
      </View>
      <Switch
        value={enabled}
        onValueChange={handleToggle}
        disabled={busy}
        trackColor={{ false: colors.g300, true: colors.orange }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.g50,
    borderRadius: radius.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  label: { fontSize: 13, fontWeight: '600', color: colors.g800 },
  sub: { fontSize: 11, color: colors.g500, marginTop: 2 },
});
