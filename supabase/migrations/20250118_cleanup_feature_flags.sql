-- Migration: Cleanup feature flags system
-- The feature flags code was deleted but table remained
-- This migration removes the orphaned database table

DROP TABLE IF EXISTS feature_flags CASCADE;
