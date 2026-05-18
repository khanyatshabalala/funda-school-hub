import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function AdminIndex() {
  const router = useRouter();

  const items = [
    { label: 'Schools', route: '/admin/schools' },
    { label: 'Districts', route: '/admin/districts' },
    { label: 'Users', route: '/admin/users' },
    { label: 'Admissions', route: '/admin/admissions' },
    { label: 'Marks & report cards', route: '/admin/marks' },
    { label: 'Audit', route: '/admin/audit' },
  ];

  return (
    <ScrollView contentContainerStyle={s.container}>
      {items.map((it) => (
        <TouchableOpacity key={it.route} style={s.card} onPress={() => router.push(it.route as any)}>
          <Text style={s.cardText}>{it.label}</Text>
          <Ionicons name="chevron-forward" size={18} color="#64748b" />
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#0f172a' },
  card: { backgroundColor: '#081223', padding: 16, borderRadius: 10, marginBottom: 12, flexDirection: 'row', alignItems: 'center' },
  cardText: { color: '#f1f5f9', fontWeight: '700', fontSize: 16, flex: 1 },
});
