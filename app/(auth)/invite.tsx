import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../store/index';
import { useTheme } from '../components/ThemeProvider';

export default function InviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token as string;
  const { acceptInvite, isAuthenticated, isLoading } = useAppStore();
  const { theme } = useTheme();
  const [status, setStatus] = useState<'loading' | 'accepting' | 'error' | 'success'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace({
        pathname: '/(auth)',
        params: { inviteToken: token },
      });
      return;
    }

    handleAcceptInvite();
  }, [isLoading, isAuthenticated]);

  const handleAcceptInvite = async () => {
    if (!token) {
      setStatus('error');
      setErrorMsg('Token de invitación no válido');
      return;
    }

    setStatus('accepting');
    try {
      await acceptInvite(token);
      setStatus('success');
      setTimeout(() => {
        router.replace('/(tabs)');
      }, 1500);
    } catch (error: any) {
      setStatus('error');
      setErrorMsg(error.message || 'Error al aceptar la invitación');
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.primary }]}>RebeDari</Text>

        {status === 'loading' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.statusText, { color: theme.text }]}>Verificando invitación...</Text>
          </View>
        )}

        {status === 'accepting' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.statusText, { color: theme.text }]}>Vinculando con tu pareja...</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.statusContainer}>
            <Text style={[styles.successIcon, { color: theme.success }]}>✓</Text>
            <Text style={[styles.successText, { color: theme.success }]}>¡Invitación aceptada!</Text>
            <Text style={[styles.subText, { color: theme.textSecondary }]}>Redirigiendo...</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusContainer}>
            <Text style={[styles.errorIcon, { color: theme.error }]}>✗</Text>
            <Text style={[styles.errorText, { color: theme.error }]}>{errorMsg}</Text>
            <Text
              style={[styles.retryButton, { color: theme.primary }]}
              onPress={() => {
                setStatus('loading');
                handleAcceptInvite();
              }}
            >
              Reintentar
            </Text>
            <Text
              style={[styles.homeButton, { color: theme.textSecondary }]}
              onPress={() => router.replace('/(tabs)')}
            >
              Ir al inicio
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 40,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    marginTop: 20,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  successText: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
  },
  errorIcon: {
    fontSize: 60,
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  homeButton: {
    fontSize: 14,
    marginTop: 15,
    textDecorationLine: 'underline',
  },
});
