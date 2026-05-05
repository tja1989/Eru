import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

type Quest = {
  id: string;
  title: string;
  description: string | null;
  actionType: string;
  targetCount: number;
  rewardPoints: number;
  currentCount: number;
  completed: boolean;
};

export function QuestRow({ quest }: { quest: Quest }) {
  const pct = Math.min(
    100,
    Math.round((quest.currentCount / quest.targetCount) * 100),
  );
  return (
    <View style={styles.row}>
      <View style={{ flex: 1 }}>
        <Text style={styles.title}>{quest.title}</Text>
        <Text style={styles.progress}>
          {quest.currentCount}/{quest.targetCount}
        </Text>
        <View style={styles.barWrap}>
          <View
            testID="progress-fill"
            style={{
              ...styles.barFill,
              width: `${pct}%`,
              backgroundColor: quest.completed ? '#10B981' : '#1A3C6E',
            }}
          />
        </View>
      </View>
      <Text style={styles.reward}>+{quest.rewardPoints} pts</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', padding: 12, alignItems: 'center' },
  title: { fontWeight: '600', color: '#262626' },
  progress: { fontSize: 12, color: '#737373', marginTop: 2 },
  barWrap: {
    height: 6,
    backgroundColor: '#F0F0F0',
    borderRadius: 3,
    marginTop: 6,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  reward: { marginLeft: 12, color: '#E8792B', fontWeight: '700' },
});
