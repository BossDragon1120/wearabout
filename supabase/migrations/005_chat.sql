-- WearAbout: "I'd love to chat about…" on posts.
-- Run once in Supabase > SQL Editor > New query > paste > Run.

-- Your phone number, for friends to text or call you. Only you and mutual friends can read it.
create table public.contacts (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  phone text not null check (char_length(phone) between 7 and 20),
  updated_at timestamptz not null default now()
);
alter table public.contacts enable row level security;
create policy "own number" on public.contacts for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "mutual friends see number" on public.contacts for select to authenticated
  using (public.is_mutual(auth.uid(), user_id));

-- A post can invite friends to chat about something, for a limited time.
alter table public.posts add column chat_topic text not null default '' check (char_length(chat_topic) <= 60);
alter table public.posts add column chat_until timestamptz;

-- You can end your own chat invitation early.
create policy "update my posts" on public.posts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on public.posts from authenticated;
grant update (chat_until) on public.posts to authenticated;
