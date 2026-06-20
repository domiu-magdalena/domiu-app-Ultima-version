-- Migration: 2025062103_storage_buckets
-- Description: Create storage buckets for file uploads

-- ============================================================
-- Helper: create bucket if not exists
-- ============================================================
do $$
begin
  -- business-logos
  if not exists (select 1 from storage.buckets where id = 'business-logos') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('business-logos', 'business-logos', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']);
  end if;

  -- business-banners
  if not exists (select 1 from storage.buckets where id = 'business-banners') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('business-banners', 'business-banners', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);
  end if;

  -- product-images
  if not exists (select 1 from storage.buckets where id = 'product-images') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('product-images', 'product-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);
  end if;

  -- user-avatars
  if not exists (select 1 from storage.buckets where id = 'user-avatars') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('user-avatars', 'user-avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']);
  end if;

  -- chat-files
  if not exists (select 1 from storage.buckets where id = 'chat-files') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('chat-files', 'chat-files', false, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'application/pdf']);
  end if;

  -- ratings-images
  if not exists (select 1 from storage.buckets where id = 'ratings-images') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('ratings-images', 'ratings-images', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);
  end if;

  -- promotions
  if not exists (select 1 from storage.buckets where id = 'promotions') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('promotions', 'promotions', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);
  end if;

  -- categories
  if not exists (select 1 from storage.buckets where id = 'categories') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('categories', 'categories', true, 5242880, array['image/png', 'image/jpeg', 'image/webp']);
  end if;
end $$;

-- ============================================================
-- Storage Policies
-- ============================================================

-- Business owners can upload to their own business folders
DROP POLICY IF EXISTS "Business owners can upload logos" ON storage.objects;
CREATE POLICY "Business owners can upload logos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-logos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Business owners can upload banners" ON storage.objects;
CREATE POLICY "Business owners can upload banners"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'business-banners'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Product images: business owners can upload
DROP POLICY IF EXISTS "Business owners can upload product images" ON storage.objects;
CREATE POLICY "Business owners can upload product images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'product-images'
    AND auth.role() = 'authenticated'
  );

-- User avatars: authenticated users can upload own avatar
DROP POLICY IF EXISTS "Users can upload own avatar" ON storage.objects;
CREATE POLICY "Users can upload own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'user-avatars'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Chat files: chat participants can upload
DROP POLICY IF EXISTS "Chat participants can upload files" ON storage.objects;
CREATE POLICY "Chat participants can upload files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-files'
    AND auth.role() = 'authenticated'
  );

-- Ratings images: authenticated users can upload
DROP POLICY IF EXISTS "Users can upload rating images" ON storage.objects;
CREATE POLICY "Users can upload rating images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'ratings-images'
    AND auth.role() = 'authenticated'
  );

-- Promotions: admins can upload
DROP POLICY IF EXISTS "Admins can upload promotions" ON storage.objects;
CREATE POLICY "Admins can upload promotions"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'promotions'
    AND public.is_admin()
  );

-- Category images: admins can upload
DROP POLICY IF EXISTS "Admins can upload category images" ON storage.objects;
CREATE POLICY "Admins can upload category images"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'categories'
    AND public.is_admin()
  );

-- Public read access for public buckets
DROP POLICY IF EXISTS "Public read business logos" ON storage.objects;
CREATE POLICY "Public read business logos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-logos');

DROP POLICY IF EXISTS "Public read business banners" ON storage.objects;
CREATE POLICY "Public read business banners"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'business-banners');

DROP POLICY IF EXISTS "Public read product images" ON storage.objects;
CREATE POLICY "Public read product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "Public read user avatars" ON storage.objects;
CREATE POLICY "Public read user avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'user-avatars');

DROP POLICY IF EXISTS "Public read ratings images" ON storage.objects;
CREATE POLICY "Public read ratings images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ratings-images');

DROP POLICY IF EXISTS "Public read promotions" ON storage.objects;
CREATE POLICY "Public read promotions"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'promotions');

DROP POLICY IF EXISTS "Public read category images" ON storage.objects;
CREATE POLICY "Public read category images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'categories');

-- Chat files: participants can read
DROP POLICY IF EXISTS "Chat participants can read files" ON storage.objects;
CREATE POLICY "Chat participants can read files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-files'
    AND auth.role() = 'authenticated'
  );

-- Owners can delete their own files
DROP POLICY IF EXISTS "Owners can delete own storage objects" ON storage.objects;
CREATE POLICY "Owners can delete own storage objects"
  ON storage.objects FOR DELETE
  USING (
    bucket_id IN ('business-logos', 'business-banners', 'product-images', 'user-avatars', 'ratings-images')
    AND auth.role() = 'authenticated'
    AND owner = auth.uid()
  );
