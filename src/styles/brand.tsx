import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

export const COLORS = {
  primary: '#d4869a',
  background: 'rgba(255, 245, 248, 0.95)',
};

export function PrimaryButton({ title, onPress, style }: any) {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const disabled = style?.disabled;

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[styles.button, style, { backgroundColor: colors.primary, opacity: disabled ? 0.7 : 1 }]}
    >
      <Text style={styles.text}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  text: { fontSize: 16, fontWeight: '600' },
});

export default PrimaryButton;
