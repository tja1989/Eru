import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Proposal, SponsorshipStatus } from '@/services/sponsorshipService';

type Props = {
  proposal: Proposal;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
};

function statusLabel(status: SponsorshipStatus): string {
  if (status === 'accepted' || status === 'active') return 'LIVE';
  if (status === 'pending') return 'PENDING';
  if (status === 'declined') return 'DECLINED';
  if (status === 'completed') return 'DONE';
  // Exhaustive on the SponsorshipStatus union — keep a stable fallback so
  // any future enum addition prints something human-readable until this
  // switch catches up.
  return String(status).toUpperCase();
}

function statusColor(status: SponsorshipStatus): string {
  if (status === 'accepted' || status === 'active') return '#10B981';
  if (status === 'pending') return '#E8792B';
  if (status === 'declined') return '#ED4956';
  return '#737373';
}

function formatCurrency(value: string | number | null | undefined): string {
  const n = Number(value ?? 0);
  return `₹${n.toLocaleString('en-IN')}`;
}

export function SponsorshipCard({ proposal, onAccept, onDecline }: Props) {
  const isPending = proposal.status === 'pending';
  const businessName = proposal.business?.name ?? 'Business';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.businessName}>{businessName}</Text>
        <View style={[styles.badge, { backgroundColor: statusColor(proposal.status) }]}>
          <Text style={styles.badgeText}>{statusLabel(proposal.status)}</Text>
        </View>
      </View>

      <View style={styles.metricsRow}>
        <Metric label="Reach" value={proposal.reach.toLocaleString('en-IN')} />
        <Metric label="Clicks" value={proposal.clicks.toLocaleString('en-IN')} />
        <Metric label="Spend" value={formatCurrency(proposal.boostSpent)} />
        <Metric label="Earnings" value={formatCurrency(proposal.creatorEarnings)} />
      </View>

      {isPending && (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.declineBtn]}
            onPress={() => onDecline?.(proposal.id)}
          >
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => onAccept?.(proposal.id)}
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginHorizontal: 16,
    marginTop: 10,
    borderWidth: 0.5,
    borderColor: '#E5E5E5',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  businessName: { fontSize: 15, fontWeight: '700', color: '#262626', flex: 1 },
  badge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },

  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metric: { flex: 1, alignItems: 'flex-start' },
  metricValue: { fontSize: 14, fontWeight: '700', color: '#262626' },
  metricLabel: { fontSize: 11, color: '#737373', marginTop: 2 },

  actionRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  actionBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: { backgroundColor: '#E8792B' },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  declineBtn: { borderWidth: 1, borderColor: '#D4D4D4', backgroundColor: 'transparent' },
  declineText: { color: '#525252', fontWeight: '700', fontSize: 14 },
});
