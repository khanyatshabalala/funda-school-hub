import { useEffect, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const CURRENT_YEAR = new Date().getFullYear();

type ClassRow = {
  id: string; name: string; grade_id: number;
  academic_year: number; teacher_user_id: string | null; teacher_name: string | null;
};
type Grade       = { id: number; label: string };
type StaffMember = { id: string; full_name: string | null };

export default function ClassesScreen() {
  const { primaryRole, primarySchoolId } = useAuth();
  const canManage = ["principal", "school_admin", "super_admin"].includes(primaryRole);

  const [classes, setClasses]   = useState<ClassRow[]>([]);
  const [grades, setGrades]     = useState<Grade[]>([]);
  const [staff, setStaff]       = useState<StaffMember[]>([]);
  const [loading, setLoading]   = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving]     = useState(false);

  // Form
  const [name, setName]               = useState("");
  const [gradeId, setGradeId]         = useState<number | null>(null);
  const [teacherId, setTeacherId]     = useState<string | null>(null);
  const [showGradePicker, setShowGradePicker]   = useState(false);
  const [showTeacherPicker, setShowTeacherPicker] = useState(false);

  const load = async () => {
    if (!primarySchoolId) { setLoading(false); return; }
    setLoading(true);

    const [{ data: classData }, { data: gradeData }, { data: roleData }] = await Promise.all([
      supabase.from("classes")
        .select("id, name, grade_id, academic_year, teacher_user_id")
        .eq("school_id", primarySchoolId)
        .order("grade_id").order("name"),
      supabase.from("grades").select("id, label").order("id"),
      supabase.from("user_roles").select("user_id")
        .eq("school_id", primarySchoolId)
        .in("role", ["teacher", "school_admin", "principal"]),
    ]);

    setGrades((gradeData ?? []) as Grade[]);

    const staffIds = [...new Set((roleData ?? []).map((r: any) => r.user_id))];
    let staffList: StaffMember[] = [];
    if (staffIds.length > 0) {
      const { data: profileData } = await supabase
        .from("profiles").select("id, full_name").in("id", staffIds).order("full_name");
      staffList = (profileData ?? []) as StaffMember[];
    }
    setStaff(staffList);

    const staffMap = Object.fromEntries(staffList.map(s => [s.id, s.full_name]));
    const enriched: ClassRow[] = (classData ?? []).map((c: any) => ({
      ...c,
      teacher_name: c.teacher_user_id ? (staffMap[c.teacher_user_id] ?? "Unknown") : null,
    }));
    setClasses(enriched);
    setLoading(false);
  };

  useEffect(() => { load(); }, [primarySchoolId]);

  const gradeLabel = (id: number) =>
    grades.find(g => g.id === id)?.label ?? (id === 0 ? "Grade R" : `Grade ${id}`);

  const onSave = async () => {
    if (!name.trim()) { Alert.alert("Enter a class name"); return; }
    if (gradeId === null) { Alert.alert("Select a grade"); return; }
    if (!primarySchoolId) return;
    setSaving(true);
    const { error } = await supabase.from("classes").insert({
      school_id:       primarySchoolId,
      name:            name.trim(),
      grade_id:        gradeId,
      teacher_user_id: teacherId ?? null,
      academic_year:   CURRENT_YEAR,
    });
    setSaving(false);
    if (error) { Alert.alert("Error", error.message); return; }
    Alert.alert("Class created", `"${name.trim()}" has been added.`);
    setModalOpen(false);
    setName(""); setGradeId(null); setTeacherId(null);
    load();
  };

  const onDelete = (cls: ClassRow) => {
    Alert.alert("Delete class", `Remove "${cls.name}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setDeleting(cls.id);
          await supabase.from("classes").delete().eq("id", cls.id);
          setDeleting(null);
          load();
        },
      },
    ]);
  };

  if (!canManage) {
    return (
      <SafeAreaView style={s.container}>
        <View style={s.emptyWrap}>
          <Ionicons name="shield-outline" size={40} color="#334155" />
          <Text style={s.empty}>Only principals and school admins can manage classes.</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Group by grade
  const byGrade = classes.reduce<Record<number, ClassRow[]>>((acc, c) => {
    (acc[c.grade_id] ??= []).push(c);
    return acc;
  }, {});
  const sortedGrades = Object.keys(byGrade).map(Number).sort((a, b) => a - b);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Classes · {CURRENT_YEAR}</Text>
        <TouchableOpacity style={s.addBtn} onPress={() => setModalOpen(true)}>
          <Ionicons name="add" size={20} color="#0f172a" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : classes.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="school-outline" size={40} color="#334155" />
          <Text style={s.empty}>No classes yet.</Text>
          <Text style={s.emptySub}>Tap + to add a class group.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {sortedGrades.map(gId => (
            <View key={gId} style={s.gradeGroup}>
              <Text style={s.gradeLabel}>{gradeLabel(gId)}</Text>
              {byGrade[gId].map(cls => (
                <View key={cls.id} style={s.card}>
                  <View style={s.cardIcon}>
                    <Ionicons name="people" size={16} color="#38bdf8" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.cardName}>{cls.name}</Text>
                    {cls.teacher_name ? (
                      <Text style={s.cardTeacher}>{cls.teacher_name}</Text>
                    ) : (
                      <Text style={s.cardTeacherEmpty}>Unassigned</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => onDelete(cls)}
                    disabled={deleting === cls.id}
                    style={s.deleteBtn}
                  >
                    {deleting === cls.id
                      ? <ActivityIndicator size="small" color="#ef4444" />
                      : <Ionicons name="trash-outline" size={18} color="#ef4444" />}
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add class modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add class</Text>
            <TouchableOpacity onPress={() => { setModalOpen(false); setName(""); setGradeId(null); setTeacherId(null); }}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            <Text style={s.fieldLabel}>Class name</Text>
            <TextInput
              style={s.input} value={name} onChangeText={setName}
              placeholder="e.g. 10A or Grade 4 Maths" placeholderTextColor="#475569" autoFocus
            />

            <Text style={s.fieldLabel}>Grade</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowGradePicker(true)}>
              <Text style={gradeId !== null ? s.pickerText : s.pickerPlaceholder}>
                {gradeId !== null ? gradeLabel(gradeId) : "Select grade"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            <Text style={s.fieldLabel}>
              Teacher <Text style={s.fieldLabelOptional}>(optional)</Text>
            </Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowTeacherPicker(true)}>
              <Text style={teacherId ? s.pickerText : s.pickerPlaceholder}>
                {teacherId ? (staff.find(t => t.id === teacherId)?.full_name ?? "Unknown") : "Unassigned"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            <TouchableOpacity
              style={[s.saveBtn, (saving || !name.trim() || gradeId === null) && s.saveBtnDisabled]}
              onPress={onSave}
              disabled={saving || !name.trim() || gradeId === null}
            >
              {saving
                ? <ActivityIndicator color="#0f172a" />
                : <Text style={s.saveBtnText}>Create class</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>

        {/* Grade picker */}
        <Modal visible={showGradePicker} transparent animationType="slide">
          <View style={s.pickerModal}><View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>Select grade</Text>
            <ScrollView>
              {grades.map(g => (
                <TouchableOpacity key={g.id} style={s.pickerOption}
                  onPress={() => { setGradeId(g.id); setShowGradePicker(false); }}>
                  <Text style={[s.pickerOptionText, gradeId === g.id && s.pickerOptionActive]}>{g.label}</Text>
                  {gradeId === g.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.pickerCancel} onPress={() => setShowGradePicker(false)}>
              <Text style={s.pickerCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View></View>
        </Modal>

        {/* Teacher picker */}
        <Modal visible={showTeacherPicker} transparent animationType="slide">
          <View style={s.pickerModal}><View style={s.pickerSheet}>
            <Text style={s.pickerTitle}>Assign teacher</Text>
            <ScrollView>
              <TouchableOpacity style={s.pickerOption}
                onPress={() => { setTeacherId(null); setShowTeacherPicker(false); }}>
                <Text style={[s.pickerOptionText, !teacherId && s.pickerOptionActive]}>Unassigned</Text>
                {!teacherId && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
              </TouchableOpacity>
              {staff.map(t => (
                <TouchableOpacity key={t.id} style={s.pickerOption}
                  onPress={() => { setTeacherId(t.id); setShowTeacherPicker(false); }}>
                  <Text style={[s.pickerOptionText, teacherId === t.id && s.pickerOptionActive]}>
                    {t.full_name ?? t.id}
                  </Text>
                  {teacherId === t.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={s.pickerCancel} onPress={() => setShowTeacherPicker(false)}>
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
  list:               { padding: 16, gap: 16, paddingBottom: 40 },
  emptyWrap:          { flex: 1, alignItems: "center", justifyContent: "center", gap: 10, padding: 32 },
  empty:              { color: "#94a3b8", fontSize: 15, fontWeight: "600", textAlign: "center" },
  emptySub:           { color: "#475569", fontSize: 13, textAlign: "center" },
  gradeGroup:         { gap: 8 },
  gradeLabel:         { fontSize: 11, fontWeight: "700", color: "#64748b", textTransform: "uppercase", letterSpacing: 0.5 },
  card:               { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1e293b", borderRadius: 12, padding: 14 },
  cardIcon:           { width: 34, height: 34, borderRadius: 8, backgroundColor: "#0ea5e920", alignItems: "center", justifyContent: "center" },
  cardName:           { color: "#f1f5f9", fontWeight: "600", fontSize: 14 },
  cardTeacher:        { color: "#64748b", fontSize: 12, marginTop: 2 },
  cardTeacherEmpty:   { color: "#334155", fontSize: 12, marginTop: 2, fontStyle: "italic" },
  deleteBtn:          { padding: 4 },
  modal:              { flex: 1, backgroundColor: "#0f172a" },
  modalHeader:        { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  modalTitle:         { fontSize: 18, fontWeight: "700", color: "#f1f5f9" },
  modalBody:          { padding: 20, gap: 4, paddingBottom: 40 },
  fieldLabel:         { fontSize: 13, fontWeight: "600", color: "#94a3b8", marginTop: 14, marginBottom: 6 },
  fieldLabelOptional: { fontSize: 11, fontWeight: "400", color: "#475569" },
  input:              { backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#f1f5f9" },
  picker:             { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerText:         { color: "#f1f5f9", fontSize: 14 },
  pickerPlaceholder:  { color: "#475569", fontSize: 14 },
  saveBtn:            { backgroundColor: "#38bdf8", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnDisabled:    { opacity: 0.5 },
  saveBtnText:        { color: "#0f172a", fontWeight: "700", fontSize: 15 },
  pickerModal:        { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000080" },
  pickerSheet:        { backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", paddingBottom: 20 },
  pickerTitle:        { fontSize: 16, fontWeight: "700", color: "#f1f5f9", padding: 20, borderBottomWidth: 1, borderBottomColor: "#334155" },
  pickerOption:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  pickerOptionText:   { color: "#cbd5e1", fontSize: 15 },
  pickerOptionActive: { color: "#38bdf8", fontWeight: "700" },
  pickerCancel:       { margin: 16, backgroundColor: "#0f172a", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  pickerCancelText:   { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
});
