import { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

export default function ProfileScreen() {
  const { user, profile, primaryRole, displayName, refresh, signOut } = useAuth();
  const [editingProfile, setEditingProfile] = useState(false);
  const [editingPassword, setEditingPassword] = useState(false);
  const [fullName, setFullName] = useState(profile?.full_name ?? "");
  const [phone, setPhone] = useState(profile?.phone ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const initials = displayName?.split(" ").map((w) => w[0]).slice(0, 2).join("") ?? "?";
  const roleLabel = primaryRole.replace(/_/g, " ");

  const onSaveProfile = async () => {
    if (!fullName.trim() || fullName.trim().length < 2) { Alert.alert("Name must be at least 2 characters"); return; }
    setSavingProfile(true);
    const { error } = await supabase.from("profiles").update({ full_name: fullName.trim(), phone: phone.trim() || null }).eq("id", user!.id);
    setSavingProfile(false);
    if (error) { Alert.alert("Error", "Could not update profile."); return; }
    await refresh();
    setEditingProfile(false);
    Alert.alert("Profile updated");
  };

  const onChangePassword = async () => {
    if (!currentPw) { Alert.alert("Enter your current password"); return; }
    if (newPw.length < 6) { Alert.alert("New password must be at least 6 characters"); return; }
    if (newPw !== confirmPw) { Alert.alert("Passwords do not match"); return; }
    setSavingPassword(true);
    const { error: signInErr } = await supabase.auth.signInWithPassword({ email: user!.email!, password: currentPw });
    if (signInErr) { setSavingPassword(false); Alert.alert("Incorrect current password"); return; }
    const { error } = await supabase.auth.updateUser({ password: newPw });
    setSavingPassword(false);
    if (error) { Alert.alert("Error", "Could not update password."); return; }
    setEditingPassword(false);
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    Alert.alert("Password updated");
  };

  const handleSignOut = () =>
    Alert.alert("Sign out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign out", style: "destructive", onPress: signOut },
    ]);

  return (
    <SafeAreaView style={s.container}>
      <ScrollView contentContainerStyle={s.scroll}>
        {/* Avatar */}
        <View style={s.avatarWrap}>
          <View style={s.avatar}><Text style={s.avatarText}>{initials}</Text></View>
          <Text style={s.name}>{displayName ?? "User"}</Text>
          <Text style={s.role}>{roleLabel}</Text>
        </View>

        {/* Personal details */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <Text style={s.cardTitle}>Personal details</Text>
            {!editingProfile && (
              <TouchableOpacity onPress={() => { setFullName(profile?.full_name ?? ""); setPhone(profile?.phone ?? ""); setEditingProfile(true); }}>
                <Ionicons name="pencil" size={16} color="#38bdf8" />
              </TouchableOpacity>
            )}
          </View>
          {editingProfile ? (
            <View style={s.form}>
              <Text style={s.label}>Full name</Text>
              <TextInput style={s.input} value={fullName} onChangeText={setFullName} autoFocus />
              <Text style={s.label}>Phone (optional)</Text>
              <TextInput style={s.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="+27 82 000 0000" placeholderTextColor="#475569" />
              <View style={s.formBtns}>
                <TouchableOpacity style={[s.saveBtn, savingProfile && s.saveBtnDisabled]} onPress={onSaveProfile} disabled={savingProfile}>
                  {savingProfile ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={s.saveBtnText}>Save</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => setEditingProfile(false)}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <View>
              <View style={s.row}><Text style={s.rowLabel}>Name</Text><Text style={s.rowValue}>{profile?.full_name ?? "—"}</Text></View>
              <View style={s.divider} />
              <View style={s.row}><Text style={s.rowLabel}>Email</Text><Text style={s.rowValue} numberOfLines={1}>{user?.email ?? "—"}</Text></View>
              <View style={s.divider} />
              <View style={s.row}><Text style={s.rowLabel}>Phone</Text><Text style={s.rowValue}>{profile?.phone ?? "—"}</Text></View>
              <View style={s.divider} />
              <View style={s.row}><Text style={s.rowLabel}>Role</Text><View style={s.rolePill}><Text style={s.rolePillText}>{roleLabel}</Text></View></View>
            </View>
          )}
        </View>

        {/* Password */}
        <View style={s.card}>
          <View style={s.cardHeader}>
            <View>
              <Text style={s.cardTitle}>Password</Text>
              {!editingPassword && <Text style={s.passwordDots}>••••••••</Text>}
            </View>
            {!editingPassword && (
              <TouchableOpacity onPress={() => setEditingPassword(true)}>
                <Text style={s.changePasswordText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>
          {editingPassword && (
            <View style={s.form}>
              <Text style={s.label}>Current password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, { flex: 1 }]} value={currentPw} onChangeText={setCurrentPw} secureTextEntry={!showCurrent} autoFocus />
                <TouchableOpacity onPress={() => setShowCurrent((v) => !v)} style={s.eyeBtn}>
                  <Ionicons name={showCurrent ? "eye-off" : "eye"} size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={s.label}>New password</Text>
              <View style={s.pwWrap}>
                <TextInput style={[s.input, { flex: 1 }]} value={newPw} onChangeText={setNewPw} secureTextEntry={!showNew} />
                <TouchableOpacity onPress={() => setShowNew((v) => !v)} style={s.eyeBtn}>
                  <Ionicons name={showNew ? "eye-off" : "eye"} size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
              <Text style={s.label}>Confirm new password</Text>
              <TextInput style={s.input} value={confirmPw} onChangeText={setConfirmPw} secureTextEntry />
              <View style={s.formBtns}>
                <TouchableOpacity style={[s.saveBtn, savingPassword && s.saveBtnDisabled]} onPress={onChangePassword} disabled={savingPassword}>
                  {savingPassword ? <ActivityIndicator size="small" color="#0f172a" /> : <Text style={s.saveBtnText}>Update</Text>}
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => { setEditingPassword(false); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }}>
                  <Text style={s.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        <TouchableOpacity style={s.signOutBtn} onPress={handleSignOut}>
          <Ionicons name="log-out-outline" size={18} color="#ef4444" />
          <Text style={s.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#0f172a" },
  scroll:            { padding: 20, gap: 16, paddingBottom: 40 },
  avatarWrap:        { alignItems: "center", gap: 8, paddingVertical: 8 },
  avatar:            { width: 72, height: 72, borderRadius: 36, backgroundColor: "#0ea5e920", alignItems: "center", justifyContent: "center" },
  avatarText:        { color: "#38bdf8", fontSize: 26, fontWeight: "800" },
  name:              { fontSize: 20, fontWeight: "800", color: "#f1f5f9" },
  role:              { fontSize: 13, color: "#64748b", textTransform: "capitalize" },
  card:              { backgroundColor: "#1e293b", borderRadius: 16, padding: 16, gap: 12 },
  cardHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  cardTitle:         { fontSize: 15, fontWeight: "700", color: "#f1f5f9" },
  passwordDots:      { color: "#64748b", fontSize: 13, marginTop: 2 },
  changePasswordText:{ color: "#38bdf8", fontSize: 13, fontWeight: "600" },
  row:               { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10 },
  divider:           { height: 1, backgroundColor: "#0f172a" },
  rowLabel:          { color: "#64748b", fontSize: 13 },
  rowValue:          { color: "#f1f5f9", fontSize: 13, fontWeight: "500", maxWidth: "60%", textAlign: "right" },
  rolePill:          { backgroundColor: "#1e3a5f", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  rolePillText:      { color: "#60a5fa", fontSize: 12, fontWeight: "600", textTransform: "capitalize" },
  form:              { gap: 4 },
  label:             { fontSize: 13, fontWeight: "600", color: "#94a3b8", marginTop: 10, marginBottom: 4 },
  input:             { backgroundColor: "#0f172a", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#f1f5f9" },
  pwWrap:            { flexDirection: "row", alignItems: "center", gap: 4 },
  eyeBtn:            { padding: 8 },
  formBtns:          { flexDirection: "row", gap: 10, marginTop: 8 },
  saveBtn:           { flex: 1, backgroundColor: "#38bdf8", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  saveBtnDisabled:   { opacity: 0.5 },
  saveBtnText:       { color: "#0f172a", fontWeight: "700", fontSize: 14 },
  cancelBtn:         { flex: 1, backgroundColor: "#0f172a", borderRadius: 10, paddingVertical: 12, alignItems: "center" },
  cancelBtnText:     { color: "#94a3b8", fontWeight: "600", fontSize: 14 },
  signOutBtn:        { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#1e293b", borderRadius: 12, paddingVertical: 14, borderWidth: 1, borderColor: "#ef444430" },
  signOutText:       { color: "#ef4444", fontWeight: "700", fontSize: 15 },
});
