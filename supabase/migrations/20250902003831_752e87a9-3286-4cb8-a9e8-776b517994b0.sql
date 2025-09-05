-- Create trigger to handle referral on new user signup
CREATE OR REPLACE FUNCTION public.handle_referral_signup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  referral_code_param TEXT;
  referrer_user_id UUID;
BEGIN
  -- Get referral code from URL parameter (stored in user metadata)
  referral_code_param := NEW.raw_user_meta_data ->> 'referral_code';
  
  IF referral_code_param IS NOT NULL THEN
    -- Find the referrer
    SELECT referrer_id INTO referrer_user_id 
    FROM public.referrals 
    WHERE referral_code = referral_code_param 
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

-- Create trigger for referral signup
CREATE TRIGGER on_auth_user_referral_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW 
  EXECUTE FUNCTION public.handle_referral_signup();

-- Create function to process referral rewards when deposit is approved
CREATE OR REPLACE FUNCTION public.process_referral_reward()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  referral_record RECORD;
  reward_amount NUMERIC := 1.0; -- $1 reward
BEGIN
  -- Only process when deposit status changes to 'approved'
  IF NEW.status = 'approved' AND OLD.status != 'approved' THEN
    -- Check if this user was referred and if deposit is >= $50
    SELECT * INTO referral_record
    FROM public.referrals 
    WHERE referred_id = NEW.user_id 
      AND status = 'signed_up'
      AND NEW.amount >= 50;
    
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
      
      -- Add reward to referrer's wallet
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
        'रेफ़र बोनस - Referral bonus for successful referral'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create trigger for processing referral rewards on deposit approval
CREATE TRIGGER on_deposit_approved_referral_reward
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW 
  EXECUTE FUNCTION public.process_referral_reward();