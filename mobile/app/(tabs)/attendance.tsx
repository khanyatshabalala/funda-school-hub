import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type AttendanceRecord = {
  id: string;
  date: string;
  status: 'present' | 'late' | 'absent';
  notes: string | null;
  learner_id: string;
};

type ChildLink = {
  learner_id: string;
  learners: { first_name: string; last_name: string; grade_id: number } | null;
};

const STATUS_COLOR: Record<string, string> = {
  present: '#22c55e',
  late:    '#f97316',
  absent:  '#ef4444',
};

const STATUS_ICON: Record<string, string> = {
  present: 'checkmark-circle',
  late:    'time',
  absent:  'close-circle',
};

const TERMS = [1, 2, 3, 4];
function currentTerm() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}
function termDateRange(term: number, year: number): [string, string] {
  const ranges: Record<number, [string, string]> = {
    1: [`${year}-01-01`, `${year}-03-31`],
    2: [`${year}-04-01`, `${year}-06-30`],
    3: [`${year}-07-01`, `${year}-09-30`],
    4: [`${year}-10-01`, `${year}-12-31`],
  };
  return ranges[term];
}

export default function AttendanceScreen() {
  const { user, primaryRole } = useAuth();
  const isParent = primaryRole === 'parent';

  const [children, setChildren] = useState<ChildLink[]>([]);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [termFilter, setTermFilter] = useState(currentTerm());
  const year = new Date().getFullYear();

  // Load linked children
  useEffect(() => {
    if (!user || !isParent) { setLoading(false); return; }
    supabase
      .from('parent_links')
      .select('learner_id, learners(first_name, last_name, grade_id)')
      .eq('parent_user_id', user.id)
      .then(({ data }) => {
        const links = (data ?? []) as ChildLink[];
        setChildren(links);
        if (links.length > 0) setSelectedChild(links[0].learner_id);
        else setLoading(false);
      });
  }, [user, isParent]);

  // Load attendance when child or term changes
  useEffect(() => {
    if (!selectedChild) return;
    setLoading(true);
    const [from, to] = termDateRange(termFilter, year);
    supabase
      .from('attendance')
      .select('id, date, status, notes, learner_id')
      .eq('learner_id', selectedChild)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setRecords((data ?? []) as AttendanceRecord[]);
        setLoading(false);
      });
  }, [selectedChild, termFilter]);

  if (!isParent) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyWrap}>
          <Ionicons name="shield-outline" size={40} color="#334155" />
          <Text style={s.empty}>This page is for parents only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Summary counts
  const present = records.filter(r => r.status === 'present').length;
  const late    = records.filter(r => r.status === 'late').length;
  const absent  = records.filter(r => r.status === 'absent').length;
  const total   = records.length;
  const attendancePct = total > 0 ? Math.round((present + late) / total * 100) : null;

  const selectedChildData = children.find(c => c.learner_id === selectedChild);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Attendance</Text>
      </View>

      {/* Child selector */}
      {children.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipRow}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {children.map(c => (
            <TouchableOpacity
              key={c.learner_id}
              style={[s.chip, selectedChild === c.learner_id && s.chipActive]}
              onPress={() => setSelectedChild(c.learner_id)}
            >
              <Text style={[s.chipText, selectedChild === c.learner_id && s.chipTextActive]}>
                {c.learners?.first_name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Term selector */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.chipRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {TERMS.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.chip, termFilter === t && s.chipActive]}
            onPress={() => setTermFilter(t)}
          >
            <Text style={[s.chipText, termFilter === t && s.chipTextActive]}>Term {t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : children.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="people-outline" size={40} color="#334155" />
          <Text style={s.empty}>No children linked yet.</Text>
          <Text style={s.emptySub}>Link a child to view their attendance.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {/* Child name */}
          {selectedChildData?.learners && (
            <View style={s.childBanner}>
              <View style={s.childAvatar}>
                <Text style={s.childAvatarText}>
                  {selectedChildData.learners.first_name[0]}
                  {selectedChildData.learners.last_name[0]}
                </Text>
              </View>
              <View>
                <Text style={s.childName}>
                  {selectedChildData.learners.first_name} {selectedChildData.learners.last_name}
                </Text>
                <Text style={s.childSub}>
                  Grade {selectedChildData.learners.grade_id === 0 ? 'R' : selectedChildData.learners.grade_id}
                  {' · '}Term {termFilter} {year}
                </Text>
              </View>
            </View>
          )}

          {/* Summary stats */}
          {total > 0 && (
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: '#22c55e' }]}>{present}</Text>
                <Text style={s.statLabel}>Present</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: '#f97316' }]}>{late}</Text>
                <Text style={s.statLabel}>Late</Text>
              </View>
              <View style={s.statCard}>
                <Text style={[s.statValue, { color: '#ef4444' }]}>{absent}</Text>
                <Text style={s.statLabel}>Absent</Text>
              </View>
              {attendancePct !== null && (
                <View style={s.statCard}>
                  <Text style={[s.statValue, { color: attendancePct >= 80 ? '#22c55e' : '#f97316' }]}>
                    {attendancePct}%
                  </Text>
                  <Text style={s.statLabel}>Rate</Text>
                </View>
              )}
            </View>
          )}

          {/* Records */}
          {records.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="calendar-outline" size={40} color="#334155" />
              <Text style={s.empty}>No records for Term {termFilter}.</Text>
              <Text style={s.emptySub}>Records appear once the school captures attendance.</Text>
            </View>
          ) : (
            records.map(r => (
              <View key={r.id} style={s.card}>
                <View style={[s.iconWrap, { backgroundColor: STATUS_COLOR[r.status] + '22' }]}>
                  <Ionicons
                    name={STATUS_ICON[r.status] as any}
                    size={20}
                    color={STATUS_COLOR[r.status]}
                  />
                </View>
                <View style={s.cardBody}>
                  <Text style={s.cardDate}>
                    {new Date(r.date + 'T00:00:00').toLocaleDateString('en-ZA', {
                      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                  {r.notes && <Text style={s.cardNotes}>{r.notes}</Text>}
                </View>
                <View style={[s.statusPill, { backgroundColor: STATUS_COLOR[r.status] + '22' }]}>
                  <Text style={[s.statusPillText, { color: STATUS_COLOR[r.status] }]}>
                    {r.status}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0f172a' },
  header:          { padding: 20, paddingBottom: 8 },
  title:           { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  chipRow:         { flexGrow: 0, marginBottom: 8 },
  chip:            { borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#1e293b' },
  chipActive:      { borderColor: '#38bdf8', backgroundColor: '#38bdf820' },
  chipText:        { color: '#64748b', fontSize: 13, fontWeight: '600' },
  chipTextActive:  { color: '#38bdf8' },
  list:            { padding: 16, gap: 10, paddingBottom: 40 },
  emptyWrap:       { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32, marginTop: 40 },
  empty:           { color: '#94a3b8', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  emptySub:        { color: '#475569', fontSize: 13, textAlign: 'center' },
  childBanner:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#1e293b', borderRadius: 12, padding: 14, marginBottom: 4 },
  childAvatar:     { width: 38, height: 38, borderRadius: 19, backgroundColor: '#0ea5e920', alignItems: 'center', justifyContent: 'center' },
  childAvatarText: { color: '#38bdf8', fontWeight: '700', fontSize: 13 },
  childName:       { color: '#f1f5f9', fontWeight: '700', fontSize: 14 },
  childSub:        { color: '#64748b', fontSize: 12, marginTop: 2 },
  statsRow:        { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statCard:        { flex: 1, backgroundColor: '#1e293b', borderRadius: 12, padding: 12, alignItems: 'center' },
  statValue:       { fontSize: 22, fontWeight: '800' },
  statLabel:       { fontSize: 11, color: '#64748b', marginTop: 2 },
  card:            { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap:        { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardBody:        { flex: 1 },
  cardDate:        { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  cardNotes:       { color: '#64748b', fontSize: 12, marginTop: 3 },
  statusPill:      { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusPillText:  { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
});
