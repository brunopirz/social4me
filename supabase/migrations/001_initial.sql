-- Social Distro — schema inicial
-- Execute no Supabase SQL Editor ou via CLI

create extension if not exists "pgcrypto";

-- Perfis (espelha auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  avatar_url text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  posts_used int not null default 0,
  posts_limit int not null default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Marcas (1 marca → N contas)
create table public.brands (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  category text,
  target_audience text,
  pain_points text,
  key_benefits text,
  cta_text text,
  brand_tone text default 'professional',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Contas sociais conectadas
create type platform_type as enum (
  'instagram', 'tiktok', 'linkedin', 'twitter', 'facebook'
);

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  platform platform_type not null,
  external_id text not null,
  display_name text,
  username text,
  avatar_url text,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  metadata jsonb default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, platform, external_id)
);

-- Posts (rascunho, agendado, publicado)
create type post_status as enum (
  'draft', 'scheduled', 'queued', 'posting', 'posted', 'failed', 'cancelled'
);

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  brand_id uuid references public.brands(id) on delete set null,
  caption text not null default '',
  angle_tag text,
  status post_status not null default 'draft',
  scheduled_for timestamptz,
  published_at timestamptz,
  platform_post_ids jsonb default '{}',
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Mídia dos posts (slides do carrossel)
create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  sort_order int not null default 0,
  storage_path text not null,
  public_url text,
  width int,
  height int,
  aspect_ratio text default '9:16',
  created_at timestamptz not null default now()
);

-- Destinos: qual conta recebe qual post (com caption override)
create table public.post_targets (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  social_account_id uuid not null references public.social_accounts(id) on delete cascade,
  caption_override text,
  status post_status not null default 'scheduled',
  platform_post_id text,
  error_message text,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, social_account_id)
);

-- Analytics simplificado
create table public.post_analytics (
  id uuid primary key default gen_random_uuid(),
  post_target_id uuid not null references public.post_targets(id) on delete cascade,
  reach int default 0,
  likes int default 0,
  comments int default 0,
  shares int default 0,
  saves int default 0,
  profile_visits int default 0,
  fetched_at timestamptz not null default now()
);

-- OAuth state (CSRF)
create table public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  platform platform_type not null,
  state text not null unique,
  redirect_after text,
  expires_at timestamptz not null default (now() + interval '15 minutes'),
  created_at timestamptz not null default now()
);

-- Índices
create index idx_posts_user_status on public.posts(user_id, status);
create index idx_posts_scheduled on public.posts(scheduled_for) where status = 'scheduled';
create index idx_social_accounts_user on public.social_accounts(user_id, platform);
create index idx_post_targets_status on public.post_targets(status);

-- RLS
alter table public.profiles enable row level security;
alter table public.brands enable row level security;
alter table public.social_accounts enable row level security;
alter table public.posts enable row level security;
alter table public.post_media enable row level security;
alter table public.post_targets enable row level security;
alter table public.post_analytics enable row level security;
alter table public.oauth_states enable row level security;

create policy "profiles_own" on public.profiles for all using (auth.uid() = id);
create policy "brands_own" on public.brands for all using (auth.uid() = user_id);
create policy "accounts_own" on public.social_accounts for all using (auth.uid() = user_id);
create policy "posts_own" on public.posts for all using (auth.uid() = user_id);
create policy "media_own" on public.post_media for all using (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);
create policy "targets_own" on public.post_targets for all using (
  exists (select 1 from public.posts p where p.id = post_id and p.user_id = auth.uid())
);
create policy "analytics_own" on public.post_analytics for all using (
  exists (
    select 1 from public.post_targets pt
    join public.posts p on p.id = pt.post_id
    where pt.id = post_target_id and p.user_id = auth.uid()
  )
);
create policy "oauth_own" on public.oauth_states for all using (auth.uid() = user_id);

-- Trigger: criar profile ao registrar
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Storage bucket (criar manualmente no dashboard: post-media, público para leitura)
-- policies: authenticated users upload to own folder user_id/*
