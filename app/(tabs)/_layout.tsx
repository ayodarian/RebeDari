import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';

const TabIcon = ({ icon, focused }: { icon: string; focused: boolean }) => (
  <View style={[styles.iconContainer, focused && styles.iconContainerFocused]}>
    <Text style={[styles.icon, focused && styles.iconFocused]}>{icon}</Text>
  </View>
);

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: '#FF6B9D',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarLabelStyle: styles.tabLabel,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Feed',
          tabBarIcon: ({ focused }) => <TabIcon icon="📷" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: 'Reels',
          tabBarIcon: ({ focused }) => <TabIcon icon="🎬" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="cartas"
        options={{
          title: 'Cartas',
          tabBarIcon: ({ focused }) => <TabIcon icon="💌" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="bingo"
        options={{
          title: 'Bingo',
          tabBarIcon: ({ focused }) => <TabIcon icon="🎯" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dedos"
        options={{
          title: 'Dedos',
          tabBarIcon: ({ focused }) => <TabIcon icon="✌️" focused={focused} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: '#FFFFFF',
    borderTopWidth: 0,
    elevation: 0,
    height: 80,
    paddingBottom: 20,
    paddingTop: 10,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
  },
  iconContainer: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerFocused: {},
  icon: {
    fontSize: 22,
    opacity: 0.5,
  },
  iconFocused: {
    opacity: 1,
  },
});