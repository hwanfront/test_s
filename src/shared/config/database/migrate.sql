-- Database Migration Script for Core AI Analysis MVP
-- This ensures the database schema matches the data model requirements

-- Start transaction
BEGIN;

-- Drop existing tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.analysis_results CASCADE;
DROP TABLE IF EXISTS public.analysis_sessions CASCADE;
DROP TABLE IF EXISTS public.quota_usage CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Drop functions if they exist
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.create_user_quota() CASCADE;
DROP FUNCTION IF EXISTS public.check_quota_limit(uuid, text) CASCADE;

-- Enable RLS (Row Level Security)
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM public;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM public;

-- Create users table with all required columns
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255),
  avatar_url TEXT,
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('google', 'naver')),
  provider_id VARCHAR(255) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(provider, provider_id)
);

-- Create analysis sessions table
CREATE TABLE public.analysis_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  title VARCHAR(255),
  content_hash VARCHAR(64) NOT NULL,
  content_length INTEGER NOT NULL CHECK (content_length > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'processing' 
    CHECK (status IN ('processing', 'completed', 'failed', 'expired')),
  risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
  risk_level VARCHAR(10) CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  confidence_score INTEGER CHECK (confidence_score >= 0 AND confidence_score <= 100),
  processing_time_ms INTEGER CHECK (processing_time_ms >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  error_message TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create risk assessments table for individual clause analysis
CREATE TABLE public.risk_assessments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.analysis_sessions(id) ON DELETE CASCADE NOT NULL,
  clause_category VARCHAR(50) NOT NULL,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
  confidence_score INTEGER NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 100),
  summary VARCHAR(200) NOT NULL,
  rationale TEXT NOT NULL,
  suggested_action TEXT,
  start_position INTEGER NOT NULL CHECK (start_position >= 0),
  end_position INTEGER NOT NULL CHECK (end_position >= start_position),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create daily quota tracking table
CREATE TABLE public.daily_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  date DATE NOT NULL,
  free_analyses_used INTEGER NOT NULL DEFAULT 0 CHECK (free_analyses_used >= 0),
  paid_analyses_used INTEGER NOT NULL DEFAULT 0 CHECK (paid_analyses_used >= 0),
  free_analyses_limit INTEGER NOT NULL DEFAULT 3 CHECK (free_analyses_limit > 0),
  last_reset_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Create clause patterns table for AI analysis
CREATE TABLE public.clause_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category VARCHAR(50) NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  risk_level VARCHAR(10) NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  keywords JSONB NOT NULL,
  prompt_template TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  industry VARCHAR(50) NOT NULL DEFAULT 'mobile-gaming',
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_provider ON public.users(provider, provider_id);
CREATE INDEX idx_analysis_sessions_user_id ON public.analysis_sessions(user_id);
CREATE INDEX idx_analysis_sessions_status ON public.analysis_sessions(status);
CREATE INDEX idx_analysis_sessions_expires_at ON public.analysis_sessions(expires_at);
CREATE INDEX idx_analysis_sessions_created_at ON public.analysis_sessions(created_at DESC);
CREATE INDEX idx_risk_assessments_session_id ON public.risk_assessments(session_id);
CREATE INDEX idx_daily_quotas_user_date ON public.daily_quotas(user_id, date);
CREATE INDEX idx_clause_patterns_category ON public.clause_patterns(category);
CREATE INDEX idx_clause_patterns_industry ON public.clause_patterns(industry, is_active);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add updated_at triggers
CREATE TRIGGER handle_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_analysis_sessions_updated_at
  BEFORE UPDATE ON public.analysis_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_daily_quotas_updated_at
  BEFORE UPDATE ON public.daily_quotas
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_clause_patterns_updated_at
  BEFORE UPDATE ON public.clause_patterns
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.risk_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clause_patterns ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid()::text = id::text);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid()::text = id::text);

CREATE POLICY "Service role can manage users" ON public.users
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for analysis sessions
CREATE POLICY "Users can view own sessions" ON public.analysis_sessions
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own sessions" ON public.analysis_sessions
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own sessions" ON public.analysis_sessions
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage sessions" ON public.analysis_sessions
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for risk assessments
CREATE POLICY "Users can view own risk assessments" ON public.risk_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.analysis_sessions
      WHERE analysis_sessions.id = risk_assessments.session_id
      AND analysis_sessions.user_id::text = auth.uid()::text
    )
  );

CREATE POLICY "Service role can manage risk assessments" ON public.risk_assessments
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for daily quotas
CREATE POLICY "Users can view own quota" ON public.daily_quotas
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own quota" ON public.daily_quotas
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can create own quota" ON public.daily_quotas
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Service role can manage quotas" ON public.daily_quotas
  FOR ALL USING (auth.role() = 'service_role');

-- Create RLS policies for clause patterns (read-only for users)
CREATE POLICY "Users can view active patterns" ON public.clause_patterns
  FOR SELECT USING (is_active = true);

CREATE POLICY "Service role can manage patterns" ON public.clause_patterns
  FOR ALL USING (auth.role() = 'service_role');

-- Create function to automatically create user quota entries
CREATE OR REPLACE FUNCTION public.create_user_daily_quota()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.daily_quotas (user_id, date, free_analyses_used, free_analyses_limit)
  VALUES (NEW.id, CURRENT_DATE, 0, 3)
  ON CONFLICT (user_id, date) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to create quota entries when user is created
CREATE TRIGGER create_user_quota_trigger
  AFTER INSERT ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.create_user_daily_quota();

-- Create function to check quota limits
CREATE OR REPLACE FUNCTION public.check_quota_limit(user_uuid UUID)
RETURNS TABLE(
  current_count INTEGER,
  limit_reached BOOLEAN,
  remaining INTEGER,
  daily_limit INTEGER
) AS $$
DECLARE
  current_usage INTEGER;
  daily_limit_value INTEGER := 3;
BEGIN
  -- Get or create current day's quota
  INSERT INTO public.daily_quotas (user_id, date, free_analyses_used, free_analyses_limit)
  VALUES (user_uuid, CURRENT_DATE, 0, daily_limit_value)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  -- Get current usage
  SELECT free_analyses_used, free_analyses_limit 
  INTO current_usage, daily_limit_value
  FROM public.daily_quotas
  WHERE user_id = user_uuid AND date = CURRENT_DATE;
  
  IF current_usage IS NULL THEN
    current_usage := 0;
  END IF;
  
  RETURN QUERY SELECT
    current_usage AS current_count,
    current_usage >= daily_limit_value AS limit_reached,
    GREATEST(0, daily_limit_value - current_usage) AS remaining,
    daily_limit_value AS daily_limit;
END;
$$ LANGUAGE plpgsql;

-- Create function to increment quota usage
CREATE OR REPLACE FUNCTION public.increment_quota_usage(user_uuid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  current_usage INTEGER;
  daily_limit_value INTEGER := 3;
  success BOOLEAN := false;
BEGIN
  -- Get or create current day's quota
  INSERT INTO public.daily_quotas (user_id, date, free_analyses_used, free_analyses_limit)
  VALUES (user_uuid, CURRENT_DATE, 0, daily_limit_value)
  ON CONFLICT (user_id, date) DO NOTHING;
  
  -- Check current usage and increment if under limit
  UPDATE public.daily_quotas
  SET free_analyses_used = free_analyses_used + 1,
      updated_at = timezone('utc'::text, now())
  WHERE user_id = user_uuid 
    AND date = CURRENT_DATE 
    AND free_analyses_used < free_analyses_limit
  RETURNING true INTO success;
  
  RETURN COALESCE(success, false);
END;
$$ LANGUAGE plpgsql;

-- Insert initial clause patterns for mobile gaming
INSERT INTO public.clause_patterns (category, name, description, risk_level, keywords, prompt_template, industry) VALUES
  ('account-termination', 'Arbitrary Account Closure', 'Policies allowing service termination without clear cause', 'high', 
   '["terminate", "suspend", "close account", "ban", "violation", "discretion"]'::jsonb,
   'Analyze this clause for account termination policies that may be unfair to users: {clause}', 'mobile-gaming'),
   
  ('virtual-currency', 'Virtual Currency Forfeiture', 'Terms allowing forfeiture of in-game currency', 'critical',
   '["virtual currency", "coins", "gems", "forfeit", "expire", "lose", "deduct"]'::jsonb,
   'Examine this clause for unfair virtual currency policies: {clause}', 'mobile-gaming'),
   
  ('data-collection', 'Excessive Data Collection', 'Broad data collection beyond game functionality', 'medium',
   '["personal data", "collect", "information", "tracking", "analytics", "third party"]'::jsonb,
   'Review this clause for excessive personal data collection: {clause}', 'mobile-gaming'),
   
  ('purchase-refunds', 'Restrictive Refund Policy', 'Limited or no refund policies for in-app purchases', 'high',
   '["refund", "no return", "final sale", "purchase", "payment", "billing"]'::jsonb,
   'Analyze this clause for unfair refund restrictions: {clause}', 'mobile-gaming'),
   
  ('liability-limitation', 'Excessive Liability Disclaimers', 'Broad liability limitations that may be unfair', 'medium',
   '["liability", "damages", "disclaimer", "responsible", "compensation", "loss"]'::jsonb,
   'Examine this clause for excessive liability limitations: {clause}', 'mobile-gaming');

-- Commit transaction
COMMIT;

-- Verify tables were created successfully
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN ('users', 'analysis_sessions', 'risk_assessments', 'daily_quotas', 'clause_patterns');
  
  IF table_count = 5 THEN
    RAISE NOTICE 'Database migration completed successfully. All 5 tables created.';
  ELSE
    RAISE EXCEPTION 'Database migration failed. Expected 5 tables, found %', table_count;
  END IF;
END $$;