import React, { useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

interface PollFormProps {
  question: string;
  onQuestionChange: (q: string) => void;
  options: string[];
  onOptionsChange: (opts: string[]) => void;
  disabled?: boolean;
}

export function PollForm({
  question,
  onQuestionChange,
  options,
  onOptionsChange,
  disabled,
}: PollFormProps) {
  // Seed with 2 empty options if parent passes an empty array
  useEffect(() => {
    if (options.length === 0) {
      onOptionsChange(['', '']);
    }
  }, []);

  const addOption = () => {
    if (options.length >= 4) return;
    onOptionsChange([...options, '']);
  };

  const removeOption = (index: number) => {
    if (options.length <= 2) return;
    const next = options.filter((_, i) => i !== index);
    onOptionsChange(next);
  };

  const updateOption = (index: number, value: string) => {
    const next = options.map((o, i) => (i === index ? value : o));
    onOptionsChange(next);
  };

  const canAdd = options.length < 4;
  const canRemove = options.length > 2;

  return (
    <View style={styles.container}>
      {/* Question input */}
      <TextInput
        style={styles.questionInput}
        placeholder="Ask a question…"
        placeholderTextColor={colors.g400}
        value={question}
        onChangeText={onQuestionChange}
        editable={!disabled}
        maxLength={280}
      />

      {/* Option rows */}
      {options.map((opt, idx) => (
        <View key={idx} style={styles.optionRow}>
          <TextInput
            style={styles.optionInput}
            placeholder={`Option ${idx + 1}`}
            placeholderTextColor={colors.g400}
            value={opt}
            onChangeText={(v) => updateOption(idx, v)}
            editable={!disabled}
            maxLength={100}
          />
          <TouchableOpacity
            onPress={() => removeOption(idx)}
            disabled={!canRemove || disabled}
            accessibilityLabel="Remove option"
            accessibilityState={{ disabled: !canRemove || !!disabled }}
            style={[styles.iconBtn, (!canRemove || disabled) && styles.iconBtnDisabled]}
          >
            <Text style={styles.iconBtnText}>−</Text>
          </TouchableOpacity>
        </View>
      ))}

      {/* Add option button */}
      <TouchableOpacity
        onPress={addOption}
        disabled={!canAdd || disabled}
        accessibilityLabel="Add option"
        accessibilityState={{ disabled: !canAdd || !!disabled }}
        style={[styles.addBtn, (!canAdd || disabled) && styles.addBtnDisabled]}
      >
        <Text style={styles.addBtnText}>+ Add option</Text>
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
  questionInput: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    padding: spacing.md,
    fontSize: 15,
    color: colors.g800,
    marginBottom: spacing.sm,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  optionInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.g800,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: radius.full,
    backgroundColor: colors.g100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnDisabled: { opacity: 0.35 },
  iconBtnText: { fontSize: 20, color: colors.g700, lineHeight: 22 },
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
