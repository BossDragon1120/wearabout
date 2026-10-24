-- WearAbout: let each person turn buy recommendations on or off.
-- Run once in Supabase > SQL Editor > New query > paste > Run.
alter table public.user_settings add column if not exists buy_recs boolean not null default true;
