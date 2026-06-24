import { View, Text, StyleSheet, Switch, Image, Pressable, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/index';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

export default function ProfileScreen() {
  const router = useRouter();
  const { user, sessionId, logout } = useAppStore();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const colors = getColors(isDarkMode);

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)');
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        <View style={styles.profileHeader}>
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={[styles.profileAvatar, { borderColor: colors.primary }]} />
          ) : (
            <View style={[styles.profileAvatar, styles.profileAvatarPlaceholder, { backgroundColor: colors.surface, borderColor: colors.primary }]}>
              <Text style={[styles.profileAvatarIcon, { color: colors.primary }]}>👤</Text>
            </View>
          )}
          <Pressable onPress={() => router.push('/(tabs)/perfil/editar' as any)} hitSlop={8} style={styles.editButton}>
            <Text style={[styles.editButtonText, { color: colors.primary }]}>Editar Perfil</Text>
          </Pressable>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Nombre</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.nombre || 'Sin nombre'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Mi email</Text>
          <Text style={[styles.value, { color: colors.text }]}>{user?.email || 'No disponible'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Mi ID</Text>
          <Text style={[styles.valueSmall, { color: colors.text }]}>{user?.id || 'No disponible'}</Text>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textSecondary }]}>Sesión</Text>
          <Text style={[styles.value, { color: colors.text }]}>{sessionId || 'Sin sesión'}</Text>
        </View>

        <View style={[styles.card, styles.themeCard, { backgroundColor: colors.surface }]}>
          <View style={styles.themeRow}>
            <View style={styles.themeLabelContainer}>
              <Text style={[styles.label, { color: colors.textSecondary, marginBottom: 2 }]}>Apariencia</Text>
              <Text style={[styles.value, { color: colors.text }]}>Modo Oscuro</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#E5E5EA', true: colors.primary }}
              thumbColor={isDarkMode ? '#FFFFFF' : '#F4F3F4'}
            />
          </View>
        </View>

        <Pressable onPress={handleLogout} style={[styles.logoutButton, { borderColor: colors.primary }]}>
          <Text style={[styles.logoutButtonText, { color: colors.primary }]}>Cerrar Sesión</Text>
        </Pressable>
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
  profileHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  profileAvatar: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
  },
  profileAvatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarIcon: {
    fontSize: 40,
  },
  editButton: {
    marginTop: 10,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  editButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 12,
    fontFamily: 'monospace',
  },
  themeCard: {
    paddingVertical: 14,
  },
  themeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  themeLabelContainer: {
    flex: 1,
  },
  logoutButton: {
    marginTop: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: 'center',
  },
  logoutButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
});
