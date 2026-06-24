import '../lib/crypto-polyfill';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useAppStore } from '../store/index';
import { useThemeStore } from '../store/useThemeStore';
import { themeColors } from '../constants/Colors';
import { ToastProvider } from './components/Toast';

const AUTH_ROUTES = ['/(auth)', '/(auth)/invite', '/(auth)/verify-email', '/(auth)/reset-password'];

function isAuthRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return AUTH_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isLoading = useAppStore((s) => s.isLoading);

  useEffect(() => {
    const cleanup = checkAuth() as unknown as (() => void) | undefined;
    return () => {
      if (typeof cleanup === 'function') cleanup();
    };
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const tabRoutes = ['/bingo', '/cartas', '/dedos', '/reels', '/perfil', '/(tabs)'];
    const inProtected = tabRoutes.some((r) => pathname === r || pathname.startsWith(r + '/'));
    if (!isAuthenticated && inProtected) {
      router.replace('/(auth)');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  return <>{children}</>;
}

function StatusBarHandler() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  const isDarkMode = useThemeStore((s) => s.isDarkMode);

  const CustomDarkTheme = {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: themeColors.dark.background,
      card: themeColors.dark.background,
      text: themeColors.dark.text,
      border: themeColors.dark.border,
      primary: themeColors.dark.primary,
    },
  };

  const CustomLightTheme = {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: themeColors.light.background,
      card: themeColors.light.background,
      text: themeColors.light.text,
      border: themeColors.light.border,
      primary: themeColors.light.primary,
    },
  };

  return (
    <ThemeProvider value={isDarkMode ? CustomDarkTheme : CustomLightTheme}>
      <SafeAreaProvider>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ToastProvider>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: isDarkMode ? themeColors.dark.background : themeColors.light.background } }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
            </Stack>
          </AuthGuard>
        </ToastProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
