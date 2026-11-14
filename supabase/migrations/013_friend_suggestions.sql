-- WearAbout: "People you may know" — friends of your friends, with one tap to add.
-- Safe to run more than once. Run in Supabase > SQL Editor > New query > paste > Run.

-- Your switch in Profile: show me in friend suggestions (on unless you turn it off).
alter table public.profiles add column if not exists suggest_me boolean not null default true;
-- Let people change their own switches from the app. (Also fixes the "Let friends ask about my
-- pieces" switch, which couldn't save before.)
grant update (allow_asks, suggest_me) on public.profiles to authenticated;

-- True when a and b have at least one mutual friend in common.
create or replace function public.shares_friend(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1
    from friendships a1 join friendships a2 on a2.user_id = a1.friend_id and a2.friend_id = a1.user_id
    join friendships b1 on b1.user_id = b and b1.friend_id = a1.friend_id
    join friendships b2 on b2.user_id = a1.friend_id and b2.friend_id = b
    where a1.user_id = a);
$$;

-- True when b allows suggestions and shares a mutual friend with a (for showing b's photo to a).
create or replace function public.suggestable_to(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles p where p.id = b and p.suggest_me) and public.shares_friend(a, b);
$$;

-- Suggestions for you: people who are mutual friends with your mutual friends, who you haven't
-- added and who haven't added you, nobody blocked either way, and only people who allow it.
-- Returns name, photo, how many friends you share, and one of those friends' names.
create or replace function public.friend_suggestions() returns table (id uuid, handle text, avatar_path text, mutuals int, via text)
language sql stable security definer set search_path = public as $$
  with mine as (
    select f.friend_id as fid from friendships f
    where f.user_id = auth.uid()
      and exists (select 1 from friendships g where g.user_id = f.friend_id and g.friend_id = auth.uid())),
  cand as (
    select f.friend_id as cid, count(distinct m.fid)::int as n, min(m.fid::text)::uuid as one
    from mine m
    join friendships f on f.user_id = m.fid
    join friendships g on g.user_id = f.friend_id and g.friend_id = m.fid
    where f.friend_id <> auth.uid()
      and not exists (select 1 from friendships x where (x.user_id = auth.uid() and x.friend_id = f.friend_id)
                                                     or (x.user_id = f.friend_id and x.friend_id = auth.uid()))
      and not public.is_blocked(auth.uid(), f.friend_id)
    group by f.friend_id)
  select p.id, p.handle, p.avatar_path, c.n, v.handle
  from cand c join profiles p on p.id = c.cid left join profiles v on v.id = c.one
  where auth.uid() is not null and p.suggest_me and coalesce(trim(p.handle), '') <> ''
  order by c.n desc, p.created_at desc
  limit 12;
$$;
revoke execute on function public.friend_suggestions() from public, anon;
grant execute on function public.friend_suggestions() to authenticated;
revoke execute on function public.shares_friend(uuid, uuid) from public, anon;
grant execute on function public.shares_friend(uuid, uuid) to authenticated;
revoke execute on function public.suggestable_to(uuid, uuid) from public, anon;
grant execute on function public.suggestable_to(uuid, uuid) to authenticated;

-- Profile photos: friends of friends can see them too (only for people who allow suggestions),
-- so a suggestion shows a face, not just a name. Posts and fits stay friends-only.
drop policy if exists "avatars: friends of friends read" on storage.objects;
create policy "avatars: friends of friends read" on storage.objects for select to authenticated
  using (bucket_id = 'avatars'
    and public.suggestable_to(auth.uid(), ((storage.foldername(name))[1])::uuid));
