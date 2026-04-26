import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useRouter, usePathname } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ToastProvider } from './components/Toast';

function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!auth) {
      // Si auth no está inicializado, no intentamos suscribirnos y permitimos acceso a auth route
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && pathname !== '/(auth)') {
        router.replace('/(auth)');
      }
    });
    return () => unsubscribe();
  }, [pathname]);

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
