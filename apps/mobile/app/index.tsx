import { View, Text, StyleSheet } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Eru</Text>
      <Text style={styles.subtitle}>Your attention has value</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  title: { fontSize: 48, fontWeight: '800', fontStyle: 'italic', color: '#262626' },
  subtitle: { fontSize: 16, color: '#737373', marginTop: 8 },
});
