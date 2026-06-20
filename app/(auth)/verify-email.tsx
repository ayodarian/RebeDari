import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../store/index';
import { PrimaryButton, COLORS } from '../../src/styles/brand';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail } = useAppStore();

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerify = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Ingresa el código que recibiste por email');
      return;
    }

    if (code.length !== 6) {
      Alert.alert('Error', 'El código debe tener 6 dígitos');
      return;
    }

    setIsLoading(true);
    try {
      await verifyEmail(email || '', code.trim());
      router.replace('/(tabs)');
    } catch (error: any) {
      console.error('[VerifyEmail] Error:', error);
      Alert.alert('Error', error.message || 'Código inválido o expirado');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>RebeDari</Text>
        <Text style={styles.subtitle}>Verificar email</Text>

        <View style={styles.form}>
          <Text style={styles.description}>
            Ingresa el código de 6 dígitos que enviamos a{'\n'}
            <Text style={styles.email}>{email}</Text>
          </Text>
          <TextInput
            style={styles.input}
            placeholder="Código de verificación"
            placeholderTextColor="#8E8E93"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
          />
          {isLoading ? (
            <Pressable style={[styles.button, styles.buttonDisabled]}>
              <ActivityIndicator color="#FFFFFF" />
            </Pressable>
          ) : (
            <PrimaryButton title="Verificar email" onPress={handleVerify} />
          )}
          <Pressable onPress={() => router.back()}>
            <Text style={styles.linkText}>Volver</Text>
          </Pressable>
        </View>
      </View>
    </KeyboardAvoidingView>
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
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FF6B9D',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    color: '#000000',
    textAlign: 'center',
    marginBottom: 40,
  },
  description: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  email: {
    fontWeight: '600',
    color: '#333333',
  },
  form: {
    width: '100%',
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  linkText: {
    color: '#FF6B9D',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
});
