import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageHeader } from "@/components/funda/dashboards/PageHeader";
import { ChevronLeft, ChevronRight, CalendarDays, Clock, Flag, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { friendlyDbError } from "@/lib/db-errors";

export const Route = createFileRoute("/app/calendar")({
  component: CalendarPage,
});

type CalEvent = {
  id: string;
  title: string;
  description: string | null;
  event_date: string;
  event_time: string | null;
  event_type: string | null;
  source: "national" | "school";
  schools?: { name: string } | null;
  classes?: { name: string } | null;
};

type ClassOption = {
  id: string;
  name: string;
  grade_id: number;
};

const EVENT_TYPES = [
  { value: "extra_class",   label: "Extra class" },
  { value: "meeting",       label: "Meeting" },
  { value: "sport",         label: "Sport" },
  { value: "cultural",      label: "Cultural" },
  { value: "exam",          label: "Exam" },
  { value: "other",         label: "Other" },
];

const EVENT_COLORS: Record<string, string> = {
  term_start:     "bg-green-500",
  term_end:       "bg-orange-500",
  public_holiday: "bg-red-500",
  holiday:        "bg-red-400",
  exam:           "bg-orange-500",
  sport:          "bg-blue-500",
  meeting:        "bg-purple-500",
  cultural:       "bg-pink-500",
  default:        "bg-accent",
};

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

function eventColor(type: string | null) {
  return EVENT_COLORS[type?.toLowerCase() ?? ""] ?? EVENT_COLORS.default;
}

function formatTime(t: string | null) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

// ── Add Event Dialog ───────────────────────────────────────────────────────

function AddEventDialog({
  open,
  defaultDate,
  classes,
  isTeacher,
  onOpenChange,
  onSaved,
}: {
  open: boolean;
  defaultDate: string;
  classes: ClassOption[];
  isTeacher: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved: () => void;
}) {
  const { user, primarySchoolId } = useAuth();
  const [saving, setSaving] = useState(false);

  // Teachers must always pick a class — default to their only class if they have one
  const defaultClassId = classes.length === 1 ? classes[0].id : "";

  const [title, setTitle]             = useState("");
  const [eventType, setEventType]     = useState("extra_class");
  const [eventDate, setEventDate]     = useState(defaultDate);
  const [eventTime, setEventTime]     = useState("");
  const [classId, setClassId]         = useState(defaultClassId);
  const [description, setDescription] = useState("");

  // Keep date in sync when defaultDate changes (clicking a day)
  useEffect(() => { setEventDate(defaultDate); }, [defaultDate]);
  // Auto-select class when there's only one
  useEffect(() => { setClassId(classes.length === 1 ? classes[0].id : ""); }, [classes]);

  const reset = () => {
    setTitle("");
    setEventType("extra_class");
    setEventDate(defaultDate);
    setEventTime("");
    setClassId(classes.length === 1 ? classes[0].id : "");
    setDescription("");
  };

  const handleClose = (v: boolean) => {
    if (!v) reset();
    onOpenChange(v);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim())              return toast.error("Enter a title");
    if (!eventDate)                 return toast.error("Select a date");
    if (!primarySchoolId)           return toast.error("No school assigned");
    // Teachers must select a class
    if (isTeacher && !classId)      return toast.error("Select a class");

    setSaving(true);
    const { error } = await supabase.from("calendar_events").insert({
      school_id:   primarySchoolId,
      title:       title.trim(),
      event_type:  eventType,
      event_date:  eventDate,
      event_time:  eventTime || null,
      class_id:    classId || null,
      description: description.trim() || null,
      created_by:  user?.id,
    });
    setSaving(false);

    if (error) return toast.error(friendlyDbError(error));

    toast.success("Event added to calendar");
    reset();
    onOpenChange(false);
    onSaved();
  };

  const selectedClass = classes.find(c => c.id === classId);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add event</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-1">
          {/* Title */}
          <div>
            <Label>What's happening?</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isTeacher ? "e.g. Extra Maths class, Test revision…" : "e.g. Sports day, Parent meeting…"}
              maxLength={120}
              autoFocus
            />
          </div>

          {/* Event type */}
          <div>
            <Label>Type</Label>
            <Select value={eventType} onValueChange={setEventType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Class selector */}
          <div>
            <Label>
              {isTeacher ? "Class" : "Class / audience"}
              {!isTeacher && <span className="text-muted-foreground text-xs ml-1">(optional)</span>}
            </Label>
            <Select
              value={classId || "whole_school"}
              onValueChange={(v) => setClassId(v === "whole_school" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder={isTeacher ? "Select your class" : "Whole school"} />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {/* Admin/principal can target whole school; teachers cannot */}
                {!isTeacher && (
                  <SelectItem value="whole_school">🏫 Whole school</SelectItem>
                )}
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isTeacher && classes.length === 1 && (
              <p className="text-xs text-muted-foreground mt-1">
                Your class is auto-selected.
              </p>
            )}
            {isTeacher && classes.length === 0 && (
              <p className="text-xs text-destructive mt-1">
                No classes assigned to your profile yet.
              </p>
            )}
            {!isTeacher && selectedClass && (
              <p className="text-xs text-muted-foreground mt-1">
                Only parents of learners in <strong>{selectedClass.name}</strong> will be notified.
              </p>
            )}
            {!isTeacher && !classId && (
              <p className="text-xs text-muted-foreground mt-1">
                All parents at the school will be notified.
              </p>
            )}
          </div>

          {/* Date + Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Date</Label>
              <Input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
              />
            </div>
            <div>
              <Label>
                Time <span className="text-muted-foreground text-xs">(optional)</span>
              </Label>
              <Input
                type="time"
                value={eventTime}
                onChange={(e) => setEventTime(e.target.value)}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <Label>
              Details <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Any extra info for learners or parents…"
              rows={2}
              maxLength={500}
            />
          </div>

          <Button
            type="submit"
            disabled={saving || !title.trim() || !eventDate || (isTeacher && !classId)}
            className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
          >
            {saving
              ? <><Loader2 className="size-4 animate-spin mr-2" />Saving…</>
              : <><Plus className="size-4 mr-2" />Add event</>}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CalendarPage() {
  const { primarySchoolId, primaryRole, user } = useAuth();
  const today = new Date();

  const [year, setYear]       = useState(today.getFullYear());
  const [month, setMonth]     = useState(today.getMonth());
  const [selected, setSelected] = useState<string | null>(today.toISOString().slice(0, 10));
  const [events, setEvents]   = useState<CalEvent[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogDate, setDialogDate] = useState(today.toISOString().slice(0, 10));

  const isStaff   = primaryRole !== "parent";
  const isTeacher = primaryRole === "teacher";

  // Load classes:
  // - teachers: only their own classes (scoped by teacher_user_id)
  // - admin/principal: all classes at the school (for the audience picker)
  useEffect(() => {
    if (!isStaff || !primarySchoolId || !user) return;
    const query = supabase
      .from("classes")
      .select("id, name, grade_id")
      .eq("school_id", primarySchoolId)
      .order("grade_id")
      .order("name");

    if (isTeacher) {
      query.eq("teacher_user_id", user.id);
    }

    query.then(({ data }) => setClasses((data ?? []) as ClassOption[]));
  }, [isStaff, isTeacher, primarySchoolId, user]);

  const loadEvents = () => {
    const from = new Date(year, month, 1).toISOString().slice(0, 10);
    const to   = new Date(year, month + 2, 0).toISOString().slice(0, 10);

    Promise.all([
      (supabase as any)
        .from("national_calendar")
        .select("id, title, description, event_date, event_type")
        .gte("event_date", from)
        .lte("event_date", to)
        .order("event_date"),

      primarySchoolId
        ? supabase
            .from("calendar_events")
            .select("id, title, description, event_date, event_time, event_type, schools(name), classes(name)")
            .eq("school_id", primarySchoolId)
            .gte("event_date", from)
            .lte("event_date", to)
            .order("event_date")
            .order("event_time", { ascending: true, nullsFirst: false })
        : Promise.resolve({ data: [] }),
    ]).then(([national, school]) => {
      const nat: CalEvent[] = (national.data ?? []).map((e: any) => ({
        ...e, event_time: null, source: "national" as const,
      }));
      const sch: CalEvent[] = (school.data ?? []).map((e: any) => ({
        ...e, source: "school" as const,
      }));
      setEvents([...nat, ...sch].sort((a, b) => a.event_date.localeCompare(b.event_date)));
    });
  };

  useEffect(() => { loadEvents(); }, [year, month, primarySchoolId]);

  const openAddDialog = (date?: string) => {
    setDialogDate(date ?? today.toISOString().slice(0, 10));
    setDialogOpen(true);
  };

  const byDate = events.reduce<Record<string, CalEvent[]>>((acc, e) => {
    (acc[e.event_date] ??= []).push(e);
    return acc;
  }, {});

  const firstDay    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const prevMonth = () => month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1);

  const todayStr      = today.toISOString().slice(0, 10);
  const selectedEvents = selected ? (byDate[selected] ?? []) : [];
  const upcoming       = events.filter(e => e.event_date >= todayStr).slice(0, 10);

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Calendar"
        sub="SA school calendar and your school's events."
        action={
          isStaff ? (
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={() => openAddDialog(selected ?? undefined)}
            >
              <Plus className="size-4 mr-1.5" /> Add event
            </Button>
          ) : undefined
        }
      />

      {/* ── Legend ── */}
      <div className="flex flex-wrap gap-3 mb-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-green-500 inline-block" />Term start</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-orange-500 inline-block" />Term end</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-red-500 inline-block" />Public holiday</span>
        <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-accent inline-block" />School event</span>
      </div>

      {/* ── Month grid ── */}
      <Card className="overflow-hidden mb-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <Button size="icon" variant="ghost" onClick={prevMonth} className="size-8">
            <ChevronLeft className="size-4" />
          </Button>
          <span className="font-semibold text-sm">{MONTHS[month]} {year}</span>
          <Button size="icon" variant="ghost" onClick={nextMonth} className="size-8">
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="grid grid-cols-7 border-b">
          {DAYS.map(d => (
            <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (!day) return <div key={i} className="h-12 border-b border-r last:border-r-0" />;
            const dateStr   = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const dayEvents = byDate[dateStr] ?? [];
            const isToday   = dateStr === todayStr;
            const isSel     = dateStr === selected;
            // Dim weekends slightly
            const isWeekend = new Date(dateStr).getDay() === 0 || new Date(dateStr).getDay() === 6;

            return (
              <button
                key={i}
                onClick={() => setSelected(isSel ? null : dateStr)}
                className={`relative h-12 flex flex-col items-center pt-1.5 border-b border-r last:border-r-0 transition-colors
                  ${isSel ? "bg-accent/15" : "hover:bg-muted/50"}
                  ${isWeekend ? "bg-muted/20" : ""}
                `}
              >
                <span className={`text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full
                  ${isToday ? "bg-accent text-accent-foreground font-bold" : ""}
                  ${isSel && !isToday ? "text-accent font-bold" : ""}
                  ${isWeekend && !isToday ? "text-muted-foreground" : ""}
                `}>
                  {day}
                </span>
                {dayEvents.length > 0 && (
                  <div className="flex gap-0.5 mt-0.5">
                    {dayEvents.slice(0, 3).map((e, idx) => (
                      <span key={idx} className={`size-1.5 rounded-full ${eventColor(e.event_type)}`} />
                    ))}
                    {dayEvents.length > 3 && <span className="size-1.5 rounded-full bg-muted-foreground/40" />}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ── Selected day ── */}
      {selected && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold text-muted-foreground">
              {new Date(selected + "T00:00:00").toLocaleDateString("en-ZA", {
                weekday: "long", day: "numeric", month: "long",
              })}
            </div>
            {isStaff && (
              <Button
                size="sm"
                variant="outline"
                className="text-xs h-7 gap-1"
                onClick={() => openAddDialog(selected)}
              >
                <Plus className="size-3" /> Add event
              </Button>
            )}
          </div>
          {selectedEvents.length === 0 ? (
            <Card className="p-4 text-center text-sm text-muted-foreground">No events on this day.</Card>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map(e => <EventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Upcoming ── */}
      {upcoming.length > 0 && (
        <div>
          <div className="text-sm font-semibold mb-2 text-muted-foreground">Upcoming</div>
          <div className="space-y-2">
            {upcoming.map(e => <EventCard key={e.id} event={e} />)}
          </div>
        </div>
      )}

      {events.length === 0 && (
        <Card className="p-10 text-center text-muted-foreground text-sm">
          <CalendarDays className="size-8 mx-auto mb-2 opacity-40" />
          No events this month.
        </Card>
      )}

      {/* ── Add event dialog ── */}
      {isStaff && (
        <AddEventDialog
          open={dialogOpen}
          defaultDate={dialogDate}
          classes={classes}
          isTeacher={isTeacher}
          onOpenChange={setDialogOpen}
          onSaved={loadEvents}
        />
      )}
    </div>
  );
}

function EventCard({ event }: { event: CalEvent }) {
  const dot  = eventColor(event.event_type);
  const time = formatTime(event.event_time);
  const isNational = event.source === "national";

  return (
    <Card className={`p-4 flex items-start gap-3 ${isNational ? "bg-muted/30" : ""}`}>
      <div className={`size-2.5 rounded-full mt-1.5 shrink-0 ${dot}`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <span className="font-medium text-sm">{event.title}</span>
          <div className="flex items-center gap-1.5 shrink-0">
            {isNational && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 gap-1 text-muted-foreground">
                <Flag className="size-2.5" /> SA
              </Badge>
            )}
            {event.event_type && (
              <Badge variant="secondary" className="capitalize text-[10px] px-1.5 py-0">
                {event.event_type.replace("_", " ")}
              </Badge>
            )}
            {event.classes?.name && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-purple-600 border-purple-300">
                {event.classes.name}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
          <span>
            {new Date(event.event_date + "T00:00:00").toLocaleDateString("en-ZA", {
              day: "numeric", month: "short",
            })}
          </span>
          {time && (
            <span className="flex items-center gap-1">
              <Clock className="size-3" />{time}
            </span>
          )}
          {event.schools?.name && <span>{event.schools.name}</span>}
        </div>
        {event.description && (
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{event.description}</p>
        )}
      </div>
    </Card>
  );
}
