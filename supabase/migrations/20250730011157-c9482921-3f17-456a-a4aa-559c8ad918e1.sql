-- Add admin user with email zerthyx.nft@gmail.com
-- First, we need to get the user_id for this email from auth.users
-- Since we can't directly query auth.users, we'll create a function to add admin users by email

CREATE OR REPLACE FUNCTION public.add_admin_by_email(admin_email text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_record RECORD;
  result json;
BEGIN
  -- Get user by email from profiles table
  SELECT * INTO user_record
  FROM public.profiles 
  WHERE email = admin_email
  LIMIT 1;
  
  IF user_record IS NULL THEN
    result := json_build_object(
      'success', false,
      'message', 'User not found with this email'
    );
    RETURN result;
  END IF;
  
  -- Check if already admin
  IF EXISTS(SELECT 1 FROM public.admin_users WHERE user_id = user_record.user_id) THEN
    result := json_build_object(
      'success', false,
      'message', 'User is already an admin'
    );
    RETURN result;
  END IF;
  
  -- Add as admin
  INSERT INTO public.admin_users (user_id, role, permissions)
  VALUES (
    user_record.user_id,
    'super_admin',
    '["dashboard", "users", "blockchain", "deposits", "content", "settings"]'::jsonb
  );
  
  result := json_build_object(
    'success', true,
    'message', 'Admin user added successfully'
  );
  
  RETURN result;
END;
$$;

-- Execute the function to add the admin user
SELECT public.add_admin_by_email('zerthyx.nft@gmail.com');