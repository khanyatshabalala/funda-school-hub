import { Tabs } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Ionicons } from '@expo/vector-icons';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

type Tab = {
  name: string;
  title: string;
  icon: IoniconsName;
  iconFocused: IoniconsName;
};

const parentTabs: Tab[] = [
  { name: 'index',      title: 'Home',        icon: 'home-outline',        iconFocused: 'home' },
  { name: 'discipline', title: 'Discipline',  icon: 'shield-outline',      iconFocused: 'shield' },
  { name: 'calendar',   title: 'Calendar',    icon: 'calendar-outline',    iconFocused: 'calendar' },
  { name: 'alerts',     title: 'Alerts',      icon: 'notifications-outline', iconFocused: 'notifications' },
  { name: 'profile',    title: 'Profile',     icon: 'person-outline',      iconFocused: 'person' },
];

const schoolTabs: Tab[] = [
  { name: 'index',      title: 'Home',        icon: 'home-outline',        iconFocused: 'home' },
  { name: 'learners',   title: 'Learners',    icon: 'people-outline',      iconFocused: 'people' },
  { name: 'discipline', title: 'Discipline',  icon: 'shield-outline',      iconFocused: 'shield' },
  { name: 'calendar',   title: 'Calendar',    icon: 'calendar-outline',    iconFocused: 'calendar' },
  { name: 'profile',    title: 'Profile',     icon: 'person-outline',      iconFocused: 'person' },
];

export default function TabLayout() {
  const { primaryRole } = useAuth();
  const isParent = primaryRole === 'parent';
  const tabs = isParent ? parentTabs : schoolTabs;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#38bdf8',
        tabBarInactiveTintColor: '#64748b',
        tabBarStyle: {
          backgroundColor: '#0f172a',
          borderTopColor: '#1e293b',
          paddingBottom: 4,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
        },
      }}
    >
      {tabs.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: tab.title,
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={focused ? tab.iconFocused : tab.icon}
                size={size}
                color={color}
              />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}
