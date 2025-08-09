-- Create storage bucket for transaction screenshots
INSERT INTO storage.buckets (id, name, public) VALUES ('transaction-screenshots', 'transaction-screenshots', false);

-- Create storage policies for transaction screenshots
CREATE POLICY "Users can upload their own screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'transaction-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'transaction-screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins can view all screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'transaction-screenshots' AND is_current_user_admin());