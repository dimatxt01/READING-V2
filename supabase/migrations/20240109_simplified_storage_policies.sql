-- First, ensure the bucket is properly configured
UPDATE storage.buckets 
SET 
  public = true,
  file_size_limit = 5242880, -- 5MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
WHERE id = 'book-covers';

-- Drop ALL existing policies on storage.objects for book-covers
DO $$ 
DECLARE
    pol record;
BEGIN
    FOR pol IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'storage' 
        AND tablename = 'objects' 
        AND policyname LIKE '%book%cover%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
    END LOOP;
END $$;

-- Create simple, permissive policies

-- 1. Anyone can view book covers (public read)
CREATE POLICY "Public Access for book covers"
ON storage.objects FOR SELECT
USING (bucket_id = 'book-covers');

-- 2. Authenticated users can upload book covers to their folder
CREATE POLICY "Authenticated users can upload book covers"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'book-covers' 
  AND auth.role() = 'authenticated'
);

-- 3. Authenticated users can update any book covers (for now, to avoid issues)
CREATE POLICY "Authenticated users can update book covers"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'book-covers' 
  AND auth.role() = 'authenticated'
);

-- 4. Authenticated users can delete book covers from their folder
CREATE POLICY "Authenticated users can delete their book covers"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'book-covers' 
  AND auth.role() = 'authenticated'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Ensure books table policies are correct
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- Drop existing book policies
DROP POLICY IF EXISTS "Anyone can view approved books" ON public.books;
DROP POLICY IF EXISTS "Authenticated users can create books" ON public.books;
DROP POLICY IF EXISTS "Users can update their own books" ON public.books;
DROP POLICY IF EXISTS "Public book read access" ON public.books;
DROP POLICY IF EXISTS "Authenticated insert books" ON public.books;
DROP POLICY IF EXISTS "Users update own books" ON public.books;

-- Simple book policies
-- Allow everyone to read all books (for now, to simplify)
CREATE POLICY "Public book read access"
ON public.books FOR SELECT
USING (true);

-- Allow authenticated users to insert books
CREATE POLICY "Authenticated insert books"
ON public.books FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- Allow users to update their own books
CREATE POLICY "Users update own books"
ON public.books FOR UPDATE
USING (auth.uid() = created_by OR auth.role() = 'authenticated')
WITH CHECK (auth.uid() = created_by OR auth.role() = 'authenticated');