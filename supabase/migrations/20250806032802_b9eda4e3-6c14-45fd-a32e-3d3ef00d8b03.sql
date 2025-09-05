-- Create function to transfer daily earnings to total profit
CREATE OR REPLACE FUNCTION transfer_daily_earnings()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql;

-- Create logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.logs (
  id SERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  message TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on logs table
ALTER TABLE public.logs ENABLE ROW LEVEL SECURITY;

-- Create policy for logs table (admin only)
CREATE POLICY "Admin can view logs" 
ON public.logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM admin_users 
    WHERE user_id = auth.uid()
  )
);

-- Create a scheduled job to run daily at midnight (this would need to be set up manually in production)
-- For now, we'll create a function that can be called manually by admin