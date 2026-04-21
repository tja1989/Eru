import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { colors, spacing, radius } from '../constants/theme';

export interface RechargePlan {
  id: string;
  amountRupees: number;
  pointsCost: number;
}

interface Props {
  phone: string;
  operator: string;
  lastRechargeRupees: number | null;
  plans: RechargePlan[];
  selectedPlanId: string | null;
  onSelectPlan: (id: string) => void;
  onSubmit: () => void;
  onChangePhone?: () => void;
}

export function RechargeCard({
  phone,
  operator,
  lastRechargeRupees,
  plans,
  selectedPlanId,
  onSelectPlan,
  onSubmit,
  onChangePhone,
}: Props) {
  const selected = plans.find((p) => p.id === selectedPlanId) ?? null;
  const disabled = !selected;

  return (
    <View style={styles.card}>
      {/* Phone + operator line */}
      <View style={styles.phoneRow}>
        <Text style={styles.phoneIcon}>📱</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.phone}>{phone}</Text>
          <Text style={styles.meta}>
            {operator}
            {lastRechargeRupees != null ? ` • Last recharge: ₹${lastRechargeRupees}` : ''}
          </Text>
        </View>
        {onChangePhone ? (
          <TouchableOpacity onPress={onChangePhone}>
            <Text style={styles.change}>Change</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 3 plan buttons */}
      <View style={styles.plansRow}>
        {plans.map((p) => {
          const active = p.id === selectedPlanId;
          return (
            <TouchableOpacity
              key={p.id}
              style={[styles.plan, active && styles.planActive]}
              onPress={() => onSelectPlan(p.id)}
            >
              <Text style={[styles.planAmount, active && styles.planAmountActive]}>₹{p.amountRupees}</Text>
              <Text style={styles.planPts}>{p.pointsCost.toLocaleString()} pts</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        accessibilityLabel="Recharge"
        accessibilityState={{ disabled }}
        onPress={disabled ? undefined : onSubmit}
        style={[styles.cta, disabled && styles.ctaDisabled]}
      >
        <Text style={styles.ctaText}>
          {selected
            ? `Recharge with ${selected.pointsCost.toLocaleString()} pts →`
            : 'Select an amount'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderWidth: 0.5,
    borderColor: colors.g200,
    borderRadius: radius.lg,
  },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.md },
  phoneIcon: { fontSize: 20 },
  phone: { fontSize: 14, fontWeight: '700', color: colors.g800 },
  meta: { fontSize: 11, color: colors.g500, marginTop: 1 },
  change: { fontSize: 12, color: colors.blue, fontWeight: '600' },
  plansRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  plan: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
  },
  planActive: { borderColor: colors.orange, borderWidth: 1.5, backgroundColor: 'rgba(232,121,43,0.06)' },
  planAmount: { fontSize: 15, fontWeight: '700', color: colors.g700 },
  planAmountActive: { color: colors.orange },
  planPts: { fontSize: 10, color: colors.g500, marginTop: 2 },
  cta: {
    backgroundColor: colors.blue,
    paddingVertical: 12,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
