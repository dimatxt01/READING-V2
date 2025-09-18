-- Update bucket settings to ensure it's public
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'book-covers';

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view book covers" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload book covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own book covers" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own book covers" ON storage.objects;

-- Create storage policies for book-covers bucket

-- Allow anyone to view book covers (since they're public)
CREATE POLICY "Anyone can view book covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');

-- Allow authenticated users to upload book covers
CREATE POLICY "Authenticated users can upload book covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-covers' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update their own book covers
CREATE POLICY "Users can update their own book covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-covers' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'book-covers'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to delete their own book covers
CREATE POLICY "Users can delete their own book covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-covers' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Also ensure the books table has proper RLS policies for the created_by field
-- Enable RLS on books table if not already enabled
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Anyone can view approved books" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can create books" ON public.books;
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;

-- Allow anyone to view approved books or books they created
CREATE POLICY "Anyone can view approved books"
ON public.books FOR SELECT
USING (status = 'approved' OR auth.uid() = created_by);

-- Allow authenticated users to create books
CREATE POLICY "Authenticated users can create books"
ON public.books FOR INSERT
WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = created_by);

-- Allow users to update their own books
CREATE POLICY "Users can update their own books"
ON public.books FOR UPDATE
USING (auth.uid() = created_by)
WITH CHECK (auth.uid() = created_by);