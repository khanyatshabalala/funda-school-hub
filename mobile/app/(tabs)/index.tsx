import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function currentTerm() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

// ── Parent home ────────────────────────────────────────────────────────────
function ParentHome() {
  const { user, displayName, profile } = useAuth();
  const router = useRouter();
  const firstName = displayName?.split(' ')[0] ?? '';
  const isPremium = profile?.subscription_tier === 'premium';

  const [children, setChildren] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [nextEvent, setNextEvent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from('parent_links')
        .select('id, relationship, learners(id, first_name, last_name, grade_id, schools(name))')
        .eq('parent_user_id', user.id),
      supabase.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .is('read_at', null),
      supabase.from('calendar_events')
        .select('id, title, event_date, event_type')
        .gte('event_date', today)
        .order('event_date')
        .limit(1),
    ]).then(([{ data: links }, { count }, { data: events }]) => {
      setChildren((links ?? []) as any[]);
      setUnreadCount(count ?? 0);
      setNextEvent(events?.[0] ?? null);
      setLoading(false);
    });
  }, [user]);

  if (loading) return <ActivityIndicator color="#38bdf8" style={{ marginTop: 60 }} />;

  const quickLinks = [
    { label: 'My children', icon: 'people', route: '/(tabs)/children' },
    { label: 'Attendance', icon: 'checkmark-circle', route: '/(tabs)/attendance' },
    { label: 'Exam timetable', icon: 'list', route: '/(tabs)/exam-timetable' },
    { label: 'Report cards', icon: 'document-text', route: '/(tabs)/report-cards' },
    { label: 'Calendar', icon: 'calendar', route: '/(tabs)/calendar' },
    { label: 'Schools', icon: 'school', route: '/(tabs)/schools' },
    { label: isPremium ? 'Premium ✓' : 'Go Premium', icon: 'star', route: '/(tabs)/upgrade' },
    { label: 'Alerts', icon: 'notifications', route: '/(tabs)/alerts' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      {/* Greeting */}
      <View style={styles.greetingBlock}>
        <Text style={styles.greetingText}>{greeting()}{firstName ? `, ${firstName}` : ''} 👋</Text>
        <Text style={styles.greetingSub}>Term {currentTerm()} · {new Date().getFullYear()}</Text>
      </View>

      {/* Unread notifications banner */}
      {unreadCount > 0 && (
        <TouchableOpacity
          style={styles.notifBanner}
          onPress={() => router.push('/(tabs)/alerts')}
        >
          <Ionicons name="notifications" size={16} color="#38bdf8" />
          <Text style={styles.notifBannerText}>
            {unreadCount} unread notification{unreadCount !== 1 ? 's' : ''}
          </Text>
          <Ionicons name="chevron-forward" size={14} color="#64748b" style={{ marginLeft: 'auto' }} />
        </TouchableOpacity>
      )}

      {/* Next event */}
      {nextEvent && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Next event</Text>
          <TouchableOpacity style={styles.eventCard} onPress={() => router.push('/(tabs)/calendar')}>
            <View style={styles.eventDot} />
            <View style={{ flex: 1 }}>
              <Text style={styles.eventTitle}>{nextEvent.title}</Text>
              <Text style={styles.eventDate}>
                {new Date(nextEvent.event_date + 'T00:00:00').toLocaleDateString('en-ZA', {
                  weekday: 'short', day: 'numeric', month: 'short',
                })}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={14} color="#64748b" />
          </TouchableOpacity>
        </View>
      )}

      {/* Children */}
      {children.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>My children</Text>
          {children.map((c: any) => {
            const l = c.learners;
            if (!l) return null;
            return (
              <View key={c.id} style={styles.childCard}>
                <View style={styles.childAvatar}>
                  <Text style={styles.childAvatarText}>{l.first_name[0]}{l.last_name[0]}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.childName}>{l.first_name} {l.last_name}</Text>
                  <Text style={styles.childSub}>
                    {l.schools?.name} · Grade {l.grade_id === 0 ? 'R' : l.grade_id}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick access</Text>
        <View style={styles.quickGrid}>
          {quickLinks.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickCard}
              onPress={() => router.push(q.route as any)}
            >
              <Ionicons name={q.icon as any} size={22} color="#38bdf8" />
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ── School home ────────────────────────────────────────────────────────────
function SchoolHome() {
  const { primarySchoolId, displayName, primaryRole } = useAuth();
  const router = useRouter();
  const firstName = displayName?.split(' ')[0] ?? '';

  const [school, setSchool] = useState<{ name: string } | null>(null);
  const [learnerCount, setLearnerCount] = useState(0);
  const [recentDiscipline, setRecentDiscipline] = useState<any[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!primarySchoolId) { setLoading(false); return; }
    const today = new Date().toISOString().slice(0, 10);
    Promise.all([
      supabase.from('schools').select('name').eq('id', primarySchoolId).maybeSingle(),
      supabase.from('learners').select('*', { count: 'exact', head: true }).eq('school_id', primarySchoolId),
      supabase.from('calendar_events')
        .select('id, title, event_date, event_type')
        .eq('school_id', primarySchoolId)
        .gte('event_date', today)
        .order('event_date').limit(3),
    ]).then(([{ data: s }, { count }, { data: events }]) => {
      setSchool(s as any);
      setLearnerCount(count ?? 0);
      setUpcomingEvents(events ?? []);
      setLoading(false);
    });
  }, [primarySchoolId]);

  if (loading) return <ActivityIndicator color="#38bdf8" style={{ marginTop: 60 }} />;

  const quickLinks = [
    { label: 'Learners', icon: 'people', route: '/(tabs)/learners' },
    { label: 'Attendance', icon: 'checkmark-circle', route: '/(tabs)/attendance-capture' },
    { label: 'Discipline', icon: 'shield', route: '/(tabs)/discipline' },
    { label: 'Calendar', icon: 'calendar', route: '/(tabs)/calendar' },
    { label: 'Exam timetable', icon: 'list', route: '/(tabs)/exam-timetable' },
    { label: 'Alerts', icon: 'notifications', route: '/(tabs)/alerts' },
  ];

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <View style={styles.greetingBlock}>
        <Text style={styles.greetingText}>{greeting()}{firstName ? `, ${firstName}` : ''} 👋</Text>
        <Text style={styles.greetingSub}>
          Term {currentTerm()} · {school?.name ?? 'Your school'}
        </Text>
        <View style={styles.rolePill}>
          <Text style={styles.rolePillText}>{primaryRole.replace('_', ' ')}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{learnerCount}</Text>
          <Text style={styles.statLabel}>Learners</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{currentTerm()}</Text>
          <Text style={styles.statLabel}>Current term</Text>
        </View>
      </View>

      {/* Upcoming events */}
      {upcomingEvents.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Upcoming events</Text>
          {upcomingEvents.map((e) => (
            <View key={e.id} style={styles.eventCard}>
              <View style={styles.eventDot} />
              <View style={{ flex: 1 }}>
                <Text style={styles.eventTitle}>{e.title}</Text>
                <Text style={styles.eventDate}>
                  {new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-ZA', {
                    weekday: 'short', day: 'numeric', month: 'short',
                  })}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Quick links */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Quick access</Text>
        <View style={styles.quickGrid}>
          {quickLinks.map((q) => (
            <TouchableOpacity
              key={q.label}
              style={styles.quickCard}
              onPress={() => router.push(q.route as any)}
            >
              <Ionicons name={q.icon as any} size={22} color="#38bdf8" />
              <Text style={styles.quickLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </ScrollView>
  );
}

// ── Root ───────────────────────────────────────────────────────────────────
export default function HomeScreen() {
  const { primaryRole, loading } = useAuth();

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 60 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {primaryRole === 'parent' ? <ParentHome /> : <SchoolHome />}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0f172a' },
  scroll:          { padding: 20, paddingBottom: 40, gap: 16 },
  greetingBlock:   { gap: 4 },
  greetingText:    { fontSize: 24, fontWeight: '800', color: '#f1f5f9' },
  greetingSub:     { fontSize: 13, color: '#94a3b8' },
  rolePill:        { alignSelf: 'flex-start', backgroundColor: '#1e293b', borderRadius: 20, paddingHorizontal: 10, paddingVertical: 3, marginTop: 6 },
  rolePillText:    { fontSize: 11, color: '#94a3b8', textTransform: 'capitalize' },
  notifBanner:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#0ea5e915', borderWidth: 1, borderColor: '#0ea5e930', borderRadius: 12, padding: 12 },
  notifBannerText: { color: '#38bdf8', fontSize: 13, fontWeight: '600' },
  section:         { gap: 8 },
  sectionLabel:    { fontSize: 12, fontWeight: '700', color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  eventCard:       { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#1e293b', borderRadius: 12, padding: 12 },
  eventDot:        { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38bdf8' },
  eventTitle:      { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  eventDate:       { color: '#64748b', fontSize: 12, marginTop: 2 },
  childCard:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 12, padding: 12 },
  childAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0ea5e920', alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { color: '#38bdf8', fontWeight: '700', fontSize: 13 },
  childName:       { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  childSub:        { color: '#64748b', fontSize: 12, marginTop: 1 },
  statsRow:        { flexDirection: 'row', gap: 12 },
  statCard:        { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center' },
  statValue:       { fontSize: 28, fontWeight: '800', color: '#38bdf8' },
  statLabel:       { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  quickGrid:       { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  quickCard:       { width: '47%', backgroundColor: '#1e293b', borderRadius: 12, padding: 16, alignItems: 'center', gap: 8 },
  quickLabel:      { color: '#cbd5e1', fontSize: 12, fontWeight: '600', textAlign: 'center' },
});
