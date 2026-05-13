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
const TERMS = [1, 2, 3, 4];
function currentTerm() { const m = new Date().getMonth() + 1; if (m <= 3) return 1; if (m <= 6) return 2; if (m <= 9) return 3; return 4; }
function todayIso() { return new Date().toISOString().slice(0, 10); }

type ExamEntry = {
  id: string; subject: string; grade_id: number | null;
  exam_date: string; start_time: string | null; end_time: string | null;
  venue: string | null; notes: string | null; term: number; academic_year: number;
};
type Grade = { id: number; label: string };

export default function ExamTimetableScreen() {
  const { primarySchoolId, primaryRole, user } = useAuth();
  const isParent  = primaryRole === "parent";
  const canManage = ["principal", "school_admin", "super_admin"].includes(primaryRole);

  const [schoolIds, setSchoolIds]   = useState<string[]>([]);
  const [exams, setExams]           = useState<ExamEntry[]>([]);
  const [grades, setGrades]         = useState<Grade[]>([]);
  const [loading, setLoading]       = useState(true);
  const [termFilter, setTermFilter] = useState(currentTerm());
  const [modalOpen, setModalOpen]   = useState(false);
  const [saving, setSaving]         = useState(false);
  const [deleting, setDeleting]     = useState<string | null>(null);

  // Form state
  const [subject, setSubject]           = useState("");
  const [examDate, setExamDate]         = useState(todayIso());
  const [startTime, setStartTime]       = useState("");
  const [venue, setVenue]               = useState("");
  const [selectedGrade, setSelectedGrade] = useState<number | null>(null);
  const [showGradePicker, setShowGradePicker] = useState(false);

  // Resolve which school IDs to query
  useEffect(() => {
    if (isParent) {
      // Parents: collect all schools their children attend
      if (!user) { setLoading(false); return; }
      supabase
        .from("parent_links")
        .select("learners(schools(id))")
        .eq("parent_user_id", user.id)
        .then(({ data }) => {
          const ids = (data ?? [])
            .map((l: any) => l.learners?.schools?.id)
            .filter(Boolean) as string[];
          setSchoolIds([...new Set(ids)]);
        });
    } else {
      // Staff: use their assigned school
      if (primarySchoolId) setSchoolIds([primarySchoolId]);
      else setLoading(false);
    }
  }, [isParent, user, primarySchoolId]);

  const load = async () => {
    if (schoolIds.length === 0) { setLoading(false); return; }
    setLoading(true);
    const [{ data: g }, { data: e }] = await Promise.all([
      supabase.from("grades").select("id, label").order("id"),
      (supabase as any)
        .from("exam_timetables")
        .select("id,subject,grade_id,exam_date,start_time,end_time,venue,notes,term,academic_year")
        .in("school_id", schoolIds)
        .order("exam_date")
        .order("start_time"),
    ]);
    setGrades((g ?? []) as Grade[]);
    setExams((e ?? []) as ExamEntry[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, [schoolIds]);

  const filtered = exams.filter(e => e.term === termFilter);
  const grouped: Record<string, ExamEntry[]> = {};
  for (const exam of filtered) {
    if (!grouped[exam.exam_date]) grouped[exam.exam_date] = [];
    grouped[exam.exam_date].push(exam);
  }
  const sortedDates = Object.keys(grouped).sort();

  const onSave = async () => {
    if (!subject.trim()) { Alert.alert("Enter a subject"); return; }
    if (!examDate) { Alert.alert("Select a date"); return; }
    if (!primarySchoolId) return;
    setSaving(true);
    const { error } = await (supabase as any).from("exam_timetables").insert({
      school_id: primarySchoolId,
      subject: subject.trim(),
      grade_id: selectedGrade,
      exam_date: examDate,
      start_time: startTime || null,
      venue: venue.trim() || null,
      term: termFilter,
      academic_year: CURRENT_YEAR,
    });
    setSaving(false);
    if (error) { Alert.alert("Error", error.message); return; }
    setModalOpen(false);
    setSubject(""); setExamDate(todayIso()); setStartTime(""); setVenue(""); setSelectedGrade(null);
    load();
  };

  const onDelete = async (id: string) => {
    Alert.alert("Delete exam", "Remove this exam from the timetable?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          setDeleting(id);
          await (supabase as any).from("exam_timetables").delete().eq("id", id);
          setDeleting(null);
          load();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Exam timetable</Text>
        {canManage && (
          <TouchableOpacity style={s.addBtn} onPress={() => setModalOpen(true)}>
            <Ionicons name="add" size={20} color="#0f172a" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.termRow}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
      >
        {TERMS.map(t => (
          <TouchableOpacity
            key={t}
            style={[s.termChip, termFilter === t && s.termChipActive]}
            onPress={() => setTermFilter(t)}
          >
            <Text style={[s.termChipText, termFilter === t && s.termChipTextActive]}>Term {t}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : schoolIds.length === 0 ? (
        <View style={s.emptyWrap}>
          <Ionicons name="calendar-outline" size={40} color="#334155" />
          <Text style={s.empty}>
            {isParent ? "Link a child to see their exam timetable." : "No school assigned."}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={s.list}>
          {sortedDates.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="calendar-outline" size={40} color="#334155" />
              <Text style={s.empty}>No exams for Term {termFilter}.</Text>
            </View>
          ) : (
            sortedDates.map(date => (
              <View key={date} style={s.dateGroup}>
                <View style={s.dateHeader}>
                  <Ionicons name="calendar" size={14} color="#38bdf8" />
                  <Text style={s.dateLabel}>
                    {new Date(date + "T00:00:00").toLocaleDateString("en-ZA", {
                      weekday: "short", day: "numeric", month: "short", year: "numeric",
                    })}
                  </Text>
                </View>
                {grouped[date].map(exam => (
                  <View key={exam.id} style={s.examCard}>
                    <View style={{ flex: 1 }}>
                      <Text style={s.examSubject}>{exam.subject}</Text>
                      <View style={s.examMeta}>
                        {exam.grade_id !== null && (
                          <Text style={s.examMetaText}>
                            {grades.find(g => g.id === exam.grade_id)?.label ?? `Grade ${exam.grade_id}`}
                          </Text>
                        )}
                        {exam.start_time && (
                          <Text style={s.examMetaText}>
                            🕐 {exam.start_time.slice(0, 5)}
                            {exam.end_time ? ` – ${exam.end_time.slice(0, 5)}` : ""}
                          </Text>
                        )}
                        {exam.venue && <Text style={s.examMetaText}>📍 {exam.venue}</Text>}
                      </View>
                    </View>
                    {canManage && (
                      <TouchableOpacity
                        onPress={() => onDelete(exam.id)}
                        disabled={deleting === exam.id}
                        style={s.deleteBtn}
                      >
                        {deleting === exam.id
                          ? <ActivityIndicator size="small" color="#ef4444" />
                          : <Ionicons name="trash-outline" size={18} color="#ef4444" />}
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add exam modal — staff only */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={s.modal}>
          <View style={s.modalHeader}>
            <Text style={s.modalTitle}>Add exam</Text>
            <TouchableOpacity onPress={() => setModalOpen(false)}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={s.modalBody}>
            <Text style={s.label}>Subject</Text>
            <TextInput
              style={s.input} value={subject} onChangeText={setSubject}
              placeholder="e.g. Mathematics" placeholderTextColor="#475569" autoFocus
            />
            <Text style={s.label}>Grade (optional)</Text>
            <TouchableOpacity style={s.picker} onPress={() => setShowGradePicker(true)}>
              <Text style={selectedGrade !== null ? s.pickerText : s.pickerPlaceholder}>
                {selectedGrade !== null
                  ? (grades.find(g => g.id === selectedGrade)?.label ?? `Grade ${selectedGrade}`)
                  : "All grades"}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
            <Text style={s.label}>Exam date</Text>
            <TextInput
              style={s.input} value={examDate} onChangeText={setExamDate}
              placeholder="YYYY-MM-DD" placeholderTextColor="#475569"
            />
            <Text style={s.label}>Start time (optional)</Text>
            <TextInput
              style={s.input} value={startTime} onChangeText={setStartTime}
              placeholder="e.g. 09:00" placeholderTextColor="#475569"
            />
            <Text style={s.label}>Venue (optional)</Text>
            <TextInput
              style={s.input} value={venue} onChangeText={setVenue}
              placeholder="e.g. Hall A" placeholderTextColor="#475569"
            />
            <TouchableOpacity
              style={[s.saveBtn, (saving || !subject.trim() || !examDate) && s.saveBtnDisabled]}
              onPress={onSave}
              disabled={saving || !subject.trim() || !examDate}
            >
              {saving
                ? <ActivityIndicator color="#0f172a" />
                : <Text style={s.saveBtnText}>Add exam</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>

        <Modal visible={showGradePicker} transparent animationType="slide">
          <View style={s.pickerModal}>
            <View style={s.pickerSheet}>
              <Text style={s.pickerTitle}>Select grade</Text>
              <ScrollView>
                <TouchableOpacity
                  style={s.pickerOption}
                  onPress={() => { setSelectedGrade(null); setShowGradePicker(false); }}
                >
                  <Text style={[s.pickerOptionText, selectedGrade === null && s.pickerOptionActive]}>
                    All grades
                  </Text>
                  {selectedGrade === null && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                </TouchableOpacity>
                {grades.map(g => (
                  <TouchableOpacity
                    key={g.id}
                    style={s.pickerOption}
                    onPress={() => { setSelectedGrade(g.id); setShowGradePicker(false); }}
                  >
                    <Text style={[s.pickerOptionText, selectedGrade === g.id && s.pickerOptionActive]}>
                      {g.label}
                    </Text>
                    {selectedGrade === g.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={s.pickerCancel} onPress={() => setShowGradePicker(false)}>
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
  container:        { flex: 1, backgroundColor: "#0f172a" },
  header:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, paddingBottom: 8 },
  title:            { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  addBtn:           { backgroundColor: "#38bdf8", borderRadius: 20, width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  termRow:          { flexGrow: 0, marginBottom: 8 },
  termChip:         { borderWidth: 1, borderColor: "#334155", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#1e293b" },
  termChipActive:   { borderColor: "#38bdf8", backgroundColor: "#38bdf820" },
  termChipText:     { color: "#64748b", fontSize: 13, fontWeight: "600" },
  termChipTextActive:{ color: "#38bdf8" },
  list:             { padding: 16, gap: 16, paddingBottom: 40 },
  emptyWrap:        { alignItems: "center", marginTop: 60, gap: 10 },
  empty:            { color: "#94a3b8", fontSize: 15, fontWeight: "600", textAlign: "center" },
  dateGroup:        { gap: 8 },
  dateHeader:       { flexDirection: "row", alignItems: "center", gap: 6 },
  dateLabel:        { color: "#38bdf8", fontWeight: "700", fontSize: 13 },
  examCard:         { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1e293b", borderRadius: 12, padding: 14 },
  examSubject:      { color: "#f1f5f9", fontWeight: "600", fontSize: 14 },
  examMeta:         { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 4 },
  examMetaText:     { color: "#64748b", fontSize: 12 },
  deleteBtn:        { padding: 4 },
  modal:            { flex: 1, backgroundColor: "#0f172a" },
  modalHeader:      { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#1e293b" },
  modalTitle:       { fontSize: 18, fontWeight: "700", color: "#f1f5f9" },
  modalBody:        { padding: 20, gap: 4, paddingBottom: 40 },
  label:            { fontSize: 13, fontWeight: "600", color: "#94a3b8", marginTop: 14, marginBottom: 6 },
  input:            { backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: "#f1f5f9" },
  picker:           { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "#1e293b", borderWidth: 1, borderColor: "#334155", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerText:       { color: "#f1f5f9", fontSize: 14 },
  pickerPlaceholder:{ color: "#475569", fontSize: 14 },
  saveBtn:          { backgroundColor: "#38bdf8", borderRadius: 10, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  saveBtnDisabled:  { opacity: 0.5 },
  saveBtnText:      { color: "#0f172a", fontWeight: "700", fontSize: 15 },
  pickerModal:      { flex: 1, justifyContent: "flex-end", backgroundColor: "#00000080" },
  pickerSheet:      { backgroundColor: "#1e293b", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "70%", paddingBottom: 20 },
  pickerTitle:      { fontSize: 16, fontWeight: "700", color: "#f1f5f9", padding: 20, borderBottomWidth: 1, borderBottomColor: "#334155" },
  pickerOption:     { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#0f172a" },
  pickerOptionText: { color: "#cbd5e1", fontSize: 15 },
  pickerOptionActive:{ color: "#38bdf8", fontWeight: "700" },
  pickerCancel:     { margin: 16, backgroundColor: "#0f172a", borderRadius: 10, paddingVertical: 14, alignItems: "center" },
  pickerCancelText: { color: "#94a3b8", fontWeight: "600", fontSize: 15 },
});
