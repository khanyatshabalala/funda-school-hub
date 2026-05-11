import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Learner = {
  id: string;
  first_name: string;
  last_name: string;
  grade_id: number;
  learner_number: string | null;
  gender: string | null;
};

export default function LearnersScreen() {
  const { primarySchoolId } = useAuth();
  const [learners, setLearners] = useState<Learner[]>([]);
  const [search, setSearch]     = useState('');
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    if (!primarySchoolId) { setLoading(false); return; }
    supabase
      .from('learners')
      .select('id, first_name, last_name, grade_id, learner_number, gender')
      .eq('school_id', primarySchoolId)
      .order('last_name')
      .then(({ data }) => {
        setLearners((data ?? []) as Learner[]);
        setLoading(false);
      });
  }, [primarySchoolId]);

  const filtered = learners.filter((l) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return `${l.first_name} ${l.last_name}`.toLowerCase().includes(q)
      || (l.learner_number ?? '').toLowerCase().includes(q);
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Learners</Text>
        <Text style={styles.count}>{learners.length} registered</Text>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search" size={16} color="#475569" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name or learner number…"
          placeholderTextColor="#475569"
        />
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {filtered.length === 0 ? (
            <Text style={styles.empty}>
              {search ? 'No learners match your search.' : 'No learners registered yet.'}
            </Text>
          ) : (
            filtered.map((l) => (
              <View key={l.id} style={styles.card}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>
                    {l.first_name[0]}{l.last_name[0]}
                  </Text>
                </View>
                <View style={styles.cardBody}>
                  <Text style={styles.name}>{l.first_name} {l.last_name}</Text>
                  <Text style={styles.sub}>
                    Grade {l.grade_id === 0 ? 'R' : l.grade_id}
                    {l.learner_number ? ` · ${l.learner_number}` : ''}
                    {l.gender ? ` · ${l.gender}` : ''}
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

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0f172a' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', padding: 20, paddingBottom: 8 },
  title:       { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  count:       { fontSize: 13, color: '#64748b' },
  searchWrap:  { flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 12, backgroundColor: '#1e293b', borderRadius: 10, paddingHorizontal: 12 },
  searchIcon:  { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 14, color: '#f1f5f9' },
  list:        { padding: 16, gap: 8 },
  empty:       { color: '#475569', textAlign: 'center', marginTop: 40 },
  card:        { backgroundColor: '#1e293b', borderRadius: 12, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar:      { width: 40, height: 40, borderRadius: 20, backgroundColor: '#0ea5e922', alignItems: 'center', justifyContent: 'center' },
  avatarText:  { color: '#38bdf8', fontWeight: '700', fontSize: 14 },
  cardBody:    { flex: 1 },
  name:        { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  sub:         { color: '#64748b', fontSize: 12, marginTop: 2 },
});
