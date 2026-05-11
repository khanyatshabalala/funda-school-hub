-- Exam timetables
create table if not exists exam_timetables (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  subject      text not null,
  grade_id     integer references grades(id),
  exam_date    date not null,
  start_time   time,
  end_time     time,
  venue        text,
  notes        text,
  term         integer not null default 1 check (term between 1 and 4),
  academic_year integer not null default extract(year from now())::integer,
  created_by   uuid references auth.users(id),
  created_at   timestamptz not null default now()
);

-- Index for fast school + year queries
create index if not exists exam_timetables_school_year_idx
  on exam_timetables(school_id, academic_year, exam_date);

-- RLS
alter table exam_timetables enable row level security;

-- School staff (teacher, principal, school_admin, super_admin) can read timetables for their school
create policy "school staff can read exam timetables"
  on exam_timetables for select
  using (
    has_school_role(
      array['teacher','principal','school_admin']::app_role[],
      school_id,
      auth.uid()
    )
    or is_super_admin(auth.uid())
  );

-- Principal and school_admin can insert
create policy "school admin can insert exam timetables"
  on exam_timetables for insert
  with check (
    has_school_role(
      array['principal','school_admin']::app_role[],
      school_id,
      auth.uid()
    )
    or is_super_admin(auth.uid())
  );

-- Principal and school_admin can update
create policy "school admin can update exam timetables"
  on exam_timetables for update
  using (
    has_school_role(
      array['principal','school_admin']::app_role[],
      school_id,
      auth.uid()
    )
    or is_super_admin(auth.uid())
  );

-- Principal and school_admin can delete
create policy "school admin can delete exam timetables"
  on exam_timetables for delete
  using (
    has_school_role(
      array['principal','school_admin']::app_role[],
      school_id,
      auth.uid()
    )
    or is_super_admin(auth.uid())
  );
