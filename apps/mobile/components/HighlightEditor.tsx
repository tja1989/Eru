import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  FlatList,
} from 'react-native';
import { highlightsService, Highlight } from '@/services/highlightsService';
import { userService } from '@/services/userService';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing, radius } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  existing?: Highlight;
  onSaved: (highlight: Highlight) => void;
}

export function HighlightEditor({ visible, onClose, existing, onSaved }: Props) {
  const { user } = useAuthStore();
  const [title, setTitle] = useState(existing?.title ?? '');
  const [emoji, setEmoji] = useState(existing?.emoji ?? '');
  const [contentItems, setContentItems] = useState<any[]>([]);
  const [selectedContentIds, setSelectedContentIds] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  // Reset form when visibility or existing changes
  useEffect(() => {
    if (visible) {
      setTitle(existing?.title ?? '');
      setEmoji(existing?.emoji ?? '');
      setSelectedContentIds(new Set());
    }
  }, [visible, existing]);

  // Load user's own content for multi-select
  useEffect(() => {
    if (visible && user?.id) {
      userService
        .getContent(user.id, 'post')
        .then((data: any) => setContentItems(data.items ?? data.posts ?? []))
        .catch(() => setContentItems([]));
    }
  }, [visible, user?.id]);

  const toggleContent = (contentId: string) => {
    setSelectedContentIds((prev) => {
      const next = new Set(prev);
      if (next.has(contentId)) {
        next.delete(contentId);
      } else {
        next.add(contentId);
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!title.trim() || !emoji.trim()) return;
    setSaving(true);
    try {
      let saved: Highlight;
      if (existing) {
        saved = await highlightsService.update(existing.id, { title: title.trim(), emoji: emoji.trim() });
      } else {
        saved = await highlightsService.create({ title: title.trim(), emoji: emoji.trim() });
        // Add selected content items to the new highlight
        for (const contentId of selectedContentIds) {
          await highlightsService.addItem(saved.id, contentId);
        }
      }
      onSaved(saved);
    } catch {
      // swallow — in production you'd show an error toast
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!existing) return;
    try {
      await highlightsService.remove(existing.id);
      onClose();
    } catch {
      // swallow
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.cancelBtn}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{existing ? 'Edit Highlight' : 'New Highlight'}</Text>
          <TouchableOpacity onPress={handleSave} disabled={saving}>
            <Text style={[styles.saveBtn, saving && styles.saveBtnDisabled]}>Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.body} keyboardShouldPersistTaps="handled">
          {/* Title */}
          <TextInput
            style={styles.input}
            placeholder="Title (max 40 chars)"
            placeholderTextColor={colors.g400}
            value={title}
            onChangeText={setTitle}
            maxLength={40}
          />

          {/* Emoji */}
          <TextInput
            style={styles.input}
            placeholder="Emoji"
            placeholderTextColor={colors.g400}
            value={emoji}
            onChangeText={setEmoji}
            maxLength={8}
          />

          {/* Content picker — only shown for new highlights */}
          {!existing && contentItems.length > 0 && (
            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Add posts</Text>
              <FlatList
                data={contentItems}
                keyExtractor={(item) => item.id}
                numColumns={3}
                scrollEnabled={false}
                renderItem={({ item }) => {
                  const selected = selectedContentIds.has(item.id);
                  return (
                    <TouchableOpacity
                      testID={`content-select-${item.id}`}
                      style={[styles.contentThumb, selected && styles.contentThumbSelected]}
                      onPress={() => toggleContent(item.id)}
                    >
                      {selected && (
                        <View style={styles.checkBadge}>
                          <Text style={styles.checkText}>✓</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                }}
              />
            </View>
          )}

          {/* Delete button (edit mode only) */}
          {existing && (
            <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
              <Text style={styles.deleteBtnText}>Delete</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const THUMB_SIZE = 100;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.card,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.g900,
  },
  cancelBtn: {
    fontSize: 15,
    color: colors.g500,
  },
  saveBtn: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.orange,
  },
  saveBtnDisabled: {
    opacity: 0.4,
  },
  body: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.g900,
    marginBottom: spacing.md,
  },
  pickerSection: {
    marginTop: spacing.md,
  },
  pickerLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.g600,
    marginBottom: spacing.sm,
  },
  contentThumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    margin: 2,
    backgroundColor: colors.g100,
    borderRadius: radius.sm,
    overflow: 'hidden',
    position: 'relative',
  },
  contentThumbSelected: {
    borderWidth: 2.5,
    borderColor: colors.orange,
  },
  checkBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.orange,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '800',
  },
  deleteBtn: {
    marginTop: spacing.xxl,
    marginBottom: spacing.xxl,
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    alignItems: 'center',
  },
  deleteBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.red,
  },
});
