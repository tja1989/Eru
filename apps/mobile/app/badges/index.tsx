import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { badgesService, Badge } from '@/services/badgesService';
import { BadgeGrid } from '@/components/BadgeGrid';

export default function BadgesScreen() {
  const [badges, setBadges] = useState<Badge[] | null>(null);

  useEffect(() => {
    badgesService
      .list()
      .then(setBadges)
      .catch(() => setBadges([]));
  }, []);

  if (!badges) return <ActivityIndicator style={{ marginTop: 80 }} />;

  const unlockedCount = badges.filter((b) => b.unlockedAt).length;

  return (
    <ScrollView style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>🏆 Badges</Text>
        <Text style={styles.count}>
          {unlockedCount}/{badges.length} unlocked
        </Text>
      </View>
      <BadgeGrid badges={badges} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { padding: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#EFEFEF' },
  title: { fontSize: 18, fontWeight: '700', color: '#262626' },
  count: { fontSize: 13, color: '#737373', marginTop: 4 },
});
