import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type CalEvent = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  event_type: string | null;
  source: 'national' | 'school';
  classes?: { name: string } | null;
};

const EVENT_COLORS: Record<string, string> = {
  term_start:     '#22c55e',
  term_end:       '#f97316',
  public_holiday: '#ef4444',
  extra_class:    '#38bdf8',
  exam:           '#f97316',
  sport:          '#3b82f6',
  meeting:        '#a855f7',
  default:        '#38bdf8',
};

function eventColor(type: string | null) {
  return EVENT_COLORS[type?.toLowerCase() ?? ''] ?? EVENT_COLORS.default;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function CalendarScreen() {
  const { primarySchoolId } = useAuth();
  const today = new Date();
  const [month, setMonth] = useState(today.getMonth());
  const [year, setYear]   = useState(today.getFullYear());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const from = new Date(year, month, 1).toISOString().slice(0, 10);
    const to   = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    setLoading(true);

    Promise.all([
      (supabase as any).from('national_calendar')
        .select('id, title, event_date, event_type')
        .gte('event_date', from).lte('event_date', to).order('event_date'),
      primarySchoolId
        ? supabase.from('calendar_events')
            .select('id, title, event_date, event_time, event_type, classes(name)')
            .eq('school_id', primarySchoolId)
            .gte('event_date', from).lte('event_date', to).order('event_date')
        : Promise.resolve({ data: [] }),
    ]).then(([nat, sch]) => {
      const natEvents: CalEvent[] = (nat.data ?? []).map((e: any) => ({ ...e, event_time: null, source: 'national' as const }));
      const schEvents: CalEvent[] = (sch.data ?? []).map((e: any) => ({ ...e, source: 'school' as const }));
      setEvents([...natEvents, ...schEvents].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      setLoading(false);
    });
  }, [month, year, primarySchoolId]);

  const prevMonth = () => month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1);

  const todayStr = today.toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.event_date >= todayStr);

  return (
    <SafeAreaView style={styles.container}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {upcoming.length === 0 ? (
            <Text style={styles.empty}>No events this month.</Text>
          ) : (
            upcoming.map((e) => (
              <View key={e.id} style={styles.card}>
                <View style={[styles.dot, { backgroundColor: eventColor(e.event_type) }]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{e.title}</Text>
                  <Text style={styles.cardSub}>
                    {new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {e.event_time && ` · ${e.event_time.slice(0, 5)}`}
                    {e.classes?.name && ` · ${e.classes.name}`}
                  </Text>
                </View>
                {e.source === 'national' && (
                  <View style={styles.saBadge}><Text style={styles.saBadgeText}>SA</Text></View>
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f172a' },
  monthNav:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  navBtn:       { padding: 8 },
  navArrow:     { fontSize: 24, color: '#94a3b8', fontWeight: '300' },
  monthLabel:   { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  list:         { padding: 16, gap: 10 },
  empty:        { color: '#475569', textAlign: 'center', marginTop: 40 },
  card:         { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot:          { width: 10, height: 10, borderRadius: 5, marginTop: 2 },
  cardBody:     { flex: 1 },
  cardTitle:    { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  cardSub:      { color: '#64748b', fontSize: 12, marginTop: 2 },
  saBadge:      { backgroundColor: '#1e3a5f', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saBadgeText:  { color: '#60a5fa', fontSize: 10, fontWeight: '700' },
});
