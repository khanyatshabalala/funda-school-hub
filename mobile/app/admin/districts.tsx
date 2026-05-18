import { View, Text, ScrollView, ActivityIndicator, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function Districts() {
  const [districts, setDistricts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any).from('districts').select('id,name').order('name').then(({ data }) => {
      setDistricts(data ?? []);
      setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={s.container}>
      {districts.map((d) => (
        <View key={d.id} style={s.row}>
          <Text style={s.text}>{d.name}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#0f172a' },
  row: { backgroundColor: '#081223', padding: 12, borderRadius: 8, marginBottom: 8 },
  text: { color: '#f1f5f9' },
});
