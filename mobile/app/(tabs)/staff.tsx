import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from 'expo-router';
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type StaffMember = {
  id: string;
  full_name: string | null;
  created_at: string;
  roles: { id: string; role: string }[];
};

const ROLES = ["teacher", "school_admin"] as const;
type CreatableRole = typeof ROLES[number];

export default function StaffScreen() {
  const { primaryRole, primarySchoolId, user } = useAuth();
    const router = useRouter();
  const canManage = ["principal", "school_admin", "super_admin"].includes(primaryRole);

  const [staff, setStaff]         = useState<StaffMember[]>([]);
  const [schoolName, setSchoolName] = useState("");
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [removing, setRemoving]   = useState<string | null>(null);

  // Form state
  const [fullName, setFullName]   = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [role, setRole]           = useState<CreatableRole>("teacher");
  const [showPw, setShowPw]       = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);

  const load = async () => {
    if (!primarySchoolId) { setLoading(false); return; }
    setLoading(true);

    const { data: roleRows } = await supabase
      .from("user_roles")
      .select("id, user_id, role")
      .eq("school_id", primarySchoolId)
      .neq("role", "parent");

    if (!roleRows?.length) { setStaff([]); setLoading(false); return; }

    const userIds = [...new Set(roleRows.map(r => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .in("id", userIds);

    const rolesByUser = roleRows.reduce<Record<string, { id: string; role: string }[]>>((acc, r) => {
      (acc[r.user_id] ??= []).push({ id: r.id, role: r.role });
      return acc;
    }, {});

    const members: StaffMember[] = (profiles ?? []).map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      created_at: p.created_at,
      roles: rolesByUser[p.id] ?? [],
    }));

    setStaff(members.filter(m => m.id !== user?.id));
    setLoading(false);
  };

  useEffect(() => {
    load();
    if (primarySchoolId) {
      supabase.from("schools").select("name").eq("id", primarySchoolId).maybeSingle()
        .then(({ data }) => setSchoolName((data as any)?.name ?? ""));
    }
  }, [primarySchoolId]);

  const onCreateStaff = async () => {
    if (!fullName.trim()) { Alert.alert("Enter full name"); return; }
    if (!email.trim())    { Alert.alert("Enter email"); return; }
    if (password.length < 6) { Alert.alert("Password must be at least 6 characters"); return; }
    if (!primarySchoolId) return;

    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    try {
      const res = await fetch(
        `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/create-staff-account`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "",
          },
          body: JSON.stringify({
            full_name: fullName.trim(),
            email: email.trim(),
            password,
            role,
            school_id: primarySchoolId,
          }),
        }
      );
      const json = await res.json();
      setSaving(false);
      if (!res.ok) { Alert.alert("Error", json.error ?? "Could not create account"); return; }
      Alert.alert("Account created", `Share the temporary password with ${fullName.trim()}.`);
      setModalOpen(false);
      setFullName(""); setEmail(""); setPassword(""); setRole("teacher");
      load();
    } catch {
      setSaving(false);
      Alert.alert("Error", "Network error. Please try again.");
    }
  };

  const onRemove = (roleId: string, memberName: string | null) => {
    Alert.alert(
      "Remove staff member?",
      `This will remove ${memberName ?? "this person"}'s access to ${schoolName}. Their account will still exist.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove access", style: "destructive",
          onPress: async () => {
            setRemoving(roleId);
            const { error } = await supabase.from("user_roles").delete().eq("id", roleId);
            setRemoving(null);
            if (error) { Alert.alert("Error", error.message); return; }
            load();
          },
        },
      ]
    );
  };

  if (!canManage) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyWrap}>
          <Ionicons name="shield-outline" size={40} color="#334155" />
          <Text style={s.empty}>Only principals and school admins can manage staff.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Staff</Text>
        {['principal', 'school_admin'].includes(primaryRole) && (
          <TouchableOpacity style={s.adminBtn} onPress={() => router.push('/admin')}>
            <Ionicons name="shield-checkmark" size={18} color="#0f172a" />
          </TouchableOpacity>
        )}
        <TouchableOpacity style={s.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <View style={s.infoBanner}>
        <Ionicons name="information-circle-outline" size={14} color="#38bdf8" />
        <Text style={s.infoBannerText}>
          Staff sign in at the school portal using their email and temporary password.
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : staff.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="people-outline" size={40} color="#334155" />
          <Text style={s.empty}>No staff added yet.</Text>
          <Text style={s.emptySub}>Tap + to add a teacher or admin.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {staff.map(m => (
            <View key={m.id} style={s.card}>
              <View style={s.avatar}>
                <Text style={s.avatarText}>
                  {(m.full_name ?? "?").split(" ").map(w => w[0]).slice(0, 2).join("")}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.cardName}>{m.full_name ?? "—"}</Text>
                <View style={s.rolePills}>
                  {m.roles.map(r => (
                    <View key={r.id} style={s.rolePill}>
                      <Text style={s.rolePillText}>{r.role.replace("_", " ")}</Text>
                    </View>
                  ))}
                </View>
                <Text style={s.cardDate}>
                  Added {new Date(m.created_at).toLocaleDateString("en-ZA", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </Text>
              </View>
              {m.roles.map(r => (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => onRemove(r.id, m.full_name)}
                  disabled={removing === r.id}
                  style={s.removeBtn}
                >
                  {removing === r.id
                    ? <ActivityIndicator size="small" color="#ef4444" />
                    : <Ionicons name="trash-outline" size={18} color="#ef4444" />}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add staff modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add staff member</Text>
            <TouchableOpacity onPress={() => { setModalOpen(false); setFullName(""); setEmail(""); setPassword(""); }}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            <Text style={s.fieldLabel}>Full name</Text>
            <TextInput
              style={s.input} value={fullName} onChangeText={setFullName}
              placeholder="e.g. Nomsa Dlamini" placeholderTextColor="#475569" autoFocus
            />

            <Text style={s.fieldLabel}>Work email</Text>
            <TextInput
              style={s.input} value={email} onChangeText={setEmail}
              placeholder="teacher@school.co.za" placeholderTextColor="#475569"
              keyboardType="email-address" autoCapitalize="none"
            />

            <Text style={s.fieldLabel}>Temporary password</Text>
            <View style={s.pwWrap}>
              <TextInput
                style={[s.input, { flex: 1 }]} value={password} onChangeText={setPassword}
                secureTextEntry={!showPw} placeholder="Min. 6 characters" placeholderTextColor="#475569"
              />
              <TouchableOpacity onPress={() => setShowPw(v => !v)} style={s.eyeBtn}>
                <Ionicons name={showPw ? "eye-off" : "eye"} size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Role</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowRolePicker(true)}>
              <Text style={s.pickerText}>{role.replace("_", " ")}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.saveBtn, (saving || !fullName.trim() || !email.trim() || password.length < 6) && s.saveBtnDisabled]}
              onPress={onCreateStaff}
              disabled={saving || !fullName.trim() || !email.trim() || password.length < 6}
            >
              {saving
                ? <ActivityIndicator color="#0f172a" />
                : <Text style={s.saveBtnText}>Create account</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>

        {/* Role picker */}
        <Modal visible={showRolePicker} transparent animationType="slide">
          <View style={s.pickerModal}>
            <View style={s.pickerSheet}>
              <Text style={s.pickerTitle}>Select role</Text>
              {ROLES.map(r => (
                <TouchableOpacity
                  key={r}
                  style={s.pickerOption}
                  onPress={() => { setRole(r); setShowRolePicker(false); }}
                >
                  <Text style={[s.pickerOptionText, role === r && s.pickerOptionActive]}>
                    {r.replace("_", " ")}
                  </Text>
                  {role === r && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                </TouchableOpacity>
              ))}
              <TouchableOpacity style={s.pickerCancel} onPress={() => setShowRolePicker(false)}>
                <Text style={s.pickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:          { flex: 1, backgroundColor: "#0f172a" },
  header:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 12 },
  title:              { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  addBtn:             { backgroundColor: "#38bdf8", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  infoBanner:         { flexDirection: "row", alignItems: "flex-start", gap: 8, marginHorizontal: 16, marginBottom: 12, backgroundColor: "#0ea5e915", borderRadius: 10, padding: 10 },
  infoBannerText:     { color: "#38bdf8", fontSize: 12, flex: 1, lineHeight: 17 },
  list:               { padding: 16, gap: 10, paddingBottom: 40 },
  emptyWrap:          { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  empty:              { color: "#94a3b8", fontSize: 15, fontWeight: "600", textAlign: "center" },
  emptySub:           { color: "#475569", fontSize: 13, textAlign: "center" },
  card:               { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1e293b", borderRadius: 12, padding: 14 },
  avatar:             { width: 40, height: 40, borderRadius: 20, backgroundColor: "#0ea5e920", alignItems: "center", justifyContent: "center" },
  avatarText:         { color: "#38bdf8", fontWeight: "700", fontSize: 14 },
  cardName:           { color: "#f1f5f9", fontWeight: "600", fontSize: 14 },
  rolePills:          { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  rolePill:           { backgroundColor: "#1e3a5f", borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  rolePillText:       { color: "#60a5fa", fontSize: 11, fontWeight: "600", textTransform: "capitalize" },
  cardDate:           { color: "#475569", fontSize: 11, marginTop: 3 },
  removeBtn:          { padding: 4 },
  modal:              { flex: 1, backgroundColor: "#0f172a" },
  modalHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  modalTitle:         { fontSize: 18, fontWeight: "700", color: "#f1f5f9" },
  modalBody:          { padding: 20, gap: 4, paddingBottom: 40 },
  fieldLabel:         { fontSize: 13, fontWeight: "600", color: "#94a3b8", marginTop: 14, marginBottom: 6 },
  input:              { backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#f1f5f9" },
  pwWrap:             { flexDirection: "row", alignItems: "center", gap: 4 },
  eyeBtn:             { padding: 8 },
  picker:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerText:         { color: "#f1f5f9", fontSize: 14, textTransform: "capitalize" },
  saveBtn:            { backgroundColor: "#38bdf8", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnDisabled:    { opacity: 0.5 },
  saveBtnText:        { color: "#0f172a", fontWeight: "700", fontSize: 15 },
  pickerModal:        { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000080" },
  pickerSheet:        { backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 20 },
  pickerTitle:        { fontSize: 16, fontWeight: "700", color: "#f1f5f9", padding: 20, borderBottomWidth: 1, borderBottomColor: "#334155" },
  pickerOption:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  pickerOptionText:   { color: "#cbd5e1", fontSize: 15, textTransform: "capitalize" },
  pickerOptionActive: { color: "#38bdf8", fontWeight: "700" },
  pickerCancel:       { margin: 16, backgroundColor: "#0f172a", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  pickerCancelText:   { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
  adminBtn:           { backgroundColor: '#38bdf8', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
});
