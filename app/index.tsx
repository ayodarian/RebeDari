import { Redirect } from 'expo-router';
import { useAppStore } from '../store/index';
import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  const isAuthenticated = useAppStore((s) => s.isAuthenticated);
  const isLoading = useAppStore((s) => s.isLoading);

  if (isLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: 'rgba(255, 245, 248, 0.95)',
        }}
      >
        <ActivityIndicator size="large" color="#FF6B9D" />
      </View>
    );
  }

  return <Redirect href={isAuthenticated ? '/(tabs)' : '/(auth)'} />;
}
