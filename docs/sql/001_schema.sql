-- 001_schema.sql
-- Core schema for freemium entitlements and content tiers.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
    id uuid primary key references auth.users(id) on delete cascade,
    created_at timestamptz not null default now(),
    role text not null default 'guest' check (role in ('guest', 'free', 'pro')),
    free_total_limit int not null default 80 check (free_total_limit >= 0),
    free_total_used int not null default 0 check (free_total_used >= 0),
    ads_enabled boolean not null default true
);

create table if not exists public.billing (
    user_id uuid primary key references auth.users(id) on delete cascade,
    stripe_customer_id text,
    subscription_status text not null default 'free',
    current_period_end timestamptz,
    price_id text,
    updated_at timestamptz not null default now()
);

create table if not exists public.usage_daily (
    user_id uuid not null references auth.users(id) on delete cascade,
    day date not null,
    used_count int not null default 0 check (used_count >= 0),
    primary key (user_id, day)
);

create table if not exists public.sentences (
    id uuid primary key default gen_random_uuid(),
    statement text not null,
    expanded_statement text,
    category text,
    difficulty int not null default 1,
    tier text not null default 'free' check (tier in ('free', 'pro'))
);

create index if not exists idx_sentences_tier on public.sentences(tier);
create index if not exists idx_sentences_category on public.sentences(category);
create index if not exists idx_usage_daily_user_day on public.usage_daily(user_id, day);
create index if not exists idx_billing_customer on public.billing(stripe_customer_id);

