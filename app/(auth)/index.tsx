import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAppStore } from '../../store/index';
import { PrimaryButton, COLORS } from '../../src/styles/brand';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export default function LoginScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const inviteToken = params.inviteToken as string | undefined;
  const { login, register, recoverPassword, signInWithIdToken } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const inExpoGo = isExpoGo();

  // Google ID Token request
  const [request, response, promptAsync] = Google.useIdTokenAuthRequest({
    clientId: GOOGLE_WEB_CLIENT_ID || undefined,
  });

  useEffect(() => {
    if (response?.type === 'success') {
      const { id_token } = response.params;
      if (id_token) {
        handleGoogleIdToken(id_token);
      }
    }
  }, [response]);

  const handleGoogleIdToken = async (idToken: string) => {
    setIsLoading(true);
    try {
      await signInWithIdToken(idToken);
      if (inviteToken) {
        router.replace({
          pathname: '/(auth)/invite',
          params: { token: inviteToken },
        });
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      console.error('[Login] Google ID token error:', error);
      Alert.alert('Error', error.message || 'No se pudo iniciar sesión con Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor ingresa email y contraseña');
      return;
    }

    setIsLoading(true);
    try {
      await login(email, password);
      if (inviteToken) {
        router.replace({
          pathname: '/(auth)/invite',
          params: { token: inviteToken },
        });
      } else {
        router.replace('/(tabs)');
      }
    } catch (error: any) {
      const err = error as any;
      const msg = err?.message || '';

      if (msg === 'Credenciales inválidas') {
        Alert.alert('Error', 'Correo o contraseña incorrectos');
      } else if (msg === 'Usuario no encontrado') {
        Alert.alert('Error', 'Usuario no encontrado. Verifica tu correo electrónico.');
      } else {
        Alert.alert('Error', msg || 'Hubo un problema al iniciar sesión. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsLoading(true);
    try {
      const result = await register(email, password);
      console.log('[Register] Result from store:', result);

      if (result.requiresVerification) {
        console.log('[Register] Navigating to verify-email with email:', email);
        router.push({
          pathname: '/(auth)/verify-email',
          params: { email, inviteToken: inviteToken || '' },
        });
      } else {
        console.log('[Register] No verification needed, navigating to tabs');
        if (inviteToken) {
          router.replace({
            pathname: '/(auth)/invite',
            params: { token: inviteToken },
          });
        } else {
          router.replace('/(tabs)');
        }
      }
    } catch (error: any) {
      const err = error as any;
      const msg = err?.message || '';

      if (msg === 'YaExiste') {
        Alert.alert('Correo ya registrado', 'Este correo ya tiene una cuenta. Usa "Recuperar contraseña" si olvidaste tu contraseña.');
      } else if (msg.includes('invalid')) {
        Alert.alert('Error', 'Correo electrónico inválido');
      } else if (msg.includes('weak')) {
        Alert.alert('Error', 'La contraseña es muy débil');
      } else {
        Alert.alert('Error', msg || 'Hubo un problema al registrar. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecovery = async () => {
    if (!recoveryEmail) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    setIsLoading(true);
    try {
      await recoverPassword(recoveryEmail);
      router.push({
        pathname: '/(auth)/reset-password',
        params: { email: recoveryEmail },
      });
    } catch (error: any) {
      const msg = error?.message || '';
      if (msg.includes('not found')) {
        Alert.alert('Error', 'Correo no registrado');
      } else {
        Alert.alert('Error', msg || 'No se pudo enviar el correo de recuperación');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (!GOOGLE_WEB_CLIENT_ID) {
      Alert.alert(
        'Configuración requerida',
        'Google OAuth no está configurado.\n\nNecesitas agregar EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID al archivo .env'
      );
      return;
    }
    setIsLoading(true);
    try {
      await promptAsync();
    } catch (error: any) {
      console.error('[Login] Google prompt error:', error);
      Alert.alert('Error', 'No se pudo iniciar sesión con Google');
    } finally {
      setIsLoading(false);
    }
  };

  const showGoogleButton = !inExpoGo && GOOGLE_WEB_CLIENT_ID;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={styles.title}>RebeDari</Text>
        <Text style={styles.subtitle}>
          {recoveryMode
            ? 'Recupera tu cuenta'
            : isRegistering
              ? 'Crear cuenta'
              : 'Iniciar sesión'}
        </Text>

        {recoveryMode ? (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email de recuperación"
              placeholderTextColor="#8E8E93"
              value={recoveryEmail}
              onChangeText={setRecoveryEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {isLoading ? (
              <Pressable style={[styles.button, styles.buttonDisabled]}>
                <ActivityIndicator color="#FFFFFF" />
              </Pressable>
            ) : (
              <PrimaryButton title="Enviar código" onPress={handleRecovery} />
            )}
            <Pressable onPress={() => setRecoveryMode(false)}>
              <Text style={styles.linkText}>Volver a iniciar sesión</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8E8E93"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {isLoading ? (
              <Pressable style={[styles.button, styles.buttonDisabled]}>
                <ActivityIndicator color="#FFFFFF" />
              </Pressable>
            ) : (
              <PrimaryButton title={isRegistering ? 'Crear cuenta' : 'Entrar'} onPress={isRegistering ? handleRegister : handleLogin} />
            )}
            <Pressable onPress={() => setRecoveryMode(true)}>
              <Text style={styles.linkText}>¿Olvidaste tu contraseña?</Text>
            </Pressable>
            <Pressable onPress={() => setIsRegistering(!isRegistering)}>
              <Text style={styles.linkText}>
                {isRegistering
                  ? '¿Ya tienes cuenta? Entrar'
                  : 'Crear nueva cuenta'}
              </Text>
            </Pressable>

            {showGoogleButton && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>o continúa con</Text>
                  <View style={styles.dividerLine} />
                </View>

                <Pressable style={styles.oauthButton} onPress={handleGoogleLogin}>
                  <Text style={styles.oauthButtonText}>G   Google</Text>
                </Pressable>
              </>
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
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5EA',
  },
  dividerText: {
    color: '#8E8E93',
    fontSize: 13,
    marginHorizontal: 12,
  },
  oauthButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  oauthButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
  },
});
