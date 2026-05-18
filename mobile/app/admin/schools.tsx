import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';

export default function AdminSchools() {
  const [schools, setSchools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    (supabase as any)
      .from('schools')
      .select('id,name')
      .order('name')
      .then(({ data }) => { setSchools(data ?? []); setLoading(false); });
  }, []);

  if (loading) return <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={s.container}>
      {schools.map((sc) => (
        <TouchableOpacity key={sc.id} style={s.card} onPress={() => router.push(`/admin/schools/${sc.id}` as any)}>
          <Text style={s.cardText}>{sc.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#0f172a' },
  card: { backgroundColor: '#081223', padding: 14, borderRadius: 8, marginBottom: 10 },
  cardText: { color: '#f1f5f9', fontWeight: '600' },
});
