import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { userService } from '../services/userService';
import { formatHandle } from '../utils/formatHandle';
import { colors, spacing, radius } from '../constants/theme';

const MAX_TAGS = 10;

export interface TagUser {
  id: string;
  name: string;
  username: string;
  avatarUrl?: string;
}

interface UserTagPickerProps {
  /** IDs already confirmed before this open */
  initialSelected: TagUser[];
  onConfirm: (selected: TagUser[]) => void;
  onCancel: () => void;
}

export function UserTagPicker({ initialSelected, onConfirm, onCancel }: UserTagPickerProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TagUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<TagUser[]>(initialSelected);
  const [limitWarning, setLimitWarning] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    if (q.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const users = await userService.search(q);
      setResults(users);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.length < 1) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(() => {
      runSearch(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  const isSelected = (id: string) => selected.some((u) => u.id === id);

  const toggleUser = (user: TagUser) => {
    if (isSelected(user.id)) {
      setSelected((prev) => prev.filter((u) => u.id !== user.id));
      setLimitWarning(false);
    } else {
      if (selected.length >= MAX_TAGS) {
        setLimitWarning(true);
        return;
      }
      setSelected((prev) => [...prev, user]);
      setLimitWarning(false);
    }
  };

  const removeChip = (id: string) => {
    setSelected((prev) => prev.filter((u) => u.id !== id));
    setLimitWarning(false);
  };

  return (
    <View style={styles.container}>
      {/* Selected chips */}
      {selected.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.chipsRow}
          contentContainerStyle={styles.chipsContent}
        >
          {selected.map((u) => (
            <View key={u.id} style={styles.chip}>
              <Text style={styles.chipText}>{formatHandle(u.username)}</Text>
              <TouchableOpacity
                onPress={() => removeChip(u.id)}
                accessibilityLabel={`Remove ${u.username}`}
              >
                <Text style={styles.chipRemove}>×</Text>
              </TouchableOpacity>
            </View>
          ))}
        </ScrollView>
      )}

      {/* Limit warning */}
      {limitWarning && (
        <View style={styles.warningBox}>
          <Text style={styles.warningText}>You can tag a maximum of {MAX_TAGS} users.</Text>
        </View>
      )}

      {/* Search input */}
      <TextInput
        style={styles.searchInput}
        placeholder="Search by username or name"
        placeholderTextColor={colors.g400}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        accessibilityLabel="Search users"
      />

      {loading && (
        <ActivityIndicator size="small" color={colors.blue} style={styles.loader} />
      )}

      {/* Results */}
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        initialNumToRender={8}
        renderItem={({ item }) => {
          const sel = isSelected(item.id);
          return (
            <TouchableOpacity
              style={[styles.resultRow, sel && styles.resultRowSelected]}
              onPress={() => toggleUser(item)}
              accessibilityLabel={`${item.name} ${formatHandle(item.username)}`}
              accessibilityState={{ selected: sel }}
            >
              {item.avatarUrl ? (
                <Image source={{ uri: item.avatarUrl }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarInitial}>
                    {(item.name ?? item.username).charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.name}</Text>
                <Text style={styles.userHandle}>{formatHandle(item.username)}</Text>
              </View>
              {sel && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
      />

      {/* Action buttons */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} accessibilityLabel="Cancel tagging">
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.confirmBtn}
          onPress={() => onConfirm(selected)}
          accessibilityLabel="Confirm tagged users"
        >
          <Text style={styles.confirmBtnText}>
            Confirm{selected.length > 0 ? ` (${selected.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.card, padding: spacing.lg },
  chipsRow: { maxHeight: 48, marginBottom: spacing.md },
  chipsContent: { gap: spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.g100,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    gap: spacing.xs,
  },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.g800 },
  chipRemove: { fontSize: 16, color: colors.g500, lineHeight: 18 },
  warningBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.md,
    padding: spacing.sm,
    marginBottom: spacing.sm,
  },
  warningText: { fontSize: 12, color: '#92400E' },
  searchInput: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 15,
    color: colors.g800,
    marginBottom: spacing.md,
  },
  loader: { marginVertical: spacing.sm },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  resultRowSelected: { opacity: 0.85 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.g200 },
  avatarFallback: { justifyContent: 'center', alignItems: 'center' },
  avatarInitial: { fontSize: 16, fontWeight: '700', color: colors.g600 },
  userInfo: { flex: 1 },
  userName: { fontSize: 14, fontWeight: '700', color: colors.g900 },
  userHandle: { fontSize: 12, color: colors.g500, marginTop: 2 },
  checkmark: { fontSize: 18, color: colors.green, fontWeight: '700' },
  separator: { height: 0.5, backgroundColor: colors.g200 },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingTop: spacing.lg,
    borderTopWidth: 0.5,
    borderTopColor: colors.g200,
    marginTop: spacing.md,
  },
  cancelBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: colors.g300,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: colors.g700 },
  confirmBtn: {
    flex: 1,
    backgroundColor: colors.blue,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  confirmBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
