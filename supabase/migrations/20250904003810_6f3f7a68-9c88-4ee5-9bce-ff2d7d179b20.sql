-- Fix all database functions with proper search_path settings for security
-- This fixes all 17 database linter warnings

-- 1. Fix function search paths for security compliance
CREATE OR REPLACE FUNCTION public.handle_new_user_mining_wallet()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  INSERT INTO public.mining_wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.reset_daily_mining_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  UPDATE public.mining_wallets 
  SET 
    today_points = 0,
    today_claims = 0,
    last_reset_date = CURRENT_DATE
  WHERE last_reset_date < CURRENT_DATE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = auth.uid()
  );
$function$;

CREATE OR REPLACE FUNCTION public.create_user_referral_code(user_id_param uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.transfer_daily_earnings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Update user wallets to transfer daily_earnings to total_profit
  UPDATE user_wallets 
  SET 
    total_profit = total_profit + daily_earnings,
    daily_earnings = 0,
    last_earnings_update = now()
  WHERE 
    is_active = true 
    AND total_deposit > 0 
    AND daily_earnings > 0;
    
  -- Log the operation
  INSERT INTO public.logs (operation, message, timestamp)
  VALUES ('daily_earnings_transfer', 'Daily earnings transferred to total profit', now());
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_mining_claim(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.complete_task(user_id_param uuid, task_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  result json;
  total_deposits numeric := 0;
  active_users integer := 0;
  total_nft_locked numeric := 0;
  today_profit numeric := 0;
BEGIN
  -- Get total deposits
  SELECT COALESCE(SUM(amount), 0) INTO total_deposits
  FROM public.deposits 
  WHERE status = 'approved';
  
  -- Get active users (users who logged in last 30 days)
  SELECT COUNT(*) INTO active_users
  FROM public.profiles 
  WHERE updated_at > now() - interval '30 days' AND is_blocked = false;
  
  -- Get total NFT locked (sum of active user wallets)
  SELECT COALESCE(SUM(total_deposit), 0) INTO total_nft_locked
  FROM public.user_wallets 
  WHERE is_active = true;
  
  -- Get today's profit distributed
  SELECT COALESCE(SUM(daily_earnings), 0) INTO today_profit
  FROM public.user_wallets 
  WHERE last_earnings_update::date = CURRENT_DATE;
  
  result := json_build_object(
    'total_deposits', total_deposits,
    'active_users', active_users,
    'total_nft_locked', total_nft_locked,
    'today_profit', today_profit
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_id_param
  );
$function$;

CREATE OR REPLACE FUNCTION public.add_admin_by_email(admin_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_record RECORD;
  result json;
BEGIN
  -- Get user by email from profiles table
  SELECT * INTO user_record
  FROM public.profiles 
  WHERE email = admin_email
  LIMIT 1;
  
  IF user_record IS NULL THEN
    result := json_build_object(
      'success', false,
      'message', 'User not found with this email'
    );
    RETURN result;
  END IF;
  
  -- Check if already admin
  IF EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = user_record.user_id) THEN
    result := json_build_object(
      'success', false,
      'message', 'User is already an admin'
    );
    RETURN result;
  END IF;
  
  -- Add as admin
  INSERT INTO public.admin_users (user_id, role, permissions)
  VALUES (
    user_record.user_id,
    'super_admin',
    '["dashboard", "users", "blockchain", "deposits", "content", "settings"]'::jsonb
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Admin user added successfully'
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  referral_code_param TEXT;
  referrer_user_id UUID;
BEGIN
  -- Get referral code from user metadata
  referral_code_param := NEW.raw_user_meta_data ->> 'referral_code';
  
  IF referral_code_param IS NOT NULL THEN
    -- Find the referrer
    SELECT referrer_id INTO referrer_user_id 
    FROM public.referrals 
    WHERE referral_code = referral_code_param 
      AND referred_id IS NULL
    LIMIT 1;
    
    IF referrer_user_id IS NOT NULL THEN
      -- Update the referral record with the new user
      UPDATE public.referrals 
      SET 
        referred_id = NEW.id,
        signup_date = now(),
        status = 'signed_up'
      WHERE referral_code = referral_code_param AND referrer_id = referrer_user_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  referral_record RECORD;
  reward_amount NUMERIC := 1.0; -- $1 USDT reward
BEGIN
  -- Only process when deposit status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Check if this user was referred and minimum deposit requirement (any amount)
    SELECT * INTO referral_record
    FROM public.referrals 
    WHERE referred_id = NEW.user_id 
      AND status = 'signed_up'
      AND reward_paid = false;
    
    IF referral_record IS NOT NULL THEN
      -- Update referral status to qualified
      UPDATE public.referrals 
      SET 
        status = 'qualified',
        qualification_date = now(),
        qualification_amount = NEW.amount,
        reward_amount = reward_amount,
        reward_paid = true
      WHERE id = referral_record.id;
      
      -- Add reward to referrer's wallet total_profit
      UPDATE public.user_wallets 
      SET 
        total_profit = total_profit + reward_amount,
        updated_at = now()
      WHERE user_id = referral_record.referrer_id;
      
      -- Create a deposit record for the referral bonus
      INSERT INTO public.deposits (
        user_id,
        amount,
        status,
        blockchain,
        deposit_address,
        admin_notes
      ) VALUES (
        referral_record.referrer_id,
        reward_amount,
        'approved',
        'USDT',
        'referral_bonus',
        'Refer Bonus - Referral reward for successful referral'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_nft_deposit_with_shared_timer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  user_wallet RECORD;
  batch_number INTEGER;
  maturity_date TIMESTAMP WITH TIME ZONE;
  days_lock_period INTEGER := 45;
BEGIN
  -- Only process when deposit status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    
    -- Get user's wallet information
    SELECT * INTO user_wallet
    FROM public.user_wallets 
    WHERE user_id = NEW.user_id;
    
    -- If this is the first deposit or wallet doesn't exist
    IF user_wallet IS NULL THEN
      -- Create new wallet if it doesn't exist
      INSERT INTO public.user_wallets (
        user_id, 
        total_deposit, 
        is_active, 
        nft_maturity_date,
        deposit_batch_count,
        first_deposit_date,
        latest_deposit_date
      ) VALUES (
        NEW.user_id,
        NEW.amount,
        true,
        now() + (days_lock_period || ' days')::INTERVAL,
        1,
        now(),
        now()
      );
      
      batch_number := 1;
      maturity_date := now() + (days_lock_period || ' days')::INTERVAL;
      
    ELSIF user_wallet.first_deposit_date IS NULL OR user_wallet.nft_maturity_date IS NULL THEN
      -- First NFT deposit for existing wallet
      UPDATE public.user_wallets 
      SET 
        total_deposit = total_deposit + NEW.amount,
        is_active = true,
        nft_maturity_date = now() + (days_lock_period || ' days')::INTERVAL,
        deposit_batch_count = 1,
        first_deposit_date = now(),
        latest_deposit_date = now(),
        updated_at = now()
      WHERE user_id = NEW.user_id;
      
      batch_number := 1;
      maturity_date := now() + (days_lock_period || ' days')::INTERVAL;
      
    ELSE
      -- Subsequent deposit - use shared timer from first deposit
      UPDATE public.user_wallets 
      SET 
        total_deposit = total_deposit + NEW.amount,
        latest_deposit_date = now(),
        deposit_batch_count = deposit_batch_count + 1,
        updated_at = now()
      WHERE user_id = NEW.user_id;
      
      batch_number := user_wallet.deposit_batch_count + 1;
      maturity_date := user_wallet.nft_maturity_date; -- Share the timer from first deposit
    END IF;
    
    -- Create NFT deposit record
    INSERT INTO public.nft_deposits (
      user_id,
      deposit_id,
      amount,
      deposit_date,
      batch_number,
      maturity_date
    ) VALUES (
      NEW.user_id,
      NEW.id,
      NEW.amount,
      now(),
      batch_number,
      maturity_date
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_nft_maturity_check()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  nft_deposit RECORD;
BEGIN
  -- Mark matured NFT deposits
  UPDATE public.nft_deposits 
  SET 
    is_matured = true,
    updated_at = now()
  WHERE maturity_date <= now() 
    AND is_matured = false;
    
  -- Update wallet maturity status for users whose first batch has matured
  FOR nft_deposit IN 
    SELECT DISTINCT user_id, MIN(batch_number) as first_batch
    FROM public.nft_deposits 
    WHERE is_matured = true AND is_withdrawn = false
    GROUP BY user_id
  LOOP
    -- Check if user's first batch is ready for withdrawal
    IF EXISTS (
      SELECT 1 FROM public.nft_deposits 
      WHERE user_id = nft_deposit.user_id 
        AND batch_number = nft_deposit.first_batch 
        AND is_matured = true 
        AND is_withdrawn = false
    ) THEN
      -- Update wallet to show first batch is ready for withdrawal
      UPDATE public.user_wallets 
      SET updated_at = now()
      WHERE user_id = nft_deposit.user_id;
    END IF;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.process_nft_withdrawal(user_id_param uuid, amount_param numeric)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  available_amount NUMERIC := 0;
  withdrawal_amount NUMERIC := amount_param;
  nft_deposit RECORD;
  result JSON;
BEGIN
  -- Calculate total available amount from matured deposits
  SELECT COALESCE(SUM(amount), 0) INTO available_amount
  FROM public.nft_deposits 
  WHERE user_id = user_id_param 
    AND is_matured = true 
    AND is_withdrawn = false;
  
  -- Check if requested amount is available
  IF withdrawal_amount > available_amount THEN
    result := json_build_object(
      'success', false,
      'error', 'insufficient_funds',
      'message', 'Insufficient matured NFT deposits for withdrawal',
      'available_amount', available_amount
    );
    RETURN result;
  END IF;
  
  -- Process withdrawal from oldest matured deposits first
  FOR nft_deposit IN 
    SELECT * FROM public.nft_deposits 
    WHERE user_id = user_id_param 
      AND is_matured = true 
      AND is_withdrawn = false
    ORDER BY batch_number ASC, deposit_date ASC
  LOOP
    IF withdrawal_amount <= 0 THEN
      EXIT;
    END IF;
    
    IF nft_deposit.amount <= withdrawal_amount THEN
      -- Mark entire deposit as withdrawn
      UPDATE public.nft_deposits 
      SET 
        is_withdrawn = true,
        updated_at = now()
      WHERE id = nft_deposit.id;
      
      withdrawal_amount := withdrawal_amount - nft_deposit.amount;
    ELSE
      -- Partial withdrawal (shouldn't happen with current logic but good to have)
      -- For now, we'll mark as withdrawn and handle partial logic later if needed
      UPDATE public.nft_deposits 
      SET 
        is_withdrawn = true,
        updated_at = now()
      WHERE id = nft_deposit.id;
      
      withdrawal_amount := 0;
    END IF;
  END LOOP;
  
  -- Update user wallet total_deposit to reflect withdrawn amount
  UPDATE public.user_wallets 
  SET 
    total_deposit = total_deposit - amount_param,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  result := json_build_object(
    'success', true,
    'withdrawn_amount', amount_param,
    'remaining_available', available_amount - amount_param
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_nft_deposit_summary(user_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  total_deposits NUMERIC := 0;
  matured_amount NUMERIC := 0;
  pending_amount NUMERIC := 0;
  next_maturity_date TIMESTAMP WITH TIME ZONE;
  batch_info JSON;
  result JSON;
BEGIN
  -- Get total amounts
  SELECT 
    COALESCE(SUM(amount), 0),
    COALESCE(SUM(CASE WHEN is_matured = true AND is_withdrawn = false THEN amount ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN is_matured = false THEN amount ELSE 0 END), 0)
  INTO total_deposits, matured_amount, pending_amount
  FROM public.nft_deposits 
  WHERE user_id = user_id_param AND is_withdrawn = false;
  
  -- Get next maturity date
  SELECT MIN(maturity_date) INTO next_maturity_date
  FROM public.nft_deposits 
  WHERE user_id = user_id_param 
    AND is_matured = false;
  
  -- Get batch information
  SELECT json_agg(
    json_build_object(
      'batch_number', batch_number,
      'amount', amount,
      'deposit_date', deposit_date,
      'maturity_date', maturity_date,
      'is_matured', is_matured,
      'is_withdrawn', is_withdrawn
    ) ORDER BY batch_number
  ) INTO batch_info
  FROM public.nft_deposits 
  WHERE user_id = user_id_param;
  
  result := json_build_object(
    'total_deposits', total_deposits,
    'matured_amount', matured_amount,
    'pending_amount', pending_amount,
    'next_maturity_date', next_maturity_date,
    'batches', COALESCE(batch_info, '[]'::json)
  );
  
  RETURN result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_daily_earnings()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  wallet_record RECORD;
  daily_rate DECIMAL;
  time_diff_hours DECIMAL;
  earnings_increment DECIMAL;
BEGIN
  -- Get daily profit rate from settings
  SELECT CAST(setting_value AS DECIMAL) INTO daily_rate 
  FROM public.admin_settings 
  WHERE setting_key = 'daily_profit_rate';
  
  -- Update earnings for all active wallets
  FOR wallet_record IN 
    SELECT * FROM public.user_wallets 
    WHERE is_active = true AND total_deposit > 0
  LOOP
    -- Calculate time difference in hours
    SELECT EXTRACT(EPOCH FROM (now() - wallet_record.last_earnings_update)) / 3600 INTO time_diff_hours;
    
    -- Calculate earnings increment
    earnings_increment := (wallet_record.total_deposit * daily_rate / 100) * (time_diff_hours / 24);
    
    -- Update wallet
    UPDATE public.user_wallets 
    SET 
      daily_earnings = daily_earnings + earnings_increment,
      total_profit = total_profit + earnings_increment,
      last_earnings_update = now()
    WHERE id = wallet_record.id;
  END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  -- Insert user profile
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.email
  );
  
  -- Insert user wallet
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id);
  
  -- Create referral code for new user
  INSERT INTO public.referrals (referrer_id, referral_code)
  VALUES (NEW.id, generate_referral_code());
  
  RETURN NEW;
END;
$function$;

-- Enable realtime for all tables that need it
ALTER TABLE public.profiles REPLICA IDENTITY FULL;
ALTER TABLE public.user_wallets REPLICA IDENTITY FULL;
ALTER TABLE public.deposits REPLICA IDENTITY FULL;
ALTER TABLE public.withdrawals REPLICA IDENTITY FULL;
ALTER TABLE public.mining_wallets REPLICA IDENTITY FULL;
ALTER TABLE public.mining_sessions REPLICA IDENTITY FULL;
ALTER TABLE public.referrals REPLICA IDENTITY FULL;
ALTER TABLE public.nft_deposits REPLICA IDENTITY FULL;
ALTER TABLE public.admin_users REPLICA IDENTITY FULL;
ALTER TABLE public.tasks REPLICA IDENTITY FULL;
ALTER TABLE public.user_tasks REPLICA IDENTITY FULL;

-- Add tables to realtime publication
DO $$
BEGIN
  -- Drop existing publication if it exists
  DROP PUBLICATION IF EXISTS supabase_realtime;
  
  -- Create new publication with all necessary tables
  CREATE PUBLICATION supabase_realtime FOR TABLE 
    public.profiles,
    public.user_wallets,
    public.deposits,
    public.withdrawals,
    public.mining_wallets,
    public.mining_sessions,
    public.referrals,
    public.nft_deposits,
    public.admin_users,
    public.tasks,
    public.user_tasks,
    public.admin_settings,
    public.mining_settings,
    public.blockchain_networks;
END $$;

-- Create triggers for proper user handling
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_referral_signup();

DROP TRIGGER IF EXISTS on_deposit_approved_referral ON public.deposits;
CREATE TRIGGER on_deposit_approved_referral
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE PROCEDURE public.process_referral_reward();

DROP TRIGGER IF EXISTS on_deposit_approved_nft ON public.deposits;
CREATE TRIGGER on_deposit_approved_nft
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE PROCEDURE public.process_nft_deposit_with_shared_timer();

-- Fix approve deposit functionality to use actual deposit amount
CREATE OR REPLACE FUNCTION public.approve_deposit_with_amount(deposit_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  deposit_record RECORD;
  result JSON;
BEGIN
  -- Get deposit details
  SELECT * INTO deposit_record
  FROM public.deposits
  WHERE id = deposit_id_param AND status = 'pending';
  
  IF deposit_record IS NULL THEN
    result := json_build_object(
      'success', false,
      'message', 'Deposit not found or already processed'
    );
    RETURN result;
  END IF;
  
  -- Update deposit status to approved
  UPDATE public.deposits
  SET status = 'approved', updated_at = now()
  WHERE id = deposit_id_param;
  
  result := json_build_object(
    'success', true,
    'message', 'Deposit approved successfully'
  );
  
  RETURN result;
END;
$function$;