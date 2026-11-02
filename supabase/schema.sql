-- Tick cloud sync — run this once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- One row per user holds their whole app state. Row Level Security means a signed-in user can only
-- ever read or write their OWN row, which is what makes it safe to publish the anon key in the page.

create table if not exists public.tick_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb       not null,
  rev        integer     not null default 1,      -- bumped on every save; used to detect two devices writing at once
  updated_at timestamptz not null default now()
);

alter table public.tick_state enable row level security;

drop policy if exists "tick_state select own" on public.tick_state;
drop policy if exists "tick_state insert own" on public.tick_state;
drop policy if exists "tick_state update own" on public.tick_state;
drop policy if exists "tick_state delete own" on public.tick_state;

create policy "tick_state select own" on public.tick_state
  for select to authenticated using ((select auth.uid()) = user_id);

create policy "tick_state insert own" on public.tick_state
  for insert to authenticated with check ((select auth.uid()) = user_id);

create policy "tick_state update own" on public.tick_state
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy "tick_state delete own" on public.tick_state
  for delete to authenticated using ((select auth.uid()) = user_id);
