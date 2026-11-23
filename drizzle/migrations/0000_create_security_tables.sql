-- Profiles: one row per account, auto-created on signup
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);

grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select to authenticated
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Auto-create a profile row whenever a new account is created
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(coalesce(new.email, 'user'), '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- Scans: each user sees only their own scan history
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  url text not null,
  final_url text,
  grade text not null,
  score integer not null,
  checks jsonb not null default '[]'::jsonb,
  status text not null default 'completed',
  error_message text,
  created_at timestamptz not null default now()
);

create index scans_user_id_created_idx on public.scans (user_id, created_at desc);

grant select, insert, delete on public.scans to authenticated;
grant all on public.scans to service_role;

alter table public.scans enable row level security;

create policy "Users can view own scans"
  on public.scans for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can insert own scans"
  on public.scans for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can delete own scans"
  on public.scans for delete to authenticated
  using (auth.uid() = user_id);