-- WearAbout: "Love this piece?" Friends can tap any piece in your post and ask where it's from.
-- Safe to run more than once. Run in Supabase > SQL Editor > New query > paste > Run.

-- The pieces in a post (label, type, close-up), copied in when you post so friends can see them.
alter table public.posts add column if not exists pieces jsonb not null default '[]'::jsonb;

-- Your switch in Profile: let friends ask about your pieces (on unless you turn it off).
alter table public.profiles add column if not exists allow_asks boolean not null default true;

-- One row per friend per piece they loved. The poster can answer publicly (it's added to the post)
-- or just to the people who asked.
create table if not exists public.piece_asks (
  id bigint generated always as identity primary key,
  post_id uuid not null references public.posts on delete cascade,
  piece int not null check (piece >= 0 and piece < 40),
  asker uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  answer_brand text check (char_length(answer_brand) <= 40),
  answer_note text check (char_length(answer_note) <= 160),
  answer_public boolean,
  unique (post_id, piece, asker)
);
alter table public.piece_asks enable row level security;

-- Ask: only on a friend's post you can see, not your own, and only if they allow asks.
drop policy if exists "ask about a piece" on public.piece_asks;
create policy "ask about a piece" on public.piece_asks for insert to authenticated
  with check (
    asker = auth.uid() and answered_at is null and answer_brand is null and answer_note is null and answer_public is null
    and exists (select 1 from public.posts p
                join public.profiles pr on pr.id = p.user_id
                where p.id = post_id and p.user_id <> auth.uid()
                  and public.is_mutual(auth.uid(), p.user_id) and pr.allow_asks)
  );
-- See: your own asks, and asks about your posts. (Other friends don't see private answers.)
drop policy if exists "see asks" on public.piece_asks;
create policy "see asks" on public.piece_asks for select to authenticated
  using (asker = auth.uid() or exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
-- Answer: only the poster, on their own post.
drop policy if exists "answer asks" on public.piece_asks;
create policy "answer asks" on public.piece_asks for update to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid()));
-- Take back your own ask.
drop policy if exists "unask" on public.piece_asks;
create policy "unask" on public.piece_asks for delete to authenticated using (asker = auth.uid());

-- Notifications: tell the poster about a new ask, and the asker when it's answered.
drop trigger if exists notify_piece_ask on public.piece_asks;
create trigger notify_piece_ask after insert on public.piece_asks
  for each row execute function public.wa_notify();
drop trigger if exists notify_piece_answer on public.piece_asks;
create trigger notify_piece_answer after update of answered_at on public.piece_asks
  for each row when (new.answered_at is not null and old.answered_at is null)
  execute function public.wa_notify();
