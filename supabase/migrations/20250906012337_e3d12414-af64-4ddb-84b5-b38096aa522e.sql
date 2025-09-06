-- Fix the double deposit issue by dropping all triggers first, then recreating

-- Drop all existing triggers that depend on the function
DROP TRIGGER IF EXISTS process_nft_deposit_trigger ON public.deposits;
DROP TRIGGER IF EXISTS on_deposit_approved_nft_shared_timer ON public.deposits;
DROP TRIGGER IF EXISTS on_deposit_approved_nft ON public.deposits;

-- Now drop the function safely
DROP FUNCTION IF EXISTS public.process_nft_deposit_with_shared_timer() CASCADE;

-- Recreate the function with proper logic to prevent double entries
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
  existing_nft_deposit UUID;
BEGIN
  -- Only process when deposit status changes to 'approved' and prevent double processing
  IF NEW.status = 'approved' AND (OLD.status != 'approved' OR OLD.status IS NULL) THEN
    
    -- Check if NFT deposit already exists for this deposit_id to prevent duplicates
    SELECT id INTO existing_nft_deposit
    FROM public.nft_deposits 
    WHERE deposit_id = NEW.id;
    
    -- If NFT deposit already exists, skip processing
    IF existing_nft_deposit IS NOT NULL THEN
      RETURN NEW;
    END IF;
    
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
        NEW.amount,  -- Use exact deposit amount
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
    
    -- Create SINGLE NFT deposit record - no duplicates
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

-- Create only ONE trigger - this will prevent double execution
CREATE TRIGGER on_deposit_approved_nft_shared_timer
  AFTER UPDATE ON public.deposits
  FOR EACH ROW
  EXECUTE FUNCTION public.process_nft_deposit_with_shared_timer();

-- Clean up existing duplicate NFT deposits
-- Keep only the first NFT deposit for each deposit_id
DELETE FROM public.nft_deposits 
WHERE id NOT IN (
  SELECT DISTINCT ON (deposit_id) id 
  FROM public.nft_deposits 
  ORDER BY deposit_id, created_at ASC
);

-- Recalculate user wallet total_deposit based on actual NFT deposits
UPDATE public.user_wallets 
SET total_deposit = (
  SELECT COALESCE(SUM(amount), 0) 
  FROM public.nft_deposits 
  WHERE user_id = user_wallets.user_id AND is_withdrawn = false
);