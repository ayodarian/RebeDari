import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="index" options={{ title: 'Iniciar Sesión' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Restablecer Contraseña' }} />
      <Stack.Screen name="verify-email" options={{ title: 'Verificar Email' }} />
      <Stack.Screen name="invite" options={{ title: 'Invitación' }} />
    </Stack>
  );
}