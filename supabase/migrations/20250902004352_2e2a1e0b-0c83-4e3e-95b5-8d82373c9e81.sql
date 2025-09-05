-- Create function to handle selective NFT withdrawals
CREATE OR REPLACE FUNCTION public.process_nft_withdrawal(
  user_id_param UUID,
  amount_param NUMERIC
)
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

-- Create function to get NFT deposit summary for a user
CREATE OR REPLACE FUNCTION public.get_nft_deposit_summary(user_id_param UUID)
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