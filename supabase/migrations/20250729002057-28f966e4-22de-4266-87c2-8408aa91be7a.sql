-- Create admin users table for admin authentication
CREATE TABLE public.admin_users (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  role text NOT NULL DEFAULT 'admin',
  permissions jsonb DEFAULT '["dashboard", "users", "blockchain", "deposits", "content", "settings"]'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Admin users can only view their own record
CREATE POLICY "Admin users can view their own record" 
ON public.admin_users 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create user blocking functionality
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_blocked boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS blocked_at timestamp with time zone NULL,
ADD COLUMN IF NOT EXISTS blocked_by uuid NULL;

-- Create blockchain networks table
CREATE TABLE public.blockchain_networks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  network_type text NOT NULL,
  deposit_address text NOT NULL,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for blockchain networks
ALTER TABLE public.blockchain_networks ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view blockchain networks
CREATE POLICY "Anyone can view blockchain networks" 
ON public.blockchain_networks 
FOR SELECT 
USING (auth.role() = 'authenticated');

-- Add content management tables
CREATE TABLE public.nft_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE TABLE public.mining_token_images (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  image_url text NOT NULL,
  is_active boolean NOT NULL DEFAULT false,
  uploaded_by uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS for image tables
ALTER TABLE public.nft_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mining_token_images ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view active images
CREATE POLICY "Anyone can view active NFT images" 
ON public.nft_images 
FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

CREATE POLICY "Anyone can view active mining token images" 
ON public.mining_token_images 
FOR SELECT 
USING (auth.role() = 'authenticated' AND is_active = true);

-- Insert default blockchain networks
INSERT INTO public.blockchain_networks (name, network_type, deposit_address) VALUES
('BNB Chain', 'BEP-20', '0x1234567890abcdef1234567890abcdef12345678'),
('TRON', 'TRC20', 'TGHQjbAWL8wqb1234567890abcdef123456789');

-- Add admin dashboard statistics function
CREATE OR REPLACE FUNCTION public.get_admin_dashboard_stats()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id_param uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS(
    SELECT 1 FROM public.admin_users 
    WHERE user_id = user_id_param
  );
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_blockchain_networks_updated_at
  BEFORE UPDATE ON public.blockchain_networks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_nft_images_updated_at
  BEFORE UPDATE ON public.nft_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mining_token_images_updated_at
  BEFORE UPDATE ON public.mining_token_images
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();