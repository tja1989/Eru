import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import type { BusinessSearchItem } from '@eru/shared';
import { businessService } from '../services/businessService';
import { colors, spacing, radius } from '../constants/theme';

interface Props {
  value: BusinessSearchItem | null;
  onChange: (business: BusinessSearchItem | null) => void;
}

// A post tagged with a business unlocks the 20% commission split when the
// business boosts the content — that's the carrot shown in the PWA copy.
export function BusinessTagPicker({ value, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BusinessSearchItem[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce typed queries: fire a search only after 150ms of no-typing so
  // we don't hammer the API on every keystroke.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const items = await businessService.search(query);
        setResults(items);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 150);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  return (
    <View style={styles.wrap}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>🏪 Tag a Business</Text>
        <View style={styles.commissionBadge}>
          <Text style={styles.commissionText}>+20% commission</Text>
        </View>
      </View>

      {value ? (
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <Text style={styles.chipText}>@{value.name}</Text>
            <TouchableOpacity
              onPress={() => onChange(null)}
              accessibilityLabel="Remove business tag"
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.chipRemove}>✕</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <TextInput
            placeholder="Search businesses by name..."
            placeholderTextColor={colors.g400}
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            autoCapitalize="none"
          />
          {results.length > 0 ? (
            <View style={styles.results}>
              {results.map((biz) => (
                <TouchableOpacity
                  key={biz.id}
                  style={styles.row}
                  onPress={() => {
                    onChange(biz);
                    setQuery('');
                    setResults([]);
                  }}
                >
                  <Text style={styles.rowName}>{biz.name}</Text>
                  <Text style={styles.rowMeta}>
                    {biz.category} • {biz.pincode}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          {loading ? <Text style={styles.loading}>Searching…</Text> : null}
        </>
      )}

      <Text style={styles.help}>
        The business will see your content. If they boost it as sponsored, you earn 20% of their spend
        — real money, not just points!
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    backgroundColor: 'rgba(232,121,43,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(232,121,43,0.2)',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  label: { fontSize: 13, fontWeight: '700', color: colors.g800 },
  commissionBadge: {
    backgroundColor: 'rgba(16,185,129,0.12)',
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  commissionText: { fontSize: 10, fontWeight: '700', color: colors.green },
  chipRow: { flexDirection: 'row', marginBottom: spacing.sm },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.orange,
    borderRadius: radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipText: { fontSize: 12, fontWeight: '700', color: colors.orange },
  chipRemove: { fontSize: 14, color: colors.g500, paddingHorizontal: 2 },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    fontSize: 13,
    color: colors.g800,
  },
  results: {
    marginTop: 6,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
  },
  row: { paddingHorizontal: spacing.sm, paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  rowName: { fontSize: 13, fontWeight: '600', color: colors.g800 },
  rowMeta: { fontSize: 11, color: colors.g500, marginTop: 1 },
  loading: { fontSize: 11, color: colors.g500, marginTop: 4 },
  help: { fontSize: 11, color: colors.g600, lineHeight: 16, marginTop: spacing.sm },
});
