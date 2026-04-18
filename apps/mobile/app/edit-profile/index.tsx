import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { userService } from '../../services/userService';
import { mediaService } from '../../services/mediaService';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, radius } from '../../constants/theme';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, setUser } = useAuthStore();

  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [usernameError, setUsernameError] = useState<string | null>(null);

  // Load existing settings on mount
  useEffect(() => {
    const load = async () => {
      try {
        const data = await userService.getSettings();
        setName(data.name ?? user?.name ?? '');
        setUsername(data.username ?? user?.username ?? '');
        setBio(data.bio ?? '');
        setAvatarUrl(data.avatarUrl ?? null);
      } catch {
        // Fall back to auth store values
        setName(user?.name ?? '');
        setUsername(user?.username ?? '');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // Handle avatar tap — open image library, upload via S3 presign
  const handleAvatarTap = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (result.canceled || !result.assets?.length) return;

    const asset = result.assets[0];
    const contentType = asset.mimeType ?? 'image/jpeg';

    setUploadingAvatar(true);
    try {
      const { uploadUrl, fileUrl } = await mediaService.presign({
        contentType,
        size: 0, // size not always available from picker; backend ignores for presign
      });
      await mediaService.uploadFileToS3(uploadUrl, { uri: asset.uri, type: contentType });
      setAvatarUrl(fileUrl);
    } catch {
      Alert.alert('Upload Failed', 'Could not upload photo. Please try again.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Save handler
  const handleSave = async () => {
    setUsernameError(null);
    setSaving(true);
    try {
      await userService.updateSettings({ name, username, bio, avatarUrl: avatarUrl ?? undefined });
      // Update local auth store so header/profile reflects new name immediately
      if (user) {
        setUser({ ...user, name, username });
      }
      Alert.alert(
        'Profile saved',
        'Your profile has been updated.',
        [{ text: 'OK', onPress: () => router.back() }],
      );
    } catch (err: any) {
      if (err?.response?.status === 409) {
        setUsernameError('Username already taken');
      } else {
        Alert.alert('Error', 'Could not save profile. Please try again.');
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.centered}>
          <ActivityIndicator color={colors.navy} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Profile</Text>
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || uploadingAvatar}
          style={styles.saveBtn}
        >
          {saving ? (
            <ActivityIndicator color={colors.navy} size="small" />
          ) : (
            <Text style={[styles.saveText, (saving || uploadingAvatar) && styles.saveDimmed]}>
              Save
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <TouchableOpacity
            testID="avatar-tap-btn"
            onPress={handleAvatarTap}
            disabled={uploadingAvatar}
            style={styles.avatarWrap}
          >
            {uploadingAvatar ? (
              <View style={[styles.avatarCircle, styles.avatarPlaceholder]}>
                <ActivityIndicator color={colors.navy} />
              </View>
            ) : avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarCircle} />
            ) : (
              <View style={[styles.avatarCircle, styles.avatarPlaceholder]}>
                <Text style={styles.avatarInitial}>
                  {name.charAt(0).toUpperCase() || '?'}
                </Text>
              </View>
            )}
            <View style={styles.avatarEditBadge}>
              <Text style={styles.avatarEditBadgeText}>✎</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.avatarHint}>Tap to change photo</Text>
        </View>

        {/* Fields */}
        <Text style={styles.sectionHeader}>Profile</Text>
        <View style={styles.section}>
          {/* Name */}
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={name}
              onChangeText={setName}
              placeholder="Display name"
              placeholderTextColor={colors.g400}
              returnKeyType="next"
              maxLength={100}
            />
          </View>

          <View style={styles.divider} />

          {/* Username */}
          <View style={styles.fieldColRow}>
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Username</Text>
              <TextInput
                style={styles.fieldInput}
                value={username}
                onChangeText={(v) => {
                  setUsername(v);
                  if (usernameError) setUsernameError(null);
                }}
                placeholder="username"
                placeholderTextColor={colors.g400}
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
                maxLength={30}
              />
            </View>
            {usernameError ? (
              <Text style={styles.fieldError}>{usernameError}</Text>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Bio */}
          <View style={styles.fieldColRow}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.bioInput]}
              value={bio}
              onChangeText={setBio}
              placeholder="Tell people about yourself..."
              placeholderTextColor={colors.g400}
              multiline
              maxLength={150}
              returnKeyType="done"
            />
            <Text style={styles.charCount}>{bio.length}/150</Text>
          </View>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
    backgroundColor: colors.card,
  },
  backBtn: { padding: spacing.xs, width: 40 },
  backArrow: { fontSize: 22, color: colors.g800, fontWeight: '600' },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
    color: colors.g900,
  },
  headerSpacer: { width: 40 },
  saveBtn: { width: 40, alignItems: 'flex-end' },
  saveText: { fontSize: 16, fontWeight: '700', color: colors.navy },
  saveDimmed: { opacity: 0.4 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  // Avatar
  avatarSection: { alignItems: 'center', paddingVertical: spacing.xl },
  avatarWrap: { position: 'relative', marginBottom: spacing.sm },
  avatarCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.g200,
  },
  avatarPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: colors.g600 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.navy,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  avatarEditBadgeText: { fontSize: 11, color: '#fff' },
  avatarHint: { fontSize: 12, color: colors.g500 },

  // Fields
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.g500,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.sm,
  },
  section: {
    backgroundColor: colors.card,
    borderTopWidth: 0.5,
    borderBottomWidth: 0.5,
    borderColor: colors.g100,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  fieldColRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  fieldLabel: { fontSize: 15, color: colors.g900, width: 100 },
  fieldInput: { flex: 1, fontSize: 15, color: colors.g700, textAlign: 'right' },
  bioInput: {
    textAlign: 'left',
    marginTop: spacing.sm,
    minHeight: 70,
    lineHeight: 21,
  },
  charCount: { fontSize: 11, color: colors.g400, textAlign: 'right', marginTop: 4 },
  fieldError: { fontSize: 12, color: colors.red, marginTop: 4 },
  divider: { height: 0.5, backgroundColor: colors.g100, marginLeft: spacing.lg },

  bottomPad: { height: 60 },
});
