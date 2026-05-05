import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { storiesService, Story } from '@/services/storiesService';
import { formatHandle } from '@/utils/formatHandle';

const STORY_DURATION_MS = 5000;

export default function StoryViewer() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [stories, setStories] = useState<Story[]>([]);
  const [index, setIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    storiesService.feed().then((s) => {
      const start = Math.max(0, s.findIndex((x) => x.id === id));
      setStories(s);
      setIndex(start);
      setLoading(false);
    });
  }, [id]);

  useEffect(() => {
    if (loading || stories.length === 0) return;
    const current = stories[index];
    if (!current) return;
    storiesService.markViewed(current.id).catch(() => {});
    const t = setTimeout(() => {
      if (index + 1 >= stories.length) router.back();
      else setIndex(index + 1);
    }, STORY_DURATION_MS);
    return () => clearTimeout(t);
  }, [index, loading, stories]);

  if (loading || stories.length === 0) {
    return <ActivityIndicator style={{ flex: 1, backgroundColor: '#000' }} color="#fff" />;
  }

  const current = stories[index];
  return (
    <View style={styles.root}>
      <TouchableOpacity style={styles.close} onPress={() => router.back()}>
        <Text style={styles.closeText}>×</Text>
      </TouchableOpacity>
      <Text style={styles.username}>{formatHandle(current.user.username)}</Text>
      <Image source={{ uri: current.mediaUrl }} style={styles.media} resizeMode="contain" />
      <TouchableOpacity
        testID="story-skip"
        style={styles.tapArea}
        onPress={() => {
          if (index + 1 >= stories.length) router.back();
          else setIndex(index + 1);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', top: 50, right: 20, zIndex: 2 },
  closeText: { color: '#fff', fontSize: 34 },
  username: { position: 'absolute', top: 56, left: 20, color: '#fff', fontWeight: '700', zIndex: 2 },
  media: { flex: 1 },
  tapArea: { ...StyleSheet.absoluteFillObject },
});
