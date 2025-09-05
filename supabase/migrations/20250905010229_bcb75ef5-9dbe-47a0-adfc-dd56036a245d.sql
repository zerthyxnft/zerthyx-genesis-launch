-- Fix the double deposit issue by updating the approve_deposit_with_amount function
CREATE OR REPLACE FUNCTION public.approve_deposit_with_amount(deposit_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
  
  -- Note: The NFT deposit processing is handled by the trigger process_nft_deposit_with_shared_timer
  -- which only adds the exact deposit amount, not double
  
  result := json_build_object(
    'success', true,
    'message', 'Deposit approved successfully'
  );
  
  RETURN result;
END;
$function$;

-- Update the NFT deposit trigger to ensure no double processing
CREATE OR REPLACE FUNCTION public.process_nft_deposit_with_shared_timer()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  user_wallet RECORD;
  batch_number INTEGER;
  maturity_date TIMESTAMP WITH TIME ZONE;
  days_lock_period INTEGER := 45;
BEGIN
  -- Only process when deposit status changes to 'approved' and prevent double processing
  IF NEW.status = 'approved' AND (OLD.status != 'approved' OR OLD.status IS NULL) THEN
    
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
        NEW.amount,  -- Use exact deposit amount, not double
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
        total_deposit = total_deposit + NEW.amount,  -- Add exact amount only
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
        total_deposit = total_deposit + NEW.amount,  -- Add exact amount only
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
      NEW.amount,  -- Use exact amount
      now(),
      batch_number,
      maturity_date
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Disable the referral trigger temporarily and create manual management
DROP TRIGGER IF EXISTS process_referral_reward_trigger ON public.deposits;

-- Create a function to manually add referral rewards
CREATE OR REPLACE FUNCTION public.add_referral_reward(referrer_user_id uuid, referred_user_id uuid, reward_amount numeric DEFAULT 1.0)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  referral_record RECORD;
  result JSON;
BEGIN
  -- Check if referral exists
  SELECT * INTO referral_record
  FROM public.referrals 
  WHERE referrer_id = referrer_user_id 
    AND referred_id = referred_user_id;
  
  IF referral_record IS NULL THEN
    result := json_build_object(
      'success', false,
      'message', 'Referral relationship not found'
    );
    RETURN result;
  END IF;
  
  -- Check if reward already paid
  IF referral_record.reward_paid = true THEN
    result := json_build_object(
      'success', false,
      'message', 'Reward already paid for this referral'
    );
    RETURN result;
  END IF;
  
  -- Update referral status
  UPDATE public.referrals 
  SET 
    status = 'qualified',
    qualification_date = now(),
    qualification_amount = reward_amount,
    reward_amount = reward_amount,
    reward_paid = true
  WHERE id = referral_record.id;
  
  -- Add reward to referrer's wallet total_profit
  UPDATE public.user_wallets 
  SET 
    total_profit = total_profit + reward_amount,
    updated_at = now()
  WHERE user_id = referrer_user_id;
  
  -- Create a deposit record for the referral bonus
  INSERT INTO public.deposits (
    user_id,
    amount,
    status,
    blockchain,
    deposit_address,
    admin_notes
  ) VALUES (
    referrer_user_id,
    reward_amount,
    'approved',
    'USDT',
    'referral_bonus',
    'Referral reward for successful referral'
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Referral reward added successfully'
  );
  
  RETURN result;
END;
$function$;