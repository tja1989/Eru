import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { colors, spacing } from '../constants/theme';

interface Store {
  businessId: string;
  businessName: string;
  businessAvatarUrl: string | null;
  businessCategory: string | null;
  activeOfferCount: number;
}

interface Props {
  stores: Store[];
}

export function WatchlistStoresRow({ stores }: Props) {
  const router = useRouter();
  if (!stores?.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      {stores.map((s) => (
        <TouchableOpacity
          key={s.businessId}
          style={styles.tile}
          onPress={() => router.push(`/business/${s.businessId}`)}
        >
          <View style={styles.avatarWrap}>
            <Avatar uri={s.businessAvatarUrl} size={58} />
            {s.activeOfferCount > 0 ? (
              <View
                style={styles.dot}
                accessibilityLabel={`${s.businessName} has ${s.activeOfferCount} active offers`}
              >
                <Text style={styles.dotText}>{s.activeOfferCount}</Text>
              </View>
            ) : null}
          </View>
          <Text style={styles.name} numberOfLines={1}>{s.businessName}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff' },
  content: { paddingVertical: spacing.sm, paddingHorizontal: 12, gap: 14 },
  tile: { alignItems: 'center', width: 68 },
  avatarWrap: { position: 'relative' },
  dot: {
    position: 'absolute',
    top: -2,
    right: -2,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    backgroundColor: colors.orange,
    borderWidth: 1.5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { color: '#fff', fontSize: 9, fontWeight: '800' },
  name: { fontSize: 10.5, color: colors.g800, marginTop: 4, maxWidth: 68, textAlign: 'center' },
});
