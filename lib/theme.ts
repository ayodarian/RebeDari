export interface Theme {
  background: string;
  surface: string;
  surfaceSecondary: string;
  primary: string;
  primaryLight: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  shadow: string;
  dock: string;
  dockIcon: string;
  input: string;
  inputText: string;
  placeholder: string;
  success: string;
  error: string;
  warning: string;
  headerBg: string;
  headerCapsule: string;
  headerMuted: string;
  primaryDesaturated: string;
  primaryMuted: string;
  badgeBg: string;
}

export const lightTheme: Theme = {
  background: '#FFF5F8',
  surface: '#FFFFFF',
  surfaceSecondary: 'rgba(255,255,255,0.7)',
  primary: '#d4869a',
  primaryLight: 'rgba(212,134,154,0.2)',
  text: '#1c1c1e',
  textSecondary: '#636366',
  textTertiary: '#8e8e93',
  border: '#e5e5ea',
  shadow: '#000000',
  dock: 'rgba(255,220,225,0.85)',
  dockIcon: '#636366',
  input: '#f2f2f7',
  inputText: '#1c1c1e',
  placeholder: '#8e8e93',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  headerBg: '#FFF5F8',
  headerCapsule: '#F0E0E5',
  headerMuted: '#8e8e93',
  primaryDesaturated: '#d4869a',
  primaryMuted: '#c47088',
  badgeBg: 'rgba(255,107,157,0.2)',
};

export const darkTheme: Theme = {
  background: '#1c1c1e',
  surface: '#2c2c2e',
  surfaceSecondary: '#3a3a3c',
  primary: '#c9929e',
  primaryLight: 'rgba(201,146,158,0.25)',
  text: '#e5e5ea',
  textSecondary: '#8e8e93',
  textTertiary: '#636366',
  border: '#3a3a3c',
  shadow: '#000000',
  dock: '#2c2c2e',
  dockIcon: '#636366',
  input: '#3a3a3c',
  inputText: '#e5e5ea',
  placeholder: '#636366',
  success: '#30D158',
  error: '#FF453A',
  warning: '#FF9F0A',
  headerBg: '#1c1c1e',
  headerCapsule: '#141416',
  headerMuted: '#636366',
  primaryDesaturated: '#c9929e',
  primaryMuted: '#8b4a5e',
  badgeBg: 'rgba(255,255,255,0.15)',
};
