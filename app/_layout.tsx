import '../lib/crypto-polyfill';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { useAppStore } from '../store/index';
import { ToastProvider } from './components/Toast';
import * as Linking from 'expo-linking';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isLoading = useAppStore((s) => s.isLoading);
  const checkAuth = useAppStore((s) => s.checkAuth);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isLoading) return;
    
    const tabRoutes = ['/bingo', '/cartas', '/dedos', '/reels', '/perfil'];
    if (!isAuthenticated && tabRoutes.includes(pathname)) {
      router.replace('/(auth)');
    }
  }, [isAuthenticated, isLoading, pathname]);

  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const { url } = event;
      const parsed = Linking.parse(url);

      if (parsed.path === 'invite' && parsed.queryParams?.token) {
        const token = parsed.queryParams.token as string;
        if (isAuthenticated) {
          router.push({
            pathname: '/(auth)/invite',
            params: { token },
          });
        } else {
          router.replace({
            pathname: '/(auth)',
            params: { inviteToken: token },
          });
        }
      }
    };

    const subscription = Linking.addEventListener('url', handleDeepLink);

    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated]);

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" />
      <ToastProvider>
        <AuthGuard>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
          </Stack>
        </AuthGuard>
      </ToastProvider>
    </SafeAreaProvider>
  );
}
