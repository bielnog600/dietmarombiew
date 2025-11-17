/*
  # Create storage bucket for profile photos
  
  1. Changes
    - Create storage bucket for profile photos
    - Set up storage policies for authenticated users
    - Configure bucket settings
  
  2. Security
    - Only authenticated users can upload to their own folder
    - Public read access for photos
*/

-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
SELECT 'profile-photos', 'profile-photos', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'profile-photos'
);

-- Update bucket settings
UPDATE storage.buckets
SET public = true,
    file_size_limit = 5242880, -- 5MB
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'profile-photos';

-- Create policies for storage objects
DO $$ 
BEGIN
  -- Upload policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can upload profile photos'
  ) THEN
    CREATE POLICY "Users can upload profile photos"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
      bucket_id = 'profile-photos' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;

  -- Read policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Public read access for profile photos'
  ) THEN
    CREATE POLICY "Public read access for profile photos"
    ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'profile-photos');
  END IF;

  -- Delete policy
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND schemaname = 'storage' 
    AND policyname = 'Users can delete their profile photos'
  ) THEN
    CREATE POLICY "Users can delete their profile photos"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
      bucket_id = 'profile-photos' AND
      auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;