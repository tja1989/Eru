import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { SpinWheel } from '@/components/SpinWheel';
import { spinService } from '@/services/spinService';
import { usePointsStore } from '@/stores/pointsStore';

export default function SpinScreen() {
  const [canSpin, setCanSpin] = useState<boolean | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);

  useEffect(() => {
    spinService.status().then((s) => setCanSpin(s.canSpin)).catch(() => setCanSpin(false));
  }, []);

  async function handleSpin() {
    setSpinning(true);
    try {
      const r = await spinService.spin();
      setResult(r.pointsAwarded);
      setCanSpin(false);
      await usePointsStore.getState().refreshSummary();
    } catch (e: any) {
      Alert.alert('Spin failed', e?.response?.data?.error ?? 'Try again');
    } finally {
      setSpinning(false);
    }
  }

  if (canSpin === null) return <ActivityIndicator style={{ marginTop: 80 }} />;

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Daily Spin 🎡</Text>
      {result !== null ? (
        <Text style={styles.win}>You won +{result} pts!</Text>
      ) : canSpin ? (
        <SpinWheel spinning={spinning} onSpin={handleSpin} />
      ) : (
        <Text style={styles.gone}>Come back tomorrow!</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA', alignItems: 'center', paddingTop: 40 },
  title: { fontSize: 20, fontWeight: '700', color: '#262626', marginBottom: 20 },
  win: { fontSize: 22, color: '#10B981', fontWeight: '800', marginTop: 40 },
  gone: { fontSize: 16, color: '#737373', marginTop: 60 },
});
