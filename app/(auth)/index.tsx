import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Constants from 'expo-constants';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useAppStore } from '../../store/index';
import { PrimaryButton } from '../../src/styles/brand';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID || '';

function isExpoGo(): boolean {
  return Constants.appOwnership === 'expo';
}

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, recoverPassword, signInWithIdToken } = useAppStore();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const inExpoGo = isExpoGo();

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
      router.replace('/(tabs)');
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
      router.replace('/(tabs)');
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
          params: { email },
        });
      } else {
        console.log('[Register] No verification needed, navigating to tabs');
        router.replace('/(tabs)');
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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>RebeDari</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>
          {recoveryMode
            ? 'Recupera tu cuenta'
            : isRegistering
              ? 'Crear cuenta'
              : 'Iniciar sesión'}
        </Text>

        {recoveryMode ? (
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Email de recuperación"
              placeholderTextColor={colors.textSecondary}
              value={recoveryEmail}
              onChangeText={setRecoveryEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            {isLoading ? (
              <Pressable style={[styles.button, { backgroundColor: colors.primary }]}>
                <ActivityIndicator color="#FFFFFF" />
              </Pressable>
            ) : (
              <PrimaryButton title="Enviar código" onPress={handleRecovery} />
            )}
            <Pressable onPress={() => setRecoveryMode(false)}>
              <Text style={[styles.linkText, { color: colors.primary }]}>Volver a iniciar sesión</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.form}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Email"
              placeholderTextColor={colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
              placeholder="Contraseña"
              placeholderTextColor={colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            {isLoading ? (
              <Pressable style={[styles.button, { backgroundColor: colors.primary }]}>
                <ActivityIndicator color="#FFFFFF" />
              </Pressable>
            ) : (
              <PrimaryButton title={isRegistering ? 'Crear cuenta' : 'Entrar'} onPress={isRegistering ? handleRegister : handleLogin} />
            )}
            <Pressable onPress={() => setRecoveryMode(true)}>
              <Text style={[styles.linkText, { color: colors.primary }]}>¿Olvidaste tu contraseña?</Text>
            </Pressable>

            {showGoogleButton && (
              <>
                <View style={styles.dividerContainer}>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                  <Text style={[styles.dividerText, { color: colors.textSecondary }]}>o continúa con</Text>
                  <View style={[styles.dividerLine, { backgroundColor: colors.border }]} />
                </View>

                <Pressable
                  style={[styles.oauthButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={handleGoogleLogin}
                >
                  <Text style={[styles.oauthButtonText, { color: colors.text }]}>G   Google</Text>
                </Pressable>
              </>
            )}
          </View>
        )}
      </View>

      {!recoveryMode && (
        <Pressable
          onPress={() => setIsRegistering(!isRegistering)}
          style={styles.bottomButton}
        >
          <Text style={[styles.linkText, { color: colors.primary }]}>
            {isRegistering ? '¿Ya tienes cuenta? Entrar' : 'Crear nueva cuenta'}
          </Text>
        </Pressable>
      )}
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
  form: {
    width: '100%',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 15,
  },
  linkText: {
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
  },
  dividerText: {
    fontSize: 13,
    marginHorizontal: 12,
  },
  oauthButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
  },
  oauthButtonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  bottomButton: {
    paddingVertical: 16,
    paddingBottom: 32,
    alignItems: 'center',
  },
});
