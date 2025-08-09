-- Create tasks table for available tasks
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  reward_points INTEGER NOT NULL DEFAULT 0,
  icon TEXT,
  platform TEXT NOT NULL,
  external_url TEXT,
  verification_type TEXT NOT NULL DEFAULT 'manual', -- 'api', 'manual', 'auto'
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_recurring BOOLEAN NOT NULL DEFAULT false, -- for daily check-in
  category TEXT NOT NULL DEFAULT 'social', -- 'social', 'bonus', 'daily', 'referral'
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_tasks table to track task completion
CREATE TABLE public.user_tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'verified'
  points_earned INTEGER NOT NULL DEFAULT 0,
  completion_date TIMESTAMP WITH TIME ZONE,
  verification_screenshot TEXT,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, task_id)
);

-- Create referrals table for referral system
CREATE TABLE public.referrals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id UUID NOT NULL,
  referred_id UUID,
  referral_code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'completed', 'qualified'
  qualification_amount NUMERIC DEFAULT 0,
  reward_amount NUMERIC DEFAULT 0,
  reward_paid BOOLEAN DEFAULT false,
  signup_date TIMESTAMP WITH TIME ZONE,
  qualification_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create task_settings table for admin configuration
CREATE TABLE public.task_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default tasks
INSERT INTO public.tasks (task_type, title, description, reward_points, icon, platform, external_url, verification_type, category) VALUES
('twitter_follow', 'हमारे Twitter पेज को Follow करें', 'Twitter पर हमें Follow करें और 1000 पॉइंट्स कमाएं', 1000, 'Twitter', 'twitter', 'https://twitter.com/zerthyx', 'manual', 'social'),
('telegram_join', 'Telegram चैनल Join करें', 'हमारे Telegram चैनल से जुड़ें', 1500, 'MessageCircle', 'telegram', 'https://t.me/zerthyx', 'manual', 'social'),
('instagram_follow', 'Instagram को Follow करें', 'Instagram पर हमें Follow करें', 1000, 'Instagram', 'instagram', 'https://instagram.com/zerthyx', 'manual', 'social'),
('facebook_like', 'Facebook Page को Like करें', 'हमारे Facebook page को Like करें', 800, 'Facebook', 'facebook', 'https://facebook.com/zerthyx', 'manual', 'social'),
('youtube_subscribe', 'YouTube Channel Subscribe करें', 'YouTube पर Subscribe करें और bell icon दबाएं', 1200, 'Youtube', 'youtube', 'https://youtube.com/@zerthyx', 'manual', 'social'),
('twitter_like', 'Twitter Post को Like करें', 'हमारी latest post को Like करें', 500, 'Heart', 'twitter', 'https://twitter.com/zerthyx/status/latest', 'manual', 'social'),
('instagram_like', 'Instagram Post को Like करें', 'हमारी latest Instagram post को Like करें', 500, 'Heart', 'instagram', 'https://instagram.com/p/latest', 'manual', 'social'),
('youtube_watch', 'YouTube Video पूरा देखें', 'हमारी latest video को complete देखें', 800, 'Play', 'youtube', 'https://youtube.com/watch?v=latest', 'manual', 'social'),
('daily_checkin', 'Daily Check-in', 'रोज़ाना check-in करें और 500 पॉइंट्स पाएं', 500, 'Calendar', 'app', NULL, 'auto', 'daily');

-- Insert task settings
INSERT INTO public.task_settings (setting_key, setting_value, description) VALUES
('referral_reward_amount', '1', 'Referral reward in USDT'),
('referral_min_deposit', '50', 'Minimum deposit required for referral qualification'),
('daily_tasks_limit', '8', 'Maximum daily tasks available'),
('tasks_enabled', 'true', 'Enable/disable task system');

-- Enable RLS
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_settings ENABLE ROW LEVEL SECURITY;

-- RLS policies for tasks
CREATE POLICY "Anyone can view active tasks" 
ON public.tasks 
FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

-- RLS policies for user_tasks
CREATE POLICY "Users can view their own task completions" 
ON public.user_tasks 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task completions" 
ON public.user_tasks 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task completions" 
ON public.user_tasks 
FOR UPDATE 
USING (auth.uid() = user_id);

-- RLS policies for referrals
CREATE POLICY "Users can view their own referrals" 
ON public.referrals 
FOR SELECT 
USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert their own referrals" 
ON public.referrals 
FOR INSERT 
WITH CHECK (auth.uid() = referrer_id);

CREATE POLICY "Users can update their own referrals" 
ON public.referrals 
FOR UPDATE 
USING (auth.uid() = referrer_id);

-- RLS policies for task_settings
CREATE POLICY "Anyone can view task settings" 
ON public.task_settings 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Create triggers for timestamp updates
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_tasks_updated_at
BEFORE UPDATE ON public.user_tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_referrals_updated_at
BEFORE UPDATE ON public.referrals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_settings_updated_at
BEFORE UPDATE ON public.task_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate unique referral code
CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists BOOLEAN := true;
BEGIN
  WHILE exists LOOP
    code := 'REF' || UPPER(substring(gen_random_uuid()::text from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.referrals WHERE referral_code = code) INTO exists;
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create user referral code
CREATE OR REPLACE FUNCTION public.create_user_referral_code(user_id_param UUID)
RETURNS TEXT AS $$
DECLARE
  existing_code TEXT;
  new_code TEXT;
BEGIN
  -- Check if user already has a referral code
  SELECT referral_code INTO existing_code
  FROM public.referrals 
  WHERE referrer_id = user_id_param 
  LIMIT 1;
  
  IF existing_code IS NOT NULL THEN
    RETURN existing_code;
  END IF;
  
  -- Generate new referral code
  new_code := generate_referral_code();
  
  -- Insert new referral record
  INSERT INTO public.referrals (referrer_id, referral_code)
  VALUES (user_id_param, new_code);
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to complete a task
CREATE OR REPLACE FUNCTION public.complete_task(user_id_param UUID, task_id_param UUID)
RETURNS JSON AS $$
DECLARE
  task_record RECORD;
  user_task_record RECORD;
  wallet_record RECORD;
  result JSON;
BEGIN
  -- Get task details
  SELECT * INTO task_record
  FROM public.tasks 
  WHERE id = task_id_param AND is_active = true;
  
  IF task_record IS NULL THEN
    result := json_build_object(
      'success', false,
      'error', 'task_not_found',
      'message', 'Task not found or inactive'
    );
    RETURN result;
  END IF;
  
  -- Check if task already completed (for non-recurring tasks)
  SELECT * INTO user_task_record
  FROM public.user_tasks 
  WHERE user_id = user_id_param AND task_id = task_id_param;
  
  IF user_task_record IS NOT NULL AND NOT task_record.is_recurring THEN
    result := json_build_object(
      'success', false,
      'error', 'task_already_completed',
      'message', 'Task already completed'
    );
    RETURN result;
  END IF;
  
  -- For daily check-in, check if already done today
  IF task_record.is_recurring AND user_task_record IS NOT NULL THEN
    IF DATE(user_task_record.completion_date) = CURRENT_DATE THEN
      result := json_build_object(
        'success', false,
        'error', 'daily_task_completed',
        'message', 'Daily task already completed today'
      );
      RETURN result;
    END IF;
  END IF;
  
  -- Insert or update user task completion
  IF user_task_record IS NULL THEN
    INSERT INTO public.user_tasks (
      user_id, 
      task_id, 
      status, 
      points_earned, 
      completion_date
    ) VALUES (
      user_id_param,
      task_id_param,
      CASE WHEN task_record.verification_type = 'auto' THEN 'verified' ELSE 'completed' END,
      task_record.reward_points,
      now()
    );
  ELSE
    UPDATE public.user_tasks 
    SET 
      status = CASE WHEN task_record.verification_type = 'auto' THEN 'verified' ELSE 'completed' END,
      completion_date = now(),
      updated_at = now()
    WHERE user_id = user_id_param AND task_id = task_id_param;
  END IF;
  
  -- Add points to mining wallet if auto-verified
  IF task_record.verification_type = 'auto' THEN
    -- Get or create mining wallet
    SELECT * INTO wallet_record
    FROM public.mining_wallets 
    WHERE user_id = user_id_param;
    
    IF wallet_record IS NULL THEN
      INSERT INTO public.mining_wallets (user_id, total_points)
      VALUES (user_id_param, task_record.reward_points);
    ELSE
      UPDATE public.mining_wallets 
      SET 
        total_points = total_points + task_record.reward_points,
        updated_at = now()
      WHERE user_id = user_id_param;
    END IF;
  END IF;
  
  result := json_build_object(
    'success', true,
    'points_earned', task_record.reward_points,
    'verification_required', task_record.verification_type != 'auto',
    'message', 'Task completed successfully'
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;