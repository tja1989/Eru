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
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { userService } from '../../services/userService';
import { useAuthStore } from '../../stores/authStore';
import { colors, spacing, radius } from '../../constants/theme';

type Gender = 'male' | 'female' | 'other';

interface UserSettings {
  name: string;
  bio: string;
  pincode: string;
  pushNotifications: boolean;
  privateAccount: boolean;
  shareDataWithBrands: boolean;
  dob: string | null;
  gender: Gender | null;
  secondaryPincodes: string[];
  notificationEmail: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  name: '',
  bio: '',
  pincode: '',
  pushNotifications: true,
  privateAccount: false,
  shareDataWithBrands: true,
  dob: null,
  gender: null,
  secondaryPincodes: [],
  notificationEmail: false,
};

/** Formats an ISO date string (YYYY-MM-DD) to a human-friendly form like "15 Jan 1990". */
function formatDob(isoDate: string | null): string {
  if (!isoDate) return 'Not set';
  // Parse as UTC noon to avoid timezone-off-by-one errors
  const [year, month, day] = isoDate.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

/** Converts a JS Date to an ISO date string YYYY-MM-DD in UTC. */
function toISODateString(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function SettingsScreen() {
  const router = useRouter();
  const { user, logout, reset } = useAuthStore();

  const [settings, setSettings] = useState<UserSettings>({
    ...DEFAULT_SETTINGS,
    name: user?.name ?? '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [showDobPicker, setShowDobPicker] = useState(false);
  const [newPincode, setNewPincode] = useState('');

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
          dob: data.dob ?? null,
          gender: data.gender ?? null,
          secondaryPincodes: data.secondaryPincodes ?? [],
          notificationEmail: data.notificationEmail ?? false,
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

  const handleDobChange = (_event: DateTimePickerEvent, date?: Date) => {
    // On Android the picker dismisses itself; on iOS we use a modal.
    // If date is undefined the user cancelled — close without saving.
    if (Platform.OS === 'android') {
      setShowDobPicker(false);
    }
    if (date !== undefined) {
      updateField('dob', toISODateString(date));
    }
  };

  const handleAddSecondaryPincode = () => {
    const trimmed = newPincode.trim();
    if (trimmed.length !== 6 || !/^\d{6}$/.test(trimmed)) return;
    if (settings.secondaryPincodes.includes(trimmed)) return;
    if (settings.secondaryPincodes.length >= 5) return;
    updateField('secondaryPincodes', [...settings.secondaryPincodes, trimmed]);
    setNewPincode('');
  };

  const handleRemoveSecondaryPincode = (code: string) => {
    updateField('secondaryPincodes', settings.secondaryPincodes.filter((p) => p !== code));
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This cannot be undone. Your posts will remain visible but anonymized.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await userService.deleteMe();
              reset();
              router.replace('/(auth)/welcome' as any);
            } catch {
              Alert.alert('Error', 'Could not delete account. Please try again.');
            }
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
          <TouchableOpacity
            testID="dob-row"
            style={styles.fieldRow}
            onPress={() => setShowDobPicker(true)}
            activeOpacity={0.7}
          >
            <Text style={styles.fieldLabel}>Date of Birth</Text>
            <Text style={[styles.fieldInput, styles.fieldValue]}>
              {formatDob(settings.dob)}
            </Text>
          </TouchableOpacity>
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
          <View style={styles.divider} />
          {/* F10.2: Gender radio */}
          <View style={styles.fieldColRow}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.genderRow}>
              {(['male', 'female', 'other'] as Gender[]).map((option) => {
                const selected = settings.gender === option;
                const label = option.charAt(0).toUpperCase() + option.slice(1);
                return (
                  <TouchableOpacity
                    key={option}
                    testID={`gender-option-${option}`}
                    style={[styles.genderChip, selected && styles.genderChipSelected]}
                    onPress={() => updateField('gender', option)}
                    activeOpacity={0.7}
                  >
                    {selected && (
                      <View testID={`gender-selected-${option}`} style={styles.genderDot} />
                    )}
                    <Text style={[styles.genderChipText, selected && styles.genderChipTextSelected]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={styles.divider} />
          {/* F10.3: Secondary pincodes */}
          <View style={styles.fieldColRow}>
            <Text style={styles.fieldLabel}>Other Areas</Text>
            <View style={styles.chipWrap}>
              {settings.secondaryPincodes.map((code) => (
                <View key={code} style={styles.pincodeChip}>
                  <Text style={styles.pincodeChipText}>{code}</Text>
                  <TouchableOpacity
                    testID={`remove-pincode-${code}`}
                    onPress={() => handleRemoveSecondaryPincode(code)}
                    hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                  >
                    <Text style={styles.pincodeChipRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <TextInput
              testID="secondary-pincode-input"
              style={[styles.pincodeAddInput, settings.secondaryPincodes.length >= 5 && styles.pincodeAddInputDisabled]}
              value={newPincode}
              onChangeText={(v) => setNewPincode(v.replace(/\D/g, '').slice(0, 6))}
              placeholder={settings.secondaryPincodes.length >= 5 ? 'Max 5 pincodes reached' : '+ Add Pincode'}
              placeholderTextColor={settings.secondaryPincodes.length >= 5 ? colors.g300 : colors.g400}
              keyboardType="number-pad"
              maxLength={6}
              returnKeyType="done"
              editable={settings.secondaryPincodes.length < 5}
              onSubmitEditing={handleAddSecondaryPincode}
            />
          </View>
        </View>

        {/* DOB picker — Android shows native dialog; iOS uses a modal sheet */}
        {showDobPicker && Platform.OS === 'android' && (
          <DateTimePicker
            testID="dob-picker"
            mode="date"
            display="default"
            value={settings.dob ? new Date(settings.dob + 'T12:00:00Z') : new Date()}
            maximumDate={new Date()}
            onChange={handleDobChange}
          />
        )}
        {Platform.OS !== 'android' && (
          <Modal
            visible={showDobPicker}
            transparent
            animationType="slide"
            onRequestClose={() => setShowDobPicker(false)}
          >
            <View style={styles.pickerModalOverlay}>
              <View style={styles.pickerModalSheet}>
                <View style={styles.pickerModalHeader}>
                  <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                    <Text style={styles.pickerCancelText}>Cancel</Text>
                  </TouchableOpacity>
                  <Text style={styles.pickerTitle}>Date of Birth</Text>
                  <TouchableOpacity onPress={() => setShowDobPicker(false)}>
                    <Text style={styles.pickerDoneText}>Done</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  testID="dob-picker"
                  mode="date"
                  display="spinner"
                  value={settings.dob ? new Date(settings.dob + 'T12:00:00Z') : new Date()}
                  maximumDate={new Date()}
                  onChange={handleDobChange}
                />
              </View>
            </View>
          </Modal>
        )}

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
          {/* F10.4: Email digest toggle */}
          <View style={styles.divider} />
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Text style={styles.toggleLabel}>Email Digest</Text>
              <Text style={styles.toggleDesc}>Receive a weekly summary of your top content</Text>
            </View>
            <Switch
              testID="email-digest-toggle"
              value={settings.notificationEmail}
              onValueChange={(v) => updateField('notificationEmail', v)}
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

        {/* F10.5: Linked Accounts section */}
        <Text style={styles.sectionHeader}>Linked Accounts</Text>
        <View style={styles.section}>
          {/* Phone — always verified since auth is phone-based */}
          <View style={styles.linkedRow}>
            <View style={styles.linkedInfo}>
              <Text style={styles.linkedLabel}>Phone</Text>
              {user?.phone ? (
                <Text style={styles.linkedVerified}>✓ Verified • {user.phone}</Text>
              ) : (
                <Text style={styles.linkedStatus}>Not linked</Text>
              )}
            </View>
          </View>
          <View style={styles.divider} />
          {/* Google — placeholder, no OAuth wiring yet */}
          <View style={styles.linkedRow}>
            <View style={styles.linkedInfo}>
              <Text style={styles.linkedLabel}>Google</Text>
              <Text style={styles.linkedStatus}>Not linked</Text>
            </View>
            <TouchableOpacity style={styles.linkedBtn} activeOpacity={0.7}>
              <Text style={styles.linkedBtnText}>Link with Google</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.divider} />
          {/* Instagram — placeholder */}
          <View style={styles.linkedRow}>
            <View style={styles.linkedInfo}>
              <Text style={styles.linkedLabel}>Instagram</Text>
              <Text style={styles.linkedStatus}>Not linked</Text>
            </View>
            <TouchableOpacity style={styles.linkedBtn} activeOpacity={0.7}>
              <Text style={styles.linkedBtnText}>Link with Instagram</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Eru Account stats — lifetime + engagement totals */}
        <Text style={styles.sectionHeader}>Eru Account</Text>
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
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.fieldLabel}>Lifetime points</Text>
            <Text style={styles.infoValue}>
              🪙 {Number((user as any)?.lifetimePoints ?? 0).toLocaleString()}
            </Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.fieldLabel}>Current tier</Text>
            <Text style={styles.infoValue}>{String(user?.tier ?? 'explorer')}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.infoRow}>
            <Text style={styles.fieldLabel}>Creator score</Text>
            <Text style={styles.infoValue}>
              {Number(user?.creatorScore ?? 50).toFixed(0)}/100
            </Text>
          </View>
        </View>

        {/* Log out */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        {/* F10.6: Delete Account — destructive action at the very bottom */}
        <TouchableOpacity
          testID="delete-account-btn"
          style={styles.deleteAccountBtn}
          onPress={handleDeleteAccount}
          activeOpacity={0.7}
        >
          <Text style={styles.deleteAccountText}>Delete Account</Text>
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

  // F10.6 — Delete Account (outlined destructive, less prominent than logout)
  deleteAccountBtn: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.red,
    borderRadius: radius.xl,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  deleteAccountText: { fontSize: 16, fontWeight: '600', color: colors.red },

  bottomPad: { height: spacing.xxxl * 2 },

  fieldValue: { textAlign: 'right', color: colors.g500 },

  // F10.2 — Gender radio
  genderRow: {
    flexDirection: 'row',
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  genderChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.g200,
    backgroundColor: colors.bg,
  },
  genderChipSelected: {
    borderColor: colors.navy,
    backgroundColor: colors.navy + '12',
  },
  genderDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.navy,
    marginRight: spacing.xs,
  },
  genderChipText: { fontSize: 14, color: colors.g600 },
  genderChipTextSelected: { color: colors.navy, fontWeight: '600' },

  // F10.3 — Secondary pincodes
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  pincodeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.navy + '15',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  pincodeChipText: { fontSize: 13, color: colors.navy, fontWeight: '600' },
  pincodeChipRemove: { fontSize: 12, color: colors.navy, marginLeft: spacing.xs, opacity: 0.7 },
  pincodeAddInput: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.g700,
    borderWidth: 1,
    borderColor: colors.g200,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pincodeAddInputDisabled: {
    borderColor: colors.g100,
    color: colors.g400,
    backgroundColor: colors.g50,
  },

  // F10.5 — Linked accounts
  linkedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 60,
  },
  linkedInfo: { flex: 1 },
  linkedLabel: { fontSize: 15, color: colors.g900, fontWeight: '500' },
  linkedVerified: { fontSize: 12, color: colors.green, marginTop: 2 },
  linkedStatus: { fontSize: 12, color: colors.g400, marginTop: 2 },
  linkedBtn: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.navy,
  },
  linkedBtnText: { fontSize: 13, color: colors.navy, fontWeight: '600' },

  pickerModalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  pickerModalSheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingBottom: spacing.xxxl,
  },
  pickerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.g100,
  },
  pickerTitle: { fontSize: 15, fontWeight: '600', color: colors.g900 },
  pickerCancelText: { fontSize: 15, color: colors.g500 },
  pickerDoneText: { fontSize: 15, fontWeight: '700', color: colors.navy },
});
