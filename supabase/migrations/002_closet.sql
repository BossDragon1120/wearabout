-- WearAbout: Closet (passive wardrobe built from your logged fits).
-- Run once in Supabase > SQL Editor > New query > paste > Run.

create table public.closet_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  label text not null check (char_length(label) between 1 and 80),
  type text not null default 'other',
  brand text,
  created_at timestamptz not null default now()
);
create index closet_items_user on public.closet_items (user_id);

alter table public.closet_items enable row level security;
create policy "own closet" on public.closet_items for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
