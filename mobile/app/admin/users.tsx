import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function AdminUsers() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (supabase as any).from('profiles').select('id,full_name').limit(100).then(({ data }) => {
      setUsers(data ?? []); setLoading(false);
    });
  }, []);

  if (loading) return <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />;

  return (
    <ScrollView contentContainerStyle={s.container}>
      {users.map(u => (
        <View key={u.id} style={s.row}>
          <Text style={s.text}>{u.full_name ?? '—'}</Text>
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
