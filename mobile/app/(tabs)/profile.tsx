import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/lib/auth-context';

export default function ProfileScreen() {
  const { displayName, primaryRole, primarySchoolId, signOut } = useAuth();

  const handleSignOut = () => {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        {/* Avatar */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {displayName?.split(' ').map((w) => w[0]).slice(0, 2).join('') ?? '?'}
          </Text>
        </View>

        <Text style={styles.name}>{displayName ?? 'User'}</Text>
        <Text style={styles.role}>{primaryRole.replace('_', ' ')}</Text>

        {/* Info rows */}
        <View style={styles.infoCard}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue} numberOfLines={1}>
              {primaryRole.replace('_', ' ')}
            </Text>
          </View>
          {primarySchoolId && (
            <View style={[styles.infoRow, { borderTopWidth: 1, borderTopColor: '#0f172a' }]}>
              <Text style={styles.infoLabel}>School ID</Text>
              <Text style={styles.infoValue} numberOfLines={1}>
                {primarySchoolId.slice(0, 8)}…
              </Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#0f172a' },
  inner:        { flex: 1, alignItems: 'center', padding: 32, paddingTop: 48 },
  avatar:       { width: 80, height: 80, borderRadius: 40, backgroundColor: '#0ea5e922', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  avatarText:   { color: '#38bdf8', fontSize: 28, fontWeight: '800' },
  name:         { fontSize: 22, fontWeight: '800', color: '#f1f5f9', marginBottom: 4 },
  role:         { fontSize: 14, color: '#64748b', textTransform: 'capitalize', marginBottom: 32 },
  infoCard:     { width: '100%', backgroundColor: '#1e293b', borderRadius: 12, overflow: 'hidden', marginBottom: 24 },
  infoRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 14 },
  infoLabel:    { fontSize: 13, color: '#64748b' },
  infoValue:    { fontSize: 13, color: '#f1f5f9', fontWeight: '600', maxWidth: '60%' },
  signOutBtn:   { width: '100%', backgroundColor: '#1e293b', borderRadius: 12, paddingVertical: 14, alignItems: 'center', borderWidth: 1, borderColor: '#ef444433' },
  signOutText:  { color: '#ef4444', fontWeight: '700', fontSize: 15 },
});
