-- WearAbout: notifications when a friend joins or posts.
-- Run once in Supabase > SQL Editor > New query > paste > Run.

-- Lets the database tell the server function when something happens.
create extension if not exists pg_net with schema extensions;

-- Each phone that turned on notifications. Only you can see or change yours.
create table public.push_subs (
  endpoint text primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subs enable row level security;
create policy "own push subscriptions" on public.push_subs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- What kinds of notifications each person wants.
alter table public.user_settings add column notify_posts boolean not null default true;
alter table public.user_settings add column notify_friends boolean not null default true;

-- At most one notification per friend, per kind, per day. Server only.
create table public.push_log (
  recipient uuid not null references auth.users on delete cascade,
  sender uuid not null references auth.users on delete cascade,
  kind text not null,
  day date not null default current_date,
  primary key (recipient, sender, kind, day)
);
alter table public.push_log enable row level security;

-- The app's own notification signing key, created by the server on first use. Server only.
create table public.app_keys (
  name text primary key,
  value jsonb not null
);
alter table public.app_keys enable row level security;

-- When a post or a friendship is added, ping the server function.
create or replace function public.wa_notify() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  perform net.http_post(
    url := 'https://hsbmjprblxybazcrnhrd.supabase.co/functions/v1/wear-about',
    body := jsonb_build_object('action', 'notify', 'table', TG_TABLE_NAME, 'record', to_jsonb(NEW)),
    headers := '{"Content-Type": "application/json"}'::jsonb);
  return NEW;
end $$;

create trigger notify_new_post after insert on public.posts
  for each row execute function public.wa_notify();
create trigger notify_new_friend after insert on public.friendships
  for each row execute function public.wa_notify();
