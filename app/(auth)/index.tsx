import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/index';
import { PrimaryButton, COLORS } from '../styles/brand';

export default function LoginScreen() {
  const router = useRouter();
  const { login, register, recoverPassword } = useAppStore();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

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
      const message = error.message || 'Error desconocido';
      if (message.includes('auth/invalid-email')) {
        Alert.alert('Error', 'Correo electrónico inválido');
      } else if (message.includes('auth/invalid-credential') || message.includes('auth/wrong-password')) {
        Alert.alert('Error', 'Correo o contraseña incorrectos');
      } else if (message.includes('auth/user-not-found')) {
        Alert.alert('Error', 'Usuario no encontrado');
      } else {
        Alert.alert('Error', 'Hubo un problema al iniciar sesión');
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
      await register(email, password);
      router.replace('/(tabs)');
    } catch (error: any) {
      const message = error.message || 'Error desconocido';
      if (message.includes('auth/email-already-in-use')) {
        Alert.alert('Error', 'Este correo ya está registrado');
      } else if (message.includes('auth/invalid-email')) {
        Alert.alert('Error', 'Correo electrónico inválido');
      } else if (message.includes('auth/weak-password')) {
        Alert.alert('Error', 'La contraseña es muy débil');
      } else {
        Alert.alert('Error', 'Hubo un problema al registrar');
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
      Alert.alert('Éxito', 'Revisa tu bandeja de entrada para cambiar tu contraseña');
      setRecoveryMode(false);
    } catch (error: any) {
      const message = error.message || 'Error desconocido';
      if (message.includes('auth/invalid-email')) {
        Alert.alert('Error', 'Correo electrónico inválido');
      } else if (message.includes('auth/user-not-found')) {
        Alert.alert('Error', 'Usuario no encontrado');
      } else {
        Alert.alert('Error', 'No se pudo enviar el correo de recuperación');
      }
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
            <Pressable style={styles.button} onPress={handleRecovery}>
              <Text style={styles.buttonText}>Enviar código</Text>
            </Pressable>
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
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  linkText: {
    color: '#FF6B9D',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 10,
  },
});
