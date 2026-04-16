import React from 'react';
import { View, Image, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - 3) / 3;

export function MediaGrid({ items }: { items: any[] }) {
  return (
    <View style={styles.grid}>
      {items.map((item) => (
        <TouchableOpacity key={item.id}>
          <Image
            source={{ uri: item.media?.[0]?.thumbnailUrl || item.media?.[0]?.originalUrl }}
            style={styles.cell}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 1.5 },
  cell: { width: CELL_SIZE, height: CELL_SIZE, backgroundColor: '#E0E0E0' },
});
