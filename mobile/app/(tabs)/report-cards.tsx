import { useEffect, useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/lib/supabase";

const CURRENT_YEAR = new Date().getFullYear();

type ReportCard = {
  id: string; learner_id: string; academic_year: number; term: number;
  file_path: string; file_name: string; notes: string | null; uploaded_at: string;
  learners: { first_name: string; last_name: string; grade_id: number; schools: { name: string } | null } | null;
};

export default function ReportCardsScreen() {
  const { user, primaryRole } = useAuth();
  const isParent = primaryRole === "parent";
  const [reports, setReports] = useState<ReportCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [yearFilter, setYearFilter] = useState(CURRENT_YEAR);

  useEffect(() => {
    if (!user || !isParent) { setLoading(false); return; }
    (async () => {
      const { data: links } = await supabase.from("parent_links").select("learner_id").eq("parent_user_id", user.id);
      const ids = (links ?? []).map((l: any) => l.learner_id);
      if (!ids.length) { setReports([]); setLoading(false); return; }
      const { data } = await (supabase as any).from("report_cards")
        .select("id, learner_id, academic_year, term, file_path, file_name, notes, uploaded_at, learners(first_name, last_name, grade_id, schools(name))")
        .in("learner_id", ids).order("academic_year", { ascending: false }).order("term", { ascending: false });
      setReports((data ?? []) as ReportCard[]);
      setLoading(false);
    })();
  }, [user, isParent]);

  const onView = async (card: ReportCard) => {
    setDownloading(card.id);
    const { data, error } = await supabase.storage.from("report-cards").createSignedUrl(card.file_path, 60);
    setDownloading(null);
    if (error || !data?.signedUrl) { Alert.alert("Error", "Could not open report card."); return; }
    Linking.openURL(data.signedUrl);
  };

  const filtered = reports.filter(r => r.academic_year === yearFilter);
  const grouped = filtered.reduce<Record<string, { learner: ReportCard["learners"]; cards: ReportCard[] }>>((acc, r) => {
    if (!acc[r.learner_id]) acc[r.learner_id] = { learner: r.learners, cards: [] };
    acc[r.learner_id].cards.push(r);
    return acc;
  }, {});
  const years = [...new Set(reports.map(r => r.academic_year))].sort((a, b) => b - a);

  if (!isParent) return (
    <SafeAreaView style={s.container}>
      <View style={s.emptyWrap}><Ionicons name="shield-outline" size={40} color="#334155" /><Text style={s.empty}>Parents only.</Text></View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}><Text style={s.title}>Report cards</Text></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.yearRow} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
        {(years.length ? years : [CURRENT_YEAR]).map(y => (
          <TouchableOpacity key={y} style={[s.yearChip, yearFilter === y && s.yearChipActive]} onPress={() => setYearFilter(y)}>
            <Text style={[s.yearChipText, yearFilter === y && s.yearChipTextActive]}>{y}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} /> : (
        <ScrollView contentContainerStyle={s.list}>
          {reports.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="document-text-outline" size={40} color="#334155" />
              <Text style={s.empty}>No report cards yet.</Text>
              <Text style={s.emptySub}>Your school will upload them at the end of each term.</Text>
            </View>
          ) : Object.keys(grouped).length === 0 ? (
            <Text style={s.empty}>No report cards for {yearFilter}.</Text>
          ) : (
            Object.entries(grouped).map(([learnerId, { learner, cards }]) => (
              <View key={learnerId} style={s.learnerSection}>
                <View style={s.learnerHeader}>
                  <View style={s.learnerAvatar}><Text style={s.learnerAvatarText}>{learner?.first_name?.[0]}{learner?.last_name?.[0]}</Text></View>
                  <View>
                    <Text style={s.learnerName}>{learner?.first_name} {learner?.last_name}</Text>
                    <Text style={s.learnerSub}>{learner?.schools?.name} · Grade {learner?.grade_id === 0 ? "R" : learner?.grade_id}</Text>
                  </View>
                </View>
                {cards.map(card => (
                  <View key={card.id} style={s.card}>
                    <View style={s.cardIcon}><Ionicons name="document-text" size={22} color="#64748b" /></View>
                    <View style={{ flex: 1 }}>
                      <Text style={s.cardTitle}>Term {card.term} · {card.academic_year}</Text>
                      <Text style={s.cardFile} numberOfLines={1}>{card.file_name}</Text>
                      {card.notes && <Text style={s.cardNotes} numberOfLines={2}>{card.notes}</Text>}
                      <Text style={s.cardDate}>Uploaded {new Date(card.uploaded_at).toLocaleDateString("en-ZA", { day: "numeric", month: "short", year: "numeric" })}</Text>
                    </View>
                    <TouchableOpacity style={s.viewBtn} onPress={() => onView(card)} disabled={downloading === card.id}>
                      {downloading === card.id
                        ? <ActivityIndicator size="small" color="#38bdf8" />
                        : <Ionicons name="open-outline" size={18} color="#38bdf8" />}
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container:         { flex: 1, backgroundColor: "#0f172a" },
  header:            { padding: 20, paddingBottom: 8 },
  title:             { fontSize: 22, fontWeight: "800", color: "#f1f5f9" },
  yearRow:           { flexGrow: 0, marginBottom: 8 },
  yearChip:          { borderWidth: 1, borderColor: "#334155", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7, backgroundColor: "#1e293b" },
  yearChipActive:    { borderColor: "#38bdf8", backgroundColor: "#38bdf820" },
  yearChipText:      { color: "#64748b", fontSize: 13, fontWeight: "600" },
  yearChipTextActive:{ color: "#38bdf8" },
  list:              { padding: 16, gap: 16, paddingBottom: 40 },
  emptyWrap:         { alignItems: "center", marginTop: 60, gap: 10 },
  empty:             { color: "#94a3b8", fontSize: 15, fontWeight: "600" },
  emptySub:          { color: "#475569", fontSize: 13, textAlign: "center" },
  learnerSection:    { gap: 8 },
  learnerHeader:     { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 4 },
  learnerAvatar:     { width: 36, height: 36, borderRadius: 18, backgroundColor: "#0ea5e920", alignItems: "center", justifyContent: "center" },
  learnerAvatarText: { color: "#38bdf8", fontWeight: "700", fontSize: 13 },
  learnerName:       { color: "#f1f5f9", fontWeight: "700", fontSize: 14 },
  learnerSub:        { color: "#64748b", fontSize: 12 },
  card:              { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#1e293b", borderRadius: 12, padding: 14 },
  cardIcon:          { width: 40, height: 40, borderRadius: 10, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  cardTitle:         { color: "#f1f5f9", fontWeight: "600", fontSize: 14 },
  cardFile:          { color: "#64748b", fontSize: 12, marginTop: 2 },
  cardNotes:         { color: "#64748b", fontSize: 12, fontStyle: "italic", marginTop: 2 },
  cardDate:          { color: "#475569", fontSize: 11, marginTop: 4 },
  viewBtn:           { width: 36, height: 36, borderRadius: 10, backgroundColor: "#0ea5e915", alignItems: "center", justifyContent: "center" },
});
