-- WearAbout: get a phone notification for every report, and review reports inside the app.
-- Run once in Supabase > SQL Editor > New query > paste > Run.
-- Before running, replace YOUR-EMAIL below with the email you sign in to WearAbout with.

-- Who reviews reports (you). Moderators can see a Reports screen in Profile.
create table if not exists public.moderators (
  user_id uuid primary key references auth.users on delete cascade
);
alter table public.moderators enable row level security;
drop policy if exists "am i a moderator" on public.moderators;
create policy "am i a moderator" on public.moderators for select to authenticated using (user_id = auth.uid());

insert into public.moderators (user_id)
  select id from auth.users where lower(email) = lower('YOUR-EMAIL')
  on conflict do nothing;

-- When a report was handled, and what was decided.
alter table public.reports add column if not exists reviewed_at timestamptz;
alter table public.reports add column if not exists decision text;

-- Ping the server function when a report comes in, so it can notify you.
drop trigger if exists notify_new_report on public.reports;
create trigger notify_new_report after insert on public.reports
  for each row execute function public.wa_notify();
