-- Migration: 2025062604 - Add accepted status to order_status enum for courier workflow
-- Adds accepted state between assigned and picked_up

-- ============================================================
-- 1. ADD ACCEPTED TO ORDER STATUS
-- ============================================================

alter type order_status add value if not exists 'accepted';
