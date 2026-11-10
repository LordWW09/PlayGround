-- SEED shared campaigns: run this once in Supabase SQL Editor.
-- Uses the Supabase Auth UID as the sole source of identity.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.seed_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  app_role text not null check (app_role in ('master', 'player')),
  created_at timestamptz not null default now()
);

create table if not exists public.seed_campaigns (
  id text primary key,
  owner_id uuid not null references auth.users(id) on delete cascade,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.seed_campaign_members (
  campaign_id text not null references public.seed_campaigns(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_role text not null default 'player' check (member_role = 'player'),
  status text not null default 'pending' check (status in ('pending', 'active')),
  joined_at timestamptz not null default now(),
  primary key (campaign_id, user_id)
);

create table if not exists public.seed_campaign_invites (
  id uuid primary key default gen_random_uuid(),
  campaign_id text not null references public.seed_campaigns(id) on delete cascade,
  token_hash text not null unique,
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists seed_campaign_members_user_idx
  on public.seed_campaign_members(user_id, status);
create index if not exists seed_campaign_invites_campaign_idx
  on public.seed_campaign_invites(campaign_id);

-- Security-definer predicates avoid recursive RLS checks between campaigns and memberships.
create or replace function public.seed_is_campaign_owner(p_campaign_id text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.seed_campaigns c where c.id = p_campaign_id and c.owner_id = auth.uid()) $$;
create or replace function public.seed_is_active_member(p_campaign_id text)
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.seed_campaign_members m where m.campaign_id = p_campaign_id and m.user_id = auth.uid() and m.status = 'active') $$;
revoke all on function public.seed_is_campaign_owner(text) from public, anon;
revoke all on function public.seed_is_active_member(text) from public, anon;
grant execute on function public.seed_is_campaign_owner(text) to authenticated;
grant execute on function public.seed_is_active_member(text) to authenticated;

alter table public.seed_profiles enable row level security;
alter table public.seed_campaigns enable row level security;
alter table public.seed_campaign_members enable row level security;
alter table public.seed_campaign_invites enable row level security;

-- Profiles are readable by their owner. Public account creation always creates a
-- player profile; role promotion is performed only by a trusted administrator.
drop policy if exists seed_profiles_read_self on public.seed_profiles;
create policy seed_profiles_read_self on public.seed_profiles
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists seed_profiles_insert_self on public.seed_profiles;
-- Profile creation goes through the SECURITY DEFINER RPC below so clients cannot
-- choose app_role through a direct table insert.
revoke insert on public.seed_profiles from anon, authenticated;
drop policy if exists seed_profiles_update_name on public.seed_profiles;
create policy seed_profiles_update_name on public.seed_profiles
  for update to authenticated using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
revoke update on public.seed_profiles from authenticated;
grant update (display_name) on public.seed_profiles to authenticated;

-- Campaign payload is visible to the owner and approved members. Approved players
-- may update shared play state; only the owner may create or delete a campaign.
drop policy if exists seed_campaigns_read_members on public.seed_campaigns;
create policy seed_campaigns_read_members on public.seed_campaigns
  for select to authenticated using (
    owner_id = (select auth.uid()) or public.seed_is_active_member(id)
  );
drop policy if exists seed_campaigns_insert_owner on public.seed_campaigns;
create policy seed_campaigns_insert_owner on public.seed_campaigns
  for insert to authenticated with check (
    owner_id = (select auth.uid()) and exists (
      select 1 from public.seed_profiles p
      where p.user_id = (select auth.uid()) and p.app_role = 'master'
    )
  );
drop policy if exists seed_campaigns_update_members on public.seed_campaigns;
create policy seed_campaigns_update_members on public.seed_campaigns
  for update to authenticated using (
    owner_id = (select auth.uid()) or public.seed_is_active_member(id)
  ) with check (
    owner_id = (select auth.uid()) or public.seed_is_active_member(id)
  );
drop policy if exists seed_campaigns_delete_owner on public.seed_campaigns;
create policy seed_campaigns_delete_owner on public.seed_campaigns
  for delete to authenticated using (owner_id = (select auth.uid()));

-- Memberships are private: a participant sees their own status; the campaign
-- owner sees all requests. Mutations are only available through the RPCs below.
drop policy if exists seed_members_read_related on public.seed_campaign_members;
create policy seed_members_read_related on public.seed_campaign_members
  for select to authenticated using (
    user_id = (select auth.uid()) or public.seed_is_campaign_owner(campaign_id)
  );
revoke insert, update, delete on public.seed_campaign_members from authenticated;

-- Invite hashes are never readable through the client API.
revoke all on public.seed_campaign_invites from anon, authenticated;

-- Remove the earlier caller-selectable role signature when upgrading an existing schema.
drop function if exists public.seed_create_profile(text, text);
create or replace function public.seed_create_profile(p_display_name text)
returns public.seed_profiles
language plpgsql security definer set search_path = ''
as $$
declare result public.seed_profiles;
begin
  if auth.uid() is null then
    raise exception 'Autenticação necessária';
  end if;
  insert into public.seed_profiles(user_id, display_name, app_role)
  values (auth.uid(), left(trim(coalesce(p_display_name, '')), 80), 'player')
  on conflict (user_id) do nothing;
  select * into result from public.seed_profiles where user_id = auth.uid();
  return result;
end;
$$;

create or replace function public.seed_create_invite(p_campaign_id text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare token text;
begin
  if not exists (select 1 from public.seed_campaigns c
    where c.id = p_campaign_id and c.owner_id = auth.uid()) then
    raise exception 'Somente o Mestre da campanha pode convidar';
  end if;
  token := encode(extensions.gen_random_bytes(24), 'hex');
  insert into public.seed_campaign_invites(campaign_id, token_hash)
  values (p_campaign_id, encode(extensions.digest(token, 'sha256'), 'hex'));
  return token;
end;
$$;

create or replace function public.seed_request_join(p_invite_token text)
returns text
language plpgsql security definer set search_path = ''
as $$
declare target_campaign text;
begin
  if auth.uid() is null or coalesce(length(p_invite_token), 0) < 32 then
    raise exception 'Convite inválido ou expirado';
  end if;
  select i.campaign_id into target_campaign
  from public.seed_campaign_invites i
  where i.token_hash = encode(extensions.digest(p_invite_token, 'sha256'), 'hex')
    and i.expires_at > now();
  if target_campaign is null then raise exception 'Convite inválido ou expirado'; end if;
  insert into public.seed_campaign_members(campaign_id, user_id, member_role, status)
  values (target_campaign, auth.uid(), 'player', 'pending')
  on conflict (campaign_id, user_id) do nothing;
  return target_campaign;
end;
$$;

create or replace function public.seed_approve_member(p_campaign_id text, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.seed_campaigns c
    where c.id = p_campaign_id and c.owner_id = auth.uid()) then
    raise exception 'Somente o Mestre da campanha pode aprovar participantes';
  end if;
  update public.seed_campaign_members set status = 'active'
  where campaign_id = p_campaign_id and user_id = p_user_id and status = 'pending';
  if not found then raise exception 'Solicitação não encontrada'; end if;
end;
$$;

create or replace function public.seed_remove_member(p_campaign_id text, p_user_id uuid)
returns void
language plpgsql security definer set search_path = ''
as $$
begin
  if not exists (select 1 from public.seed_campaigns c
    where c.id = p_campaign_id and c.owner_id = auth.uid()) then
    raise exception 'Somente o Mestre da campanha pode remover participantes';
  end if;
  delete from public.seed_campaign_members
  where campaign_id = p_campaign_id and user_id = p_user_id;
end;
$$;

revoke all on function public.seed_create_profile(text) from public, anon;
revoke all on function public.seed_create_invite(text) from public, anon;
revoke all on function public.seed_request_join(text) from public, anon;
revoke all on function public.seed_approve_member(text, uuid) from public, anon;
revoke all on function public.seed_remove_member(text, uuid) from public, anon;
grant execute on function public.seed_create_profile(text) to authenticated;
grant execute on function public.seed_create_invite(text) to authenticated;
grant execute on function public.seed_request_join(text) to authenticated;
grant execute on function public.seed_approve_member(text, uuid) to authenticated;
grant execute on function public.seed_remove_member(text, uuid) to authenticated;

grant select, insert, delete on public.seed_campaigns to authenticated;
revoke update on public.seed_campaigns from authenticated;
grant update (payload, updated_at) on public.seed_campaigns to authenticated;
grant select on public.seed_campaign_members to authenticated;
grant select on public.seed_profiles to authenticated;
