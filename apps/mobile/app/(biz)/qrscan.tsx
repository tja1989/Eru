import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import Constants from 'expo-constants';
import { colors, spacing, radius } from '@/constants/theme';
import { bizService } from '@/services/bizService';
import type { BizQrScanResponse } from '@eru/shared';

// `executionEnvironment === 'storeClient'` is true when running under
// Expo Go (no native modules). Camera renders only outside Expo Go;
// Expo Go users fall back to the manual claim-code TextInput so the
// screen never crashes when expo-camera's native module isn't linked.
const IS_EXPO_GO = Constants.executionEnvironment === 'storeClient';

export default function BizQrScan() {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<BizQrScanResponse | null>(null);
  const [scanned, setScanned] = useState(false);

  // expo-camera is required only when we know the native module exists.
  // Avoid the top-level import so Jest + Expo Go never load it.
  const CameraView = !IS_EXPO_GO ? require('expo-camera').CameraView : null;
  const useCameraPermissions = !IS_EXPO_GO ? require('expo-camera').useCameraPermissions : null;
  const [permission, requestPermission] = useCameraPermissions ? useCameraPermissions() : [null, null];

  async function submitCode(payload: string) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await bizService.scanQr(payload);
      setResult(res);
      setCode('');
    } catch (err) {
      Alert.alert('Scan failed', err instanceof Error ? err.message : 'Try again');
    } finally {
      setSubmitting(false);
    }
  }

  if (result) {
    return (
      <View style={styles.center}>
        <Text style={styles.title}>Redeemed</Text>
        <Text style={styles.row}>{result.reward.offerTitle}</Text>
        <Text style={styles.row}>@{result.reward.username}</Text>
        {result.campaignEventId ? <Text style={styles.row}>Visit logged to campaign</Text> : null}
        <TouchableOpacity style={styles.btnPrimary} onPress={() => { setResult(null); setScanned(false); }}>
          <Text style={styles.btnPrimaryText}>Scan next</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Camera path (dev build).
  if (!IS_EXPO_GO && CameraView) {
    if (!permission) {
      return <View style={styles.center}><Text>Requesting camera…</Text></View>;
    }
    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <Text style={styles.title}>Camera permission required</Text>
          <TouchableOpacity style={styles.btnPrimary} onPress={requestPermission}>
            <Text style={styles.btnPrimaryText}>Grant</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return (
      <View style={styles.cameraContainer}>
        <CameraView
          style={styles.camera}
          onBarcodeScanned={scanned ? undefined : ({ data }: { data: string }) => {
            setScanned(true);
            submitCode(data);
          }}
          barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        />
        <Text style={styles.hint}>Point at the customer's reward QR</Text>
      </View>
    );
  }

  // Manual-input fallback (Expo Go).
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Redeem a reward</Text>
      <Text style={styles.helper}>Enter the customer's claim code from their QR.</Text>
      <TextInput
        style={styles.input}
        value={code}
        onChangeText={setCode}
        placeholder="CLAIM-CODE"
        autoCapitalize="characters"
      />
      <TouchableOpacity
        style={[styles.btnPrimary, (!code.trim() || submitting) && styles.btnDisabled]}
        onPress={() => submitCode(code.trim())}
        disabled={!code.trim() || submitting}
      >
        <Text style={styles.btnPrimaryText}>{submitting ? 'Redeeming…' : 'Redeem'}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xl, gap: spacing.md, backgroundColor: colors.bg },

  cameraContainer: { flex: 1, backgroundColor: '#000' },
  camera: { flex: 1 },
  hint: { position: 'absolute', bottom: 60, left: 0, right: 0, textAlign: 'center', color: '#fff', fontSize: 14 },

  title: { fontSize: 20, fontWeight: '700', color: colors.g800 },
  helper: { fontSize: 13, color: colors.g500 },
  row: { fontSize: 14, color: colors.g700 },

  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: radius.sm, padding: spacing.md, fontSize: 16, color: colors.g800, backgroundColor: '#fff' },

  btnPrimary: { backgroundColor: colors.blue, padding: spacing.md, borderRadius: radius.sm, alignItems: 'center' },
  btnPrimaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },
});
