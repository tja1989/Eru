import React, { useState } from 'react';
import { Modal, Text, TouchableOpacity, StyleSheet, Pressable } from 'react-native';
import { contentService } from '@/services/contentService';

type Reason = 'spam' | 'harassment' | 'nudity' | 'hate' | 'violence' | 'misinformation' | 'other';

const REASON_LABELS: { key: Reason; label: string }[] = [
  { key: 'spam', label: 'Spam' },
  { key: 'harassment', label: 'Harassment' },
  { key: 'nudity', label: 'Nudity' },
  { key: 'hate', label: 'Hate' },
  { key: 'violence', label: 'Violence' },
  { key: 'misinformation', label: 'Misinformation' },
  { key: 'other', label: 'Other' },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  contentId: string;
  authorUserId: string;
  currentUserId: string;
  onDelete?: () => void;
};

type Status = 'idle' | 'submitting' | 'done' | { error: string };

export function PostActionSheet({
  visible,
  onClose,
  contentId,
  authorUserId,
  currentUserId,
  onDelete,
}: Props) {
  const [mode, setMode] = useState<'main' | 'report'>('main');
  const [status, setStatus] = useState<Status>('idle');
  const isAuthor = authorUserId === currentUserId;

  function close() {
    setMode('main');
    setStatus('idle');
    onClose();
  }

  async function chooseReason(reason: Reason) {
    setStatus('submitting');
    try {
      await contentService.report(contentId, reason, undefined);
      setStatus('done');
      // Notify parent immediately; the toast stays visible inside this modal
      // until the parent flips visible=false (or the user taps backdrop).
      onClose();
    } catch (e: unknown) {
      const resp = (e as { response?: { data?: { error?: string } } })?.response;
      const msg = resp?.data?.error || "Couldn't send report — try again";
      setStatus({ error: msg });
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          {mode === 'main' && (
            <>
              <TouchableOpacity style={styles.row} onPress={() => setMode('report')}>
                <Text style={styles.rowText}>Report</Text>
              </TouchableOpacity>
              {isAuthor && (
                <TouchableOpacity
                  style={styles.row}
                  onPress={() => {
                    close();
                    onDelete?.();
                  }}
                >
                  <Text style={[styles.rowText, styles.danger]}>Delete</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.cancel} onPress={close}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}

          {mode === 'report' && status === 'idle' && (
            <>
              <Text style={styles.header}>Why are you reporting this?</Text>
              {REASON_LABELS.map((r) => (
                <TouchableOpacity
                  key={r.key}
                  style={styles.row}
                  onPress={() => chooseReason(r.key)}
                >
                  <Text style={styles.rowText}>{r.label}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={styles.cancel} onPress={() => setMode('main')}>
                <Text style={styles.cancelText}>Back</Text>
              </TouchableOpacity>
            </>
          )}

          {status === 'submitting' && <Text style={styles.info}>Submitting…</Text>}
          {status === 'done' && (
            <Text style={styles.info}>Thanks — our team will review this soon.</Text>
          )}
          {typeof status === 'object' && 'error' in status && (
            <Text style={styles.err}>
              {status.error.toLowerCase().includes('already')
                ? "You've already reported this"
                : status.error}
            </Text>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 16,
  },
  row: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  rowText: { fontSize: 16, color: '#262626' },
  danger: { color: '#ED4956' },
  cancel: { marginTop: 10, padding: 12, alignItems: 'center' },
  cancelText: { color: '#0095F6', fontWeight: '700' },
  header: { fontSize: 14, color: '#737373', marginBottom: 10 },
  info: { padding: 10, textAlign: 'center', color: '#10B981', fontWeight: '600' },
  err: { padding: 10, textAlign: 'center', color: '#ED4956', fontWeight: '600' },
});
