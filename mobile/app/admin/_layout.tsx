import { ReactNode } from 'react';
import { SafeAreaView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/lib/auth-context';
import { Ionicons } from '@expo/vector-icons';

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { primaryRole } = useAuth();

  // Only principals and school_admins may access these screens on mobile
  const allowed = ['principal', 'school_admin'].includes(primaryRole);

  if (!allowed) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={20} color="#94a3b8" />
          </TouchableOpacity>
          <Text style={s.title}>School admin</Text>
        </View>
        <View style={s.emptyWrap}>
          <Ionicons name="shield-outline" size={48} color="#334155" />
          <Text style={s.empty}>Access restricted</Text>
          <Text style={s.emptySub}>Only school staff with admin permissions can view this area.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={20} color="#94a3b8" />
        </TouchableOpacity>
        <Text style={s.title}>School admin</Text>
      </View>
      {children}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  title: { color: '#f1f5f9', fontSize: 18, fontWeight: '800' },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  empty: { color: '#94a3b8', fontSize: 16, marginTop: 12 },
  emptySub: { color: '#64748b', marginTop: 8, textAlign: 'center', paddingHorizontal: 24 },
});
