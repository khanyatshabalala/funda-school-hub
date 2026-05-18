import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

type TransferStatus = "pending" | "approved" | "rejected" | "completed";

type Transfer = {
  id: string; status: TransferStatus; reason: string | null;
  requested_at: string; resolved_at: string | null;
  learner_id: string; from_school_id: string; to_school_id: string;
  learners: { first_name: string; last_name: string; grade_id: number } | null;
  from_school: { name: string } | null;
  to_school: { name: string } | null;
};
type Learner = { id: string; first_name: string; last_name: string; grade_id: number };
type School  = { id: string; name: string };

const STATUS_COLOR: Record<TransferStatus, string> = {
  pending: "#f97316", approved: "#22c55e", rejected: "#ef4444", completed: "#38bdf8",
};

export default function TransfersScreen() {
  const { primaryRole, primarySchoolId, user } = useAuth();
  const canManage = ["principal", "school_admin", "super_admin"].includes(primaryRole);

  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [learners, setLearners]   = useState<Learner[]>([]);
  const [schools, setSchools]     = useState<School[]>([]);
  const [loading, setLoading]     = useState(true);
  const [acting, setActing]       = useState<string | null>(null);
  const [tab, setTab]             = useState<"pending" | "history">("pending");
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]       = useState(false);

  // Form
  const [learnerId, setLearnerId]   = useState("");
  const [toSchoolId, setToSchoolId] = useState("");
  const [reason, setReason]         = useState("");
  const [showLearnerPicker, setShowLearnerPicker] = useState(false);
  const [showSchoolPicker, setShowSchoolPicker]   = useState(false);

  const load = async () => {
    if (!primarySchoolId) { setLoading(false); return; }
    setLoading(true);
    const [{ data: tData }, { data: lData }, { data: sData }] = await Promise.all([
      supabase.from("transfers")
        .select("id, status, reason, requested_at, resolved_at, learner_id, from_school_id, to_school_id, learners(first_name, last_name, grade_id), from_school:schools!transfers_from_school_id_fkey(name), to_school:schools!transfers_to_school_id_fkey(name)")
        .or(`from_school_id.eq.${primarySchoolId},to_school_id.eq.${primarySchoolId}`)
        .order("requested_at", { ascending: false }),
      supabase.from("learners").select("id, first_name, last_name, grade_id")
        .eq("school_id", primarySchoolId).order("last_name"),
      supabase.from("schools").select("id, name")
        .neq("id", primarySchoolId).order("name").limit(200),
    ]);
    setTransfers((tData ?? []) as unknown as Transfer[]);
    setLearners((lData ?? []) as Learner[]);
    setSchools((sData ?? []) as School[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const onRequest = async () => {
    if (!learnerId)   { Alert.alert("Select a learner"); return; }
    if (!toSchoolId)  { Alert.alert("Select destination school"); return; }
    if (!primarySchoolId) return;
    setSaving(true);
    const { error } = await supabase.from("transfers").insert({
      learner_id:     learnerId,
      from_school_id: primarySchoolId,
      to_school_id:   toSchoolId,
      reason:         reason.trim() || null,
      requested_by:   user?.id,
    });
    setSaving(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Alert.alert("Submitted", "Transfer request has been submitted.");
    setModalOpen(false);
    setLearnerId(""); setToSchoolId(""); setReason("");
    load();
  };

  const updateStatus = async (id: string, status: TransferStatus) => {
    setActing(id);
    const { error } = await supabase.from("transfers").update({
      status,
      approved_by: user?.id,
      resolved_at: new Date().toISOString(),
    }).eq("id", id);
    setActing(null);
    if (error) { Alert.alert("Error", error.message); return; }
    load();
  };

  if (!canManage) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyWrap}>
          <Ionicons name="shield-outline" size={40} color="#334155" />
          <Text style={s.empty}>Only principals and school admins can manage transfers.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pending  = transfers.filter(t => t.status === "pending");
  const history  = transfers.filter(t => t.status !== "pending");
  const displayed = tab === "pending" ? pending : history;

  const selectedLearner = learners.find(l => l.id === learnerId);
  const selectedSchool  = schools.find(sc => sc.id === toSchoolId);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Transfers</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      <View style={s.tabs}>
        <TouchableOpacity style={[s.tab, tab === "pending" && s.tabActive]} onPress={() => setTab("pending")}>
          <Text style={[s.tabText, tab === "pending" && s.tabTextActive]}>
            Pending{pending.length > 0 ? ` (${pending.length})` : ""}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[s.tab, tab === "history" && s.tabActive]} onPress={() => setTab("history")}>
          <Text style={[s.tabText, tab === "history" && s.tabTextActive]}>History</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : displayed.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="swap-horizontal-outline" size={40} color="#334155" />
          <Text style={s.empty}>
            {tab === "pending" ? "No pending transfers." : "No transfer history yet."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {displayed.map(t => {
            const learnerName = t.learners
              ? `${(t.learners as any).first_name} ${(t.learners as any).last_name}`
              : "Unknown";
            const gradeId = (t.learners as any)?.grade_id;
            const fromName = (t.from_school as any)?.name ?? "—";
            const toName   = (t.to_school as any)?.name ?? "—";
            const color    = STATUS_COLOR[t.status];

            return (
              <View key={t.id} style={s.card}>
                <View style={s.cardTop}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>
                      {learnerName.split(" ").map(w => w[0]).slice(0, 2).join("")}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{learnerName}</Text>
                    {gradeId !== undefined && (
                      <Text style={s.cardSub}>
                        Grade {gradeId === 0 ? "R" : gradeId}
                      </Text>
                    )}
                    <Text style={s.cardRoute}>{fromName} → {toName}</Text>
                    {t.reason && <Text style={s.cardReason}>{t.reason}</Text>}
                  </View>
                  <View style={[s.statusPill, { backgroundColor: color + "22" }]}>
                    <Text style={[s.statusPillText, { color }]}>{t.status}</Text>
                  </View>
                </View>

                <Text style={s.cardDate}>
                  {new Date(t.requested_at).toLocaleDateString("en-ZA", {
                    day: "numeric", month: "short", year: "numeric",
                  })}
                </Text>

                {t.status === "pending" && (
                  <View style={s.actions}>
                    <TouchableOpacity
                      style={[s.approveBtn, acting === t.id && s.btnDisabled]}
                      onPress={() => updateStatus(t.id, "approved")}
                      disabled={acting === t.id}
                    >
                      {acting === t.id
                        ? <ActivityIndicator size="small" color="#fff" />
                        : <><Ionicons name="checkmark" size={14} color="#fff" /><Text style={s.approveBtnText}>Approve</Text></>}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[s.rejectBtn, acting === t.id && s.btnDisabled]}
                      onPress={() => updateStatus(t.id, "rejected")}
                      disabled={acting === t.id}
                    >
                      <Ionicons name="close" size={14} color="#ef4444" />
                      <Text style={s.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Request transfer modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Request transfer</Text>
            <TouchableOpacity onPress={() => { setModalOpen(false); setLearnerId(""); setToSchoolId(""); setReason(""); }}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            <Text style={s.fieldLabel}>Learner</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowLearnerPicker(true)}>
              <Text style={learnerId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                {selectedLearner
                  ? `${selectedLearner.first_name} ${selectedLearner.last_name} · Grade ${selectedLearner.grade_id === 0 ? "R" : selectedLearner.grade_id}`
                  : "Select learner"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            <Text style={s.fieldLabel}>Destination school</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowSchoolPicker(true)}>
              <Text style={toSchoolId ? s.pickerText : s.pickerPlaceholder} numberOfLines={1}>
                {selectedSchool?.name ?? "Select school"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            <Text style={s.fieldLabel}>
              Reason <Text style={s.fieldLabelOptional}>(optional)</Text>
            </Text>
            <TextInput
              style={[s.input, s.textarea]}
              value={reason} onChangeText={setReason}
              placeholder="e.g. Family relocation" placeholderTextColor="#475569"
              multiline numberOfLines={3} maxLength={500}
            />

            <TouchableOpacity
              style={[s.saveBtn, (saving || !learnerId || !toSchoolId) && s.saveBtnDisabled]}
              onPress={onRequest}
              disabled={saving || !learnerId || !toSchoolId}
            >
              {saving
                ? <ActivityIndicator color="#0f172a" />
                : <Text style={s.saveBtnText}>Submit request</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>

        {/* Learner picker */}
        <Modal visible={showLearnerPicker} transparent animationType="slide">
          <View style={s.pickerModal}><View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>Select learner</Text>
            <ScrollView>
              {learners.map(l => (
                <TouchableOpacity key={l.id} style={s.pickerOption}
                  onPress={() => { setLearnerId(l.id); setShowLearnerPicker(false); }}>
                  <Text style={[s.pickerOptionText, learnerId === l.id && s.pickerOptionActive]}>
                    {l.first_name} {l.last_name} · Grade {l.grade_id === 0 ? "R" : l.grade_id}
                  </Text>
                  {learnerId === l.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.pickerCancel} onPress={() => setShowLearnerPicker(false)}>
              <Text style={s.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View></View>
        </Modal>

        {/* School picker */}
        <Modal visible={showSchoolPicker} transparent animationType="slide">
          <View style={s.pickerModal}><View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>Destination school</Text>
            <ScrollView>
              {schools.map(sc => (
                <TouchableOpacity key={sc.id} style={s.pickerOption}
                  onPress={() => { setToSchoolId(sc.id); setShowSchoolPicker(false); }}>
                  <Text style={[s.pickerOptionText, toSchoolId === sc.id && s.pickerOptionActive]}>
                    {sc.name}
                  </Text>
                  {toSchoolId === sc.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.pickerCancel} onPress={() => setShowSchoolPicker(false)}>
              <Text style={s.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View></View>
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
  tabs:               { flexDirection: "row", paddingHorizontal: 16, gap: 8, marginBottom: 12 },
  tab:                { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: "#334155", backgroundColor: "#1e293b" },
  tabActive:          { borderColor: "#38bdf8", backgroundColor: "#38bdf820" },
  tabText:            { color: "#64748b", fontSize: 13, fontWeight: "600" },
  tabTextActive:      { color: "#38bdf8" },
  list:               { padding: 16, gap: 10, paddingBottom: 40 },
  emptyWrap:          { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  empty:              { color: "#94a3b8", fontSize: 15, fontWeight: "600", textAlign: "center" },
  card:               { backgroundColor: "#1e293b", borderRadius: 12, padding: 14, gap: 8 },
  cardTop:            { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  avatar:             { width: 38, height: 38, borderRadius: 19, backgroundColor: "#0ea5e920", alignItems: "center", justifyContent: "center" },
  avatarText:         { color: "#38bdf8", fontWeight: "700", fontSize: 13 },
  cardName:           { color: "#f1f5f9", fontWeight: "700", fontSize: 14 },
  cardSub:            { color: "#64748b", fontSize: 12, marginTop: 1 },
  cardRoute:          { color: "#94a3b8", fontSize: 12, marginTop: 3 },
  cardReason:         { color: "#475569", fontSize: 12, fontStyle: "italic", marginTop: 2 },
  cardDate:           { color: "#475569", fontSize: 11 },
  statusPill:         { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, alignSelf: "flex-start" },
  statusPillText:     { fontSize: 11, fontWeight: "700", textTransform: "capitalize" },
  actions:            { flexDirection: "row", gap: 8 },
  approveBtn:         { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#22c55e", borderRadius: 8, paddingVertical: 10 },
  approveBtnText:     { color: "#fff", fontWeight: "700", fontSize: 13 },
  rejectBtn:          { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, backgroundColor: "#ef444415", borderWidth: 1, borderColor: "#ef444440", borderRadius: 8, paddingVertical: 10 },
  rejectBtnText:      { color: "#ef4444", fontWeight: "700", fontSize: 13 },
  btnDisabled:        { opacity: 0.5 },
  modal:              { flex: 1, backgroundColor: "#0f172a" },
  modalHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  modalTitle:         { fontSize: 18, fontWeight: "700", color: "#f1f5f9" },
  modalBody:          { padding: 20, gap: 4, paddingBottom: 40 },
  fieldLabel:         { fontSize: 13, fontWeight: "600", color: "#94a3b8", marginTop: 14, marginBottom: 6 },
  fieldLabelOptional: { fontSize: 11, fontWeight: "400", color: "#475569" },
  input:              { backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#f1f5f9" },
  textarea:           { minHeight: 80, textAlignVertical: "top" },
  picker:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerText:         { color: "#f1f5f9", fontSize: 14, flex: 1 },
  pickerPlaceholder:  { color: "#475569", fontSize: 14, flex: 1 },
  saveBtn:            { backgroundColor: "#38bdf8", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnDisabled:    { opacity: 0.5 },
  saveBtnText:        { color: "#0f172a", fontWeight: "700", fontSize: 15 },
  pickerModal:        { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000080" },
  pickerSheet:        { backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", paddingBottom: 20 },
  pickerTitle:        { fontSize: 16, fontWeight: "700", color: "#f1f5f9", padding: 20, borderBottomWidth: 1, borderBottomColor: "#334155" },
  pickerOption:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  pickerOptionText:   { color: "#cbd5e1", fontSize: 15, flex: 1 },
  pickerOptionActive: { color: "#38bdf8", fontWeight: "700" },
  pickerCancel:       { margin: 16, backgroundColor: "#0f172a", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  pickerCancelText:   { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
});
