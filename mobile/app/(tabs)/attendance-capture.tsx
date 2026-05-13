import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type AttendanceStatus = 'present' | 'late' | 'absent';

type Learner = {
  id: string;
  first_name: string;
  last_name: string;
  grade_id: number;
};

type ClassOption = { id: string; name: string; grade_id: number | null };

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; icon: string }[] = [
  { value: 'present', label: 'Present', color: '#22c55e', icon: 'checkmark-circle' },
  { value: 'late',    label: 'Late',    color: '#f97316', icon: 'time' },
  { value: 'absent',  label: 'Absent',  color: '#ef4444', icon: 'close-circle' },
];

function todayIso() { return new Date().toISOString().slice(0, 10); }

export default function AttendanceCaptureScreen() {
  const { primarySchoolId, primaryRole, user } = useAuth();
  const isStaff = ['teacher', 'principal', 'school_admin', 'super_admin'].includes(primaryRole);

  const [classes, setClasses]       = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [learners, setLearners]     = useState<Learner[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [existing, setExisting]     = useState<Record<string, string>>({}); // learner_id -> record id
  const [loading, setLoading]       = useState(true);
  const [saving, setSaving]         = useState(false);
  const [date, setDate]             = useState(todayIso());

  // Load classes
  useEffect(() => {
    if (!primarySchoolId || !isStaff) { setLoading(false); return; }
    supabase
      .from('classes')
      .select('id, name, grade_id')
      .eq('school_id', primarySchoolId)
      .order('name')
      .then(({ data }) => {
        const list = (data ?? []) as ClassOption[];
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0]);
        setLoading(false);
      });
  }, [primarySchoolId, isStaff]);

  // Load learners + existing attendance when class or date changes
  useEffect(() => {
    if (!selectedClass || !primarySchoolId) return;
    setLoading(true);

    const gradeId = selectedClass.grade_id;
    const learnerQuery = gradeId !== null
      ? supabase.from('learners').select('id, first_name, last_name, grade_id')
          .eq('school_id', primarySchoolId).eq('grade_id', gradeId).order('last_name')
      : supabase.from('learners').select('id, first_name, last_name, grade_id')
          .eq('school_id', primarySchoolId).order('last_name');

    learnerQuery.then(async ({ data: lData }) => {
      const learnerList = (lData ?? []) as Learner[];
      setLearners(learnerList);

      if (learnerList.length === 0) { setLoading(false); return; }

      // Load existing attendance for this date
      const ids = learnerList.map(l => l.id);
      const { data: attData } = await supabase
        .from('attendance')
        .select('id, learner_id, status')
        .in('learner_id', ids)
        .eq('date', date);

      const statusMap: Record<string, AttendanceStatus> = {};
      const idMap: Record<string, string> = {};
      for (const row of (attData ?? []) as any[]) {
        statusMap[row.learner_id] = row.status;
        idMap[row.learner_id] = row.id;
      }
      setAttendance(statusMap);
      setExisting(idMap);
      setLoading(false);
    });
  }, [selectedClass, date, primarySchoolId]);

  const setStatus = (learnerId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [learnerId]: status }));
  };

  const markAll = (status: AttendanceStatus) => {
    const all: Record<string, AttendanceStatus> = {};
    learners.forEach(l => { all[l.id] = status; });
    setAttendance(all);
  };

  const onSave = async () => {
    const unmarked = learners.filter(l => !attendance[l.id]);
    if (unmarked.length > 0) {
      Alert.alert(
        'Unmarked learners',
        `${unmarked.length} learner(s) have no status. Mark all unmarked as absent?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Mark absent & save',
            onPress: () => {
              const updated = { ...attendance };
              unmarked.forEach(l => { updated[l.id] = 'absent'; });
              setAttendance(updated);
              doSave(updated);
            },
          },
        ],
      );
      return;
    }
    doSave(attendance);
  };

  const doSave = async (statusMap: Record<string, AttendanceStatus>) => {
    setSaving(true);
    const upserts = learners.map(l => ({
      id:          existing[l.id] ?? undefined,
      learner_id:  l.id,
      date,
      status:      statusMap[l.id] ?? 'absent',
      recorded_by: user?.id,
    }));

    const { error } = await supabase
      .from('attendance')
      .upsert(upserts, { onConflict: 'learner_id,date' });

    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    Alert.alert('Saved', `Attendance for ${date} saved.`);
  };

  if (!isStaff) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyWrap}>
          <Ionicons name="shield-outline" size={40} color="#334155" />
          <Text style={s.empty}>Staff only.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const markedCount = learners.filter(l => attendance[l.id]).length;

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Attendance capture</Text>
      </View>

      {/* Date */}
      <View style={s.dateRow}>
        <Ionicons name="calendar-outline" size={16} color="#64748b" />
        <Text style={s.dateText}>{new Date(date + 'T00:00:00').toLocaleDateString('en-ZA', {
          weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
        })}</Text>
      </View>

      {/* Class selector */}
      {classes.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={s.chipRow}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        >
          {classes.map(c => (
            <TouchableOpacity
              key={c.id}
              style={[s.chip, selectedClass?.id === c.id && s.chipActive]}
              onPress={() => setSelectedClass(c)}
            >
              <Text style={[s.chipText, selectedClass?.id === c.id && s.chipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : learners.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="people-outline" size={40} color="#334155" />
          <Text style={s.empty}>No learners in this class.</Text>
        </View>
      ) : (
        <>
          {/* Quick mark all */}
          <View style={s.quickRow}>
            <Text style={s.quickLabel}>Mark all:</Text>
            {STATUS_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt.value}
                style={[s.quickBtn, { borderColor: opt.color + '60' }]}
                onPress={() => markAll(opt.value)}
              >
                <Text style={[s.quickBtnText, { color: opt.color }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <ScrollView contentContainerStyle={s.list}>
            {learners.map(l => {
              const status = attendance[l.id];
              return (
                <View key={l.id} style={s.learnerCard}>
                  <View style={s.learnerInfo}>
                    <View style={s.avatar}>
                      <Text style={s.avatarText}>{l.first_name[0]}{l.last_name[0]}</Text>
                    </View>
                    <View>
                      <Text style={s.learnerName}>{l.first_name} {l.last_name}</Text>
                      <Text style={s.learnerGrade}>
                        Grade {l.grade_id === 0 ? 'R' : l.grade_id}
                      </Text>
                    </View>
                  </View>
                  <View style={s.statusBtns}>
                    {STATUS_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          s.statusBtn,
                          status === opt.value && { backgroundColor: opt.color + '22', borderColor: opt.color },
                        ]}
                        onPress={() => setStatus(l.id, opt.value)}
                      >
                        <Ionicons
                          name={opt.icon as any}
                          size={18}
                          color={status === opt.value ? opt.color : '#334155'}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}
          </ScrollView>

          {/* Save bar */}
          <View style={s.saveBar}>
            <Text style={s.saveBarText}>
              {markedCount}/{learners.length} marked
            </Text>
            <TouchableOpacity
              style={[s.saveBtn, saving && s.saveBtnDisabled]}
              onPress={onSave}
              disabled={saving}
            >
              {saving
                ? <ActivityIndicator size="small" color="#0f172a" />
                : <Text style={s.saveBtnText}>Save attendance</Text>}
            </TouchableOpacity>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f172a' },
  header:       { padding: 20, paddingBottom: 8 },
  title:        { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  dateRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  dateText:     { color: '#94a3b8', fontSize: 13 },
  chipRow:      { flexGrow: 0, marginBottom: 8 },
  chip:         { borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: '#1e293b' },
  chipActive:   { borderColor: '#38bdf8', backgroundColor: '#38bdf820' },
  chipText:     { color: '#64748b', fontSize: 13, fontWeight: '600' },
  chipTextActive:{ color: '#38bdf8' },
  quickRow:     { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  quickLabel:   { color: '#64748b', fontSize: 12, fontWeight: '600' },
  quickBtn:     { borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  quickBtnText: { fontSize: 12, fontWeight: '700' },
  list:         { padding: 16, gap: 8, paddingBottom: 100 },
  emptyWrap:    { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 32 },
  empty:        { color: '#94a3b8', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  learnerCard:  { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  learnerInfo:  { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  avatar:       { width: 36, height: 36, borderRadius: 18, backgroundColor: '#0ea5e920', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { color: '#38bdf8', fontWeight: '700', fontSize: 12 },
  learnerName:  { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  learnerGrade: { color: '#64748b', fontSize: 12, marginTop: 1 },
  statusBtns:   { flexDirection: 'row', gap: 6 },
  statusBtn:    { width: 36, height: 36, borderRadius: 8, borderWidth: 1, borderColor: '#334155', alignItems: 'center', justifyContent: 'center' },
  saveBar:      { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#0f172a', borderTopWidth: 1, borderTopColor: '#1e293b', padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  saveBarText:  { color: '#64748b', fontSize: 13, fontWeight: '600' },
  saveBtn:      { backgroundColor: '#38bdf8', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 24, alignItems: 'center' },
  saveBtnDisabled:{ opacity: 0.5 },
  saveBtnText:  { color: '#0f172a', fontWeight: '700', fontSize: 14 },
});
