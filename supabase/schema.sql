-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- USERS TABLE (Public profiles linked to Auth)
create table public.users (
  id uuid references auth.users not null primary key,
  email text,
  full_name text,
  role text check (role in ('admin', 'staff', 'guardian')),
  family_id uuid, -- For grouping families
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- FAMILIES TABLE (Groups guardians)
create table public.families (
  id uuid default uuid_generate_v4() primary key,
  name text not null, -- e.g. "佐藤家"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- CHILDREN TABLE
create table public.children (
  id uuid default uuid_generate_v4() primary key,
  family_id uuid references public.families not null,
  name text not null,
  class_name text, -- e.g. "1-2"
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RESERVATIONS TABLE
create table public.reservations (
  id uuid default uuid_generate_v4() primary key,
  child_id uuid references public.children not null,
  date date not null,
  status text check (status in ('reserved', 'attended', 'absent')) default 'reserved',
  
  -- Return Details
  return_method text check (return_method in ('pickup', 'bus', 'walk', 'other_parent')),
  return_details text, -- "16:00 Bus" or "Picked up by Tanaka-san"
  
  -- Approval Workflow
  approval_status text check (approval_status in ('pending', 'approved', 'rejected')) default 'approved',
  
  -- Finance
  fee integer default 0,
  is_paid boolean default false,
  
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS POLICIES (Simplified for initial setup)
alter table public.users enable row level security;
alter table public.families enable row level security;
alter table public.children enable row level security;
alter table public.reservations enable row level security;

-- Policies will need to be defined such that:
-- Admin/Staff can see ALL data.
-- Guardians can ONLY see data linked to their family_id.
