-- Seeds the subject page for ME46020 Finite Element Analysis (SGSITS, Mech sem 7), so its study site has a page to sit on.
-- Name and code are from the student's own course pack. The 2023-24 department scheme PDF lists ME46020 as "Computer Aided Design"
-- (codes were reused between schemes), so the syllabus card shows the name and scheme year it was taken from.

do $seed$
declare c bigint := (select id from public.colleges where slug = 'sgsits'); s bigint;
begin
  insert into public.subjects (branch, semester, name, code) values ('Mech', 7, 'Finite Element Analysis', 'ME46020') on conflict do nothing;
  select id into s from public.subjects where lower(name) = lower('Finite Element Analysis');
  insert into public.subject_offerings (college_id, subject_id, branch, semester, code) values (c, s, 'Mech', 7, 'ME46020') on conflict do nothing;
end $seed$;
