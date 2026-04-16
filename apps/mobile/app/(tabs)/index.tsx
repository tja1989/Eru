import { View, Text, StyleSheet } from 'react-native';

export default function HomeFeedScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Home Feed — coming in Task 8</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FAFAFA' },
  text: { fontSize: 16, color: '#737373' },
});
