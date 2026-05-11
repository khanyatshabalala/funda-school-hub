import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

function greetingTime() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function currentTerm() {
  const m = new Date().getMonth() + 1;
  if (m <= 3) return 1;
  if (m <= 6) return 2;
  if (m <= 9) return 3;
  return 4;
}

export default function HomeScreen() {
  const { primarySchoolId, primaryRole, displayName } = useAuth();
  const [school, setSchool] = useState<{ name: string } | null>(null);
  const [learnerCount, setLearnerCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const firstName = displayName?.split(' ')[0] ?? '';
  const term = currentTerm();

  useEffect(() => {
    if (!primarySchoolId) { setLoading(false); return; }
    Promise.all([
      supabase.from('schools').select('name').eq('id', primarySchoolId).maybeSingle(),
      supabase.from('learners').select('*', { count: 'exact', head: true }).eq('school_id', primarySchoolId),
    ]).then(([{ data: s }, { count }]) => {
      setSchool(s as any);
      setLearnerCount(count ?? 0);
      setLoading(false);
    });
  }, [primarySchoolId]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Greeting */}
        <View style={styles.greeting}>
          <Text style={styles.greetingText}>
            {greetingTime()}{firstName ? `, ${firstName}` : ''} 👋
          </Text>
          <Text style={styles.greetingSub}>
            Term {term}{school ? ` · ${school.name}` : ''}
          </Text>
        </View>

        {/* Role badge */}
        <View style={styles.roleBadge}>
          <Text style={styles.roleBadgeText}>
            {primaryRole.replace('_', ' ')}
          </Text>
        </View>

        {/* Stats */}
        {primaryRole !== 'parent' && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{learnerCount}</Text>
              <Text style={styles.statLabel}>Learners</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{term}</Text>
              <Text style={styles.statLabel}>Current term</Text>
            </View>
          </View>
        )}

        {!primarySchoolId && primaryRole !== 'parent' && (
          <View style={styles.infoCard}>
            <Text style={styles.infoText}>No school assigned to your account.</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  scroll: { padding: 20, gap: 16 },
  greeting: { marginBottom: 4 },
  greetingText: { fontSize: 24, fontWeight: '800', color: '#f1f5f9' },
  greetingSub: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  roleBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#1e293b',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  roleBadgeText: { fontSize: 12, color: '#94a3b8', textTransform: 'capitalize' },
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  statValue: { fontSize: 28, fontWeight: '800', color: '#38bdf8' },
  statLabel: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  infoCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 16,
  },
  infoText: { color: '#94a3b8', fontSize: 14, textAlign: 'center' },
});
