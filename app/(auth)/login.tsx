import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [recoveryEmail, setRecoveryEmail] = useState('');

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor ingresa usuario y contraseña');
      return;
    }

    try {
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : {};
      
      const user = users[username];
      if (user && user.password === password) {
        await AsyncStorage.setItem('currentUser', JSON.stringify(user));
        router.replace('/(tabs)');
      } else {
        Alert.alert('Error', 'Usuario o contraseña incorrectos');
      }
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al iniciar sesión');
    }
  };

  const handleRegister = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    if (password.length < 4) {
      Alert.alert('Error', 'La contraseña debe tener al menos 4 caracteres');
      return;
    }

    try {
      const usersData = await AsyncStorage.getItem('users');
      const users = usersData ? JSON.parse(usersData) : {};
      
      if (users[username]) {
        Alert.alert('Error', 'Este usuario ya existe');
        return;
      }

      const userCount = Object.keys(users).length;
      if (userCount >= 2) {
        Alert.alert('Error', 'Solo se permiten 2 usuarios');
        return;
      }

      const newUser = { id: Date.now().toString(), username, password, nombre: username };
      users[username] = newUser;
      
      await AsyncStorage.setItem('users', JSON.stringify(users));
      await AsyncStorage.setItem('currentUser', JSON.stringify(newUser));
      
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Hubo un problema al registrar');
    }
  };

  const handleRecovery = async () => {
    if (!recoveryEmail) {
      Alert.alert('Error', 'Por favor ingresa tu email');
      return;
    }

    Alert.alert('Recuperación', 'Se ha enviado un código de recuperación a tu email');
    setRecoveryMode(false);
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
              placeholder="Usuario"
              placeholderTextColor="#8E8E93"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Contraseña"
              placeholderTextColor="#8E8E93"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
            <Pressable 
              style={styles.button} 
              onPress={isRegistering ? handleRegister : handleLogin}
            >
              <Text style={styles.buttonText}>
                {isRegistering ? 'Crear cuenta' : 'Entrar'}
              </Text>
            </Pressable>
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
    backgroundColor: '#FFFFFF',
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