-- Seed SA grade reference data
-- Primary: Grade R (0) through Grade 7
-- Secondary: Grade 8 through Grade 12
-- Combined schools cover both phases

insert into public.grades (id, label, phase) values
  (0,  'Grade R',  'primary'),
  (1,  'Grade 1',  'primary'),
  (2,  'Grade 2',  'primary'),
  (3,  'Grade 3',  'primary'),
  (4,  'Grade 4',  'primary'),
  (5,  'Grade 5',  'primary'),
  (6,  'Grade 6',  'primary'),
  (7,  'Grade 7',  'primary'),
  (8,  'Grade 8',  'secondary'),
  (9,  'Grade 9',  'secondary'),
  (10, 'Grade 10', 'secondary'),
  (11, 'Grade 11', 'secondary'),
  (12, 'Grade 12', 'secondary')
on conflict (id) do update
  set label = excluded.label,
      phase  = excluded.phase;
