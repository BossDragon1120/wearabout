-- WearAbout database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then click Run.
-- Safe to run once on a new project.

-- ---------- tables ----------

create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  handle text not null default '' check (char_length(handle) <= 30),
  friend_code text not null unique,
  created_at timestamptz not null default now()
);

create table public.fits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  local_date date not null,                 -- the user's own calendar day, for streaks
  category text not null,
  detail text not null default '' check (char_length(detail) <= 60),
  bg_choice text not null default 'studio' check (bg_choice in ('studio','themed','original')),
  image_path text not null,                 -- fits/<uid>/<id>.jpg (backdrop version)
  thumb_path text not null,                 -- fits/<uid>/<id>-thumb.jpg
  orig_path text,                           -- fits/<uid>/<id>-orig.jpg (kept for the wardrobe builder)
  score numeric(3,1),
  analysis jsonb,                           -- {dims, low, review, tweak, buy, badges, goal}
  items jsonb not null default '[]',        -- [{label, type, brand}]
  rec_fb jsonb not null default '{}'        -- {tweak: 'up'|'down', buy: 'up'|'down'}
);
create index fits_user_created on public.fits (user_id, created_at desc);

-- Private per-person settings, such as the personal style goal that counts for 10% of the score.
create table public.user_settings (
  user_id uuid primary key default auth.uid() references auth.users on delete cascade,
  style_goal text not null default '' check (char_length(style_goal) <= 40),
  updated_at timestamptz not null default now()
);

create table public.saved_recs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fit_id uuid not null references public.fits on delete cascade,
  kind text not null check (kind in ('buy','tweak')),
  title text not null,
  detail text not null default '',
  query text not null,
  category text not null default '',
  created_at timestamptz not null default now(),
  unique (fit_id, kind)
);

create table public.friendships (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  friend_id uuid not null references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id),
  check (user_id <> friend_id)
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  fit_id uuid references public.fits on delete set null,
  created_at timestamptz not null default now(),
  category text not null,
  detail text not null default '',
  caption text not null default '' check (char_length(caption) <= 140),
  plugs jsonb not null default '[]',        -- [{label, link, review}]
  badges jsonb not null default '[]',       -- badge names the fit earned, shown to friends
  image_path text not null                  -- posts/<uid>/<id>.jpg
);
create index posts_created on public.posts (created_at desc);

create table public.hearts (
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  post_id uuid not null references public.posts on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

-- Server functions record each paid AI call here to enforce a daily cap. Not readable from the app.
create table public.ai_usage (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users on delete cascade,
  kind text not null,
  created_at timestamptz not null default now()
);
create index ai_usage_user_time on public.ai_usage (user_id, created_at);

-- ---------- helpers ----------

-- True when a and b have each added the other (or are the same person).
create or replace function public.is_mutual(a uuid, b uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select a = b or (
    exists (select 1 from friendships where user_id = a and friend_id = b) and
    exists (select 1 from friendships where user_id = b and friend_id = a)
  );
$$;

-- Every new account gets a profile with a unique 6-character friend code.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare c text;
begin
  loop
    select string_agg(substr('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 1 + floor(random() * 32)::int, 1), '')
      into c from generate_series(1, 6);
    exit when not exists (select 1 from profiles where friend_code = c);
  end loop;
  insert into profiles (id, friend_code) values (new.id, c);
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Look someone up by friend code without exposing everyone's profile.
create or replace function public.find_by_code(code text) returns table (id uuid, handle text)
language sql stable security definer set search_path = public as $$
  select p.id, p.handle from profiles p
  where auth.uid() is not null and p.friend_code = upper(trim(code));
$$;
revoke execute on function public.find_by_code(text) from public, anon;
grant execute on function public.find_by_code(text) to authenticated;

-- ---------- row level security ----------

alter table public.profiles enable row level security;
alter table public.fits enable row level security;
alter table public.saved_recs enable row level security;
alter table public.user_settings enable row level security;
alter table public.friendships enable row level security;
alter table public.posts enable row level security;
alter table public.hearts enable row level security;
alter table public.ai_usage enable row level security;   -- no policies: app cannot read or write it

-- profiles: you, and anyone connected to you in either direction
create policy "profiles visible to self and connections" on public.profiles for select to authenticated
  using (id = auth.uid() or exists (
    select 1 from public.friendships f
    where (f.user_id = auth.uid() and f.friend_id = profiles.id)
       or (f.user_id = profiles.id and f.friend_id = auth.uid())));
create policy "edit own profile" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());
revoke update on public.profiles from authenticated;
grant update (handle) on public.profiles to authenticated;   -- friend codes can't be changed from the app

-- fits and saved recs: private to their owner
create policy "own fits" on public.fits for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own settings" on public.user_settings for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own saved recs" on public.saved_recs for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- friendships: see rows that involve you; add or remove only your own side
create policy "see my friendships" on public.friendships for select to authenticated
  using (user_id = auth.uid() or friend_id = auth.uid());
create policy "add a friend" on public.friendships for insert to authenticated
  with check (user_id = auth.uid());
create policy "remove a friend" on public.friendships for delete to authenticated
  using (user_id = auth.uid());

-- posts: you and mutual friends can see them; only you post or remove yours
create policy "mutual friends see posts" on public.posts for select to authenticated
  using (public.is_mutual(auth.uid(), user_id));
create policy "post my fits" on public.posts for insert to authenticated
  with check (user_id = auth.uid());
create policy "remove my posts" on public.posts for delete to authenticated
  using (user_id = auth.uid());

-- hearts: visible on posts you can see; you add or remove your own
create policy "see hearts on visible posts" on public.hearts for select to authenticated
  using (exists (select 1 from public.posts p where p.id = post_id));
create policy "heart a visible post" on public.hearts for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id));
create policy "unheart" on public.hearts for delete to authenticated
  using (user_id = auth.uid());

-- ---------- photo storage ----------

insert into storage.buckets (id, name, public) values
  ('fits', 'fits', false),
  ('posts', 'posts', false)
on conflict (id) do nothing;

-- fits/<uid>/...: only the owner
create policy "fits: owner reads" on storage.objects for select to authenticated
  using (bucket_id = 'fits' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fits: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'fits' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "fits: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'fits' and (storage.foldername(name))[1] = auth.uid()::text);

-- posts/<uid>/...: owner and mutual friends read; owner uploads and deletes
create policy "posts: mutual friends read" on storage.objects for select to authenticated
  using (bucket_id = 'posts' and public.is_mutual(auth.uid(), ((storage.foldername(name))[1])::uuid));
create policy "posts: owner uploads" on storage.objects for insert to authenticated
  with check (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "posts: owner deletes" on storage.objects for delete to authenticated
  using (bucket_id = 'posts' and (storage.foldername(name))[1] = auth.uid()::text);
