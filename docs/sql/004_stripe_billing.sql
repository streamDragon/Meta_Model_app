-- 004_stripe_billing.sql
-- Stripe-specific persistence and helper trigger.

create table if not exists public.stripe_events (
    event_id text primary key,
    processed_at timestamptz not null default now()
);

create index if not exists idx_stripe_events_processed_at
    on public.stripe_events(processed_at desc);

create or replace function public.touch_billing_updated_at()
returns trigger
language plpgsql
as $$
begin
    new.updated_at := now();
    return new;
end;
$$;

drop trigger if exists trg_touch_billing_updated_at on public.billing;
create trigger trg_touch_billing_updated_at
before update on public.billing
for each row
execute function public.touch_billing_updated_at();

alter table public.stripe_events enable row level security;

revoke all on public.stripe_events from authenticated;
revoke all on public.stripe_events from anon;

