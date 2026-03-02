-- 003_rpc.sql
-- Helper functions and atomic RPC functions for entitlements and quota enforcement.

create or replace function public.app_is_anonymous(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
    select coalesce((select u.is_anonymous from auth.users u where u.id = uid), false);
$$;

create or replace function public.is_pro(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
    select
      exists (
        select 1
        from public.billing b
        where b.user_id = uid
          and b.subscription_status in ('active', 'trialing')
      )
      or exists (
        select 1
        from public.profiles p
        where p.id = uid
          and p.role = 'pro'
      );
$$;

create or replace function public.resolve_user_role(uid uuid default auth.uid())
returns text
language sql
stable
security definer
set search_path = public
as $$
    select case
        when public.is_pro(uid) then 'pro'
        when public.app_is_anonymous(uid) then 'guest'
        else 'free'
    end;
$$;

create or replace function public.ensure_profile()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_role text;
    v_profile public.profiles;
    v_ads_enabled boolean;
begin
    if v_uid is null then
        raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
    end if;

    v_role := public.resolve_user_role(v_uid);
    v_ads_enabled := (v_role <> 'pro');

    insert into public.profiles (id, role, ads_enabled)
    values (v_uid, v_role, v_ads_enabled)
    on conflict (id) do nothing;

    update public.profiles
    set
        role = v_role,
        ads_enabled = v_ads_enabled
    where id = v_uid
      and (role is distinct from v_role or ads_enabled is distinct from v_ads_enabled);

    select * into v_profile
    from public.profiles
    where id = v_uid;

    return v_profile;
end;
$$;

create or replace function public.app_today_jerusalem()
returns date
language sql
stable
as $$
    select (timezone('Asia/Jerusalem', now()))::date;
$$;

create or replace function public.get_entitlements()
returns table (
    role text,
    ads_enabled boolean,
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
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_profile public.profiles;
    v_today date := public.app_today_jerusalem();
    v_guest_used int := 0;
    v_guest_limit int := 10;
begin
    if v_uid is null then
        raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
    end if;

    v_profile := public.ensure_profile();

    select coalesce(ud.used_count, 0)
      into v_guest_used
      from public.usage_daily ud
     where ud.user_id = v_uid
       and ud.day = v_today;

    return query
    select
        v_profile.role,
        v_profile.ads_enabled,
        v_guest_limit,
        v_guest_used,
        greatest(v_guest_limit - v_guest_used, 0),
        v_profile.free_total_limit,
        v_profile.free_total_used,
        greatest(v_profile.free_total_limit - v_profile.free_total_used, 0),
        (v_profile.role = 'pro');
end;
$$;

create or replace function public.consume_sentence(p_count int default 1)
returns table (
    role text,
    ads_enabled boolean,
    guest_daily_limit int,
    guest_daily_used_today int,
    guest_daily_remaining int,
    free_total_limit int,
    free_total_used int,
    free_total_remaining int,
    unlimited boolean,
    consumed_count int
)
language plpgsql
security definer
set search_path = public
as $$
declare
    v_uid uuid := auth.uid();
    v_profile public.profiles;
    v_count int := greatest(coalesce(p_count, 1), 1);
    v_today date := public.app_today_jerusalem();
    v_guest_limit int := 10;
    v_guest_used int := 0;
    v_new_free_used int;
begin
    if v_uid is null then
        raise exception 'AUTH_REQUIRED' using errcode = 'P0001';
    end if;

    if v_count > 100 then
        raise exception 'INVALID_COUNT' using errcode = 'P0001';
    end if;

    v_profile := public.ensure_profile();

    if v_profile.role = 'pro' then
        return query
        select e.role, e.ads_enabled, e.guest_daily_limit, e.guest_daily_used_today, e.guest_daily_remaining,
               e.free_total_limit, e.free_total_used, e.free_total_remaining, e.unlimited, 0
        from public.get_entitlements() e;
        return;
    end if;

    if v_profile.role = 'guest' then
        insert into public.usage_daily (user_id, day, used_count)
        values (v_uid, v_today, 0)
        on conflict (user_id, day) do nothing;

        update public.usage_daily
        set used_count = used_count + v_count
        where user_id = v_uid
          and day = v_today
          and (used_count + v_count) <= v_guest_limit
        returning used_count into v_guest_used;

        if not found then
            raise exception 'QUOTA_EXCEEDED_GUEST' using errcode = 'P0001';
        end if;
    elsif v_profile.role = 'free' then
        update public.profiles
        set free_total_used = free_total_used + v_count
        where id = v_uid
          and (free_total_used + v_count) <= free_total_limit
        returning free_total_used into v_new_free_used;

        if not found then
            raise exception 'QUOTA_EXCEEDED_FREE' using errcode = 'P0001';
        end if;
    else
        raise exception 'UNSUPPORTED_ROLE' using errcode = 'P0001';
    end if;

    return query
    select e.role, e.ads_enabled, e.guest_daily_limit, e.guest_daily_used_today, e.guest_daily_remaining,
           e.free_total_limit, e.free_total_used, e.free_total_remaining, e.unlimited, v_count
    from public.get_entitlements() e;
end;
$$;

grant execute on function public.app_is_anonymous(uuid) to authenticated;
grant execute on function public.is_pro(uuid) to authenticated;
grant execute on function public.resolve_user_role(uuid) to authenticated;
grant execute on function public.ensure_profile() to authenticated;
grant execute on function public.app_today_jerusalem() to authenticated;
grant execute on function public.get_entitlements() to authenticated;
grant execute on function public.consume_sentence(int) to authenticated;

