-- 006_pack_quota.sql
-- Convert entitlements from daily semantics to pack quotas and add server-side guest quota.

create table if not exists public.entitlements (
    user_id uuid primary key references auth.users(id) on delete cascade,
    plan text not null default 'free' check (plan in ('guest', 'free', 'pro')),
    total_quota int not null default 60 check (total_quota >= 0),
    remaining int not null default 60 check (remaining >= 0),
    updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
    user_id uuid not null references auth.users(id) on delete cascade,
    request_id text not null,
    cost int not null check (cost > 0),
    created_at timestamptz not null default now(),
    primary key (user_id, request_id)
);

-- Step 1: migrate entitlements columns from daily model to pack model.
do $$
begin
    if exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'entitlements'
          and column_name = 'daily_limit'
    ) and not exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'entitlements'
          and column_name = 'total_quota'
    ) then
        execute 'alter table public.entitlements rename column daily_limit to total_quota';
    end if;
end;
$$;

alter table public.entitlements add column if not exists total_quota int;
alter table public.entitlements alter column total_quota set default 60;
alter table public.entitlements alter column remaining set default 60;
alter table public.entitlements add column if not exists updated_at timestamptz not null default now();
alter table public.entitlements drop column if exists reset_at;
alter table public.entitlements drop column if exists daily_limit;

update public.entitlements
set
    plan = case when plan = 'pro' then 'pro' else 'free' end,
    total_quota = case when plan = 'pro' then greatest(coalesce(total_quota, 60), 60) else 60 end,
    remaining = case
        when plan = 'pro' then greatest(coalesce(remaining, 60), 60)
        else least(greatest(coalesce(remaining, 60), 0), 60)
    end,
    updated_at = now();

alter table public.entitlements alter column total_quota set not null;
alter table public.entitlements alter column remaining set not null;

-- Step 2: guest quota tables (server-side, no client-only counters).
create table if not exists public.guest_entitlements (
    guest_fingerprint text primary key,
    total_quota int not null default 10 check (total_quota >= 0),
    remaining int not null default 10 check (remaining >= 0),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table if not exists public.guest_usage_events (
    guest_fingerprint text not null references public.guest_entitlements(guest_fingerprint) on delete cascade,
    request_id text not null,
    cost int not null check (cost > 0),
    created_at timestamptz not null default now(),
    primary key (guest_fingerprint, request_id)
);

create index if not exists idx_guest_usage_events_created_at
    on public.guest_usage_events(created_at desc);

-- Step 3: RLS / policies.
alter table public.entitlements enable row level security;
alter table public.usage_events enable row level security;
alter table public.guest_entitlements enable row level security;
alter table public.guest_usage_events enable row level security;

drop policy if exists entitlements_select_own on public.entitlements;
create policy entitlements_select_own
on public.entitlements
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists usage_events_select_own on public.usage_events;
create policy usage_events_select_own
on public.usage_events
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists usage_events_insert_own on public.usage_events;
create policy usage_events_insert_own
on public.usage_events
for insert
to authenticated
with check (user_id = auth.uid());

-- Guest tables are accessed only via SECURITY DEFINER RPCs.
revoke all on public.guest_entitlements from anon;
revoke all on public.guest_entitlements from authenticated;
revoke all on public.guest_usage_events from anon;
revoke all on public.guest_usage_events from authenticated;

-- Step 4: helper functions (pack model only).
create or replace function public.ensure_entitlements_state(p_uid uuid default auth.uid())
returns public.entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := p_uid;
    v_plan text;
    v_ent public.entitlements;
begin
    if v_uid is null then
        raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
    end if;

    v_plan := case
        when public.resolve_user_role(v_uid) = 'pro' then 'pro'
        else 'free'
    end;

    insert into public.entitlements (user_id, plan, total_quota, remaining, updated_at)
    values (v_uid, v_plan, 60, 60, now())
    on conflict (user_id) do nothing;

    select * into v_ent
    from public.entitlements
    where user_id = v_uid
    for update;

    if not found then
        raise exception 'ENTITLEMENTS_NOT_FOUND' using errcode = 'P0001';
    end if;

    if v_plan = 'pro' then
        update public.entitlements
        set
            plan = 'pro',
            total_quota = 60,
            remaining = greatest(remaining, 60),
            updated_at = now()
        where user_id = v_uid
        returning * into v_ent;
    else
        update public.entitlements
        set
            plan = 'free',
            total_quota = 60,
            remaining = least(greatest(remaining, 0), 60),
            updated_at = now()
        where user_id = v_uid
        returning * into v_ent;
    end if;

    return v_ent;
end;
$$;

create or replace function public.ensure_guest_entitlements_state(p_guest_fingerprint text)
returns public.guest_entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_guest_fingerprint text := btrim(coalesce(p_guest_fingerprint, ''));
    v_ent public.guest_entitlements;
begin
    if v_guest_fingerprint = '' then
        raise exception 'GUEST_FINGERPRINT_REQUIRED' using errcode = 'P0001';
    end if;

    insert into public.guest_entitlements (guest_fingerprint, total_quota, remaining, updated_at)
    values (v_guest_fingerprint, 10, 10, now())
    on conflict (guest_fingerprint) do nothing;

    select * into v_ent
    from public.guest_entitlements
    where guest_fingerprint = v_guest_fingerprint
    for update;

    if not found then
        raise exception 'GUEST_ENTITLEMENTS_NOT_FOUND' using errcode = 'P0001';
    end if;

    return v_ent;
end;
$$;

create or replace function public.get_entitlements_state()
returns table (
    role text,
    plan text,
    ads_enabled boolean,
    total_quota int,
    remaining int,
    unlimited boolean,
    guest_daily_limit int,
    guest_daily_used_today int,
    guest_daily_remaining int,
    free_total_limit int,
    free_total_used int,
    free_total_remaining int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_ent public.entitlements;
begin
    if v_uid is null then
        raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
    end if;

    v_ent := public.ensure_entitlements_state(v_uid);

    return query
    select
        v_ent.plan as role,
        v_ent.plan as plan,
        (v_ent.plan <> 'pro') as ads_enabled,
        v_ent.total_quota,
        v_ent.remaining,
        (v_ent.plan = 'pro') as unlimited,
        10,
        0,
        0,
        v_ent.total_quota,
        greatest(v_ent.total_quota - v_ent.remaining, 0),
        v_ent.remaining;
end;
$$;

create or replace function public.get_guest_entitlements_state(p_guest_fingerprint text)
returns table (
    role text,
    plan text,
    ads_enabled boolean,
    total_quota int,
    remaining int,
    unlimited boolean,
    guest_daily_limit int,
    guest_daily_used_today int,
    guest_daily_remaining int,
    free_total_limit int,
    free_total_used int,
    free_total_remaining int
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_ent public.guest_entitlements;
begin
    v_ent := public.ensure_guest_entitlements_state(p_guest_fingerprint);

    return query
    select
        'guest'::text,
        'guest'::text,
        true,
        v_ent.total_quota,
        v_ent.remaining,
        false,
        v_ent.total_quota,
        greatest(v_ent.total_quota - v_ent.remaining, 0),
        v_ent.remaining,
        60,
        0,
        60;
end;
$$;

create or replace function public.consume_quota(p_request_id text, p_cost int default 1)
returns table (
    allowed boolean,
    reason text,
    remaining int,
    total_quota int,
    plan text,
    role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_request_id text := btrim(coalesce(p_request_id, ''));
    v_cost int := greatest(coalesce(p_cost, 1), 1);
    v_ent public.entitlements;
begin
    if v_uid is null then
        return query select false, 'not_authenticated'::text, 0, 60, 'guest'::text, 'guest'::text;
        return;
    end if;

    if v_request_id = '' then
        return query select false, 'invalid_request_id'::text, 0, 60, 'free'::text, 'free'::text;
        return;
    end if;

    if v_cost > 100 then
        return query select false, 'invalid_cost'::text, 0, 60, 'free'::text, 'free'::text;
        return;
    end if;

    v_ent := public.ensure_entitlements_state(v_uid);

    select * into v_ent
    from public.entitlements
    where user_id = v_uid
    for update;

    if exists (
        select 1
        from public.usage_events ue
        where ue.user_id = v_uid
          and ue.request_id = v_request_id
    ) then
        return query
        select true, 'idempotent_replay'::text, v_ent.remaining, v_ent.total_quota, v_ent.plan, v_ent.plan;
        return;
    end if;

    if v_ent.plan = 'pro' then
        insert into public.usage_events (user_id, request_id, cost)
        values (v_uid, v_request_id, v_cost)
        on conflict (user_id, request_id) do nothing;

        return query
        select true, 'pro_unlimited'::text, v_ent.remaining, v_ent.total_quota, v_ent.plan, v_ent.plan;
        return;
    end if;

    if v_ent.remaining < v_cost then
        return query
        select false, 'quota_exhausted'::text, v_ent.remaining, v_ent.total_quota, v_ent.plan, v_ent.plan;
        return;
    end if;

    insert into public.usage_events (user_id, request_id, cost)
    values (v_uid, v_request_id, v_cost)
    on conflict (user_id, request_id) do nothing;

    if not found then
        return query
        select true, 'idempotent_replay'::text, v_ent.remaining, v_ent.total_quota, v_ent.plan, v_ent.plan;
        return;
    end if;

    update public.entitlements
    set remaining = remaining - v_cost,
        updated_at = now()
    where user_id = v_uid
    returning * into v_ent;

    return query
    select true, 'consumed'::text, v_ent.remaining, v_ent.total_quota, v_ent.plan, v_ent.plan;
end;
$$;

create or replace function public.consume_guest_quota(
    p_guest_fingerprint text,
    p_request_id text,
    p_cost int default 1
)
returns table (
    allowed boolean,
    reason text,
    remaining int,
    total_quota int,
    plan text,
    role text
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_guest_fingerprint text := btrim(coalesce(p_guest_fingerprint, ''));
    v_request_id text := btrim(coalesce(p_request_id, ''));
    v_cost int := greatest(coalesce(p_cost, 1), 1);
    v_ent public.guest_entitlements;
begin
    if v_guest_fingerprint = '' then
        return query select false, 'guest_fingerprint_required'::text, 0, 10, 'guest'::text, 'guest'::text;
        return;
    end if;

    if v_request_id = '' then
        return query select false, 'invalid_request_id'::text, 0, 10, 'guest'::text, 'guest'::text;
        return;
    end if;

    if v_cost > 100 then
        return query select false, 'invalid_cost'::text, 0, 10, 'guest'::text, 'guest'::text;
        return;
    end if;

    v_ent := public.ensure_guest_entitlements_state(v_guest_fingerprint);

    select * into v_ent
    from public.guest_entitlements
    where guest_fingerprint = v_guest_fingerprint
    for update;

    if exists (
        select 1
        from public.guest_usage_events gue
        where gue.guest_fingerprint = v_guest_fingerprint
          and gue.request_id = v_request_id
    ) then
        return query
        select true, 'idempotent_replay'::text, v_ent.remaining, v_ent.total_quota, 'guest'::text, 'guest'::text;
        return;
    end if;

    if v_ent.remaining < v_cost then
        return query
        select false, 'quota_exhausted'::text, v_ent.remaining, v_ent.total_quota, 'guest'::text, 'guest'::text;
        return;
    end if;

    insert into public.guest_usage_events (guest_fingerprint, request_id, cost)
    values (v_guest_fingerprint, v_request_id, v_cost)
    on conflict (guest_fingerprint, request_id) do nothing;

    if not found then
        return query
        select true, 'idempotent_replay'::text, v_ent.remaining, v_ent.total_quota, 'guest'::text, 'guest'::text;
        return;
    end if;

    update public.guest_entitlements
    set remaining = remaining - v_cost,
        updated_at = now()
    where guest_fingerprint = v_guest_fingerprint
    returning * into v_ent;

    return query
    select true, 'consumed'::text, v_ent.remaining, v_ent.total_quota, 'guest'::text, 'guest'::text;
end;
$$;

-- Step 5: grants.
revoke execute on function public.get_entitlements_state() from anon;
revoke execute on function public.consume_quota(text, int) from anon;

grant execute on function public.ensure_entitlements_state(uuid) to authenticated;
grant execute on function public.get_entitlements_state() to authenticated;
grant execute on function public.consume_quota(text, int) to authenticated;

grant execute on function public.ensure_guest_entitlements_state(text) to anon, authenticated;
grant execute on function public.get_guest_entitlements_state(text) to anon, authenticated;
grant execute on function public.consume_guest_quota(text, text, int) to anon, authenticated;
