import { Tabs, useRouter, usePathname } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { View, Text, StyleSheet, Pressable, Image, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/index';
import { useTheme } from '../components/ThemeProvider';
import { NotificationBell } from '../components/NotificationBell';

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
  const { user, partner, logout } = useAppStore();
  const { theme } = useTheme();
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

  const handleProfilePress = () => {
    router.push('/(tabs)/perfil');
  };

  const handlePartnerPress = () => {
    router.push('/(tabs)/chat');
  };

  const getInitials = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10, backgroundColor: theme.headerBg }]}>
      <Text style={[styles.headerTitle, { color: theme.primaryDesaturated }]}>RebeDari</Text>
      <View style={styles.headerRight}>
        <View style={[styles.counterBubble, { backgroundColor: theme.headerCapsule }]}>
          <Text style={[styles.headerLabel, { color: theme.headerMuted }]}>Juntos desde:</Text>
          <Text style={[styles.counterBold, { color: theme.primaryDesaturated }]}>{timeTogether}</Text>
        </View>
        <TouchableOpacity onPress={handleProfilePress} style={[styles.profileButton, { backgroundColor: theme.primaryMuted }]}>
          {user?.avatarUrl ? (
            <Image source={{ uri: user.avatarUrl }} style={styles.profileImage} />
          ) : (
            <View style={[styles.profileInitials, { backgroundColor: theme.primaryMuted }]}>
              <Text style={styles.profileInitialsText}>
                {user?.nombre ? getInitials(user.nombre) : '?'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <NotificationBell
          trigger={
            partner && partner.avatarUrl ? (
              <TouchableOpacity onPress={handlePartnerPress} style={styles.partnerButton}>
                <Image source={{ uri: partner.avatarUrl }} style={styles.partnerImage} />
              </TouchableOpacity>
            ) : partner ? (
              <TouchableOpacity onPress={handlePartnerPress} style={styles.partnerButton}>
                <View style={[styles.partnerInitials, { backgroundColor: theme.headerCapsule }]}>
                  <Text style={[styles.partnerInitialsText, { color: theme.primaryDesaturated }]}>
                    {partner.nombre ? getInitials(partner.nombre) : '?'}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handlePartnerPress} style={styles.partnerButton}>
                <View style={[styles.partnerInitials, { backgroundColor: theme.headerCapsule }]}>
                  <Image source={require('../../assets/icon-message-default.png')} style={[styles.chatIcon, { tintColor: theme.primaryDesaturated }]} />
                </View>
              </TouchableOpacity>
            )
          }
        />
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

export default function TabLayout() {
  const pathname = usePathname();
  const { theme } = useTheme();

  const getActiveIndex = () => {
    if (pathname.includes('/reels')) return 1;
    if (pathname.includes('/cartas')) return 2;
    if (pathname.includes('/bingo')) return 3;
    if (pathname.includes('/dedos')) return 4;
    return 0;
  };

  return (
    <GestureHandlerRootView style={[styles.container, { backgroundColor: theme.background }]}>
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
        <Tabs.Screen
          name="perfil"
          options={{
            href: '/(tabs)/perfil',
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
  const { theme } = useTheme();

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
      <View style={[styles.dock, { backgroundColor: theme.dock }]}>
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
                style={[styles.dockIcon, isFocused ? { tintColor: theme.primary } : { tintColor: theme.dockIcon }]}
              />
              <Text style={[styles.dockLabel, isFocused ? { color: theme.primary } : { color: theme.dockIcon }]}>
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
    backgroundColor: 'transparent',
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
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  profileInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileInitialsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  partnerButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  partnerInitials: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerInitialsText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 8,
  },
  logoutIcon: {
    fontSize: 20,
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
    backgroundColor: 'transparent',
  },
  dock: {
    flexDirection: 'row',
    borderRadius: 25,
    height: 50,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
    shadowColor: '#000',
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
  },
  dockLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  chatIcon: {
    width: 20,
    height: 20,
  },
});
