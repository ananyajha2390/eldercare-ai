-- ==============================================================================
-- ElderCare AI - Supabase Database Schema & Row Level Security (RLS) Policies
-- ==============================================================================
-- Run this SQL in your Supabase SQL Editor (https://app.supabase.com/project/_/sql)
-- to provision tables, triggers, and Row Level Security for authenticated users.

-- 1. Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- 2. User Profiles Table
-- Holds public metadata linked 1:1 with auth.users(id).
-- Passwords are strictly handled by Supabase Auth (auth.users) and never stored here.
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade not null unique,
  full_name text not null,
  email text not null,
  phone text,
  role text check (role in ('family', 'elderly')) not null default 'family',
  avatar_url text,
  language text default 'auto',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Index for faster queries by auth user ID
create index if not exists idx_profiles_user_id on public.profiles(user_id);
create index if not exists idx_profiles_email on public.profiles(email);

-- 3. Care Relationships Table
-- Links a Family Caregiver user account to an Elderly Profile
create table if not exists public.care_relationships (
  id uuid primary key default uuid_generate_v4(),
  caregiver_user_id uuid references auth.users(id) on delete cascade not null,
  elderly_profile_id uuid references public.profiles(id) on delete cascade not null,
  relationship text not null default 'parent', -- 'parent', 'grandparent', 'spouse', 'other'
  status text check (status in ('active', 'pending', 'inactive')) not null default 'active',
  created_at timestamptz default now() not null
);

create index if not exists idx_care_rel_caregiver on public.care_relationships(caregiver_user_id);
create index if not exists idx_care_rel_elderly on public.care_relationships(elderly_profile_id);

-- 4. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.care_relationships enable row level security;

-- ==============================================================================
-- Row Level Security (RLS) Policies
-- ==============================================================================

-- 4.1 PROFILES POLICIES
-- Policy 1: Users can view their own profile
create policy "Users can view own profile"
  on public.profiles
  for select
  using (auth.uid() = user_id);

-- Policy 2: Caregivers can view profiles of elderly users they have an active care relationship with
create policy "Caregivers can view authorized elderly profiles"
  on public.profiles
  for select
  using (
    exists (
      select 1 from public.care_relationships cr
      where cr.caregiver_user_id = auth.uid()
        and cr.elderly_profile_id = profiles.id
        and cr.status = 'active'
    )
  );

-- Policy 3: Users can insert their own profile
create policy "Users can insert own profile"
  on public.profiles
  for insert
  with check (auth.uid() = user_id);

-- Policy 4: Users can update their own profile
create policy "Users can update own profile"
  on public.profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- 4.2 CARE RELATIONSHIPS POLICIES
-- Policy 1: Caregivers can view their own care relationships
create policy "Caregivers can view own care relationships"
  on public.care_relationships
  for select
  using (auth.uid() = caregiver_user_id);

-- Policy 2: Elderly users can view care relationships that link to them
create policy "Elderly can view relationships linked to them"
  on public.care_relationships
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = care_relationships.elderly_profile_id
        and p.user_id = auth.uid()
    )
  );

-- Policy 3: Caregivers can create care relationships
create policy "Caregivers can insert care relationships"
  on public.care_relationships
  for insert
  with check (auth.uid() = caregiver_user_id);

-- Policy 4: Caregivers can update their care relationships
create policy "Caregivers can update own care relationships"
  on public.care_relationships
  for update
  using (auth.uid() = caregiver_user_id)
  with check (auth.uid() = caregiver_user_id);

-- ==============================================================================
-- 5. Trigger: Automatic Profile Creation on Supabase Auth Signup
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email, full_name, role, phone, language)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'role', 'family'),
    new.raw_user_meta_data->>'phone',
    coalesce(new.raw_user_meta_data->>'language', 'auto')
  )
  on conflict (user_id) do update
  set
    full_name = coalesce(excluded.full_name, profiles.full_name),
    role = coalesce(excluded.role, profiles.role),
    phone = coalesce(excluded.phone, profiles.phone),
    updated_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Drop trigger if exists and recreate
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ==============================================================================
-- 6. Helper updated_at trigger
-- ==============================================================================
create or replace function public.update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- ==============================================================================
-- 7. Elderly Profiles Table
-- ==============================================================================
create table if not exists public.elderly_profiles (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  relationship text default 'Parent',
  age integer default 70,
  phone text,
  address text,
  preferred_language text default 'hinglish',
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.elderly_profiles enable row level security;

create policy "Users can view elderly profiles they own"
  on public.elderly_profiles for select
  using (auth.uid() = owner_id);

create policy "Users can insert elderly profiles they own"
  on public.elderly_profiles for insert
  with check (auth.uid() = owner_id);

create policy "Users can update elderly profiles they own"
  on public.elderly_profiles for update
  using (auth.uid() = owner_id);

create policy "Users can delete elderly profiles they own"
  on public.elderly_profiles for delete
  using (auth.uid() = owner_id);

-- ==============================================================================
-- 8. Family Members Table
-- ==============================================================================
create table if not exists public.family_members (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  elderly_id uuid references public.elderly_profiles(id) on delete cascade,
  name text not null,
  relation text not null,
  phone text,
  role text default 'Member',
  is_primary boolean default false,
  notify_sms boolean default true,
  notify_call boolean default true,
  notify_whatsapp boolean default true,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

alter table public.family_members enable row level security;

create policy "Users can view family members they own"
  on public.family_members for select
  using (auth.uid() = owner_id);

create policy "Users can insert family members they own"
  on public.family_members for insert
  with check (auth.uid() = owner_id);

create policy "Users can update family members they own"
  on public.family_members for update
  using (auth.uid() = owner_id);

create policy "Users can delete family members they own"
  on public.family_members for delete
  using (auth.uid() = owner_id);

-- ==============================================================================
-- 9. Health Readings Table (BP, Blood Sugar, Mood, Hydration)
-- ==============================================================================
create table if not exists public.health_readings (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  elderly_id uuid,
  blood_pressure_systolic integer,
  blood_pressure_diastolic integer,
  blood_sugar text,
  mood text,
  hydration text,
  notes text,
  recorded_at timestamptz default now() not null,
  created_at timestamptz default now() not null
);

alter table public.health_readings enable row level security;

create policy "Users can view their health readings"
  on public.health_readings for select
  using (auth.uid() = owner_id);

create policy "Users can insert their health readings"
  on public.health_readings for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their health readings"
  on public.health_readings for update
  using (auth.uid() = owner_id);

-- ==============================================================================
-- 10. Medications Table
-- ==============================================================================
create table if not exists public.medications (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  elderly_id uuid,
  medicine_name text not null,
  dosage text default '1 tablet',
  schedule_time text default '09:00 AM',
  is_taken boolean default false,
  taken_at timestamptz,
  created_at timestamptz default now() not null
);

alter table public.medications enable row level security;

create policy "Users can view their medications"
  on public.medications for select
  using (auth.uid() = owner_id);

create policy "Users can insert their medications"
  on public.medications for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their medications"
  on public.medications for update
  using (auth.uid() = owner_id);

-- ==============================================================================
-- 11. Call Logs / Check-ins Table
-- ==============================================================================
create table if not exists public.call_logs (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  elderly_id uuid,
  call_type text default 'ai_voice_checkin',
  status text default 'completed',
  duration_seconds integer default 0,
  summary text,
  transcript jsonb,
  extracted_data jsonb,
  started_at timestamptz default now(),
  ended_at timestamptz default now(),
  created_at timestamptz default now() not null
);

alter table public.call_logs enable row level security;

create policy "Users can view their call logs"
  on public.call_logs for select
  using (auth.uid() = owner_id);

create policy "Users can insert their call logs"
  on public.call_logs for insert
  with check (auth.uid() = owner_id);

-- ==============================================================================
-- 12. Alerts Table
-- ==============================================================================
create table if not exists public.alerts (
  id uuid primary key default uuid_generate_v4(),
  owner_id uuid references auth.users(id) on delete cascade not null,
  elderly_id uuid,
  title text not null,
  message text not null,
  severity text default 'normal', -- normal, attention, urgent
  is_dismissed boolean default false,
  created_at timestamptz default now() not null
);

alter table public.alerts enable row level security;

create policy "Users can view their alerts"
  on public.alerts for select
  using (auth.uid() = owner_id);

create policy "Users can insert their alerts"
  on public.alerts for insert
  with check (auth.uid() = owner_id);

create policy "Users can update their alerts"
  on public.alerts for update
  using (auth.uid() = owner_id);

