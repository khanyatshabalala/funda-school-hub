import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { ClipboardList, ShieldAlert, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";
import { friendlyDbError } from "@/lib/db-errors";

type AttendanceStatus = "present" | "late" | "absent";
type Learner = { id: string; first_name: string; last_name: string; grade_id: number };
type ClassOption = { id: string; name: string; grade_id: number | null };

const STATUS_OPTIONS: { value: AttendanceStatus; label: string; color: string; icon: React.ReactNode }[] = [
  { value: "present", label: "Present", color: "bg-green-600 hover:bg-green-700 text-white",        icon: <CheckCircle2 className="size-3.5" /> },
  { value: "late",    label: "Late",    color: "bg-orange-500 hover:bg-orange-600 text-white",      icon: <Clock className="size-3.5" /> },
  { value: "absent",  label: "Absent",  color: "bg-destructive hover:bg-destructive/90 text-white", icon: <XCircle className="size-3.5" /> },
];

function todayIso() { return new Date().toISOString().slice(0, 10); }

export function AttendanceCapturePage() {
  const { primaryRole, primarySchoolId, user } = useAuth();
  const isStaff = ["teacher", "principal", "school_admin", "super_admin"].includes(primaryRole);

  const [classes, setClasses]         = useState<ClassOption[]>([]);
  const [selectedClass, setSelectedClass] = useState<ClassOption | null>(null);
  const [learners, setLearners]       = useState<Learner[]>([]);
  const [attendance, setAttendance]   = useState<Record<string, AttendanceStatus>>({});
  const [existing, setExisting]       = useState<Record<string, string>>({}); // learner_id → record id
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [date]                        = useState(todayIso());

  // Load classes
  useEffect(() => {
    if (!primarySchoolId || !isStaff) { setLoading(false); return; }
    supabase
      .from("classes")
      .select("id, name, grade_id")
      .eq("school_id", primarySchoolId)
      .order("name")
      .then(({ data }) => {
        const list = (data ?? []) as ClassOption[];
        setClasses(list);
        if (list.length > 0) setSelectedClass(list[0]);
        else setLoading(false);
      });
  }, [primarySchoolId, isStaff]);

  // Load learners + existing attendance when class changes
  useEffect(() => {
    if (!selectedClass || !primarySchoolId) return;
    setLoading(true);

    const gradeId = selectedClass.grade_id;
    const learnerQ = gradeId !== null
      ? supabase.from("learners").select("id, first_name, last_name, grade_id")
          .eq("school_id", primarySchoolId).eq("grade_id", gradeId).order("last_name")
      : supabase.from("learners").select("id, first_name, last_name, grade_id")
          .eq("school_id", primarySchoolId).order("last_name");

    learnerQ.then(async ({ data: lData }) => {
      const list = (lData ?? []) as Learner[];
      setLearners(list);
      if (!list.length) { setLoading(false); return; }

      const { data: attData } = await supabase
        .from("attendance")
        .select("id, learner_id, status")
        .in("learner_id", list.map(l => l.id))
        .eq("date", date);

      const statusMap: Record<string, AttendanceStatus> = {};
      const idMap: Record<string, string> = {};
      for (const row of (attData ?? []) as any[]) {
        statusMap[row.learner_id] = row.status;
        idMap[row.learner_id] = row.id;
      }
      setAttendance(statusMap);
      setExisting(idMap);
      setLoading(false);
    });
  }, [selectedClass, primarySchoolId]);

  const setStatus = (learnerId: string, status: AttendanceStatus) =>
    setAttendance(prev => ({ ...prev, [learnerId]: status }));

  const markAll = (status: AttendanceStatus) => {
    const all: Record<string, AttendanceStatus> = {};
    learners.forEach(l => { all[l.id] = status; });
    setAttendance(all);
  };

  const doSave = async (statusMap: Record<string, AttendanceStatus>) => {
    setSaving(true);
    const upserts = learners.map(l => ({
      ...(existing[l.id] ? { id: existing[l.id] } : {}),
      learner_id:  l.id,
      date,
      status:      statusMap[l.id] ?? "absent",
      recorded_by: user?.id,
    }));
    const { error } = await supabase
      .from("attendance")
      .upsert(upserts as any, { onConflict: "learner_id,date" });
    setSaving(false);
    if (error) return toast.error(friendlyDbError(error));
    toast.success(`Attendance saved for ${new Date(date + "T00:00:00").toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" })}`);
  };

  const onSave = async () => {
    const unmarked = learners.filter(l => !attendance[l.id]);
    if (unmarked.length > 0) {
      // Mark all unmarked as absent automatically
      const updated = { ...attendance };
      unmarked.forEach(l => { updated[l.id] = "absent"; });
      setAttendance(updated);
      await doSave(updated);
    } else {
      await doSave(attendance);
    }
  };

  if (!isStaff) {
    return (
      <div className="max-w-lg">
        <PageHeader title="Attendance capture" sub="Daily roll call." />
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ShieldAlert className="size-8 mx-auto mb-2 opacity-40" />
          Staff only.
        </Card>
      </div>
    );
  }

  const markedCount = learners.filter(l => attendance[l.id]).length;
  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString("en-ZA", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Attendance capture"
        sub={formattedDate}
        action={
          <Button
            className="bg-accent text-accent-foreground hover:bg-accent/90"
            disabled={saving || learners.length === 0}
            onClick={onSave}
          >
            {saving ? <><Loader2 className="size-4 animate-spin mr-2" />Saving…</> : <><ClipboardList className="size-4 mr-1.5" />Save attendance</>}
          </Button>
        }
      />

      {/* Class selector */}
      {classes.length > 0 && (
        <div className="flex items-center gap-3 mb-5 flex-wrap">
          <span className="text-sm text-muted-foreground">Class:</span>
          <Select
            value={selectedClass?.id ?? ""}
            onValueChange={id => setSelectedClass(classes.find(c => c.id === id) ?? null)}
          >
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {learners.length > 0 && (
            <span className="text-xs text-muted-foreground ml-auto">
              {markedCount}/{learners.length} marked
            </span>
          )}
        </div>
      )}

      {/* Quick mark all */}
      {learners.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground">Mark all:</span>
          {STATUS_OPTIONS.map(opt => (
            <Button
              key={opt.value}
              size="sm"
              className={`h-7 text-xs gap-1 ${opt.color}`}
              onClick={() => markAll(opt.value)}
            >
              {opt.icon}{opt.label}
            </Button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted-foreground py-10 text-center">Loading…</div>
      ) : classes.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <ClipboardList className="size-8 mx-auto mb-2 opacity-40" />
          <p className="font-medium text-foreground mb-1">No classes set up</p>
          <p>Add classes first so you can take attendance per class.</p>
        </Card>
      ) : learners.length === 0 ? (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          No learners in this class.
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className="p-3">Learner</th>
                <th className="p-3">Grade</th>
                <th className="p-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {learners.map(l => {
                const status = attendance[l.id];
                return (
                  <tr key={l.id} className="border-t align-middle">
                    <td className="p-3 font-medium">
                      {l.first_name} {l.last_name}
                    </td>
                    <td className="p-3 text-muted-foreground text-xs">
                      Grade {l.grade_id === 0 ? "R" : l.grade_id}
                    </td>
                    <td className="p-3">
                      <div className="flex gap-1.5 justify-end">
                        {STATUS_OPTIONS.map(opt => (
                          <Button
                            key={opt.value}
                            size="sm"
                            className={`h-7 px-2.5 text-xs gap-1 transition-opacity ${
                              status === opt.value
                                ? opt.color
                                : "bg-muted text-muted-foreground hover:bg-muted/80"
                            }`}
                            onClick={() => setStatus(l.id, opt.value)}
                          >
                            {opt.icon}
                            <span className="hidden sm:inline">{opt.label}</span>
                          </Button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}