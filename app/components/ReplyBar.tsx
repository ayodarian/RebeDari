import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import type { ChatMessage } from '../../store/useChatStore';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

interface ReplyBarProps {
  replyTo: ChatMessage;
  onCancel: () => void;
}

export default function ReplyBar({ replyTo, onCancel }: ReplyBarProps) {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 200 });
    translateY.value = withTiming(0, { duration: 200 });
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  const snippet = replyTo.content
    || (replyTo.media_type ? `[${replyTo.media_type === 'image' ? 'Foto' : replyTo.media_type === 'video' ? 'Video' : replyTo.media_type === 'audio' ? 'Audio' : 'Archivo'}]` : '...');

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: colors.background, borderTopColor: colors.inputBorder },
        animStyle,
      ]}
    >
      <View style={[styles.bar, { backgroundColor: colors.primary }]} />
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.primary }]}>Respondiendo a</Text>
        <Text style={[styles.snippet, { color: colors.text }]} numberOfLines={1}>{snippet}</Text>
      </View>
      <Pressable onPress={onCancel} style={styles.closeButton} hitSlop={10}>
        <Text style={[styles.closeIcon, { color: colors.textSecondary }]}>✕</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 10,
  },
  bar: {
    width: 3,
    alignSelf: 'stretch',
    borderRadius: 2,
  },
  content: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
  },
  snippet: {
    fontSize: 14,
    marginTop: 2,
  },
  closeButton: {
    padding: 6,
  },
  closeIcon: {
    fontSize: 18,
  },
});
