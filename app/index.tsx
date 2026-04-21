import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '../store/index';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const { isAuthenticated, isLoading, checkAuth } = useAppStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsubscribe = checkAuth();
    const timer = setTimeout(() => setReady(true), 500);
    return () => {
      unsubscribe?.();
      clearTimeout(timer);
    };
  }, []);

  if (!ready || isLoading) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255, 245, 248, 0.95)' }}><ActivityIndicator size="large" color="#FF6B9D" /></View>;
  }

  if (isAuthenticated) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)" />;
}