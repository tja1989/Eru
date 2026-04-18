import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius } from '../../constants/theme';

const VALUE_PROPS = [
  { emoji: '🪙', title: 'Earn', body: 'Get points for every post you read, watch, or engage with.' },
  { emoji: '🎁', title: 'Redeem', body: 'Spend points on local offers, gift cards, recharges, and more.' },
  { emoji: '✍️', title: 'Create', body: 'Post content, tag businesses, get commission on sponsored boosts.' },
];

export default function Welcome() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.root}>
        <Text style={styles.brand}>Eru</Text>
        <Text style={styles.tag}>your attention has value</Text>

        {VALUE_PROPS.map((v) => (
          <View key={v.title} style={styles.card}>
            <Text style={styles.emoji}>{v.emoji}</Text>
            <View style={styles.cardBody}>
              <Text style={styles.cardTitle}>{v.title}</Text>
              <Text style={styles.cardBodyText}>{v.body}</Text>
            </View>
          </View>
        ))}

        <TouchableOpacity style={styles.primary} onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.primaryText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
          <Text style={styles.secondaryText}>I already have an account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.card },
  root: { padding: spacing.xxl, flexGrow: 1, justifyContent: 'center' },
  brand: {
    fontFamily: 'Georgia',
    fontStyle: 'italic',
    fontSize: 52,
    color: colors.orange,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  tag: {
    color: colors.g500,
    textAlign: 'center',
    fontSize: 16,
    marginBottom: spacing.xxxl,
  },
  card: {
    flexDirection: 'row',
    padding: spacing.md + 2,
    backgroundColor: colors.bg,
    borderRadius: radius.lg,
    marginBottom: spacing.sm + 2,
  },
  emoji: { fontSize: 28, marginRight: spacing.md },
  cardBody: { flex: 1 },
  cardTitle: { fontWeight: '700', fontSize: 16, color: colors.g800 },
  cardBodyText: { color: colors.g500, marginTop: 2 },
  primary: {
    backgroundColor: colors.orange,
    padding: spacing.md + 2,
    borderRadius: radius.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  primaryText: { color: colors.card, fontWeight: '700', fontSize: 16 },
  secondaryText: { color: colors.blue, textAlign: 'center', marginTop: spacing.md },
});
