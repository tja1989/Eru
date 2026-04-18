import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import pollService from '../services/pollService';
import { colors, spacing, radius } from '../constants/theme';

interface PollOption {
  id: string;
  text: string;
  voteCount: number;
}

interface PollCardProps {
  contentId: string;
  question: string;
  pollOptions: PollOption[];
  userVote: string | null;
}

export function PollCard({ contentId, question, pollOptions, userVote: initialUserVote }: PollCardProps) {
  const [options, setOptions] = useState<PollOption[]>(pollOptions);
  const [userVote, setUserVote] = useState<string | null>(initialUserVote);

  const totalVotes = options.reduce((sum, o) => sum + o.voteCount, 0);

  // One Animated.Value per option, keyed by option.id
  const animatedWidths = useRef<Record<string, Animated.Value>>({});
  options.forEach((o) => {
    if (!animatedWidths.current[o.id]) {
      const pct = totalVotes === 0 ? 0 : Math.round((o.voteCount / totalVotes) * 100);
      animatedWidths.current[o.id] = new Animated.Value(pct);
    }
  });

  // Whenever options or totalVotes change, animate each bar to its new %
  useEffect(() => {
    const total = options.reduce((sum, o) => sum + o.voteCount, 0);
    const animations = options.map((o) => {
      const pct = total === 0 ? 0 : Math.round((o.voteCount / total) * 100);
      return Animated.timing(animatedWidths.current[o.id], {
        toValue: pct,
        duration: 300,
        useNativeDriver: false,
      });
    });
    Animated.parallel(animations).start();
  }, [options]);

  const handleVote = async (optionId: string) => {
    // Idempotent: tapping the already-voted option is a no-op
    if (userVote === optionId) return;

    // Save previous state for rollback
    const prevOptions = options;
    const prevUserVote = userVote;

    // Optimistic update
    const nextOptions = options.map((o) => {
      if (o.id === optionId) return { ...o, voteCount: o.voteCount + 1 };
      if (o.id === prevUserVote) return { ...o, voteCount: Math.max(0, o.voteCount - 1) };
      return o;
    });
    setOptions(nextOptions);
    setUserVote(optionId);

    try {
      await pollService.vote(contentId, optionId);
    } catch {
      // Rollback on error
      setOptions(prevOptions);
      setUserVote(prevUserVote);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>

      {options.map((option) => {
        const pct = totalVotes === 0 ? 0 : Math.round((option.voteCount / totalVotes) * 100);
        const isSelected = userVote === option.id;

        return (
          <TouchableOpacity
            key={option.id}
            onPress={() => handleVote(option.id)}
            activeOpacity={0.75}
            style={styles.optionWrap}
          >
            {/* Background fill bar — animated width */}
            <View style={styles.barBackground}>
              <Animated.View
                style={[
                  styles.barFill,
                  {
                    width: animatedWidths.current[option.id].interpolate({
                      inputRange: [0, 100],
                      outputRange: ['0%', '100%'],
                    }),
                    backgroundColor: isSelected ? colors.blue + '33' : colors.g100,
                  },
                ]}
              />
            </View>

            {/* Option text + percentage overlay */}
            <View style={styles.optionContent}>
              <View style={styles.optionLeft}>
                {isSelected && (
                  <Text
                    accessibilityLabel="Your vote"
                    style={styles.checkmark}
                  >
                    ✓
                  </Text>
                )}
                <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                  {option.text}
                </Text>
              </View>
              <Text style={[styles.pctText, isSelected && styles.pctTextSelected]}>{pct}%</Text>
            </View>
          </TouchableOpacity>
        );
      })}

      <Text style={styles.totalVotes}>
        {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  question: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.g900,
    marginBottom: spacing.xs,
  },
  optionWrap: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.g200,
    overflow: 'hidden',
    minHeight: 44,
    justifyContent: 'center',
  },
  barBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  barFill: {
    height: '100%',
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    flex: 1,
  },
  checkmark: {
    fontSize: 13,
    color: colors.blue,
    fontWeight: '700',
  },
  optionText: {
    fontSize: 14,
    color: colors.g800,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: '600',
    color: colors.g900,
  },
  pctText: {
    fontSize: 13,
    color: colors.g500,
    fontWeight: '600',
    minWidth: 36,
    textAlign: 'right',
  },
  pctTextSelected: {
    color: colors.blue,
  },
  totalVotes: {
    fontSize: 12,
    color: colors.g400,
    marginTop: spacing.xs,
  },
});
