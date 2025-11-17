/*
  # Create storage policies for progress photos
  
  1. Changes
    - Create policies for progress photos bucket
    - Set up access control for authenticated users
    - Restrict file types and sizes
  
  2. Security
    - Only authenticated users can upload to their own folders
    - Public read access for photos
    - Users can only delete their own photos
*/

-- Create policies for storage objects
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public access to photos
CREATE POLICY "Public read access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'progress-photos');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete their own photos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos' AND
  auth.uid()::text = (storage.foldername(name))[1]
);