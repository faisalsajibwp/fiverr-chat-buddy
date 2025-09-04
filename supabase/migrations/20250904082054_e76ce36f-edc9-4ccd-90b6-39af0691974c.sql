-- Create storage bucket for screenshot uploads
INSERT INTO storage.buckets (id, name, public) VALUES ('screenshots', 'screenshots', false);

-- Create storage policies for screenshot uploads
CREATE POLICY "Users can upload their own screenshots" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own screenshots" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own screenshots" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'screenshots' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Add screenshot_url column to conversations table
ALTER TABLE conversations ADD COLUMN screenshot_url TEXT;