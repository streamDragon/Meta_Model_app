-- 005_atomic_quota.sql
-- Atomic quota ledger and idempotent quota consumption RPC.

create table if not exists public.entitlements (
    user_id uuid primary key references auth.users(id) on delete cascade,
    plan text not null default 'guest' check (plan in ('guest', 'free', 'pro')),
    daily_limit int not null default 80 check (daily_limit >= 0),
    remaining int not null default 80 check (remaining >= 0),
    reset_at timestamptz not null default (timezone('utc', now()) + interval '1 day'),
    updated_at timestamptz not null default now()
);

create table if not exists public.usage_events (
    user_id uuid not null references auth.users(id) on delete cascade,
    request_id text not null,
    cost int not null check (cost > 0),
    created_at timestamptz not null default now(),
    primary key (user_id, request_id)
);

create index if not exists idx_usage_events_user_created_at
    on public.usage_events(user_id, created_at desc);

alter table public.entitlements enable row level security;
alter table public.usage_events enable row level security;

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

create or replace function public.ensure_entitlements_state(p_uid uuid default auth.uid())
returns public.entitlements
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := p_uid;
    v_now timestamptz := timezone('utc', now());
    v_plan text;
    v_ent public.entitlements;
begin
    if v_uid is null then
        raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
    end if;

    v_plan := coalesce(public.resolve_user_role(v_uid), 'free');

    insert into public.entitlements (user_id, plan, daily_limit, remaining, reset_at, updated_at)
    values (v_uid, v_plan, 80, 80, v_now + interval '1 day', v_now)
    on conflict (user_id) do nothing;

    select * into v_ent
    from public.entitlements
    where user_id = v_uid
    for update;

    if not found then
        raise exception 'ENTITLEMENTS_NOT_FOUND' using errcode = 'P0001';
    end if;

    if v_ent.plan is distinct from v_plan then
        update public.entitlements
        set plan = v_plan,
            updated_at = v_now
        where user_id = v_uid
        returning * into v_ent;
    end if;

    if v_ent.reset_at <= v_now then
        update public.entitlements
        set remaining = daily_limit,
            reset_at = v_now + interval '1 day',
            updated_at = v_now
        where user_id = v_uid
        returning * into v_ent;
    end if;

    return v_ent;
end;
$$;

create or replace function public.get_entitlements_state()
returns table (
    role text,
    plan text,
    ads_enabled boolean,
    remaining int,
    daily_limit int,
    reset_at timestamptz,
    guest_daily_limit int,
    guest_daily_used_today int,
    guest_daily_remaining int,
    free_total_limit int,
    free_total_used int,
    free_total_remaining int,
    unlimited boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_now timestamptz := timezone('utc', now());
    v_ent public.entitlements;
begin
    if v_uid is null then
        return query
        select
            'guest'::text,
            'guest'::text,
            true,
            80,
            80,
            v_now + interval '1 day',
            80,
            0,
            80,
            80,
            0,
            80,
            false;
        return;
    end if;

    v_ent := public.ensure_entitlements_state(v_uid);

    return query
    select
        v_ent.plan as role,
        v_ent.plan as plan,
        (v_ent.plan <> 'pro') as ads_enabled,
        v_ent.remaining,
        v_ent.daily_limit,
        v_ent.reset_at,
        v_ent.daily_limit,
        case when v_ent.plan = 'guest' then greatest(v_ent.daily_limit - v_ent.remaining, 0) else 0 end,
        case when v_ent.plan = 'guest' then v_ent.remaining else v_ent.daily_limit end,
        v_ent.daily_limit,
        case when v_ent.plan = 'free' then greatest(v_ent.daily_limit - v_ent.remaining, 0) else 0 end,
        case when v_ent.plan = 'free' then v_ent.remaining else v_ent.daily_limit end,
        (v_ent.plan = 'pro');
end;
$$;

create or replace function public.consume_quota(p_request_id text, p_cost int default 1)
returns table (
    allowed boolean,
    reason text,
    remaining int,
    plan text,
    role text,
    daily_limit int,
    reset_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare
    v_uid uuid := auth.uid();
    v_request_id text := btrim(coalesce(p_request_id, ''));
    v_cost int := greatest(coalesce(p_cost, 1), 1);
    v_now timestamptz := timezone('utc', now());
    v_ent public.entitlements;
begin
    if v_uid is null then
        return query
        select
            false,
            'not_authenticated'::text,
            80,
            'guest'::text,
            'guest'::text,
            80,
            v_now + interval '1 day';
        return;
    end if;

    if v_request_id = '' then
        return query
        select
            false,
            'invalid_request_id'::text,
            0,
            'guest'::text,
            'guest'::text,
            0,
            v_now + interval '1 day';
        return;
    end if;

    if v_cost > 100 then
        return query
        select
            false,
            'invalid_cost'::text,
            0,
            'guest'::text,
            'guest'::text,
            0,
            v_now + interval '1 day';
        return;
    end if;

    v_ent := public.ensure_entitlements_state(v_uid);

    select * into v_ent
    from public.entitlements
    where user_id = v_uid
    for update;

    if v_ent.reset_at <= v_now then
        update public.entitlements
        set remaining = daily_limit,
            reset_at = v_now + interval '1 day',
            updated_at = v_now
        where user_id = v_uid
        returning * into v_ent;
    end if;

    if exists (
        select 1
        from public.usage_events ue
        where ue.user_id = v_uid
          and ue.request_id = v_request_id
    ) then
        return query
        select
            true,
            'idempotent_replay'::text,
            v_ent.remaining,
            v_ent.plan,
            v_ent.plan,
            v_ent.daily_limit,
            v_ent.reset_at;
        return;
    end if;

    if v_ent.plan = 'pro' then
        insert into public.usage_events (user_id, request_id, cost)
        values (v_uid, v_request_id, v_cost)
        on conflict (user_id, request_id) do nothing;

        return query
        select
            true,
            'pro_unlimited'::text,
            v_ent.remaining,
            v_ent.plan,
            v_ent.plan,
            v_ent.daily_limit,
            v_ent.reset_at;
        return;
    end if;

    if v_ent.remaining < v_cost then
        return query
        select
            false,
            'quota_exceeded'::text,
            v_ent.remaining,
            v_ent.plan,
            v_ent.plan,
            v_ent.daily_limit,
            v_ent.reset_at;
        return;
    end if;

    insert into public.usage_events (user_id, request_id, cost)
    values (v_uid, v_request_id, v_cost)
    on conflict (user_id, request_id) do nothing;

    if not found then
        return query
        select
            true,
            'idempotent_replay'::text,
            v_ent.remaining,
            v_ent.plan,
            v_ent.plan,
            v_ent.daily_limit,
            v_ent.reset_at;
        return;
    end if;

    update public.entitlements
    set remaining = remaining - v_cost,
        updated_at = v_now
    where user_id = v_uid
    returning * into v_ent;

    return query
    select
        true,
        'consumed'::text,
        v_ent.remaining,
        v_ent.plan,
        v_ent.plan,
        v_ent.daily_limit,
        v_ent.reset_at;
end;
$$;

grant execute on function public.ensure_entitlements_state(uuid) to authenticated;
grant execute on function public.get_entitlements_state() to anon, authenticated;
grant execute on function public.consume_quota(text, int) to anon, authenticated;
