import { View, Text, StyleSheet, TextInput, Pressable, Alert, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useAppStore } from '../../store/index';
import { PrimaryButton } from '../../src/styles/brand';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

export default function VerifyEmailScreen() {
  const router = useRouter();
  const { email } = useLocalSearchParams<{ email: string }>();
  const { verifyEmail } = useAppStore();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);

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
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.primary }]}>RebeDari</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Verificar email</Text>

        <View style={styles.form}>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Ingresa el código de 6 dígitos que enviamos a{'\n'}
            <Text style={[styles.email, { color: colors.text }]}>{email}</Text>
          </Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholder="Código de verificación"
            placeholderTextColor={colors.textSecondary}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            textContentType="oneTimeCode"
          />
          {isLoading ? (
            <Pressable style={[styles.button, { backgroundColor: colors.primary }]}>
              <ActivityIndicator color="#FFFFFF" />
            </Pressable>
          ) : (
            <PrimaryButton title="Verificar email" onPress={handleVerify} />
          )}
          <Pressable onPress={() => router.back()}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Volver</Text>
          </Pressable>
        </View>
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
    borderWidth: 1,
    paddingHorizontal: 15,
    paddingVertical: 15,
    fontSize: 16,
    marginBottom: 15,
    textAlign: 'center',
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
});
