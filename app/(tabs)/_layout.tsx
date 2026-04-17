import { Tabs } from 'expo-router';
import { View, Text, StyleSheet, Pressable, Image } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

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
    backgroundColor: '#FFFFFF',
  },
  content: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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