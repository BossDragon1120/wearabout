-- WearAbout: 18+ confirmation, terms acceptance, and safe handling of illegal content.
-- Safe to run more than once. Run in Supabase > SQL Editor > New query > paste > Run.

-- When each person confirmed they're 18 or older and agreed to the Terms and Privacy Policy.
alter table public.user_settings add column if not exists terms_accepted_at timestamptz;
alter table public.user_settings add column if not exists terms_version text;

-- Illegal content (for example child sexual abuse material) must be reported to NCMEC and kept,
-- not deleted. A locked copy goes to a private "evidence" bucket that only the server can read.
alter table public.reports add column if not exists evidence_path text;
insert into storage.buckets (id, name, public) values ('evidence', 'evidence', false)
  on conflict (id) do nothing;
-- (No storage policies on purpose: people using the app can't read, list or change this bucket.)
