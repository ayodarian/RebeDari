import React from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#FF6B9D',
  primaryLight: '#FFB6C1',
  accent: '#90EE90',
  background: 'rgba(255, 245, 248, 0.95)',
  textMuted: '#8E8E93',
};

export function PrimaryButton({ title, onPress, style }: { title: string; onPress?: () => void; style?: any }) {
  return (
    <Pressable style={[styles.button, style]} onPress={onPress}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
});

export default null;
