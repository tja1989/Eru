import React from 'react';
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Avatar } from './Avatar';
import { colors } from '../constants/theme';

export function StoryRow({ stories = [] }: { stories: any[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={styles.content}>
      <TouchableOpacity style={styles.story}>
        <View style={styles.addRing}>
          <Avatar uri={null} size={58} />
          <View style={styles.addBadge}><Text style={styles.addText}>+</Text></View>
        </View>
        <Text style={styles.name}>Your story</Text>
      </TouchableOpacity>
      {stories.map((story: any) => (
        <TouchableOpacity key={story.user?.id} style={styles.story}>
          <Avatar uri={story.user?.avatarUrl} size={66} tier={story.user?.tier} />
          <Text style={styles.name} numberOfLines={1}>{story.user?.username}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: '#fff', borderBottomWidth: 0.5, borderBottomColor: colors.g100 },
  content: { paddingHorizontal: 12, paddingVertical: 10, gap: 14 },
  story: { alignItems: 'center', width: 68 },
  name: { fontSize: 10.5, color: colors.g800, marginTop: 4, maxWidth: 68, textAlign: 'center' },
  addRing: { position: 'relative' },
  addBadge: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderRadius: 10, backgroundColor: colors.blue, borderWidth: 2, borderColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  addText: { fontSize: 12, color: '#fff', fontWeight: '800' },
});
