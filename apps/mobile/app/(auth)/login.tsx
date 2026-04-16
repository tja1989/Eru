import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { setAuthToken } from '../../services/api';
import { colors, spacing } from '../../constants/theme';

export default function LoginScreen() {
  const router = useRouter();
  const { setToken, setUser } = useAuthStore();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!phone || phone.length < 10) return Alert.alert('Enter a valid phone number');
    setLoading(true);
    try {
      // For beta: mock authentication
      // In production: use Firebase phone auth
      const mockToken = 'dev-token-' + Date.now();
      setToken(mockToken);
      router.replace('/(auth)/onboarding');
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
    setLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.logo}>Eru</Text>
      <Text style={styles.subtitle}>Your attention has value</Text>
      <TextInput
        style={styles.input}
        placeholder="Phone number (e.g., 9876543210)"
        keyboardType="phone-pad"
        value={phone}
        onChangeText={setPhone}
        maxLength={15}
      />
      <TouchableOpacity style={styles.button} onPress={handleLogin} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? 'Signing in...' : 'Continue'}</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.googleButton}>
        <Text style={styles.googleText}>Sign in with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg, justifyContent: 'center', padding: spacing.xl },
  logo: { fontSize: 48, fontWeight: '800', fontStyle: 'italic', color: colors.g800, textAlign: 'center', fontFamily: 'Georgia' },
  subtitle: { fontSize: 16, color: colors.g500, textAlign: 'center', marginBottom: 40, marginTop: 8 },
  input: { borderWidth: 1, borderColor: colors.g200, borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 12, backgroundColor: '#fff' },
  button: { backgroundColor: colors.blue, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 12 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  googleButton: { borderWidth: 1, borderColor: colors.g200, borderRadius: 12, padding: 16, alignItems: 'center' },
  googleText: { fontSize: 16, fontWeight: '600', color: colors.g700 },
});
