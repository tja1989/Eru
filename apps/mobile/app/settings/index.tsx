import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, radius } from '../../constants/theme';

interface UserSettings {
  name: string;
  bio: string;
  pincode: string;
  pushNotifications: boolean;
  privateAccount: boolean;
  shareDataWithBrands: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  name: '',
  bio: '',
  pincode: '',
  pushNotifications: true,
  privateAccount: false,
  shareDataWithBrands: true,
};

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const [settings, setSettings] = useState<UserSettings>({
    ...DEFAULT_SETTINGS,
    name: user?.name ?? '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await userService.getSettings();
        setSettings({
          name: data.name ?? user?.name ?? '',
          bio: data.bio ?? '',
          pincode: data.pincode ?? '',
          pushNotifications: data.pushNotifications ?? true,
          privateAccount: data.privateAccount ?? false,
          shareDataWithBrands: data.shareDataWithBrands ?? true,
        });
      } catch {
        setSettings((prev) => ({ ...prev, name: user?.name ?? '' }));
      } finally {
        setLoading(false);
      }
    };
    loadSettings();
  }, []);

  const updateField = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await userService.updateSettings(settings);
      setHasChanges(false);
      Alert.alert('Saved', 'Your settings have been updated.');
    } catch {
      Alert.alert('Error', 'Could not save settings. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login' as any);
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Settings</Text>
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
        <Text style={styles.headerTitle}>Settings</Text>
        {hasChanges ? (
          <TouchableOpacity onPress={handleSave} disabled={saving} style={styles.saveBtn}>
            {saving ? (
              <ActivityIndicator color={colors.navy} size="small" />
            ) : (
              <Text style={styles.saveText}>Save</Text>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Profile section */}
        <Text style={styles.sectionHeader}>Profile</Text>
        <View style={styles.section}>
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Name</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.name}
              onChangeText={(v) => updateField('name', v)}
              placeholder="Your display name"
              placeholderTextColor={colors.g400}
              returnKeyType="done"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldColRow}>
            <Text style={styles.fieldLabel}>Bio</Text>
            <TextInput
              style={[styles.fieldInput, styles.bioInput]}
              value={settings.bio}
              onChangeText={(v) => updateField('bio', v)}
              placeholder="Tell people about yourself..."
              placeholderTextColor={colors.g400}
              multiline
              maxLength={150}
              returnKeyType="done"
            />
            <Text style={styles.charCount}>{settings.bio.length}/150</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.fieldRow}>
            <Text style={styles.fieldLabel}>Pincode</Text>
            <TextInput
              style={styles.fieldInput}
              value={settings.pincode}
              onChangeText={(v) => updateField('pincode', v.replace(/\D/g, '').slice(0, 6))}
              placeholder="6-digit area pincode"
              placeholderTextColor={colors.g400}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
            />
          </View>
        </View>

        {/* Notifications section */}
        <Text style={styles.sectionHeader}>Notifications</Text>
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Push Notifications</Text>
              <Text style={styles.toggleDesc}>Get alerts for likes, comments, and updates</Text>
            </View>
            <Switch
              value={settings.pushNotifications}
              onValueChange={(v) => updateField('pushNotifications', v)}
              trackColor={{ false: colors.g300, true: colors.navy }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Privacy section */}
        <Text style={styles.sectionHeader}>Privacy</Text>
        <View style={styles.section}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Private Account</Text>
              <Text style={styles.toggleDesc}>Only approved followers can see your content</Text>
            </View>
            <Switch
              value={settings.privateAccount}
              onValueChange={(v) => updateField('privateAccount', v)}
              trackColor={{ false: colors.g300, true: colors.navy }}
              thumbColor="#fff"
            />
          </View>
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Share Data with Brands</Text>
              <Text style={styles.toggleDesc}>Allow brands to view anonymised engagement data</Text>
            </View>
            <Switch
              value={settings.shareDataWithBrands}
              onValueChange={(v) => updateField('shareDataWithBrands', v)}
              trackColor={{ false: colors.g300, true: colors.navy }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* Account section */}
        <Text style={styles.sectionHeader}>Account</Text>
        <View style={styles.section}>
          <View style={styles.infoRow}>
            <Text style={styles.fieldLabel}>Username</Text>
            <Text style={styles.infoValue}>@{user?.username ?? '—'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.fieldLabel}>Phone</Text>
            <Text style={styles.infoValue}>{user?.phone ?? '—'}</Text>
          </View>
        </View>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

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
  backBtn: { padding: spacing.xs },
  backArrow: { fontSize: 22, color: colors.g800, fontWeight: '600' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: colors.g900 },
  headerSpacer: { width: 40 },
  saveBtn: { paddingHorizontal: spacing.sm },
  saveText: { fontSize: 16, fontWeight: '700', color: colors.navy },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },

  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.g500,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
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
  fieldInput: {
    flex: 1,
    fontSize: 15,
    color: colors.g700,
    textAlign: 'right',
  },
  bioInput: {
    textAlign: 'left',
    marginTop: spacing.sm,
    minHeight: 70,
    lineHeight: 21,
  },
  charCount: { fontSize: 11, color: colors.g400, textAlign: 'right', marginTop: 4 },

  divider: { height: 0.5, backgroundColor: colors.g100, marginLeft: spacing.lg },

  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  toggleInfo: { flex: 1, marginRight: spacing.md },
  toggleLabel: { fontSize: 15, color: colors.g900, fontWeight: '500' },
  toggleDesc: { fontSize: 12, color: colors.g500, marginTop: 2 },

  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  infoValue: { fontSize: 15, color: colors.g500 },

  logoutBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    backgroundColor: colors.red,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  logoutText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  bottomPad: { height: spacing.xxxl * 2 },
});
