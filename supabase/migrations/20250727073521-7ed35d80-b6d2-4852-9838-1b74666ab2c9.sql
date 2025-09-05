-- Create mining_sessions table to track user mining activity
CREATE TABLE public.mining_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  points_earned NUMERIC NOT NULL DEFAULT 1000,
  session_date DATE NOT NULL DEFAULT CURRENT_DATE,
  session_count INTEGER NOT NULL DEFAULT 1,
  last_claim_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  next_available_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 hour'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mining_wallets table for user mining points
CREATE TABLE public.mining_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  total_points NUMERIC NOT NULL DEFAULT 0,
  today_points NUMERIC NOT NULL DEFAULT 0,
  today_claims INTEGER NOT NULL DEFAULT 0,
  last_reset_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mining_settings table for admin configuration
CREATE TABLE public.mining_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default mining settings
INSERT INTO public.mining_settings (setting_key, setting_value, description) VALUES
('points_per_claim', '1000', 'Points awarded per mining claim'),
('cooldown_hours', '1', 'Hours between mining claims'),
('daily_claim_limit', '24', 'Maximum claims per day'),
('max_daily_points', '24000', 'Maximum points per day');

-- Enable RLS
ALTER TABLE public.mining_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for mining_sessions
CREATE POLICY "Users can view their own mining sessions" 
ON public.mining_sessions 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mining sessions" 
ON public.mining_sessions 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mining sessions" 
ON public.mining_sessions 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for mining_wallets
CREATE POLICY "Users can view their own mining wallet" 
ON public.mining_wallets 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own mining wallet" 
ON public.mining_wallets 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own mining wallet" 
ON public.mining_wallets 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for mining_settings
CREATE POLICY "Anyone can view mining settings" 
ON public.mining_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create triggers for timestamp updates
CREATE TRIGGER update_mining_sessions_updated_at
BEFORE UPDATE ON public.mining_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mining_wallets_updated_at
BEFORE UPDATE ON public.mining_wallets
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mining_settings_updated_at
BEFORE UPDATE ON public.mining_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user mining wallet creation
CREATE OR REPLACE FUNCTION public.handle_new_user_mining_wallet()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.mining_wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reset daily mining stats
CREATE OR REPLACE FUNCTION public.reset_daily_mining_stats()
RETURNS void AS $$
BEGIN
  UPDATE public.mining_wallets 
  SET 
    today_points = 0,
    today_claims = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to process mining claim
CREATE OR REPLACE FUNCTION public.process_mining_claim(user_id_param UUID)
RETURNS JSON AS $$
DECLARE
  wallet_record RECORD;
  settings_record RECORD;
  session_record RECORD;
  points_to_add NUMERIC;
  cooldown_hours INTEGER;
  daily_limit INTEGER;
  result JSON;
BEGIN
  -- Get mining settings
  SELECT 
    MAX(CASE WHEN setting_key = 'points_per_claim' THEN CAST(setting_value AS NUMERIC) END) as points_per_claim,
    MAX(CASE WHEN setting_key = 'cooldown_hours' THEN CAST(setting_value AS INTEGER) END) as cooldown_hours,
    MAX(CASE WHEN setting_key = 'daily_claim_limit' THEN CAST(setting_value AS INTEGER) END) as daily_limit
  INTO settings_record
  FROM public.mining_settings 
  WHERE setting_key IN ('points_per_claim', 'cooldown_hours', 'daily_claim_limit');
  
  -- Get user's mining wallet
  SELECT * INTO wallet_record 
  FROM public.mining_wallets 
  WHERE user_id = user_id_param;
  
  -- Create wallet if doesn't exist
  IF wallet_record IS NULL THEN
    INSERT INTO public.mining_wallets (user_id) 
    VALUES (user_id_param)
    RETURNING * INTO wallet_record;
  END IF;
  
  -- Reset daily stats if new day
  IF wallet_record.last_reset_date < CURRENT_DATE THEN
    UPDATE public.mining_wallets 
    SET 
      today_points = 0,
      today_claims = 0,
      last_reset_date = CURRENT_DATE
    WHERE user_id = user_id_param
    RETURNING * INTO wallet_record;
  END IF;
  
  -- Check daily limit
  IF wallet_record.today_claims >= settings_record.daily_limit THEN
    result := json_build_object(
      'success', false,
      'error', 'daily_limit_reached',
      'message', 'Daily mining limit reached'
    );
    RETURN result;
  END IF;
  
  -- Check cooldown
  SELECT * INTO session_record 
  FROM public.mining_sessions 
  WHERE user_id = user_id_param 
    AND session_date = CURRENT_DATE
  ORDER BY last_claim_time DESC 
  LIMIT 1;
  
  IF session_record IS NOT NULL AND session_record.next_available_time > now() THEN
    result := json_build_object(
      'success', false,
      'error', 'cooldown_active',
      'message', 'Mining cooldown active',
      'next_available', session_record.next_available_time
    );
    RETURN result;
  END IF;
  
  -- Process the claim
  points_to_add := settings_record.points_per_claim;
  
  -- Update wallet
  UPDATE public.mining_wallets 
  SET 
    total_points = total_points + points_to_add,
    today_points = today_points + points_to_add,
    today_claims = today_claims + 1,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Insert mining session
  INSERT INTO public.mining_sessions (
    user_id, 
    points_earned, 
    session_date, 
    session_count,
    last_claim_time,
    next_available_time
  ) VALUES (
    user_id_param,
    points_to_add,
    CURRENT_DATE,
    wallet_record.today_claims + 1,
    now(),
    now() + (settings_record.cooldown_hours || ' hours')::INTERVAL
  );
  
  result := json_build_object(
    'success', true,
    'points_earned', points_to_add,
    'total_points', wallet_record.total_points + points_to_add,
    'today_points', wallet_record.today_points + points_to_add,
    'today_claims', wallet_record.today_claims + 1,
    'next_available', now() + (settings_record.cooldown_hours || ' hours')::INTERVAL
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;