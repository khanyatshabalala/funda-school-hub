import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet,
  ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
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

const CATEGORY_COLORS: Record<string, string> = {
  calendar:   '#38bdf8',
  marks:      '#22c55e',
  attendance: '#f97316',
  discipline: '#ef4444',
  admissions: '#a855f7',
  default:    '#64748b',
};

const CATEGORY_ICONS: Record<string, string> = {
  calendar:   'calendar',
  marks:      'document-text',
  attendance: 'checkmark-circle',
  discipline: 'shield',
  admissions: 'school',
  default:    'notifications',
};

function categoryColor(cat: string | null) {
  return CATEGORY_COLORS[cat ?? ''] ?? CATEGORY_COLORS.default;
}
function categoryIcon(cat: string | null): any {
  return CATEGORY_ICONS[cat ?? ''] ?? CATEGORY_ICONS.default;
}

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

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', user.id)
      .is('read_at', null);
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
  };

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={styles.unreadSub}>{unreadCount} unread</Text>
          )}
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity style={styles.markAllBtn} onPress={markAllRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {notifications.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="notifications-off-outline" size={40} color="#334155" />
              <Text style={styles.empty}>No notifications yet.</Text>
            </View>
          ) : (
            notifications.map((n) => (
              <TouchableOpacity
                key={n.id}
                style={[styles.card, !n.read_at && styles.cardUnread]}
                onPress={() => !n.read_at && markRead(n.id)}
                activeOpacity={0.7}
              >
                {/* Category icon */}
                <View style={[styles.iconWrap, { backgroundColor: categoryColor(n.category) + '22' }]}>
                  <Ionicons
                    name={categoryIcon(n.category)}
                    size={18}
                    color={categoryColor(n.category)}
                  />
                </View>

                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, !n.read_at && styles.cardTitleUnread]}>
                    {n.title}
                  </Text>
                  {n.body && <Text style={styles.cardBody}>{n.body}</Text>}
                  <Text style={styles.cardTime}>
                    {new Date(n.created_at).toLocaleDateString('en-ZA', {
                      day: 'numeric', month: 'short', year: 'numeric',
                    })}
                  </Text>
                </View>

                {!n.read_at && <View style={styles.unreadDot} />}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:       { flex: 1, backgroundColor: '#0f172a' },
  header:          { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  title:           { fontSize: 22, fontWeight: '800', color: '#f1f5f9' },
  unreadSub:       { fontSize: 12, color: '#38bdf8', marginTop: 2 },
  markAllBtn:      { backgroundColor: '#1e293b', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  markAllText:     { color: '#94a3b8', fontSize: 12, fontWeight: '600' },
  list:            { padding: 16, gap: 8, paddingBottom: 40 },
  emptyWrap:       { alignItems: 'center', marginTop: 60, gap: 12 },
  empty:           { color: '#475569', fontSize: 14 },
  card:            { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardUnread:      { borderLeftWidth: 3, borderLeftColor: '#38bdf8' },
  iconWrap:        { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shrink: 0 } as any,
  cardContent:     { flex: 1 },
  cardTitle:       { color: '#94a3b8', fontWeight: '500', fontSize: 14 },
  cardTitleUnread: { color: '#f1f5f9', fontWeight: '700' },
  cardBody:        { color: '#64748b', fontSize: 13, marginTop: 3, lineHeight: 18 },
  cardTime:        { color: '#475569', fontSize: 11, marginTop: 6 },
  unreadDot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: '#38bdf8', marginTop: 4 },
});
