import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '@/constants/theme';
import { LocationPicker } from '@/components/LocationPicker';

interface Props {
  value: string[];
  onChange: (pincodes: string[]) => void;
  max?: number;
}

// Wraps the existing single-pincode LocationPicker into a multi-select.
// Each pick appends to a chip list; tapping a chip removes it. Caller
// supplies the persisted state, so the wizard owns the array.
export function PincodeMultiSelect({ value, onChange, max = 10 }: Props) {
  const [duplicateWarn, setDuplicateWarn] = useState(false);

  const handleSelect = (pincode: string) => {
    if (value.length >= max) return;
    if (value.includes(pincode)) {
      setDuplicateWarn(true);
      return;
    }
    setDuplicateWarn(false);
    onChange([...value, pincode]);
  };

  const remove = (pincode: string) => onChange(value.filter((p) => p !== pincode));

  return (
    <View style={styles.container}>
      <LocationPicker onSelect={handleSelect} />
      {value.length > 0 ? (
        <View style={styles.chips}>
          {value.map((p) => (
            <TouchableOpacity key={p} onPress={() => remove(p)} style={styles.chip}>
              <Text style={styles.chipText}>{p} ✕</Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
      {duplicateWarn ? <Text style={styles.warn}>Already selected</Text> : null}
      {value.length >= max ? <Text style={styles.warn}>Maximum {max} pincodes</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: { backgroundColor: colors.navy, paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.lg },
  chipText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  warn: { fontSize: 12, color: colors.orange },
});
