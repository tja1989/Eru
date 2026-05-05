import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Avatar } from './Avatar';
import { colors } from '../constants/theme';

export function StoryRow({ stories = [] }: { stories: any[] }) {
  const router = useRouter();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.container}
      contentContainerStyle={styles.content}
    >
      <TouchableOpacity
        testID="your-story"
        style={styles.story}
        onPress={() => router.push('/(tabs)/create')}
      >
        <View style={styles.addRing}>
          <Avatar uri={null} size={58} />
          <View style={styles.addBadge}>
            <Text style={styles.addText}>+</Text>
          </View>
        </View>
        <Text style={styles.name}>Your story</Text>
      </TouchableOpacity>
      {stories.map((story: any) => {
        const seen = (story.views?.length ?? 0) > 0;
        const isLive = !!story.isLive;
        const ringStyle = isLive ? styles.ringLive : seen ? styles.ringSeen : styles.ringUnseen;
        return (
          <TouchableOpacity
            key={story.id}
            testID={`story-${story.id}`}
            style={styles.story}
            onPress={() => router.push(`/stories/${story.id}`)}
          >
            <View testID={`story-ring-${story.id}`} style={[styles.ring, ringStyle]}>
              <Avatar uri={story.user?.avatarUrl} size={58} tier={story.user?.tier} />
              {isLive ? (
                <View style={styles.liveBadge}>
                  <Text style={styles.liveText}>LIVE</Text>
                </View>
              ) : null}
            </View>
            <View style={styles.nameRow}>
              <Text style={styles.name} numberOfLines={1}>
                {story.user?.username}
              </Text>
              {story.user?.isVerified ? <Text style={styles.verified}> ✓</Text> : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  content: { paddingHorizontal: 12, paddingVertical: 10, gap: 14 },
  story: { alignItems: 'center', width: 68 },
  nameRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', maxWidth: 68 },
  name: { fontSize: 10.5, color: colors.g800, marginTop: 4, maxWidth: 68, textAlign: 'center' },
  verified: { fontSize: 10, color: colors.blue, marginTop: 4 },
  addRing: { position: 'relative' },
  addBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.blue,
    borderWidth: 2,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: { fontSize: 12, color: '#fff', fontWeight: '800' },
  ring: { width: 68, height: 68, borderRadius: 34, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  ringUnseen: { borderColor: colors.orange },
  ringSeen: { borderColor: colors.g300 },
  ringLive: { borderColor: colors.red },
  liveBadge: {
    position: 'absolute',
    bottom: -4,
    backgroundColor: colors.red,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  liveText: { color: '#fff', fontSize: 8, fontWeight: '800', letterSpacing: 0.5 },
});
