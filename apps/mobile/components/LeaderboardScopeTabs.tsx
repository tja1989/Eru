import React from 'react';
import { Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

export type Scope = 'pincode' | 'state' | 'national' | 'friends';

const TABS: { key: Scope; label: string }[] = [
  { key: 'pincode', label: 'My Pincode' },
  { key: 'state', label: 'Kerala State' },
  { key: 'national', label: 'All India' },
  { key: 'friends', label: 'Friends' },
];

export function LeaderboardScopeTabs({
  scope,
  onChange,
}: {
  scope: Scope;
  onChange: (s: Scope) => void;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.root}
    >
      {TABS.map((t) => (
        <TouchableOpacity
          key={t.key}
          onPress={() => onChange(t.key)}
          style={[styles.tab, scope === t.key && styles.tabActive]}
          testID={`scope-tab-${t.key}`}
        >
          <Text style={[styles.tabText, scope === t.key && styles.tabTextActive]}>
            {t.label}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, paddingVertical: 8 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: '#F1F1F1',
  },
  tabActive: { backgroundColor: '#E8792B' },
  tabText: { fontSize: 13, fontWeight: '600', color: '#737373' },
  tabTextActive: { color: '#fff' },
});
