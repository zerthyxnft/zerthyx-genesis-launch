-- Create user profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user wallets table
CREATE TABLE public.user_wallets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_deposit DECIMAL(15,2) DEFAULT 0,
  total_profit DECIMAL(15,2) DEFAULT 0,
  daily_earnings DECIMAL(15,2) DEFAULT 0,
  last_earnings_update TIMESTAMP WITH TIME ZONE DEFAULT now(),
  nft_maturity_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deposits table
CREATE TABLE public.deposits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  blockchain TEXT NOT NULL,
  transaction_screenshot TEXT,
  deposit_address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(15,2) NOT NULL,
  wallet_address TEXT NOT NULL,
  blockchain TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create admin settings table
CREATE TABLE public.admin_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default admin settings
INSERT INTO public.admin_settings (setting_key, setting_value) VALUES 
('deposit_address_trc20', 'TRC20_ADDRESS_HERE'),
('deposit_address_bep20', 'BEP20_ADDRESS_HERE'),
('daily_profit_rate', '2.2'),
('maturity_days', '45'),
('min_withdrawal', '5'),
('max_withdrawal', '100000');

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for wallets
CREATE POLICY "Users can view their own wallet" ON public.user_wallets
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own wallet" ON public.user_wallets
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own wallet" ON public.user_wallets
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for deposits
CREATE POLICY "Users can view their own deposits" ON public.deposits
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own deposits" ON public.deposits
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for withdrawals
CREATE POLICY "Users can view their own withdrawals" ON public.withdrawals
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own withdrawals" ON public.withdrawals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create RLS policies for admin settings (readable by all authenticated users)
CREATE POLICY "Anyone can view admin settings" ON public.admin_settings
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_wallets_updated_at
  BEFORE UPDATE ON public.user_wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_deposits_updated_at
  BEFORE UPDATE ON public.deposits
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawals_updated_at
  BEFORE UPDATE ON public.withdrawals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_admin_settings_updated_at
  BEFORE UPDATE ON public.admin_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to handle new user registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to calculate daily earnings
CREATE OR REPLACE FUNCTION public.update_daily_earnings()
RETURNS void AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;