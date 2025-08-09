-- Fix function search path security warnings
DROP FUNCTION IF EXISTS public.handle_new_user();
DROP FUNCTION IF EXISTS public.update_daily_earnings();
DROP FUNCTION IF EXISTS public.update_updated_at_column();

-- Create function to update timestamps with secure search path
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Create function to handle new user registration with secure search path
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER 
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO public.profiles (user_id, name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data ->> 'name',
    NEW.email
  );
  
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;

-- Create function to calculate daily earnings with secure search path
CREATE OR REPLACE FUNCTION public.update_daily_earnings()
RETURNS void 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
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
$$;