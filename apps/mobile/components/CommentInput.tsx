import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { contentService } from '@/services/contentService';
import { useAuthStore } from '@/stores/authStore';
import { Avatar } from '@/components/Avatar';

type Props = {
  contentId: string;
  parentId?: string;
  onPosted: (comment: { id: string; text: string; user: { username: string } }) => void;
};

export function CommentInput({ contentId, parentId, onPosted }: Props) {
  const user = useAuthStore((s) => s.user);
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const trimmed = text.trim();
  const disabled = trimmed.length === 0 || submitting;

  async function handleSubmit() {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const comment = await contentService.createComment(contentId, trimmed, parentId);
      onPosted(comment);
      setText('');
    } catch (e) {
      setError("Couldn't post — try again");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.wrap}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.row}>
        <Avatar uri={user?.avatarUrl ?? null} size={32} />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Add a comment... (+3 pts for 10+ words)"
          placeholderTextColor="#8E8E8E"
          style={styles.input}
          multiline
          editable={!submitting}
        />
        <TouchableOpacity
          testID="comment-submit"
          onPress={handleSubmit}
          disabled={disabled}
          accessibilityState={{ disabled }}
          style={[styles.submit, disabled && styles.submitDisabled]}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.submitText}>Post</Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EFEFEF',
    padding: 12,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: '#262626',
    maxHeight: 100,
  },
  submit: {
    backgroundColor: '#0095F6',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minWidth: 60,
    alignItems: 'center',
  },
  submitDisabled: { opacity: 0.4 },
  submitText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  error: { color: '#ED4956', fontSize: 12, marginBottom: 6 },
});
