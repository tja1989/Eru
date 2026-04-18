import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { contentService } from '../../services/contentService';
import { mediaService } from '../../services/mediaService';
import { PollForm } from '../../components/PollForm';
import { colors, spacing, radius } from '../../constants/theme';

const CONTENT_TYPES = ['photo', 'video', 'text', 'poll'] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const TYPE_LABELS: Record<ContentType, string> = {
  photo: '📷 Photo',
  video: '🎬 Video',
  text: '✍️ Text',
  poll: '📊 Poll',
};

export default function CreateScreen() {
  const router = useRouter();
  const [contentType, setContentType] = useState<ContentType>('photo');
  const [text, setText] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Poll-specific state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>([]);

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Please allow access to your photo library.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: contentType === 'video'
        ? ImagePicker.MediaTypeOptions.Videos
        : ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.85,
    });
    if (!result.canceled) {
      setMedia(result.assets);
    }
  };

  const isPollValid =
    contentType === 'poll' &&
    pollQuestion.trim().length > 0 &&
    pollOptions.length >= 2 &&
    pollOptions.every((o) => o.trim().length > 0);

  const isShareDisabled =
    submitting ||
    (contentType === 'poll'
      ? !isPollValid
      : !text.trim() && media.length === 0);

  const handleSubmit = async () => {
    if (contentType === 'poll') {
      if (!isPollValid) {
        Alert.alert('Incomplete poll', 'Add a question and at least 2 options.');
        return;
      }
    } else if (!text.trim() && media.length === 0) {
      Alert.alert('Nothing to post', 'Add some text or media before submitting.');
      return;
    }
    setSubmitting(true);
    try {
      const mediaIds: string[] = [];

      for (const asset of media) {
        const mimeType = asset.mimeType ?? (contentType === 'video' ? 'video/mp4' : 'image/jpeg');
        const uploadData = await mediaService.upload({
          contentType: mimeType,
          width: asset.width ?? 0,
          height: asset.height ?? 0,
        });
        await mediaService.uploadFileToS3(uploadData.uploadUrl, {
          uri: asset.uri,
          type: mimeType,
        });
        mediaIds.push(uploadData.mediaId);
      }

      const parsedHashtags = hashtags
        .split(' ')
        .map((h) => h.replace(/^#/, '').trim())
        .filter(Boolean);

      if (contentType === 'poll') {
        await contentService.create({
          type: 'poll',
          text: pollQuestion.trim(),
          pollOptions: pollOptions.filter((o) => o.trim()),
          mediaIds: [],
          hashtags: parsedHashtags,
        } as any);
      } else {
        await contentService.create({
          type: contentType,
          text: text.trim() || undefined,
          mediaIds,
          hashtags: parsedHashtags,
        });
      }

      Alert.alert('Submitted!', 'Your content is being reviewed.', [
        { text: 'OK', onPress: () => router.push('/my-content' as any) },
      ]);
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedPoints =
    media.length > 0 ? (contentType === 'video' ? 30 : 20) : 10;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Post</Text>
        <TouchableOpacity
          style={[styles.shareBtn, isShareDisabled && styles.shareBtnDisabled]}
          onPress={handleSubmit}
          disabled={isShareDisabled}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.shareBtnText}>Share</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Content type tabs */}
        <View style={styles.typeTabs}>
          {CONTENT_TYPES.map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.typeTab, contentType === t && styles.typeTabActive]}
              onPress={() => setContentType(t)}
            >
              <Text style={[styles.typeTabText, contentType === t && styles.typeTabTextActive]}>
                {TYPE_LABELS[t]}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Poll form — shown only when contentType is 'poll' */}
        {contentType === 'poll' && (
          <PollForm
            question={pollQuestion}
            onQuestionChange={setPollQuestion}
            options={pollOptions}
            onOptionsChange={setPollOptions}
            disabled={submitting}
          />
        )}

        {/* Text input — hidden for polls */}
        {contentType !== 'poll' && (
          <View style={styles.textBox}>
            <TextInput
              style={styles.textInput}
              placeholder={
                contentType === 'text'
                  ? "What's on your mind?"
                  : 'Add a caption...'
              }
              placeholderTextColor={colors.g400}
              multiline
              value={text}
              onChangeText={setText}
              maxLength={2200}
            />
            <Text style={styles.charCount}>{text.length}/2200</Text>
          </View>
        )}

        {/* Media picker */}
        {contentType !== 'text' && contentType !== 'poll' && (
          <View style={styles.mediaSection}>
            <TouchableOpacity style={styles.mediaPickerBtn} onPress={pickMedia}>
              <Text style={styles.mediaPickerIcon}>🖼️</Text>
              <Text style={styles.mediaPickerText}>
                {media.length > 0
                  ? `${media.length} item${media.length > 1 ? 's' : ''} selected`
                  : `Choose ${contentType === 'video' ? 'video' : 'photos'}`}
              </Text>
            </TouchableOpacity>

            {media.length > 0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewRow}>
                {media.map((asset, idx) => (
                  <Image key={idx} source={{ uri: asset.uri }} style={styles.previewThumb} />
                ))}
              </ScrollView>
            )}
          </View>
        )}

        {/* Hashtag input */}
        <View style={styles.hashtagSection}>
          <Text style={styles.sectionLabel}>Hashtags</Text>
          <TextInput
            style={styles.hashtagInput}
            placeholder="#food #travel #art"
            placeholderTextColor={colors.g400}
            value={hashtags}
            onChangeText={setHashtags}
            autoCapitalize="none"
          />
        </View>

        {/* Moderation notice */}
        <View style={styles.moderationBanner}>
          <Text style={styles.moderationIcon}>⚠️</Text>
          <Text style={styles.moderationText}>
            All posts are reviewed before going live. This usually takes a few minutes.
            Content that violates community guidelines will not be approved.
          </Text>
        </View>

        {/* Points preview */}
        <View style={styles.pointsPreview}>
          <Text style={styles.pointsIcon}>⭐</Text>
          <Text style={styles.pointsText}>
            Earn up to <Text style={styles.pointsHighlight}>+{estimatedPoints} pts</Text> for this post
          </Text>
        </View>

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={pickMedia}>
            <Text style={styles.toolbarIcon}>📷</Text>
            <Text style={styles.toolbarLabel}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => { setContentType('video'); pickMedia(); }}
          >
            <Text style={styles.toolbarIcon}>🎬</Text>
            <Text style={styles.toolbarLabel}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setContentType('poll')}
          >
            <Text style={styles.toolbarIcon}>📊</Text>
            <Text style={styles.toolbarLabel}>Poll</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.toolbarBtn}>
            <Text style={styles.toolbarIcon}>📍</Text>
            <Text style={styles.toolbarLabel}>Location</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.card },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g200,
  },
  headerBtn: { fontSize: 20, color: colors.g800, padding: spacing.xs },
  headerTitle: { fontSize: 16, fontWeight: '700', color: colors.g900 },
  shareBtn: {
    backgroundColor: colors.blue,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    minWidth: 64,
    alignItems: 'center',
  },
  shareBtnDisabled: { opacity: 0.6 },
  shareBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  typeTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  typeTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.g300,
  },
  typeTabActive: {
    backgroundColor: colors.g900,
    borderColor: colors.g900,
  },
  typeTabText: { fontSize: 12, fontWeight: '600', color: colors.g600 },
  typeTabTextActive: { color: '#fff' },
  textBox: {
    margin: spacing.lg,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    padding: spacing.md,
    minHeight: 100,
  },
  textInput: {
    fontSize: 15,
    color: colors.g800,
    lineHeight: 22,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  charCount: { fontSize: 11, color: colors.g400, textAlign: 'right', marginTop: spacing.xs },
  mediaSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  mediaPickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1.5,
    borderColor: colors.g300,
    borderStyle: 'dashed',
    borderRadius: radius.lg,
    padding: spacing.lg,
    justifyContent: 'center',
  },
  mediaPickerIcon: { fontSize: 22 },
  mediaPickerText: { fontSize: 14, color: colors.g600, fontWeight: '600' },
  previewRow: { marginTop: spacing.md },
  previewThumb: {
    width: 80,
    height: 80,
    borderRadius: radius.md,
    marginRight: spacing.sm,
    backgroundColor: colors.g200,
  },
  hashtagSection: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionLabel: { fontSize: 13, fontWeight: '700', color: colors.g700, marginBottom: spacing.sm },
  hashtagInput: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: 14,
    color: colors.g800,
  },
  moderationBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FCD34D',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  moderationIcon: { fontSize: 16 },
  moderationText: { flex: 1, fontSize: 12, color: '#92400E', lineHeight: 18 },
  pointsPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    backgroundColor: '#F0FDF4',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  pointsIcon: { fontSize: 16 },
  pointsText: { fontSize: 13, color: '#166534' },
  pointsHighlight: { fontWeight: '800', color: colors.green },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: spacing.xl,
    borderTopWidth: 0.5,
    borderTopColor: colors.g200,
    marginBottom: spacing.xxxl,
  },
  toolbarBtn: { alignItems: 'center', gap: spacing.xs },
  toolbarIcon: { fontSize: 26 },
  toolbarLabel: { fontSize: 10, color: colors.g500, fontWeight: '600' },
});
