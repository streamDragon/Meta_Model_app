-- 002_rls.sql
-- Row-level security policies for profiles, billing, usage, and sentences.

alter table public.profiles enable row level security;
alter table public.billing enable row level security;
alter table public.usage_daily enable row level security;
alter table public.sentences enable row level security;

drop policy if exists profiles_select_own on public.profiles;
create policy profiles_select_own
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists profiles_insert_own on public.profiles;
create policy profiles_insert_own
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists billing_select_own on public.billing;
create policy billing_select_own
on public.billing
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists usage_daily_select_own on public.usage_daily;
create policy usage_daily_select_own
on public.usage_daily
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists usage_daily_insert_own on public.usage_daily;
create policy usage_daily_insert_own
on public.usage_daily
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists usage_daily_update_own on public.usage_daily;
create policy usage_daily_update_own
on public.usage_daily
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists sentences_select_by_tier on public.sentences;
create policy sentences_select_by_tier
on public.sentences
for select
to authenticated
using (
    tier = 'free'
    or exists (
        select 1
        from public.billing b
        where b.user_id = auth.uid()
          and b.subscription_status in ('active', 'trialing')
    )
    or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
          and p.role = 'pro'
    )
);

