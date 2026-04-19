import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useState, useEffect } from 'react';

const START_DATE = new Date(2025, 0, 22, 18, 35, 0);

function calculateTimeDiff(start: Date, end: Date): { years: number; months: number; days: number; hours: number; minutes: number; seconds: number } {
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  let days = end.getDate() - start.getDate();
  let hours = end.getHours() - start.getHours();
  let minutes = end.getMinutes() - start.getMinutes();
  let seconds = end.getSeconds() - start.getSeconds();

  if (seconds < 0) { seconds += 60; minutes--; }
  if (minutes < 0) { minutes += 60; hours--; }
  if (hours < 0) { hours += 24; days--; }
  if (days < 0) { 
    const prevMonth = new Date(end.getFullYear(), end.getMonth(), 0);
    days += prevMonth.getDate(); months--; 
  }
  if (months < 0) { months += 12; years--; }

  return { years: Math.abs(years), months: Math.abs(months), days: Math.abs(days), hours: Math.abs(hours), minutes: Math.abs(minutes), seconds: Math.abs(seconds) };
}

function formatTimeDifference(time: { years: number; months: number; days: number; hours: number; minutes: number; seconds: number }): string {
  const parts: string[] = [];
  if (time.years > 0) parts.push(`${time.years} año${time.years > 1 ? 's' : ''}`);
  if (time.months > 0) parts.push(`${time.months} mes${time.months > 1 ? 'es' : ''}`);
  if (time.days > 0) parts.push(`${time.days} día${time.days > 1 ? 's' : ''}`);
  if (time.hours > 0) parts.push(`${time.hours} hora${time.hours > 1 ? 's' : ''}`);
  if (time.minutes > 0) parts.push(`${time.minutes} minuto${time.minutes > 1 ? 's' : ''}`);
  parts.push(`${time.seconds} segundo${time.seconds !== 1 ? 's' : ''}`);
  return parts.join(', ');
}

function GlobalHeader() {
  const insets = useSafeAreaInsets();
  const [timeTogether, setTimeTogether] = useState('');

  useEffect(() => {
    const updateCounter = () => {
      const now = new Date();
      const timeDiff = calculateTimeDiff(START_DATE, now);
      setTimeTogether(formatTimeDifference(timeDiff));
    };
    
    updateCounter();
    const interval = setInterval(updateCounter, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
      <Text style={styles.headerTitle}>RebeDari</Text>
      <View style={styles.headerRight}>
        <Text style={styles.headerLabel}>Juntos desde:</Text>
        <Text style={styles.headerCounter}>{timeTogether}</Text>
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

function CustomTabBar() {
  const router = useRouter();
  const pathname = usePathname();

  const getCurrentIndex = () => {
    if (pathname.includes('/reels')) return 1;
    if (pathname.includes('/cartas')) return 2;
    if (pathname.includes('/bingo')) return 3;
    if (pathname.includes('/dedos')) return 4;
    return 0;
  };

  const currentIndex = getCurrentIndex();

  const navigateTo = (path: string) => {
    router.push(path as any);
  };

  return (
    <View style={styles.dockContainer}>
      <View style={styles.dock}>
        {tabs.map((tab, index) => {
          const isFocused = currentIndex === index;
          return (
            <Pressable
              key={tab.name}
              style={styles.dockItem}
              onPress={() => navigateTo(`/(tabs)/${tab.name}`)}
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

export default function TabLayout() {
  return (
    <View style={styles.container}>
      <GlobalHeader />
      <View style={styles.content}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarStyle: { display: 'none' },
          }}
        >
          <Tabs.Screen name="index" />
          <Tabs.Screen name="reels" />
          <Tabs.Screen name="cartas" />
          <Tabs.Screen name="bingo" />
          <Tabs.Screen name="dedos" />
        </Tabs>
      </View>
      <CustomTabBar />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 15,
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FF6B9D',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  headerLabel: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 2,
  },
  headerCounter: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333333',
  },
  content: {
    flex: 1,
    backgroundColor: 'rgba(255, 245, 248, 0.95)',
  },
  dockContainer: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    paddingTop: 10,
    backgroundColor: 'transparent',
  },
  dock: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 183, 197, 0.3)',
    borderRadius: 25,
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 10,
  },
  dockItem: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 8,
  },
  dockIcon: {
    width: 28,
    height: 28,
    marginBottom: 4,
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