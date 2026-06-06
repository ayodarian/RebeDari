import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';

export const COLORS = {
  primary: '#FF6B9D',
  background: 'rgba(255, 245, 248, 0.95)',
};

export function PrimaryButton({ title, onPress, style }: any) {
  return (
    <Pressable onPress={onPress} style={[styles.button, style]}>
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  text: { color: '#fff', fontSize: 16, fontWeight: '600' },
});

export default PrimaryButton;
