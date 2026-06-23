import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../store/index';
import { useTheme } from '../components/ThemeProvider';
import { PrimaryButton } from '../../src/styles/brand';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { exchangeResetPasswordToken, resetPassword } = useAppStore();
  const { theme } = useTheme();

  const [step, setStep] = useState<'code' | 'password'>('code');
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleVerifyCode = async () => {
    if (!code.trim()) {
      Alert.alert('Error', 'Ingresa el código que recibiste por email');
      return;
    }

    setIsLoading(true);
    try {
      const data = await exchangeResetPasswordToken(email || '', code.trim());
      const otp = data?.otp || data?.resetToken || data?.token || data?.access_token || '';
      if (!otp) {
        console.error('[ResetPassword] No token in response:', data);
        throw new Error('No se pudo verificar el código');
      }
      setResetToken(otp);
      setStep('password');
    } catch (error: any) {
      console.error('[ResetPassword] Verify error:', error);
      Alert.alert('Error', error.message || 'Código inválido o expirado');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword) {
      Alert.alert('Error', 'Ingresa la nueva contraseña');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(resetToken, newPassword);
      Alert.alert(
        'Éxito',
        'Tu contraseña ha sido restablecida correctamente',
        [{ text: 'OK', onPress: () => router.replace('/(auth)') }]
      );
    } catch (error: any) {
      console.error('[ResetPassword] Reset error:', error);
      Alert.alert('Error', error.message || 'No se pudo restablecer la contraseña');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: theme.primary }]}>RebeDari</Text>
        <Text style={[styles.subtitle, { color: theme.text }]}>
          {step === 'code' ? 'Verificar código' : 'Nueva contraseña'}
        </Text>

        {step === 'code' ? (
          <View style={styles.form}>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Ingresa el código de 6 dígitos que enviamos a{'\n'}
              <Text style={[styles.email, { color: theme.text }]}>{email}</Text>
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
              placeholder="Código de verificación"
              placeholderTextColor={theme.placeholder}
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
              <PrimaryButton title="Verificar código" onPress={handleVerifyCode} />
            )}
            <Pressable onPress={() => router.back()}>
              <Text style={[styles.linkText, { color: theme.primary }]}>Volver a iniciar sesión</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <Text style={[styles.description, { color: theme.textSecondary }]}>
              Ingresa tu nueva contraseña
            </Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
              placeholder="Nueva contraseña"
              placeholderTextColor={theme.placeholder}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              autoFocus
            />
            <TextInput
              style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
              placeholder="Confirmar contraseña"
              placeholderTextColor={theme.placeholder}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            {isLoading ? (
              <Pressable style={[styles.button, styles.buttonDisabled]}>
                <ActivityIndicator color="#FFFFFF" />
              </Pressable>
            ) : (
              <PrimaryButton title="Restablecer contraseña" onPress={handleResetPassword} />
            )}
          </View>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 40,
  },
  description: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  email: {
    fontWeight: '600',
  },
  form: {
    width: '100%',
  },
  input: {
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
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
});
