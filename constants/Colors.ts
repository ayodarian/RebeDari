export const themeColors = {
  light: {
    background: '#FDF0F3',
    surface: '#FFFFFF',
    surfaceSecondary: '#F5F5F5',
    text: '#1a1a1a',
    textSecondary: 'rgba(0,0,0,0.4)',
    primary: '#E52D7C',
    tabBarBg: '#FDF0F3',
    border: '#F0C0D0',
    bubbleMe: '#FFE4EF',
    bubbleMeBorder: '#E52D7C',
    inputBorder: '#F0C0D0',
  },
  dark: {
    background: '#121214',
    surface: '#1E1E22',
    surfaceSecondary: '#2A2A30',
    text: '#F5E6EA',
    textSecondary: '#A0A0AA',
    primary: '#FFB8D1',
    tabBarBg: '#121214',
    border: '#2A2A30',
    bubbleMe: '#3A3A40',
    bubbleMeBorder: 'transparent',
    inputBorder: '#2A2A30',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export function getColors(isDark: boolean) {
  return isDark ? themeColors.dark : themeColors.light;
}
