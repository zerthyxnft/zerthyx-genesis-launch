-- Add new columns to track deposit batches and shared maturity dates
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS deposit_batch_count INTEGER DEFAULT 0;
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS first_deposit_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.user_wallets ADD COLUMN IF NOT EXISTS latest_deposit_date TIMESTAMP WITH TIME ZONE;

-- Add new table to track individual deposits with their batch information
CREATE TABLE IF NOT EXISTS public.nft_deposits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    deposit_id UUID NOT NULL REFERENCES public.deposits(id),
    amount NUMERIC NOT NULL,
    deposit_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    batch_number INTEGER NOT NULL,
    maturity_date TIMESTAMP WITH TIME ZONE NOT NULL,
    is_matured BOOLEAN DEFAULT false,
    is_withdrawn BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.nft_deposits ENABLE ROW LEVEL SECURITY;

-- Create policies for nft_deposits
CREATE POLICY "Users can view their own NFT deposits" 
ON public.nft_deposits 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own NFT deposits" 
ON public.nft_deposits 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own NFT deposits" 
ON public.nft_deposits 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create function to handle NFT deposit logic with shared timers
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

-- Create trigger for processing NFT deposits with shared timers
CREATE TRIGGER on_deposit_approved_nft_shared_timer
  AFTER UPDATE ON public.deposits
  FOR EACH ROW 
  EXECUTE FUNCTION public.process_nft_deposit_with_shared_timer();

-- Create function to handle NFT maturity and selective withdrawals
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