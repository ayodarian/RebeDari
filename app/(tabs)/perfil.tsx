import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import * as Sharing from 'expo-sharing';
import { useAppStore } from '../../store/index';
import { PrimaryButton } from '../../src/styles/brand';

export default function ProfileScreen() {
  const { user, partnerId, sessionId, createInvite, leaveSession } = useAppStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [inviteToken, setInviteToken] = useState<string | null>(null);

  const handleGenerateInvite = async () => {
    setIsGenerating(true);
    try {
      const token = await createInvite();
      setInviteToken(token);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo generar la invitación');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareInvite = async () => {
    if (!inviteToken) return;
    const link = `rebedari://invite/${inviteToken}`;
    try {
      await Sharing.shareAsync(link);
    } catch (error) {
      Alert.alert('Error', 'No se pudo compartir el link');
    }
  };

  const handleLeaveSession = async () => {
    Alert.alert(
      'Desvincular pareja',
      '¿Estás seguro? Esto eliminará la conexión con tu pareja.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Desvincular',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveSession();
              setInviteToken(null);
              Alert.alert('Listo', 'Te has desvinculado de tu pareja');
            } catch (error: any) {
              Alert.alert('Error', error.message || 'No se pudo desvincular');
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Mi Perfil</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Mi email</Text>
          <Text style={styles.value}>{user?.email || 'No disponible'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Mi ID</Text>
          <Text style={styles.valueSmall}>{user?.id || 'No disponible'}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Sesión</Text>
          <Text style={styles.value}>{sessionId || 'Sin sesión'}</Text>
        </View>

        {partnerId ? (
          <View style={styles.card}>
            <Text style={styles.label}>Pareja vinculada</Text>
            <Text style={styles.value}>{partnerId}</Text>
            <Pressable style={styles.leaveButton} onPress={handleLeaveSession}>
              <Text style={styles.leaveButtonText}>Desvincular pareja</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.label}>Vincular pareja</Text>
            <Text style={styles.description}>
              Genera un link de invitación y compártelo con tu pareja para vincular sus cuentas.
            </Text>

            {inviteToken ? (
              <View style={styles.inviteContainer}>
                <Text style={styles.inviteToken}>{inviteToken}</Text>
                <Text style={styles.inviteLink}>rebedari://invite/{inviteToken}</Text>
                <Pressable style={styles.shareButton} onPress={handleShareInvite}>
                  <Text style={styles.shareButtonText}>Compartir link</Text>
                </Pressable>
                <Pressable
                  style={styles.newInviteButton}
                  onPress={handleGenerateInvite}
                  disabled={isGenerating}
                >
                  <Text style={styles.newInviteButtonText}>Generar nuevo link</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable
                style={styles.generateButton}
                onPress={handleGenerateInvite}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.generateButtonText}>Generar link de invitación</Text>
                )}
              </Pressable>
            )}
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
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B9D',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  value: {
    fontSize: 16,
    color: '#333333',
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 12,
    color: '#333333',
    fontFamily: 'monospace',
  },
  description: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 16,
    lineHeight: 20,
  },
  generateButton: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  inviteContainer: {
    alignItems: 'center',
    marginTop: 8,
  },
  inviteToken: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FF6B9D',
    letterSpacing: 4,
    marginBottom: 8,
  },
  inviteLink: {
    fontSize: 12,
    color: '#666666',
    fontFamily: 'monospace',
    marginBottom: 16,
    textAlign: 'center',
  },
  shareButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
    marginBottom: 12,
    width: '100%',
  },
  shareButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  newInviteButton: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    width: '100%',
  },
  newInviteButtonText: {
    color: '#FF6B9D',
    fontSize: 14,
    fontWeight: '500',
  },
  leaveButton: {
    backgroundColor: '#F44336',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  leaveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
