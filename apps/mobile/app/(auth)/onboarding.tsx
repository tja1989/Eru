import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { userService } from '../../services/userService';
import { colors, spacing } from '../../constants/theme';

const INTERESTS = ['Food', 'Travel', 'Tech', 'Fitness', 'Film', 'Art', 'Music', 'Fashion', 'Gaming', 'Sports', 'Education', 'Business'];

export default function OnboardingScreen() {
  const router = useRouter();
  const { phone: phoneParam } = useLocalSearchParams<{ phone: string }>();
  const { register: registerUser, setToken } = useAuthStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleInterest = (interest: string) => {
    setSelectedInterests((prev) =>
      prev.includes(interest) ? prev.filter((i) => i !== interest) : [...prev, interest]
    );
  };

  const handleComplete = async () => {
    if (!name || !username || pincode.length !== 6 || selectedInterests.length < 3) {
      return Alert.alert('Please fill all fields and select at least 3 interests');
    }
    setLoading(true);
    try {
      // Use the phone as our stable firebase-style UID during beta.
      // When real Firebase Auth is wired, this becomes auth().currentUser.uid.
      const phone = phoneParam || `+91${Math.random().toString().slice(2, 12)}`;
      const firebaseUid = 'dev-' + phone.replace(/[^0-9]/g, '');

      await registerUser({ firebaseUid, phone, name, username });

      // Update pincode + interests via settings after register
      await userService.updateSettings({
        primaryPincode: pincode,
        interests: selectedInterests.map((i) => i.toLowerCase()),
      }).catch(() => {});

      // Now it's safe to flip auth on — the user exists in the DB and the
      // dev token will validate against it on subsequent requests.
      setToken(firebaseUid);

      // Auth gate in _layout.tsx will redirect to /(tabs) because isAuthenticated flipped.
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error || error.message);
    }
    setLoading(false);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Welcome to Eru</Text>
      <Text style={styles.subtitle}>Let's set up your profile</Text>

      {step === 1 && (
        <>
          <TextInput style={styles.input} placeholder="Your name" value={name} onChangeText={setName} />
          <TextInput style={styles.input} placeholder="Choose a username" value={username} onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))} autoCapitalize="none" />
          <TextInput style={styles.input} placeholder="Your pincode (6 digits)" value={pincode} onChangeText={setPincode} keyboardType="number-pad" maxLength={6} />
          <TouchableOpacity style={styles.button} onPress={() => {
            if (name && username && pincode.length === 6) setStep(2);
            else Alert.alert('Please fill all fields');
          }}>
            <Text style={styles.buttonText}>Next: Pick Interests</Text>
          </TouchableOpacity>
        </>
      )}

      {step === 2 && (
        <>
          <Text style={styles.sectionTitle}>Pick 3 or more interests</Text>
          <View style={styles.interestGrid}>
            {INTERESTS.map((interest) => (
              <TouchableOpacity key={interest} style={[styles.pill, selectedInterests.includes(interest) && styles.pillActive]} onPress={() => toggleInterest(interest)}>
                <Text style={[styles.pillText, selectedInterests.includes(interest) && styles.pillTextActive]}>{interest}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[styles.button, selectedInterests.length < 3 && { opacity: 0.5 }]} onPress={handleComplete} disabled={loading || selectedInterests.length < 3}>
            <Text style={styles.buttonText}>{loading ? 'Setting up...' : 'Start Exploring'}</Text>
          </TouchableOpacity>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg },
  content: { padding: spacing.xl, paddingTop: 80 },
  title: { fontSize: 32, fontWeight: '800', color: colors.g800, textAlign: 'center' },
  subtitle: { fontSize: 16, color: colors.g500, textAlign: 'center', marginBottom: 32, marginTop: 8 },
  sectionTitle: { fontSize: 18, fontWeight: '700', color: colors.g800, marginBottom: 16 },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 16 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  interestGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: colors.g100, borderWidth: 1, borderColor: colors.g200 },
  pillActive: { backgroundColor: colors.blue, borderColor: colors.blue },
  pillText: { fontSize: 14, fontWeight: '600', color: colors.g700 },
  pillTextActive: { color: '#fff' },
});
