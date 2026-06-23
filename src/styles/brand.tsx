import React from 'react';
import { Pressable, Text, StyleSheet } from 'react-native';
import { useTheme } from '../../app/components/ThemeProvider';

export const COLORS = {
  primary: '#d4869a',
  background: 'rgba(255, 245, 248, 0.95)',
};

export function PrimaryButton({ title, onPress, style }: any) {
  const { theme } = useTheme();
  return (
    <Pressable onPress={onPress} style={[styles.button, { backgroundColor: theme.primary }, style]}>
      <Text style={[styles.text, { color: theme.text }]}>{title}</Text>
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
