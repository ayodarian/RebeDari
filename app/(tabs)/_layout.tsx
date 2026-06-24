import { Tabs, useRouter, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, StyleSheet, Pressable, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index';
import { useThemeStore } from '../../store/useThemeStore';
import { getColors } from '../../constants/Colors';

const START_DATE = new Date(2025, 0, 22, 6, 30, 0);

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function calculateTimeDiff(start: Date, end: Date): { years: number; months: number; days: number; hours: number; minutes: number } {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  let hours = end.getHours() - start.getHours();
  let minutes = end.getMinutes() - start.getMinutes();

  if (minutes < 0) {
    minutes += 60;
    hours -= 1;
  }
  if (hours < 0) {
    hours += 24;
    days -= 1;
  }
  if (days < 0) {
    months -= 1;
    const prevMonth = end.getMonth() - 1;
    const prevMonthYear = prevMonth < 0 ? end.getFullYear() - 1 : end.getFullYear();
    const adjustedMonth = prevMonth < 0 ? 11 : prevMonth;
    const daysInPrevMonth = getDaysInMonth(prevMonthYear, adjustedMonth);
    days += daysInPrevMonth;
  }
  if (months < 0) {
    months += 12;
    years -= 1;
  }

  return { years: Math.abs(years), months: Math.abs(months), days: Math.abs(days), hours: Math.abs(hours), minutes: Math.abs(minutes) };
}

function formatTimeDifference(time: { years: number; months: number; days: number; hours: number; minutes: number }): string {
  const parts: string[] = [];
  if (time.years > 0) parts.push(`${time.years} año${time.years > 1 ? 's' : ''}`);
  if (time.months > 0) parts.push(`${time.months} mes${time.months > 1 ? 'es' : ''}`);
  if (time.days > 0) parts.push(`${time.days} día${time.days > 1 ? 's' : ''}`);
  if (time.hours > 0) parts.push(`${time.hours} hora${time.hours > 1 ? 's' : ''}`);
  if (time.minutes > 0 || parts.length === 0) parts.push(`${time.minutes} min${time.minutes !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

function GlobalHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { user } = useAppStore();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);
  const [timeTogether, setTimeTogether] = useState<React.ReactNode>(null);

  useEffect(() => {
    const updateCounter = () => {
      const now = new Date();
      const timeDiff = calculateTimeDiff(START_DATE, now);
      setTimeTogether(formatTimeDifference(timeDiff));
    };

    updateCounter();
    const interval = setInterval(updateCounter, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: colors.background }]}>
      <Text style={[styles.headerTitle, { color: colors.primary }]}>RebeDari</Text>
      <View style={styles.headerRight}>
        <View style={[styles.counterBubble, { backgroundColor: colors.surface }]}>
          <Text style={[styles.headerLabel, { color: colors.textSecondary }]}>Juntos desde:</Text>
          <Text style={[styles.counterBold, { color: colors.text }]}>{timeTogether}</Text>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/chat')} style={styles.iconButton}>
          <Text style={styles.headerIcon}>💬</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/perfil')}
          style={[styles.avatarButton, { borderColor: colors.primary }]}
        >
          {user?.avatar_url ? (
            <Image source={{ uri: user.avatar_url }} style={styles.avatarImage} />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.surfaceSecondary }]}>
              <Text style={[styles.avatarIcon, { color: colors.primary }]}>👤</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const tabs = [
  { name: 'index', label: 'Feed', icon: require('../../assets/icon-feed.png') },
  { name: 'reels', label: 'Reels', icon: require('../../assets/icon-reels.png') },
  { name: 'cartas', label: 'Cartas', icon: require('../../assets/icon-cartas.png') },
  { name: 'bingo', label: 'Bingo', icon: require('../../assets/icon-bingo.png') },
  { name: 'dedos', label: 'Dedos', icon: require('../../assets/icon-dedos.png') },
];

function CustomTabBar({ state, descriptors, navigation }: any) {
  const insets = useSafeAreaInsets();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);

  return (
    <View style={[styles.dockContainer, { paddingBottom: insets.bottom + 16, backgroundColor: colors.tabBarBg }]}>
      <View style={[styles.dock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {state.routes.map((route: any, index: number) => {
          const { options } = descriptors[route.key];
          const isFocused = state.index === index;

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          const tabConfig = tabs.find(t => t.name === route.name);
          const icon = tabConfig?.icon || tabConfig?.icon;
          const label = tabConfig?.label || route.name;

          return (
            <Pressable
              key={route.key}
              style={styles.dockItem}
              onPress={onPress}
            >
              {icon && (
                <Image
                  source={icon}
                  style={[
                    styles.dockIcon,
                    { tintColor: isFocused ? colors.primary : colors.textSecondary },
                  ]}
                />
              )}
              <Text style={[
                styles.dockLabel,
                { color: isFocused ? colors.primary : colors.textSecondary },
                isFocused && { fontWeight: '700' },
              ]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function TabLayout() {
  const pathname = usePathname();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);

  const getActiveIndex = () => {
    if (pathname.includes('/reels')) return 1;
    if (pathname.includes('/cartas')) return 2;
    if (pathname.includes('/bingo')) return 3;
    if (pathname.includes('/dedos')) return 4;
    return 0;
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: colors.background }]}>
      <GlobalHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          animation: 'none',
        }}
      >
        <Tabs.Screen name="index" options={{ href: '/(tabs)' }} />
        <Tabs.Screen name="reels" options={{ href: '/(tabs)/reels' }} />
        <Tabs.Screen name="cartas" options={{ href: '/(tabs)/cartas' }} />
        <Tabs.Screen name="bingo" options={{ href: '/(tabs)/bingo' }} />
        <Tabs.Screen name="dedos" options={{ href: '/(tabs)/dedos' }} />
        <Tabs.Screen name="perfil" options={{ href: null }} />
        <Tabs.Screen name="perfil/editar" options={{ href: '/(tabs)/perfil/editar' }} />
      </Tabs>
      <CustomTabBarWrapper />
    </GestureHandlerRootView>
  );
}

function CustomTabBarWrapper() {
  const router = useRouter();
  const pathname = usePathname();
  const isDarkMode = useThemeStore((s) => s.isDarkMode);
  const colors = getColors(isDarkMode);

  const getActiveIndex = () => {
    if (pathname.includes('/reels')) return 1;
    if (pathname.includes('/cartas')) return 2;
    if (pathname.includes('/bingo')) return 3;
    if (pathname.includes('/dedos')) return 4;
    return 0;
  };

  const currentIndex = getActiveIndex();

  return (
    <View style={[styles.dockContainer, { backgroundColor: colors.tabBarBg }]}>
      <View style={[styles.dock, { backgroundColor: colors.surface, borderColor: colors.border }]}>
        {tabs.map((tab, index) => {
          const isFocused = currentIndex === index;
          return (
            <Pressable
              key={tab.name}
              style={styles.dockItem}
              onPress={() => {
                const route = tab.name === 'index' ? '/(tabs)' : `/(tabs)/${tab.name}`;
                router.replace(route as any);
              }}
            >
              <Image
                source={tab.icon}
                style={[
                  styles.dockIcon,
                  { tintColor: isFocused ? colors.primary : colors.textSecondary },
                ]}
              />
              <Text style={[
                styles.dockLabel,
                { color: isFocused ? colors.primary : colors.textSecondary },
                isFocused && { fontWeight: '700' },
              ]}>
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  counterBubble: {
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 4,
    alignItems: 'center',
    alignSelf: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 6,
  },
  headerIcon: {
    fontSize: 20,
  },
  avatarButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarIcon: {
    fontSize: 16,
  },
  headerLabel: {
    fontSize: 11,
    marginBottom: 0,
  },
  counterBold: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  dockContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  dock: {
    flexDirection: 'row',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 4,
  },
  dockIcon: {
    width: 22,
    height: 22,
    marginBottom: 2,
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
});
