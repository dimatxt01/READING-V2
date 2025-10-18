-- Migration: Add Performance Indexes
-- Adds critical indexes for frequently queried columns to improve performance

-- Reading submissions indexes for user/book queries
CREATE INDEX IF NOT EXISTS idx_reading_submissions_user_book
ON reading_submissions(user_id, book_id);

-- Reading submissions index for recent activity queries
CREATE INDEX IF NOT EXISTS idx_reading_submissions_created
ON reading_submissions(created_at DESC);

-- Book reviews index for book detail pages
CREATE INDEX IF NOT EXISTS idx_book_reviews_book_id
ON book_reviews(book_id);

-- Assessment results index for user history
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_created
ON assessment_results(user_id, created_at DESC);

-- Privacy settings index for activity visibility filtering
-- Only index profiles with visible activity
CREATE INDEX IF NOT EXISTS idx_profiles_activity_visible
ON profiles((privacy_settings->'activity'->>'showReadingHistory'))
WHERE (privacy_settings->'activity'->>'showReadingHistory')::boolean = true;

-- Book reader counts materialized view for performance
CREATE MATERIALIZED VIEW IF NOT EXISTS book_reader_counts AS
SELECT
  book_id,
  COUNT(DISTINCT user_id) as unique_readers,
  COUNT(*) as total_submissions,
  MAX(created_at) as last_activity
FROM reading_submissions
GROUP BY book_id;

CREATE UNIQUE INDEX IF NOT EXISTS idx_book_reader_counts_book_id
ON book_reader_counts(book_id);

-- Function to refresh book counts
CREATE OR REPLACE FUNCTION refresh_book_counts()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY book_reader_counts;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to refresh on reading submission changes
DROP TRIGGER IF EXISTS refresh_book_counts_on_submission ON reading_submissions;
CREATE TRIGGER refresh_book_counts_on_submission
AFTER INSERT OR UPDATE OR DELETE ON reading_submissions
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_book_counts();
