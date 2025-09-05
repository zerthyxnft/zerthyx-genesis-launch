-- Enable required extensions
create extension if not exists "uuid-ossp";

-- Create profiles table
create table if not exists public.profiles (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  username text,
  email text,
  is_admin boolean default false,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Create user_wallets table
create table if not exists public.user_wallets (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  wallet_address text not null,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Create deposits table
create table if not exists public.deposits (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null,
  status text default 'pending', -- pending | approved | rejected
  tx_hash text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Create withdrawals table
create table if not exists public.withdrawals (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references auth.users(id) on delete cascade,
  amount numeric(12, 2) not null,
  status text default 'pending',
  tx_hash text,
  created_at timestamp with time zone default timezone('utc', now())
);

-- Create admin settings
create table if not exists public.admin_settings (
  key text primary key,
  value jsonb
);

-- Default admin setting values
insert into public.admin_settings (key, value) values
('minimum_deposit', jsonb_build_object('amount', 50)),
('reward_rate', jsonb_build_object('daily_percent', 2.2))
on conflict (key) do nothing;

-- Row Level Security (RLS)
alter table profiles enable row level security;
alter table user_wallets enable row level security;
alter table deposits enable row level security;
alter table withdrawals enable row level security;
alter table admin_settings enable row level security;

-- Policies for profiles
create policy "Users can view their profile" on profiles
  for select using (auth.uid() = user_id);

create policy "Users can insert their profile" on profiles
  for insert with check (auth.uid() = user_id);

create policy "Users can update their profile" on profiles
  for update using (auth.uid() = user_id);

-- Policies for user_wallets
create policy "Users can view their wallet" on user_wallets
  for select using (auth.uid() = user_id);

create policy "Users can insert wallet" on user_wallets
  for insert with check (auth.uid() = user_id);

-- Policies for deposits
create policy "Users can view their own deposits" on deposits
  for select using (auth.uid() = user_id);

create policy "Users can insert their own deposits" on deposits
  for insert with check (auth.uid() = user_id);

create policy "Admins can update deposits" on deposits
  for update using (exists (
    select 1 from profiles p where p.user_id = auth.uid() and p.is_admin = true
  ));

-- Policies for withdrawals
create policy "Users can view their own withdrawals" on withdrawals
  for select using (auth.uid() = user_id);

create policy "Users can insert their own withdrawals" on withdrawals
  for insert with check (auth.uid() = user_id);

create policy "Admins can update withdrawals" on withdrawals
  for update using (exists (
    select 1 from profiles p where p.user_id = auth.uid() and p.is_admin = true
  ));

-- Policy for admin_settings
create policy "Anyone can view admin settings" on admin_settings
  for select using (true);

-- Trigger: Auto create profile when user signs up
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
