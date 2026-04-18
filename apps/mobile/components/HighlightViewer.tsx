import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { Highlight, HighlightItem } from '@/services/highlightsService';
import { colors, spacing, radius } from '@/constants/theme';

interface Props {
  visible: boolean;
  onClose: () => void;
  highlight: Highlight;
  items: HighlightItem[];
}

export function HighlightViewer({ visible, onClose, highlight, items }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const goNext = () => {
    if (currentIndex < items.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex((i) => i - 1);
    }
  };

  const currentItem = items[currentIndex] ?? null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container}>
        {/* Top bar */}
        <View style={styles.topBar}>
          <Text style={styles.highlightTitle} testID="viewer-title">
            {highlight.emoji}{' '}
            <Text>{highlight.title}</Text>
          </Text>
          <TouchableOpacity testID="viewer-close" onPress={onClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

        {/* Item counter */}
        {items.length > 0 && (
          <Text style={styles.counter}>
            {currentIndex + 1} / {items.length}
          </Text>
        )}

        {/* Content area */}
        <View style={styles.contentArea}>
          {items.length === 0 ? (
            <Text style={styles.emptyText}>No items in this highlight</Text>
          ) : (
            <>
              {/* Placeholder content card — renders caption or type label */}
              <View style={styles.contentCard}>
                <Text style={styles.contentType}>
                  {currentItem?.content?.type?.toUpperCase() ?? 'POST'}
                </Text>
                {currentItem?.content?.caption ? (
                  <Text style={styles.caption}>{currentItem.content.caption}</Text>
                ) : null}
              </View>

              {/* Navigation row */}
              <View style={styles.navRow}>
                <TouchableOpacity
                  testID="viewer-prev"
                  style={[styles.navBtn, currentIndex === 0 && styles.navBtnDisabled]}
                  onPress={goPrev}
                  disabled={currentIndex === 0}
                >
                  <Text style={styles.navBtnText}>‹ Prev</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  testID="viewer-next"
                  style={[styles.navBtn, currentIndex === items.length - 1 && styles.navBtnDisabled]}
                  onPress={goNext}
                  disabled={currentIndex === items.length - 1}
                >
                  <Text style={styles.navBtnText}>Next ›</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.g900,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  highlightTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
  },
  counter: {
    textAlign: 'center',
    fontSize: 13,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.sm,
  },
  contentArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.5)',
  },
  contentCard: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    marginBottom: spacing.xxl,
    minHeight: 200,
    justifyContent: 'center',
  },
  contentType: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.4)',
    letterSpacing: 1.5,
    marginBottom: spacing.sm,
  },
  caption: {
    fontSize: 16,
    color: '#fff',
    textAlign: 'center',
    lineHeight: 24,
  },
  navRow: {
    flexDirection: 'row',
    gap: spacing.xl,
  },
  navBtn: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: radius.full,
  },
  navBtnDisabled: {
    opacity: 0.3,
  },
  navBtnText: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '600',
  },
});
