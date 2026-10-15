-- Dismissing reports is a mod action too, so it goes through a logged function like moderate().
-- target_id is text so profile reports (uuid ids) can be dismissed as well.
create or replace function public.dismiss_reports(p_type text, p_id text, p_note text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_mod() then raise exception 'mods only'; end if;
  update reports set status = 'dismissed' where target_type = p_type and target_id = p_id and status = 'open';
  insert into mod_actions (actor_id, action, target_type, target_id, note)
  values (auth.uid(), 'dismiss', p_type, p_id, p_note);
end $$;
