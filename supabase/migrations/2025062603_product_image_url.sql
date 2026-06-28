-- Migration: 2025062603 - Add image_url to products, fix SKU handling
-- Adds image_url column to products table for direct product image storage

-- ============================================================
-- 1. ADD IMAGE_URL TO PRODUCTS
-- ============================================================

alter table public.products
add column if not exists image_url text;

-- ============================================================
-- 2. MAKE CATEGORY_ID NULLABLE FOR PRODUCTS
-- ============================================================

alter table public.products
alter column category_id drop not null;
