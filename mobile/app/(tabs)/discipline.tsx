import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type DisciplineType = 'merit' | 'warning' | 'detention' | 'suspension' | 'incident';

interface DisciplineRow {
  id: string;
  date: string;
  title: string;
  type: DisciplineType;
  points: number | null;
  learners: { first_name: string; last_name: string; grade_id: number } | null;
}

interface Learner {
  id: string;
  first_name: string;
  last_name: string;
  grade_id: number;
}

const TYPE_COLORS: Record<DisciplineType, string> = {
  merit:      '#22c55e',
  warning:    '#f97316',
  detention:  '#ef4444',
  suspension: '#b91c1c',
  incident:   '#a855f7',
};

const TYPES: DisciplineType[] = ['merit', 'warning', 'detention', 'suspension', 'incident'];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function DisciplineScreen() {
  const { primarySchoolId, primaryRole, user } = useAuth();
  const isStaff = primaryRole !== 'parent';

  const [records, setRecords]   = useState<DisciplineRow[]>([]);
  const [learners, setLearners] = useState<Learner[]>([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);

  // Form state
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [learnerId, setLearnerId]     = useState('');
  const [type, setType]               = useState<DisciplineType>('warning');
  const [title, setTitle]             = useState('');
  const [saving, setSaving]           = useState(false);

  const gradeOptions = Array.from(new Set(learners.map((l) => l.grade_id))).sort((a, b) => a - b);
  const filteredLearners = gradeFilter !== null
    ? learners.filter((l) => l.grade_id === gradeFilter)
    : [];

  const load = async () => {
    if (!primarySchoolId) { setLoading(false); return; }
    setLoading(true);

    const { data: lData } = await supabase
      .from('learners')
      .select('id, first_name, last_name, grade_id')
      .eq('school_id', primarySchoolId)
      .order('last_name');

    const learnerList = (lData ?? []) as Learner[];
    setLearners(learnerList);

    const ids = learnerList.map((l) => l.id);
    if (ids.length > 0) {
      const { data: rData } = await supabase
        .from('discipline_records')
        .select('id, date, title, type, points, learners(first_name, last_name, grade_id)')
        .in('learner_id', ids)
        .order('date', { ascending: false })
        .limit(50);
      setRecords((rData ?? []) as DisciplineRow[]);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const handleSave = async () => {
    if (!learnerId) return Alert.alert('Select a learner');
    if (!title.trim()) return Alert.alert('Enter a title');
    setSaving(true);
    const { error } = await supabase.from('discipline_records').insert({
      learner_id:  learnerId,
      type,
      title:       title.trim(),
      date:        todayIso(),
      recorded_by: user?.id,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setModalOpen(false);
    setLearnerId('');
    setTitle('');
    setGradeFilter(null);
    load();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Discipline</Text>
        {isStaff && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
            <Ionicons name="add" size={20} color="#0f172a" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {records.length === 0 ? (
            <Text style={styles.empty}>No discipline records yet.</Text>
          ) : (
            records.map((r) => (
              <View key={r.id} style={styles.card}>
                <View style={[styles.typeDot, { backgroundColor: TYPE_COLORS[r.type] }]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{r.title}</Text>
                  <Text style={styles.cardSub}>
                    {r.learners?.first_name} {r.learners?.last_name}
                    {' · '}Grade {r.learners?.grade_id === 0 ? 'R' : r.learners?.grade_id}
                    {' · '}{new Date(r.date + 'T00:00:00').toLocaleDateString('en-ZA', { day: 'numeric', month: 'short' })}
                  </Text>
                </View>
                <View style={[styles.typePill, { backgroundColor: TYPE_COLORS[r.type] + '22' }]}>
                  <Text style={[styles.typePillText, { color: TYPE_COLORS[r.type] }]}>
                    {r.type}
                  </Text>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Log record modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Log record</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            {/* Grade picker */}
            <Text style={styles.fieldLabel}>Grade</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {gradeOptions.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[styles.chip, gradeFilter === g && styles.chipActive]}
                  onPress={() => { setGradeFilter(g); setLearnerId(''); }}
                >
                  <Text style={[styles.chipText, gradeFilter === g && styles.chipTextActive]}>
                    Grade {g === 0 ? 'R' : g}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Learner picker */}
            {gradeFilter !== null && (
              <>
                <Text style={styles.fieldLabel}>Learner</Text>
                {filteredLearners.map((l) => (
                  <TouchableOpacity
                    key={l.id}
                    style={[styles.learnerRow, learnerId === l.id && styles.learnerRowActive]}
                    onPress={() => setLearnerId(l.id)}
                  >
                    <Text style={[styles.learnerName, learnerId === l.id && styles.learnerNameActive]}>
                      {l.first_name} {l.last_name}
                    </Text>
                    {learnerId === l.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                  </TouchableOpacity>
                ))}
              </>
            )}

            {/* Type picker */}
            <Text style={styles.fieldLabel}>Type</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipRow}>
              {TYPES.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.chip, type === t && { backgroundColor: TYPE_COLORS[t] + '33', borderColor: TYPE_COLORS[t] }]}
                  onPress={() => setType(t)}
                >
                  <Text style={[styles.chipText, type === t && { color: TYPE_COLORS[t] }]}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Title */}
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Disruptive behaviour in class"
              placeholderTextColor="#475569"
              maxLength={200}
            />

            <TouchableOpacity
              style={[styles.saveBtn, (saving || !learnerId || !title.trim()) && styles.saveBtnDisabled]}
              onPress={handleSave}
              disabled={saving || !learnerId || !title.trim()}
            >
              {saving
                ? <ActivityIndicator color="#0f172a" />
                : <Text style={styles.saveBtnText}>Log record</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0f172a' },
  header:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 12 },
  title:            { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  addBtn:           { backgroundColor: '#38bdf8', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  list:             { padding: 16, gap: 10 },
  empty:            { color: '#475569', textAlign: 'center', marginTop: 40 },
  card:             { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  typeDot:          { width: 10, height: 10, borderRadius: 5 },
  cardBody:         { flex: 1 },
  cardTitle:        { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  cardSub:          { color: '#64748b', fontSize: 12, marginTop: 2 },
  typePill:         { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3 },
  typePillText:     { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },
  // Modal
  modal:            { flex: 1, backgroundColor: '#0f172a' },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle:       { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  modalBody:        { padding: 20, gap: 8 },
  fieldLabel:       { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginTop: 12, marginBottom: 6 },
  chipRow:          { flexDirection: 'row', marginBottom: 4 },
  chip:             { borderWidth: 1, borderColor: '#334155', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, marginRight: 8, backgroundColor: '#1e293b' },
  chipActive:       { borderColor: '#38bdf8', backgroundColor: '#38bdf822' },
  chipText:         { color: '#94a3b8', fontSize: 13, fontWeight: '600' },
  chipTextActive:   { color: '#38bdf8' },
  learnerRow:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderRadius: 10, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#1e293b' },
  learnerRowActive: { borderColor: '#38bdf8' },
  learnerName:      { color: '#cbd5e1', fontSize: 14 },
  learnerNameActive:{ color: '#f1f5f9', fontWeight: '600' },
  input:            { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#f1f5f9' },
  saveBtn:          { backgroundColor: '#38bdf8', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnDisabled:  { opacity: 0.5 },
  saveBtnText:      { color: '#0f172a', fontWeight: '700', fontSize: 15 },
});
