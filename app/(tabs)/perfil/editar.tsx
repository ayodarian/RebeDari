import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useAppStore } from '../../../store/index';
import { useThemeStore } from '../../../store/useThemeStore';
import { getColors } from '../../../constants/Colors';
import { getClient } from '../../../lib/insforge';

export default function EditProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAppStore();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const updateAvatar = useAppStore((s) => s.updateAvatar);
  const updateProfile = useAppStore((s) => s.updateProfile);

  const [nombre, setNombre] = useState(user?.nombre || '');
  const [avatarUri, setAvatarUri] = useState<string | null>(user?.avatar_url || null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setNombre(user?.nombre || '');
    setAvatarUri(user?.avatar_url || null);
  }, [user?.id]);

  const pickImage = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
        aspect: [1, 1],
      });
      if (res.canceled || !res.assets?.[0]) return;
      setAvatarUri(res.assets[0].uri);
    } catch (e) {
      console.error('[edit-profile] pickImage error:', e);
      Alert.alert('Error', 'No se pudo abrir la galería');
    }
  };

  const uploadAvatar = async (uri: string, fileName: string): Promise<{ url: string; path: string } | null> => {
    try {
      const client = getClient();
      const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `avatars/${user?.id}/${Date.now()}_${safeName}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await client.storage.from('avatars').upload(path, blob);
      if (error) throw new Error(error.message);
      return {
        url: (data as any)?.url || path,
        path,
      };
    } catch (e) {
      console.error('[edit-profile] uploadAvatar error:', e);
      return null;
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      if (avatarUri && avatarUri !== user.avatar_url) {
        const fileName = `avatar_${Date.now()}.jpg`;
        const uploaded = await uploadAvatar(avatarUri, fileName);
        if (uploaded) {
          await updateAvatar(uploaded.url, uploaded.path);
        } else {
          Alert.alert('Error', 'No se pudo subir la foto de perfil');
          setSaving(false);
          return;
        }
      }

      if (nombre.trim() && nombre.trim() !== user.nombre) {
        await updateProfile(nombre.trim());
      }

      router.back();
    } catch (e) {
      console.error('[edit-profile] save error:', e);
      Alert.alert('Error', 'No se pudieron guardar los cambios');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.headerBar, { paddingTop: insets.top + 8, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backButton}>
          <Text style={[styles.backIcon, { color: colors.primary }]}>‹</Text>
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Editar Perfil</Text>
        <Pressable onPress={handleSave} disabled={saving} hitSlop={10} style={styles.saveButton}>
          {saving ? (
            <ActivityIndicator color={colors.primary} size="small" />
          ) : (
            <Text style={[styles.saveText, { color: colors.primary }]}>Guardar</Text>
          )}
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Pressable onPress={pickImage} style={styles.avatarSection}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: colors.primary }]} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.avatarIcon, { color: colors.primary }]}>👤</Text>
            </View>
          )}
          <Text style={[styles.changePhotoText, { color: colors.primary }]}>Cambiar foto</Text>
        </Pressable>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre</Text>
          <TextInput
            value={nombre}
            onChangeText={setNombre}
            style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
            placeholderTextColor={colors.textSecondary}
            placeholder="Tu nombre"
            maxLength={50}
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Email</Text>
          <View style={[styles.input, styles.inputDisabled, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.inputDisabledText, { color: colors.textSecondary }]}>{user?.email || ''}</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backIcon: {
    fontSize: 32,
    fontWeight: '300',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  saveButton: {
    width: 60,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatar: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 50,
  },
  changePhotoText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: '600',
  },
  fieldGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '600',
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  inputDisabled: {
    opacity: 0.7,
  },
  inputDisabledText: {
    fontSize: 16,
  },
});
