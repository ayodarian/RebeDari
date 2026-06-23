import { View, Text, StyleSheet, Pressable, Alert, ActivityIndicator, TextInput, ScrollView, Image, Switch } from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../store/index';
import { getClient } from '../../lib/insforge';
import { uploadFile } from '../../lib/storage';
import { useTheme } from '../components/ThemeProvider';
import { BackupPanel } from '../components/BackupPanel';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, updateProfile } = useAppStore();
  const { theme, isDark, toggleTheme } = useTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [editNombre, setEditNombre] = useState(user?.nombre || '');
  const [editEmail, setEditEmail] = useState(user?.email || '');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const handlePickAvatar = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tus fotos para cambiar tu avatar');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const image = result.assets[0];
      setIsUploadingAvatar(true);
      try {
        const fileExt = image.uri.split('.').pop() || 'jpg';
        const fileName = `avatar_${user?.id}_${Date.now()}.${fileExt}`;
        const path = `avatars/${fileName}`;

        const avatarUrl = await uploadFile(image.uri, path);
        await updateProfile({ avatarUrl });
        Alert.alert('Éxito', 'Avatar actualizado');
      } catch (error: any) {
        Alert.alert('Error', error.message || 'No se pudo subir el avatar');
      } finally {
        setIsUploadingAvatar(false);
      }
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      await updateProfile({
        nombre: editNombre,
        email: editEmail,
      });
      setIsEditing(false);
      Alert.alert('Éxito', 'Perfil actualizado');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'No se pudo actualizar el perfil');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar sesión',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)');
          },
        },
      ]
    );
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <Pressable onPress={handlePickAvatar} disabled={isUploadingAvatar} style={[styles.avatarContainer, { backgroundColor: theme.primary }]}>
          {isUploadingAvatar ? (
            <ActivityIndicator size="large" color={theme.text} />
          ) : user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary }]}>
              <Text style={styles.avatarInitials}>
                {user?.nombre ? getInitials(user.nombre) : '?'}
              </Text>
            </View>
          )}
          <View style={[styles.cameraIcon, { backgroundColor: theme.surface, borderColor: theme.primary }]}>
            <Text style={styles.cameraIconText}>📷</Text>
          </View>
        </Pressable>
        <Text style={[styles.avatarHint, { color: theme.textSecondary }]}>Toca para cambiar foto</Text>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Información personal</Text>
        
        {isEditing ? (
          <>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Nombre</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
                value={editNombre}
                onChangeText={setEditNombre}
                placeholder="Tu nombre"
                placeholderTextColor={theme.placeholder}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.input, color: theme.inputText }]}
                value={editEmail}
                onChangeText={setEditEmail}
                placeholder="tu@email.com"
                placeholderTextColor={theme.placeholder}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>
            <View style={styles.buttonRow}>
              <Pressable
                style={[styles.button, styles.cancelButton, { backgroundColor: theme.surfaceSecondary }]}
                onPress={() => {
                  setIsEditing(false);
                  setEditNombre(user?.nombre || '');
                  setEditEmail(user?.email || '');
                }}
              >
                <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>Cancelar</Text>
              </Pressable>
              <Pressable
                style={[styles.button, styles.saveButton, { backgroundColor: theme.primary }]}
                onPress={handleSaveProfile}
                disabled={isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator color={theme.text} />
                ) : (
                  <Text style={[styles.saveButtonText, { color: theme.text }]}>Guardar</Text>
                )}
              </Pressable>
            </View>
          </>
        ) : (
          <>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Nombre</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{user?.nombre || 'No definido'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>Email</Text>
              <Text style={[styles.infoValue, { color: theme.text }]}>{user?.email || 'No disponible'}</Text>
            </View>
            <Pressable style={[styles.editButton, { backgroundColor: theme.primary }]} onPress={() => setIsEditing(true)}>
              <Text style={[styles.editButtonText, { color: theme.text }]}>Editar perfil</Text>
            </Pressable>
          </>
        )}
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Text style={[styles.sectionTitle, { color: theme.primary }]}>Apariencia</Text>
        <View style={styles.themeToggleRow}>
          <View style={styles.themeToggleInfo}>
            <Text style={[styles.themeToggleLabel, { color: theme.text }]}>Modo oscuro</Text>
            <Text style={[styles.themeToggleDescription, { color: theme.textSecondary }]}>
              {isDark ? 'Activado' : 'Desactivado'}
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.border, true: theme.primaryLight }}
            thumbColor={isDark ? theme.primary : '#FFFFFF'}
          />
        </View>
      </View>

      <View style={[styles.section, { backgroundColor: theme.surface }]}>
        <Pressable style={[styles.logoutButton, { backgroundColor: theme.error }]} onPress={handleLogout}>
          <Text style={[styles.logoutButtonText, { color: theme.text }]}>Cerrar sesión</Text>
        </Pressable>
      </View>

      <BackupPanel />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInitials: {
    color: '#FFFFFF',
    fontSize: 48,
    fontWeight: 'bold',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  cameraIconText: {
    fontSize: 18,
  },
  avatarHint: {
    marginTop: 8,
    fontSize: 12,
  },
  section: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  infoRow: {
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    marginBottom: 6,
  },
  input: {
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  cancelButton: {},
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {},
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  editButton: {
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  editButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  logoutButton: {
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeToggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeToggleInfo: {
    flex: 1,
  },
  themeToggleLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeToggleDescription: {
    fontSize: 14,
  },
});
