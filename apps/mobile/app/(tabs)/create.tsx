import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { formatHandle } from '../../utils/formatHandle';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { contentService } from '../../services/contentService';
import { mediaService } from '../../services/mediaService';
import { PollForm } from '../../components/PollForm';
import { ThreadComposer } from '../../components/ThreadComposer';
import { LocationPicker } from '../../components/LocationPicker';
import { UserTagPicker, TagUser } from '../../components/UserTagPicker';
import { ContentSubtypeSelector } from '../../components/ContentSubtypeSelector';
import { BusinessTagPicker } from '../../components/BusinessTagPicker';
import { PointsPreviewCard } from '../../components/PointsPreviewCard';
import { ModerationNoticeCard } from '../../components/ModerationNoticeCard';
import type { ContentSubtype, BusinessSearchItem } from '@eru/shared';
import { colors, spacing, radius } from '../../constants/theme';

const CONTENT_TYPES = ['photo', 'video', 'text', 'poll', 'thread'] as const;
type ContentType = (typeof CONTENT_TYPES)[number];

const TYPE_LABELS: Record<ContentType, string> = {
  photo: '📷 Photo',
  video: '🎬 Video',
  text: '✍️ Text',
  poll: '📊 Poll',
  thread: '🧵 Thread',
};

const TYPE_TO_API: Record<ContentType, 'post' | 'reel' | 'poll' | 'thread'> = {
  photo: 'post',
  video: 'reel',
  text: 'post',
  poll: 'poll',
  thread: 'thread',
};

export default function CreateScreen() {
  const router = useRouter();
  const [contentType, setContentType] = useState<ContentType>('photo');
  const [subtype, setSubtype] = useState<ContentSubtype | null>(null);
  const [text, setText] = useState('');
  const [hashtags, setHashtags] = useState('');
  const [media, setMedia] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [submitting, setSubmitting] = useState(false);
  // Poll-specific state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState<string[]>([]);
  // Thread-specific state
  const [threadParts, setThreadParts] = useState<string[]>([]);
  // Location state
  const [showLocPicker, setShowLocPicker] = useState(false);
  const [selectedPincode, setSelectedPincode] = useState<string | null>(null);
  // Tag users state
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [taggedUsers, setTaggedUsers] = useState<TagUser[]>([]);
  // Business tag state — populated by BusinessTagPicker when the user
  // selects a business from the autocomplete. null means no tag.
  const [businessTag, setBusinessTag] = useState<BusinessSearchItem | null>(null);

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

  const isThreadValid =
    contentType === 'thread' &&
    threadParts.length >= 2 &&
    threadParts.every((p) => p.trim().length > 0);

  const isShareDisabled =
    submitting ||
    !subtype ||
    (contentType === 'poll'
      ? !isPollValid
      : contentType === 'thread'
      ? !isThreadValid
      : !text.trim() && media.length === 0);

  const handleSubmit = async () => {
    if (!subtype) {
      Alert.alert('Pick a type', 'Choose what kind of content this is so the feed can route it to the right audience.');
      return;
    }
    if (contentType === 'poll') {
      if (!isPollValid) {
        Alert.alert('Incomplete poll', 'Add a question and at least 2 options.');
        return;
      }
    } else if (contentType === 'thread') {
      if (!isThreadValid) {
        Alert.alert('Incomplete thread', 'Each part must have text, and you need at least 2 parts.');
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
        mediaIds.push(uploadData.media.id);
      }

      const parsedHashtags = hashtags
        .split(' ')
        .map((h) => h.replace(/^#/, '').trim())
        .filter(Boolean);

      const taggedUserIds = taggedUsers.length > 0 ? taggedUsers.map((u) => u.id) : undefined;

      const businessTagId = businessTag?.id;

      if (contentType === 'poll') {
        await contentService.create({
          type: TYPE_TO_API.poll,
          subtype,
          text: pollQuestion.trim(),
          pollOptions: pollOptions.map((o) => o.trim()).filter(Boolean),
          mediaIds: [],
          hashtags: parsedHashtags,
          locationPincode: selectedPincode ?? undefined,
          taggedUserIds,
          businessTagId,
        });
      } else if (contentType === 'thread') {
        await contentService.create({
          type: TYPE_TO_API.thread,
          subtype,
          threadParts: threadParts.map((p) => p.trim()).filter(Boolean),
          mediaIds: [],
          hashtags: parsedHashtags,
          locationPincode: selectedPincode ?? undefined,
          taggedUserIds,
          businessTagId,
        });
      } else {
        const payload = {
          type: TYPE_TO_API[contentType],
          subtype,
          text: text.trim() || undefined,
          mediaIds,
          hashtags: parsedHashtags,
          locationPincode: selectedPincode ?? undefined,
          taggedUserIds,
          businessTagId,
        };
        await contentService.create(payload);
      }

      Alert.alert('Submitted!', 'Your content is being reviewed.', [
        { text: 'OK', onPress: () => router.push('/my-content' as any) },
      ]);
    } catch (err: any) {
      const apiMsg = err?.response?.data?.error ?? err?.message ?? 'Unknown error';
      Alert.alert('Error', apiMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const estimatedPoints =
    media.length > 0 ? (contentType === 'video' ? 30 : 20) : 10;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.headerBtn}>✕</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create Post</Text>
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
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.typeTabs}
          contentContainerStyle={styles.typeTabsContent}
          keyboardShouldPersistTaps="handled"
        >
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
        </ScrollView>

        {/* Content subtype selector — 12-card grid + contextual banner */}
        <ContentSubtypeSelector value={subtype} onChange={setSubtype} />

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

        {/* Thread composer — shown only when contentType is 'thread' */}
        {contentType === 'thread' && (
          <ThreadComposer
            parts={threadParts}
            onPartsChange={setThreadParts}
            disabled={submitting}
          />
        )}

        {/* Text input — hidden for polls and threads */}
        {contentType !== 'poll' && contentType !== 'thread' && (
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
        {contentType !== 'text' && contentType !== 'poll' && contentType !== 'thread' && (
          <View style={styles.mediaSection}>
            <TouchableOpacity style={styles.mediaPickerBtn} onPress={pickMedia}>
              <Ionicons name="images-outline" size={22} color={colors.g600} style={{ marginRight: 8 }} />
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

        {/* Tagged users chip row */}
        {taggedUsers.length > 0 && (
          <TouchableOpacity
            style={styles.taggedChipRow}
            onPress={() => setShowTagPicker(true)}
            accessibilityLabel="Edit tagged users"
          >
            <Text style={styles.taggedChipText}>
              {'👥 Tagged: '}
              {taggedUsers.slice(0, 2).map((u) => formatHandle(u.username)).filter(Boolean).join(', ')}
              {taggedUsers.length > 2 ? ` +${taggedUsers.length - 2}` : ''}
            </Text>
          </TouchableOpacity>
        )}

        {/* Business tag — unlocks the 20% commission split */}
        <BusinessTagPicker value={businessTag} onChange={setBusinessTag} />

        {/* Moderation notice — PWA's 15-minute + +30pt copy */}
        <ModerationNoticeCard />

        {/* Points preview — 3-column breakdown: approved / like / trending */}
        <PointsPreviewCard />

        {/* Bottom toolbar */}
        <View style={styles.toolbar}>
          <TouchableOpacity style={styles.toolbarBtn} onPress={pickMedia}>
            <Ionicons name="camera-outline" size={22} color={colors.g700} />
            <Text style={styles.toolbarLabel}>Photo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => { setContentType('video'); pickMedia(); }}
          >
            <Ionicons name="videocam-outline" size={22} color={colors.g700} />
            <Text style={styles.toolbarLabel}>Video</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setContentType('poll')}
          >
            <Ionicons name="bar-chart-outline" size={22} color={colors.g700} />
            <Text style={styles.toolbarLabel}>Poll</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setShowLocPicker(true)}
          >
            <Ionicons name="location-outline" size={22} color={colors.g700} />
            <Text style={styles.toolbarLabel}>
              {selectedPincode ?? 'Location'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setShowTagPicker(true)}
            accessibilityLabel="Tag users"
          >
            <Ionicons name="people-outline" size={22} color={colors.g700} />
            <Text style={styles.toolbarLabel}>
              {taggedUsers.length > 0 ? `${taggedUsers.length} tagged` : 'Tag'}
            </Text>
          </TouchableOpacity>
          {/* Audio — placeholder matching PWA's 6-icon toolbar. The audio
              feature itself (background track picker) isn't wired yet. */}
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => Alert.alert('Audio coming soon', 'Background audio picker is on the roadmap.')}
            accessibilityLabel="Add audio"
          >
            <Ionicons name="musical-notes-outline" size={22} color={colors.g700} />
            <Text style={styles.toolbarLabel}>Audio</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Location Picker Modal */}
      <Modal
        visible={showLocPicker}
        animationType="slide"
        onRequestClose={() => setShowLocPicker(false)}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowLocPicker(false)}>
              <Text style={styles.headerBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Select Location</Text>
            <View style={{ width: 36 }} />
          </View>
          <LocationPicker
            onSelect={(pc) => {
              setSelectedPincode(pc);
              setShowLocPicker(false);
            }}
          />
        </SafeAreaView>
      </Modal>

      {/* Tag Users Modal */}
      <Modal
        visible={showTagPicker}
        animationType="slide"
        onRequestClose={() => setShowTagPicker(false)}
      >
        <SafeAreaView style={styles.safe} edges={['top']}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowTagPicker(false)}>
              <Text style={styles.headerBtn}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Tag Users</Text>
            <View style={{ width: 36 }} />
          </View>
          <UserTagPicker
            initialSelected={taggedUsers}
            onConfirm={(selected) => {
              setTaggedUsers(selected);
              setShowTagPicker(false);
            }}
            onCancel={() => setShowTagPicker(false)}
          />
        </SafeAreaView>
      </Modal>
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
    backgroundColor: colors.orange,
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
    flexGrow: 0,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  typeTabsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
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
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g200,
  },
  taggedChipRow: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    backgroundColor: colors.g100,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    alignSelf: 'flex-start',
  },
  taggedChipText: { fontSize: 13, fontWeight: '600', color: colors.g700 },
});
