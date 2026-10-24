-- WearAbout: accepting an invite link makes you mutual friends right away (no "Add back" step).
-- Run once in Supabase > SQL Editor > New query > paste > Run.

-- Each tap on "Invite friends" creates a private token for that link. A plain friend code
-- still only adds one side; only a real invite link from you makes the friendship mutual.
create table public.invites (
  token text primary key check (char_length(token) between 16 and 40),
  inviter uuid not null default auth.uid() references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);
alter table public.invites enable row level security;
create policy "create my invites" on public.invites for insert to authenticated
  with check (inviter = auth.uid());

-- Accept an invite: adds both sides of the friendship. Returns who invited you.
create or replace function public.accept_invite(t text) returns table (id uuid, handle text)
language plpgsql security definer set search_path = public as $$
declare who uuid;
begin
  if auth.uid() is null then return; end if;
  select i.inviter into who from invites i where i.token = t and i.expires_at > now();
  if who is null or who = auth.uid() then return; end if;
  insert into friendships (user_id, friend_id) values (auth.uid(), who), (who, auth.uid())
    on conflict do nothing;
  return query select p.id, p.handle from profiles p where p.id = who;
end $$;
revoke execute on function public.accept_invite(text) from public, anon;
grant execute on function public.accept_invite(text) to authenticated;
