import { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator,
  TouchableOpacity, Modal, TextInput, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type CalEvent = {
  id: string;
  title: string;
  event_date: string;
  event_time: string | null;
  event_type: string | null;
  description: string | null;
  venue: string | null;
  source: 'national' | 'school';
  classes?: { name: string } | null;
};

type ClassOption = { id: string; name: string };

const EVENT_COLORS: Record<string, string> = {
  term_start:     '#22c55e',
  term_end:       '#f97316',
  public_holiday: '#ef4444',
  extra_class:    '#38bdf8',
  exam:           '#f97316',
  sport:          '#3b82f6',
  meeting:        '#a855f7',
  cultural:       '#ec4899',
  other:          '#64748b',
  default:        '#38bdf8',
};

const EVENT_TYPES = ['extra_class', 'meeting', 'sport', 'cultural', 'exam', 'other'] as const;
type EventType = typeof EVENT_TYPES[number];

function eventColor(type: string | null) {
  return EVENT_COLORS[type?.toLowerCase() ?? ''] ?? EVENT_COLORS.default;
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function todayIso() { return new Date().toISOString().slice(0, 10); }

export default function CalendarScreen() {
  const { primarySchoolId, primaryRole, user } = useAuth();
  const today = new Date();
  const canAddEvents = ['teacher', 'principal', 'school_admin', 'super_admin'].includes(primaryRole);

  const [month, setMonth]   = useState(today.getMonth());
  const [year, setYear]     = useState(today.getFullYear());
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle]           = useState('');
  const [eventDate, setEventDate]   = useState(todayIso());
  const [eventTime, setEventTime]   = useState('');
  const [eventType, setEventType]   = useState<EventType>('other');
  const [description, setDescription] = useState('');
  const [venue, setVenue]           = useState('');
  const [classId, setClassId]       = useState<string | null>(null);
  const [classes, setClasses]       = useState<ClassOption[]>([]);
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [showClassPicker, setShowClassPicker] = useState(false);

  const loadEvents = () => {
    const from = new Date(year, month, 1).toISOString().slice(0, 10);
    const to   = new Date(year, month + 1, 0).toISOString().slice(0, 10);
    setLoading(true);

    Promise.all([
      (supabase as any).from('national_calendar')
        .select('id, title, event_date, event_type')
        .gte('event_date', from).lte('event_date', to).order('event_date'),
      primarySchoolId
        ? supabase.from('calendar_events')
            .select('id, title, event_date, event_time, event_type, description, venue, classes(name)')
            .eq('school_id', primarySchoolId)
            .gte('event_date', from).lte('event_date', to).order('event_date')
        : Promise.resolve({ data: [] }),
    ]).then(([nat, sch]) => {
      const natEvents: CalEvent[] = (nat.data ?? []).map((e: any) => ({
        ...e, event_time: null, description: null, venue: null, source: 'national' as const,
      }));
      const schEvents: CalEvent[] = ((sch as any).data ?? []).map((e: any) => ({
        ...e, source: 'school' as const,
      }));
      setEvents([...natEvents, ...schEvents].sort((a, b) => a.event_date.localeCompare(b.event_date)));
      setLoading(false);
    });
  };

  useEffect(() => { loadEvents(); }, [month, year, primarySchoolId]);

  // Load classes for teacher/admin when modal opens
  useEffect(() => {
    if (!modalOpen || !primarySchoolId) return;
    supabase
      .from('classes')
      .select('id, name')
      .eq('school_id', primarySchoolId)
      .order('name')
      .then(({ data }) => setClasses((data ?? []) as ClassOption[]));
  }, [modalOpen, primarySchoolId]);

  const prevMonth = () => month === 0 ? (setYear(y => y - 1), setMonth(11)) : setMonth(m => m - 1);
  const nextMonth = () => month === 11 ? (setYear(y => y + 1), setMonth(0)) : setMonth(m => m + 1);

  const todayStr = today.toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.event_date >= todayStr);

  const resetForm = () => {
    setTitle(''); setEventDate(todayIso()); setEventTime('');
    setEventType('other'); setDescription(''); setVenue(''); setClassId(null);
  };

  const onSave = async () => {
    if (!title.trim()) { Alert.alert('Enter a title'); return; }
    if (!eventDate) { Alert.alert('Enter a date'); return; }
    if (!primarySchoolId) return;
    setSaving(true);
    const { error } = await supabase.from('calendar_events').insert({
      school_id:   primarySchoolId,
      created_by:  user?.id,
      title:       title.trim(),
      event_date:  eventDate,
      event_time:  eventTime.trim() || null,
      event_type:  eventType,
      description: description.trim() || null,
      venue:       venue.trim() || null,
      class_id:    classId || null,
    });
    setSaving(false);
    if (error) { Alert.alert('Error', error.message); return; }
    setModalOpen(false);
    resetForm();
    loadEvents();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <TouchableOpacity onPress={prevMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{MONTHS[month]} {year}</Text>
        <TouchableOpacity onPress={nextMonth} style={styles.navBtn}>
          <Text style={styles.navArrow}>›</Text>
        </TouchableOpacity>
        {canAddEvents && (
          <TouchableOpacity style={styles.addBtn} onPress={() => setModalOpen(true)}>
            <Ionicons name="add" size={20} color="#0f172a" />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color="#38bdf8" style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {upcoming.length === 0 ? (
            <View style={styles.emptyWrap}>
              <Ionicons name="calendar-outline" size={40} color="#334155" />
              <Text style={styles.empty}>No events this month.</Text>
            </View>
          ) : (
            upcoming.map((e) => (
              <View key={e.id} style={styles.card}>
                <View style={[styles.dot, { backgroundColor: eventColor(e.event_type) }]} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardTitle}>{e.title}</Text>
                  <Text style={styles.cardSub}>
                    {new Date(e.event_date + 'T00:00:00').toLocaleDateString('en-ZA', {
                      weekday: 'short', day: 'numeric', month: 'short',
                    })}
                    {e.event_time && ` · ${e.event_time.slice(0, 5)}`}
                    {e.venue && ` · ${e.venue}`}
                    {e.classes?.name && ` · ${e.classes.name}`}
                  </Text>
                  {e.description && (
                    <Text style={styles.cardDesc} numberOfLines={2}>{e.description}</Text>
                  )}
                </View>
                {e.source === 'national' ? (
                  <View style={styles.saBadge}><Text style={styles.saBadgeText}>SA</Text></View>
                ) : (
                  e.event_type && (
                    <View style={[styles.typeBadge, { backgroundColor: eventColor(e.event_type) + '22' }]}>
                      <Text style={[styles.typeBadgeText, { color: eventColor(e.event_type) }]}>
                        {e.event_type.replace('_', ' ')}
                      </Text>
                    </View>
                  )
                )}
              </View>
            ))
          )}
        </ScrollView>
      )}

      {/* Add event modal */}
      <Modal visible={modalOpen} animationType="slide" presentationStyle="pageSheet">
        <SafeAreaView style={styles.modal}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Add event</Text>
            <TouchableOpacity onPress={() => { setModalOpen(false); resetForm(); }}>
              <Ionicons name="close" size={24} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.modalBody}>
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Sports day"
              placeholderTextColor="#475569"
              autoFocus
            />

            <Text style={styles.fieldLabel}>Event type</Text>
            <TouchableOpacity style={styles.picker} onPress={() => setShowTypePicker(true)}>
              <Text style={styles.pickerText}>{eventType.replace('_', ' ')}</Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>

            <Text style={styles.fieldLabel}>Date</Text>
            <TextInput
              style={styles.input}
              value={eventDate}
              onChangeText={setEventDate}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#475569"
            />

            <Text style={styles.fieldLabel}>Time (optional)</Text>
            <TextInput
              style={styles.input}
              value={eventTime}
              onChangeText={setEventTime}
              placeholder="e.g. 09:00"
              placeholderTextColor="#475569"
            />

            <Text style={styles.fieldLabel}>Venue (optional)</Text>
            <TextInput
              style={styles.input}
              value={venue}
              onChangeText={setVenue}
              placeholder="e.g. School hall"
              placeholderTextColor="#475569"
            />

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={[styles.input, styles.textarea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Additional details…"
              placeholderTextColor="#475569"
              multiline
              numberOfLines={3}
            />

            {classes.length > 0 && (
              <>
                <Text style={styles.fieldLabel}>Class (optional)</Text>
                <TouchableOpacity style={styles.picker} onPress={() => setShowClassPicker(true)}>
                  <Text style={classId ? styles.pickerText : styles.pickerPlaceholder}>
                    {classId ? classes.find(c => c.id === classId)?.name : 'Whole school'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>
              </>
            )}

            <TouchableOpacity
              style={[styles.saveBtn, (saving || !title.trim() || !eventDate) && styles.saveBtnDisabled]}
              onPress={onSave}
              disabled={saving || !title.trim() || !eventDate}
            >
              {saving
                ? <ActivityIndicator color="#0f172a" />
                : <Text style={styles.saveBtnText}>Add event</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>

        {/* Event type picker */}
        <Modal visible={showTypePicker} transparent animationType="slide">
          <View style={styles.pickerModal}>
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerSheetTitle}>Event type</Text>
              <ScrollView>
                {EVENT_TYPES.map(t => (
                  <TouchableOpacity
                    key={t}
                    style={styles.pickerOption}
                    onPress={() => { setEventType(t); setShowTypePicker(false); }}
                  >
                    <View style={[styles.typeColorDot, { backgroundColor: eventColor(t) }]} />
                    <Text style={[styles.pickerOptionText, eventType === t && styles.pickerOptionActive]}>
                      {t.replace('_', ' ')}
                    </Text>
                    {eventType === t && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowTypePicker(false)}>
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* Class picker */}
        <Modal visible={showClassPicker} transparent animationType="slide">
          <View style={styles.pickerModal}>
            <View style={styles.pickerSheet}>
              <Text style={styles.pickerSheetTitle}>Select class</Text>
              <ScrollView>
                <TouchableOpacity
                  style={styles.pickerOption}
                  onPress={() => { setClassId(null); setShowClassPicker(false); }}
                >
                  <Text style={[styles.pickerOptionText, !classId && styles.pickerOptionActive]}>
                    Whole school
                  </Text>
                  {!classId && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                </TouchableOpacity>
                {classes.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={styles.pickerOption}
                    onPress={() => { setClassId(c.id); setShowClassPicker(false); }}
                  >
                    <Text style={[styles.pickerOptionText, classId === c.id && styles.pickerOptionActive]}>
                      {c.name}
                    </Text>
                    {classId === c.id && <Ionicons name="checkmark" size={16} color="#38bdf8" />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity style={styles.pickerCancel} onPress={() => setShowClassPicker(false)}>
                <Text style={styles.pickerCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container:        { flex: 1, backgroundColor: '#0f172a' },
  monthNav:         { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, paddingBottom: 12 },
  navBtn:           { padding: 8 },
  navArrow:         { fontSize: 24, color: '#94a3b8', fontWeight: '300' },
  monthLabel:       { fontSize: 18, fontWeight: '700', color: '#f1f5f9', flex: 1, textAlign: 'center' },
  addBtn:           { backgroundColor: '#38bdf8', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  list:             { padding: 16, gap: 10, paddingBottom: 40 },
  emptyWrap:        { alignItems: 'center', marginTop: 60, gap: 10 },
  empty:            { color: '#475569', textAlign: 'center', fontSize: 14 },
  card:             { backgroundColor: '#1e293b', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dot:              { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
  cardBody:         { flex: 1 },
  cardTitle:        { color: '#f1f5f9', fontWeight: '600', fontSize: 14 },
  cardSub:          { color: '#64748b', fontSize: 12, marginTop: 2 },
  cardDesc:         { color: '#475569', fontSize: 12, marginTop: 4, lineHeight: 17 },
  saBadge:          { backgroundColor: '#1e3a5f', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  saBadgeText:      { color: '#60a5fa', fontSize: 10, fontWeight: '700' },
  typeBadge:        { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  typeBadgeText:    { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  // Modal
  modal:            { flex: 1, backgroundColor: '#0f172a' },
  modalHeader:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  modalTitle:       { fontSize: 18, fontWeight: '700', color: '#f1f5f9' },
  modalBody:        { padding: 20, gap: 4, paddingBottom: 40 },
  fieldLabel:       { fontSize: 13, fontWeight: '600', color: '#94a3b8', marginTop: 14, marginBottom: 6 },
  input:            { backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#f1f5f9' },
  textarea:         { minHeight: 80, textAlignVertical: 'top' },
  picker:           { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1e293b', borderWidth: 1, borderColor: '#334155', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  pickerText:       { color: '#f1f5f9', fontSize: 14, textTransform: 'capitalize' },
  pickerPlaceholder:{ color: '#475569', fontSize: 14 },
  saveBtn:          { backgroundColor: '#38bdf8', borderRadius: 10, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnDisabled:  { opacity: 0.5 },
  saveBtnText:      { color: '#0f172a', fontWeight: '700', fontSize: 15 },
  pickerModal:      { flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000080' },
  pickerSheet:      { backgroundColor: '#1e293b', borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%', paddingBottom: 20 },
  pickerSheetTitle: { fontSize: 16, fontWeight: '700', color: '#f1f5f9', padding: 20, borderBottomWidth: 1, borderBottomColor: '#334155' },
  pickerOption:     { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  pickerOptionText: { color: '#cbd5e1', fontSize: 15, flex: 1, textTransform: 'capitalize' },
  pickerOptionActive:{ color: '#38bdf8', fontWeight: '700' },
  pickerCancel:     { margin: 16, backgroundColor: '#0f172a', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  pickerCancelText: { color: '#94a3b8', fontWeight: '600', fontSize: 15 },
  typeColorDot:     { width: 10, height: 10, borderRadius: 5 },
});
