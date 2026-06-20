import { View, Text, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../store/index';

export default function InviteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const token = params.token as string;
  const { acceptInvite, isAuthenticated, isLoading } = useAppStore();
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
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>RebeDari</Text>

        {status === 'loading' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#FF6B9D" />
            <Text style={styles.statusText}>Verificando invitación...</Text>
          </View>
        )}

        {status === 'accepting' && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="large" color="#FF6B9D" />
            <Text style={styles.statusText}>Vinculando con tu pareja...</Text>
          </View>
        )}

        {status === 'success' && (
          <View style={styles.statusContainer}>
            <Text style={styles.successIcon}>✓</Text>
            <Text style={styles.successText}>¡Invitación aceptada!</Text>
            <Text style={styles.subText}>Redirigiendo...</Text>
          </View>
        )}

        {status === 'error' && (
          <View style={styles.statusContainer}>
            <Text style={styles.errorIcon}>✗</Text>
            <Text style={styles.errorText}>{errorMsg}</Text>
            <Text
              style={styles.retryButton}
              onPress={() => {
                setStatus('loading');
                handleAcceptInvite();
              }}
            >
              Reintentar
            </Text>
            <Text
              style={styles.homeButton}
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
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
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
    color: '#FF6B9D',
    textAlign: 'center',
    marginBottom: 40,
  },
  statusContainer: {
    alignItems: 'center',
  },
  statusText: {
    fontSize: 18,
    color: '#333333',
    marginTop: 20,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 60,
    color: '#4CAF50',
    marginBottom: 20,
  },
  successText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginBottom: 10,
  },
  subText: {
    fontSize: 16,
    color: '#666666',
  },
  errorIcon: {
    fontSize: 60,
    color: '#F44336',
    marginBottom: 20,
  },
  errorText: {
    fontSize: 18,
    color: '#F44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    fontSize: 16,
    color: '#FF6B9D',
    fontWeight: '600',
    marginTop: 10,
    textDecorationLine: 'underline',
  },
  homeButton: {
    fontSize: 14,
    color: '#666666',
    marginTop: 15,
    textDecorationLine: 'underline',
  },
});
