-- Backfill reading_submissions from profiles.total_pages_read
-- This creates historical reading records so the progress chart works

-- First, check if we need a default book_id
DO $$
DECLARE
  default_book_id uuid;
BEGIN
  -- Get the first book ID from the books table, or create a placeholder
  SELECT id INTO default_book_id FROM books LIMIT 1;

  IF default_book_id IS NULL THEN
    -- Create a placeholder book if none exists
    INSERT INTO books (title, author, isbn, page_count, created_at, updated_at)
    VALUES ('General Reading', 'Various', 'N/A', 1000, NOW(), NOW())
    RETURNING id INTO default_book_id;
  END IF;

  -- Backfill reading submissions for users with total_pages_read > 0
  -- We'll spread their pages across the last 30 days
  INSERT INTO reading_submissions (
    user_id,
    book_id,
    pages_read,
    time_spent,
    submission_date,
    session_timestamp,
    created_at
  )
  SELECT
    p.id as user_id,
    default_book_id as book_id,
    -- Distribute pages across 30 days (divide total by 30, round up)
    CEIL(p.total_pages_read::numeric / 30) as pages_read,
    -- Assume 1 minute per page reading time
    CEIL(p.total_pages_read::numeric / 30) as time_spent,
    -- Create entries for each of the last 30 days
    (CURRENT_DATE - (day_offset || ' days')::interval)::date as submission_date,
    (CURRENT_DATE - (day_offset || ' days')::interval) as session_timestamp,
    NOW() as created_at
  FROM profiles p
  CROSS JOIN generate_series(0, 29) as day_offset
  WHERE p.total_pages_read > 0
    AND day_offset < LEAST(30, CEIL(p.total_pages_read::numeric / 10)); -- Don't create more days than needed

END $$;

-- Add a comment
COMMENT ON TABLE reading_submissions IS 'Reading submissions - backfilled from profile counters on 2025-01-18';
