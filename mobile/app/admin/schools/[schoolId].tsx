import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function SchoolDetail() {
  const { schoolId } = useLocalSearchParams();
  const [school, setSchool] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!schoolId) return;
    (supabase as any).from('schools').select('*').eq('id', schoolId).maybeSingle()
      .then(({ data }) => { setSchool(data ?? null); setLoading(false); });
  }, [schoolId]);

  if (loading) return <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />;
  if (!school) return <View style={{ padding: 16 }}><Text style={{ color: '#94a3b8' }}>School not found.</Text></View>;

  return (
    <ScrollView contentContainerStyle={s.container}>
      <Text style={s.name}>{school.name}</Text>
      <Text style={s.meta}>{school.district}, {school.province}</Text>
      <View style={s.section}>
        <Text style={s.sectionTitle}>Quick actions</Text>
        <Text style={s.sectionItem}>• View learners</Text>
        <Text style={s.sectionItem}>• Manage classes</Text>
        <Text style={s.sectionItem}>• Upload report cards</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#0f172a' },
  name: { color: '#f1f5f9', fontSize: 20, fontWeight: '800', marginBottom: 6 },
  meta: { color: '#94a3b8', marginBottom: 12 },
  section: { backgroundColor: '#081223', padding: 12, borderRadius: 8 },
  sectionTitle: { color: '#cbd5e1', fontWeight: '700', marginBottom: 8 },
  sectionItem: { color: '#f1f5f9', marginBottom: 6 },
});
