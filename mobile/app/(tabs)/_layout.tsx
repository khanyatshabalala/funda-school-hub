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

// Parent: Home · Calendar · Alerts · Profile  (+ hidden: children, report-cards, schools, upgrade, attendance, marks)
const parentTabs: Tab[] = [
  { name: 'index',      title: 'Home',          icon: 'home-outline',          iconFocused: 'home' },
  { name: 'calendar',   title: 'Calendar',      icon: 'calendar-outline',      iconFocused: 'calendar' },
  { name: 'discipline', title: 'Discipline',    icon: 'shield-outline',        iconFocused: 'shield' },
  { name: 'alerts',     title: 'Notifications', icon: 'notifications-outline', iconFocused: 'notifications' },
  { name: 'profile',    title: 'Profile',       icon: 'person-outline',        iconFocused: 'person' },
];

// School staff / school admin: Home · Learners · Discipline · Staff · Profile
const schoolTabs: Tab[] = [
  { name: 'index',               title: 'Home',       icon: 'home-outline',       iconFocused: 'home' },
  { name: 'learners',            title: 'Learners',   icon: 'people-outline',     iconFocused: 'people' },
  { name: 'discipline',          title: 'Discipline', icon: 'shield-outline',     iconFocused: 'shield' },
  { name: 'staff',               title: 'Staff',      icon: 'people-outline',     iconFocused: 'people' },
  { name: 'profile',             title: 'Profile',    icon: 'person-outline',     iconFocused: 'person' },
];

// Screens accessible via navigation but not shown in the tab bar
// Parent: calendar, discipline, alerts are in tabs — everything else is hidden
const hiddenParentScreens = [
  'children', 'report-cards', 'schools', 'upgrade',
  'exam-timetable', 'attendance',
  'attendance-capture', 'learners', 'link-requests',
  'assistant', 'staff', 'classes', 'transfers', 'learner-detail',
  'report-cards-upload',
];

// Staff: calendar, alerts are hidden (not in staff tabs but navigable)
const hiddenStaffScreens = [
  'children', 'report-cards', 'schools', 'upgrade',
  'exam-timetable', 'attendance',
  'alerts', 'calendar', 'link-requests', 'report-cards-upload',
  'assistant', 'staff', 'classes', 'transfers', 'learner-detail',
];

export default function TabLayout() {
  const { primaryRole } = useAuth();
  const isParent = primaryRole === 'parent';
  const tabs = isParent ? parentTabs : schoolTabs;
  const hidden = isParent ? hiddenParentScreens : hiddenStaffScreens;

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

      {/* Hidden screens — accessible via navigation but not in tab bar */}
      {hidden.map((name) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{ href: null }}
        />
      ))}
    </Tabs>
  );
}
