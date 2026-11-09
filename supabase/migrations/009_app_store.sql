-- WearAbout: what the App Store requires — AI consent, blocking, and reporting.
-- Run once in Supabase > SQL Editor > New query > paste > Run.

-- 1. AI consent: when you agreed to send your photos to the AI services (Anthropic, Photoroom).
alter table public.user_settings add column if not exists ai_consent_at timestamptz;

-- 2. Blocking: a block removes the friendship both ways and stops them adding you again.
create table if not exists public.blocks (
  blocker uuid not null default auth.uid() references auth.users on delete cascade,
  blocked uuid not null references auth.users on delete cascade,
  blocked_name text not null default '' check (char_length(blocked_name) <= 30),  -- shown in your Blocked list
  created_at timestamptz not null default now(),
  primary key (blocker, blocked),
  check (blocker <> blocked)
);
alter table public.blocks enable row level security;
drop policy if exists "see my blocks" on public.blocks;
create policy "see my blocks" on public.blocks for select to authenticated using (blocker = auth.uid());
drop policy if exists "unblock" on public.blocks;
create policy "unblock" on public.blocks for delete to authenticated using (blocker = auth.uid());

create or replace function public.is_blocked(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from blocks where (blocker = a and blocked = b) or (blocker = b and blocked = a));
$$;

create or replace function public.block_user(who uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or who is null or who = auth.uid() then return; end if;
  insert into blocks (blocker, blocked, blocked_name)
    values (auth.uid(), who, coalesce((select left(handle, 30) from profiles where id = who), ''))
    on conflict do nothing;
  delete from friendships where (user_id = auth.uid() and friend_id = who) or (user_id = who and friend_id = auth.uid());
end $$;
revoke execute on function public.block_user(uuid) from public, anon;
grant execute on function public.block_user(uuid) to authenticated;

-- Adding by friend code is refused when either of you has blocked the other.
drop policy if exists "add a friend" on public.friendships;
create policy "add a friend" on public.friendships for insert to authenticated
  with check (user_id = auth.uid() and not public.is_blocked(user_id, friend_id));

-- Invite links do nothing between people who have blocked each other.
create or replace function public.accept_invite(t text) returns table (id uuid, handle text)
language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if auth.uid() is null then return; end if;
  select i.inviter into who from invites i where i.token = t and i.expires_at > now();
  if who is null or who = auth.uid() or public.is_blocked(auth.uid(), who) then return; end if;
  insert into friendships (user_id, friend_id) values (auth.uid(), who), (who, auth.uid())
    on conflict do nothing;
  return query select p.id, p.handle from profiles p where p.id = who;
end $$;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;

-- 3. Reports: anyone can report a post they can see. Only you (the owner) read them, in the Supabase dashboard.
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  reporter uuid not null default auth.uid() references auth.users on delete cascade,
  post_id uuid references public.posts on delete set null,
  reported_user uuid references auth.users on delete set null,
  reason text not null check (char_length(reason) <= 60),
  details text not null default '' check (char_length(details) <= 300),
  image_path text,                          -- kept so you can review the post even if it's removed
  status text not null default 'new',
  created_at timestamptz not null default now()
);
alter table public.reports enable row level security;
drop policy if exists "file a report" on public.reports;
create policy "file a report" on public.reports for insert to authenticated with check (reporter = auth.uid());
