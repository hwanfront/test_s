-- Enable RLS (Row Level Security)
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public;

-- Create users table
create table public.users (
  id uuid primary key default gen_random_uuid(),
  email varchar(255) unique not null,
  name varchar(255),
  avatar_url text,
  provider varchar(50) not null check (provider in ('google', 'naver')),
  provider_id varchar(255) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(provider, provider_id)
);

-- Create analysis sessions table
create table public.analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  title varchar(255) not null,
  status varchar(50) not null default 'pending' check (status in ('pending', 'processing', 'completed', 'failed')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  completed_at timestamp with time zone
);

-- Create analysis results table
create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.analysis_sessions(id) on delete cascade not null unique,
  overall_risk_score integer not null check (overall_risk_score >= 0 and overall_risk_score <= 100),
  summary text not null,
  issues_found jsonb not null default '[]'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create quota usage table
create table public.quota_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  analysis_count integer not null default 0,
  last_reset_at timestamp with time zone default timezone('utc'::text, now()) not null,
  period varchar(20) not null check (period in ('daily', 'monthly')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, period)
);

-- Create indexes for better performance
create index idx_users_email on public.users(email);
create index idx_users_provider on public.users(provider, provider_id);
create index idx_analysis_sessions_user_id on public.analysis_sessions(user_id);
create index idx_analysis_sessions_status on public.analysis_sessions(status);
create index idx_analysis_sessions_created_at on public.analysis_sessions(created_at desc);
create index idx_analysis_results_session_id on public.analysis_results(session_id);
create index idx_quota_usage_user_id on public.quota_usage(user_id);
create index idx_quota_usage_period on public.quota_usage(user_id, period);

-- Create updated_at trigger function
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc'::text, now());
  return new;
end;
$$ language plpgsql;

-- Add updated_at triggers
create trigger handle_users_updated_at
  before update on public.users
  for each row execute function public.handle_updated_at();

create trigger handle_analysis_sessions_updated_at
  before update on public.analysis_sessions
  for each row execute function public.handle_updated_at();

create trigger handle_quota_usage_updated_at
  before update on public.quota_usage
  for each row execute function public.handle_updated_at();

-- Enable Row Level Security
alter table public.users enable row level security;
alter table public.analysis_sessions enable row level security;
alter table public.analysis_results enable row level security;
alter table public.quota_usage enable row level security;

-- Create RLS policies
-- Users can only see and edit their own data
create policy "Users can view own profile" on public.users
  for select using (auth.uid()::text = id::text);

create policy "Users can update own profile" on public.users
  for update using (auth.uid()::text = id::text);

-- Analysis sessions: users can only see their own sessions
create policy "Users can view own sessions" on public.analysis_sessions
  for select using (auth.uid()::text = user_id::text);

create policy "Users can create own sessions" on public.analysis_sessions
  for insert with check (auth.uid()::text = user_id::text);

create policy "Users can update own sessions" on public.analysis_sessions
  for update using (auth.uid()::text = user_id::text);

-- Analysis results: users can only see results for their sessions
create policy "Users can view own results" on public.analysis_results
  for select using (
    exists (
      select 1 from public.analysis_sessions
      where analysis_sessions.id = analysis_results.session_id
      and analysis_sessions.user_id::text = auth.uid()::text
    )
  );

create policy "Service role can manage results" on public.analysis_results
  for all using (auth.role() = 'service_role');

-- Quota usage: users can only see their own quota
create policy "Users can view own quota" on public.quota_usage
  for select using (auth.uid()::text = user_id::text);

create policy "Users can update own quota" on public.quota_usage
  for update using (auth.uid()::text = user_id::text);

create policy "Users can create own quota" on public.quota_usage
  for insert with check (auth.uid()::text = user_id::text);

-- Create function to automatically create user quota entries
create or replace function public.create_user_quota()
returns trigger as $$
begin
  insert into public.quota_usage (user_id, period, analysis_count, last_reset_at)
  values 
    (new.id, 'daily', 0, timezone('utc'::text, now())),
    (new.id, 'monthly', 0, timezone('utc'::text, now()));
  return new;
end;
$$ language plpgsql;

-- Trigger to create quota entries when user is created
create trigger create_user_quota_trigger
  after insert on public.users
  for each row execute function public.create_user_quota();

-- Create function to check quota limits
create or replace function public.check_quota_limit(user_uuid uuid, quota_period text)
returns table(
  current_count integer,
  limit_reached boolean,
  remaining integer
) as $$
declare
  current_usage integer;
  daily_limit integer := 3;
  monthly_limit integer := 10;
  limit_value integer;
begin
  -- Get current usage
  select analysis_count into current_usage
  from public.quota_usage
  where user_id = user_uuid and period = quota_period;
  
  if current_usage is null then
    current_usage := 0;
  end if;
  
  -- Set limit based on period
  if quota_period = 'daily' then
    limit_value := daily_limit;
  else
    limit_value := monthly_limit;
  end if;
  
  return query select
    current_usage as current_count,
    current_usage >= limit_value as limit_reached,
    greatest(0, limit_value - current_usage) as remaining;
end;
$$ language plpgsql;