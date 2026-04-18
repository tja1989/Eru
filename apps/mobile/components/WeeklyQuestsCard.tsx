import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { questsService } from '@/services/questsService';
import { QuestRow } from '@/components/QuestRow';

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

export function WeeklyQuestsCard() {
  const [quests, setQuests] = useState<Quest[]>([]);

  useEffect(() => {
    questsService
      .getWeekly()
      .then(setQuests)
      .catch(() => {});
  }, []);

  const completed = quests.filter((q) => q.completed).length;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>🎯 Weekly Quests</Text>
        <Text style={styles.count}>
          {completed}/{quests.length} Complete
        </Text>
      </View>
      {quests.map((q) => (
        <QuestRow key={q.id} quest={q} />
      ))}
      <Text style={styles.bonus}>Bonus: complete all 5 for +50 pts 🎁</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: { fontWeight: '700', fontSize: 15, color: '#262626' },
  count: { fontSize: 12, color: '#10B981', fontWeight: '600' },
  bonus: {
    fontSize: 11,
    color: '#737373',
    marginTop: 8,
    textAlign: 'center',
  },
});
