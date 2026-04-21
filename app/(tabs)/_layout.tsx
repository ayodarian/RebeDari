import { Tabs, useRouter, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, StyleSheet, Pressable, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index';

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

function formatTimeDifference(time: { years: number; months: number; days: number; hours: number; minutes: number }): React.ReactNode {
  const parts: string[] = [];
  if (time.years > 0) parts.push(`${time.years} año${time.years > 1 ? 's' : ''}`);
  if (time.months > 0) parts.push(`${time.months} mes${time.months > 1 ? 'es' : ''}`);
  if (time.days > 0) parts.push(`${time.days} día${time.days > 1 ? 's' : ''}`);
  if (time.hours > 0) parts.push(`${time.hours} hora${time.hours > 1 ? 's' : ''}`);
  if (time.minutes > 0 || parts.length === 0) parts.push(`${time.minutes} min${time.minutes !== 1 ? 's' : ''}`);

  const mainText = parts.join(', ');

  return (
    <Text style={styles.counterBold}>
      {mainText}
    </Text>
  );
}

function GlobalHeader() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { logout } = useAppStore();
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

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)');
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.headerTitle}>RebeDari</Text>
      <View style={styles.headerRight}>
        <View style={styles.counterBubble}>
          <Text style={styles.headerLabel}>Juntos desde:</Text>
          {timeTogether}
        </View>
        <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
          <Text style={styles.logoutIcon}>🚪</Text>
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

  return (
    <View style={[styles.dockContainer, { paddingBottom: insets.bottom + 16 }]}>
      <View style={styles.dock}>
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
                  style={[styles.dockIcon, isFocused && styles.dockIconFocused]}
                />
              )}
              <Text style={[styles.dockLabel, isFocused && styles.dockLabelFocused]}>
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

  const getActiveIndex = () => {
    if (pathname.includes('/reels')) return 1;
    if (pathname.includes('/cartas')) return 2;
    if (pathname.includes('/bingo')) return 3;
    if (pathname.includes('/dedos')) return 4;
    return 0;
  };

  return (
    <GestureHandlerRootView style={styles.container}>
      <GlobalHeader />
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarStyle: { display: 'none' },
          animation: 'none',
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            href: '/(tabs)',
          }}
        />
        <Tabs.Screen
          name="reels"
          options={{
            href: '/(tabs)/reels',
          }}
        />
        <Tabs.Screen
          name="cartas"
          options={{
            href: '/(tabs)/cartas',
          }}
        />
        <Tabs.Screen
          name="bingo"
          options={{
            href: '/(tabs)/bingo',
          }}
        />
        <Tabs.Screen
          name="dedos"
          options={{
            href: '/(tabs)/dedos',
          }}
        />
      </Tabs>
      <CustomTabBarWrapper />
    </GestureHandlerRootView>
  );
}

function CustomTabBarWrapper() {
  const router = useRouter();
  const pathname = usePathname();

  const getActiveIndex = () => {
    if (pathname.includes('/reels')) return 1;
    if (pathname.includes('/cartas')) return 2;
    if (pathname.includes('/bingo')) return 3;
    if (pathname.includes('/dedos')) return 4;
    return 0;
  };

  const currentIndex = getActiveIndex();

  return (
    <View style={styles.dockContainer}>
      <View style={styles.dock}>
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
                style={[styles.dockIcon, isFocused && styles.dockIconFocused]}
              />
              <Text style={[styles.dockLabel, isFocused && styles.dockLabelFocused]}>
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
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
  },
  header: {
    flexDirection: 'column',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 4,
    backgroundColor: 'transparent',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  counterBubble: {
    backgroundColor: 'rgba(255, 183, 197, 0.35)',
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
  logoutButton: {
    padding: 8,
  },
  logoutIcon: {
    fontSize: 20,
  },
  headerLabel: {
    fontSize: 11,
    color: '#666666',
    marginBottom: 0,
  },
  counterBold: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#333333',
  },
  dockContainer: {
    paddingHorizontal: 20,
    paddingTop: 4,
    backgroundColor: 'transparent',
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 220, 225, 0.85)',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#FF6B9D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
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
    tintColor: '#000000',
  },
  dockIconFocused: {
    tintColor: '#FF6B9D',
  },
  dockLabel: {
    fontSize: 10,
    color: '#000000',
    fontWeight: '500',
  },
  dockLabelFocused: {
    color: '#FF6B9D',
    fontWeight: '600',
  },
});
