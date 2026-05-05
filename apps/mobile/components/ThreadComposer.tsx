import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

interface ThreadPart {
  id: string;
  text: string;
}

interface ThreadComposerProps {
  parts: string[];
  onPartsChange: (parts: string[]) => void;
  disabled?: boolean;
}

function makeId(): string {
  return Math.random().toString(36).slice(2);
}

function stringsToInternal(strings: string[]): ThreadPart[] {
  return strings.map((text) => ({ id: makeId(), text }));
}

export function ThreadComposer({ parts, onPartsChange, disabled }: ThreadComposerProps) {
  // Internal representation uses stable IDs so React never reuses the wrong
  // TextInput node when a middle part is removed.
  const [internalParts, setInternalParts] = useState<ThreadPart[]>(() =>
    stringsToInternal(parts),
  );

  // Track whether we're the ones who triggered an onPartsChange call so we
  // don't needlessly re-seed from props (which would regenerate all IDs).
  const skipNextSync = useRef(false);

  // Seed with 2 empty parts if parent passes an empty array (on mount only).
  useEffect(() => {
    if (parts.length === 0) {
      const seeded: ThreadPart[] = [
        { id: makeId(), text: '' },
        { id: makeId(), text: '' },
      ];
      setInternalParts(seeded);
      skipNextSync.current = true;
      onPartsChange(['', '']);
    }
  }, []);

  // Sync when the parent replaces the parts array from outside (e.g. reset).
  // Skip the sync we triggered ourselves to avoid needless ID churn.
  useEffect(() => {
    if (skipNextSync.current) {
      skipNextSync.current = false;
      return;
    }
    setInternalParts(stringsToInternal(parts));
  }, [parts]);

  // Propagate internal changes up, keeping the external API as string[].
  const propagate = (next: ThreadPart[]) => {
    setInternalParts(next);
    skipNextSync.current = true;
    onPartsChange(next.map((p) => p.text));
  };

  const addPart = () => {
    if (internalParts.length >= 10) return;
    propagate([...internalParts, { id: makeId(), text: '' }]);
  };

  const removePart = (id: string) => {
    if (internalParts.length <= 2) return;
    propagate(internalParts.filter((p) => p.id !== id));
  };

  const updatePart = (id: string, value: string) => {
    propagate(internalParts.map((p) => (p.id === id ? { ...p, text: value } : p)));
  };

  const canAdd = internalParts.length < 10;
  const canRemove = internalParts.length > 2;

  return (
    <View style={styles.container}>
      {internalParts.map((part, idx) => (
        <View key={part.id} style={styles.partWrapper}>
          {/* Thread connector line — shown above every part except the first */}
          {idx > 0 && <View style={styles.connectorLine} />}

          <View style={styles.partRow}>
            {/* Number badge showing position */}
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{idx + 1}</Text>
            </View>

            <View style={styles.partContent}>
              <Text style={styles.partLabel}>Part {idx + 1}</Text>
              <TextInput
                style={styles.partInput}
                placeholder={`Part ${idx + 1}…`}
                placeholderTextColor={colors.g400}
                value={part.text}
                onChangeText={(v) => updatePart(part.id, v)}
                editable={!disabled}
                multiline
                maxLength={500}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              onPress={() => removePart(part.id)}
              disabled={!canRemove || disabled}
              accessibilityLabel="Remove part"
              accessibilityState={{ disabled: !canRemove || !!disabled }}
              style={[styles.removeBtn, (!canRemove || disabled) && styles.removeBtnDisabled]}
            >
              <Text style={styles.removeBtnText}>−</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {/* Add part button */}
      <TouchableOpacity
        onPress={addPart}
        disabled={!canAdd || disabled}
        accessibilityLabel="Add part"
        accessibilityState={{ disabled: !canAdd || !!disabled }}
        style={[styles.addBtn, (!canAdd || disabled) && styles.addBtnDisabled]}
      >
        <Text style={styles.addBtnText}>+ Add part</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  partWrapper: {
    gap: 0,
  },
  connectorLine: {
    width: 2,
    height: spacing.md,
    backgroundColor: colors.g300,
    marginLeft: spacing.lg + 7, // align under badge center
    marginBottom: 2,
  },
  partRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.g900,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    flexShrink: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
  },
  partContent: {
    flex: 1,
    gap: spacing.xs,
  },
  partLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.g600,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  partInput: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.g800,
    minHeight: 80,
    lineHeight: 20,
  },
  removeBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    flexShrink: 0,
  },
  removeBtnDisabled: { opacity: 0.35 },
  removeBtnText: { fontSize: 20, color: colors.g700, lineHeight: 22 },
  addBtn: {
    marginTop: spacing.xs,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.blue,
    borderStyle: 'dashed',
    borderRadius: radius.md,
    alignItems: 'center',
  },
  addBtnDisabled: { borderColor: colors.g300, opacity: 0.5 },
  addBtnText: { fontSize: 14, color: colors.blue, fontWeight: '600' },
});
