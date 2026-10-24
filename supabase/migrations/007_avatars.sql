-- WearAbout: profile pictures.
-- Run once in Supabase > SQL Editor > New query > paste > Run.

alter table public.profiles add column avatar_path text;   -- avatars/<uid>/<file>.jpg
grant update (avatar_path) on public.profiles to authenticated;

-- True when a and b are connected in either direction (or are the same person).
create or replace function public.is_connected(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a = b or exists (
    select 1 from friendships
    where (user_id = a and friend_id = b) or (user_id = b and friend_id = a));
$$;

-- Profile pictures get their own private folder, separate from fit photos.
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', false)
on conflict (id) do nothing;

-- avatars/<uid>/...: you and people you're connected with can see it; only you change it.
create policy "avatars: connections read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and public.is_connected(auth.uid(), ((storage.foldername(name))[1])::uuid));
create policy "avatars: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
