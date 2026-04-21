import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput, Modal } from 'react-native';
import type { Proposal } from '@/services/sponsorshipService';
import { sponsorshipService } from '@/services/sponsorshipService';
import { colors, spacing, radius } from '@/constants/theme';

interface Props {
  proposal: Proposal;
  onUpdated: (next: Proposal) => void;
}

// Sticks to the top of a chat thread when the conversation was opened from a
// boost-proposal notification. Shows the deal in a glance + Accept / ✕ /
// Negotiate buttons wired to the /sponsorship/:id/* endpoints.
export function ProposalContextCard({ proposal, onUpdated }: Props) {
  const [busy, setBusy] = useState(false);
  const [negotiateOpen, setNegotiateOpen] = useState(false);
  const [counterAmount, setCounterAmount] = useState(String(proposal.boostAmount));
  const [note, setNote] = useState('');

  async function handleAccept() {
    if (busy) return;
    setBusy(true);
    try {
      const next = await sponsorshipService.accept(proposal.id);
      onUpdated(next);
      Alert.alert('Accepted', 'The boost is live.');
    } catch (e: any) {
      Alert.alert('Could not accept', e?.response?.data?.error ?? 'Try again');
    } finally {
      setBusy(false);
    }
  }

  async function handleDecline() {
    Alert.alert(
      'Decline boost?',
      'The business will be notified.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            if (busy) return;
            setBusy(true);
            try {
              const next = await sponsorshipService.decline(proposal.id);
              onUpdated(next);
            } catch (e: any) {
              Alert.alert('Could not decline', e?.response?.data?.error ?? 'Try again');
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }

  async function handleNegotiate() {
    const amount = Number(counterAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      Alert.alert('Invalid amount', 'Enter a positive rupee amount.');
      return;
    }
    setBusy(true);
    try {
      const next = await sponsorshipService.negotiate(proposal.id, amount, note || undefined);
      onUpdated(next);
      setNegotiateOpen(false);
      setNote('');
      Alert.alert('Counter sent', 'The business will see your counter-offer.');
    } catch (e: any) {
      Alert.alert('Could not send counter', e?.response?.data?.error ?? 'Try again');
    } finally {
      setBusy(false);
    }
  }

  const isPending = proposal.status === 'pending';
  const businessName = proposal.business?.name ?? 'Business';

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.label}>BOOST PROPOSAL</Text>
        <Text style={styles.status}>{proposal.status.toUpperCase()}</Text>
      </View>
      <Text style={styles.biz}>{businessName}</Text>
      <View style={styles.metricsRow}>
        <Metric label="Boost" value={`₹${Number(proposal.boostAmount).toLocaleString('en-IN')}`} />
        <Metric label="Commission" value={`${Number(proposal.commissionPct)}%`} />
        <Metric
          label="You earn"
          value={`₹${Number(proposal.creatorEarnings ?? 0).toLocaleString('en-IN')}`}
          highlight
        />
      </View>
      {isPending ? (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.btn, styles.declineBtn]}
            onPress={handleDecline}
            disabled={busy}
            accessibilityLabel="Decline"
          >
            <Text style={styles.declineText}>✕</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.negotiateBtn]}
            onPress={() => setNegotiateOpen(true)}
            disabled={busy}
            accessibilityLabel="Negotiate"
          >
            <Text style={styles.negotiateText}>Negotiate</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.btn, styles.acceptBtn]}
            onPress={handleAccept}
            disabled={busy}
            accessibilityLabel="Accept"
          >
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <Modal visible={negotiateOpen} animationType="slide" transparent>
        <View style={styles.modalBg}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Counter offer</Text>
            <Text style={styles.modalLabel}>New boost amount (₹)</Text>
            <TextInput
              value={counterAmount}
              onChangeText={setCounterAmount}
              keyboardType="number-pad"
              style={styles.modalInput}
            />
            <Text style={styles.modalLabel}>Note (optional)</Text>
            <TextInput
              value={note}
              onChangeText={setNote}
              placeholder="Why this number?"
              style={[styles.modalInput, { minHeight: 60 }]}
              multiline
            />
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setNegotiateOpen(false)} style={[styles.btn, styles.declineBtn]}>
                <Text style={styles.declineText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleNegotiate} style={[styles.btn, styles.acceptBtn]} disabled={busy}>
                <Text style={styles.acceptText}>Send counter</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricValue, highlight && styles.metricHighlight]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(232,121,43,0.08)',
    borderWidth: 0.5,
    borderColor: 'rgba(232,121,43,0.3)',
    marginHorizontal: spacing.md,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.lg,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { fontSize: 10, fontWeight: '800', letterSpacing: 1, color: colors.orange },
  status: { fontSize: 10, fontWeight: '800', color: colors.g500 },
  biz: { fontSize: 15, fontWeight: '700', color: colors.g900, marginTop: 4 },
  metricsRow: { flexDirection: 'row', marginTop: 10, gap: 8 },
  metric: { flex: 1 },
  metricValue: { fontSize: 14, fontWeight: '800', color: colors.g800 },
  metricHighlight: { color: colors.green },
  metricLabel: { fontSize: 10, color: colors.g500, marginTop: 2 },
  actionRow: { flexDirection: 'row', marginTop: 12, gap: 8 },
  btn: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  acceptBtn: { backgroundColor: colors.orange, flex: 2 },
  acceptText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  declineBtn: { borderWidth: 1, borderColor: colors.g300, backgroundColor: '#fff' },
  declineText: { color: colors.g700, fontWeight: '700', fontSize: 13 },
  negotiateBtn: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.orange, flex: 2 },
  negotiateText: { color: colors.orange, fontWeight: '700', fontSize: 13 },
  modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: '#fff', padding: 16, borderTopLeftRadius: 16, borderTopRightRadius: 16, gap: 8 },
  modalTitle: { fontSize: 16, fontWeight: '800', color: colors.g900, marginBottom: 4 },
  modalLabel: { fontSize: 11, fontWeight: '700', color: colors.g600, marginTop: 6 },
  modalInput: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.md, padding: 10, fontSize: 14, color: colors.g800 },
  modalActions: { flexDirection: 'row', gap: 8, marginTop: 10 },
});
