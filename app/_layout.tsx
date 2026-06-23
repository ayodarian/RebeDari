import '../lib/crypto-polyfill';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAppStore } from '../store/index';
import { ToastProvider } from './components/Toast';
import { ThemeProvider, useTheme } from './components/ThemeProvider';
import { registerForPushNotifications } from '../lib/notifications';
import * as Linking from 'expo-linking';

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
    useAppStore.getState().checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated && !isAuthRoute(pathname)) {
      router.replace('/(auth)');
    }
  }, [isAuthenticated, isLoading, pathname, router]);

  useEffect(() => {
    if (isAuthenticated) {
      registerForPushNotifications();
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const handleDeepLink = (url: string | null) => {
      if (!url) return;
      const parsed = Linking.parse(url);
      if (parsed.path === 'invite' && typeof parsed.queryParams?.token === 'string') {
        const token = parsed.queryParams.token;
        const auth = useAppStore.getState().isAuthenticated;
        if (auth) {
          router.push({ pathname: '/(auth)/invite', params: { token } });
        } else {
          router.replace({ pathname: '/(auth)', params: { inviteToken: token } });
        }
      }
    };

    const sub = Linking.addEventListener('url', (e) => handleDeepLink(e.url));
    Linking.getInitialURL().then(handleDeepLink);
    return () => sub.remove();
  }, [router]);

  return <>{children}</>;
}

function StatusBarHandler() {
  const { isDark } = useTheme();
  return <StatusBar style={isDark ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBarHandler />
        <ToastProvider>
          <AuthGuard>
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="(auth)" />
            </Stack>
          </AuthGuard>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
