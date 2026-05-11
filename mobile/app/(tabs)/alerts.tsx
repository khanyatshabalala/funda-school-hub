import { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type Notification = {
  id: string;
  title: string;
  body: string | null;
  category: string | null;
  read_at: string | null;
  created_at: string;
};

export default function AlertsScreen() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) { setLoading(false); return; }
    const { data } = await supabase
      .from('notifications')
      .select('id, title, body, category, read_at, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifications((data ?? []) as Notification[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const markRead = async (id: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id);
    setNotifications((prev) =>
      prev.map((n) => n.id === id ? { ...n, read_at: new Date().toISOString() } : n)
    );
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        {unreadCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unreadCount}</Text>
          </View>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.length === 0 ? (
            <Text style={styles.empty}>No notifications yet.</Text>
          ) : (
            notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read_at && styles.cardUnread]}
                onPress={() => !n.read_at && markRead(n.id)}
                activeOpacity={0.7}
              >
                {!n.read_at && <View style={styles.unreadDot} />}
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{n.title}</Text>
                  {n.body && <Text style={styles.cardBody2}>{n.body}</Text>}
                  <Text style={styles.cardTime}>
                    {new Date(n.created_at).toLocaleDateString('en-ZA', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#0f172a' },
  header:      { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 20, paddingBottom: 12 },
  title:       { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  badge:       { backgroundColor: '#38bdf8', borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText:   { color: '#0f172a', fontSize: 12, fontWeight: '700' },
  list:        { padding: 16, gap: 8 },
  empty:       { color: '#475569', textAlign: 'center', marginTop: 40 },
  card:        { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, flexDirection: 'row', gap: 10 },
  cardUnread:  { borderLeftWidth: 3, borderLeftColor: '#38bdf8' },
  unreadDot:   { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38bdf8', marginTop: 5 },
  cardBody:    { flex: 1 },
  cardTitle:   { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  cardBody2:   { color: '#94a3b8', fontSize: 13, marginTop: 3 },
  cardTime:    { color: '#475569', fontSize: 11, marginTop: 6 },
});
