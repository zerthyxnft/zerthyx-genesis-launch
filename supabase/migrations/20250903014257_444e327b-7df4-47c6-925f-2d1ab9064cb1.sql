-- Update handle_new_user function to create referral code
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Update handle_referral_signup function to properly handle referrals
CREATE OR REPLACE FUNCTION public.handle_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Update process_referral_reward function for automatic $1 USDT reward
CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create trigger for referral signup (if not exists)
DROP TRIGGER IF EXISTS on_auth_user_created_referral ON auth.users;
CREATE TRIGGER on_auth_user_created_referral
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_referral_signup();

-- Create trigger for referral reward processing (if not exists)  
DROP TRIGGER IF EXISTS on_deposit_approved_referral ON public.deposits;
CREATE TRIGGER on_deposit_approved_referral
  AFTER UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.process_referral_reward();