-- Create leaderboard functions for privacy-aware rankings

-- Function to get leaderboard with privacy filtering
CREATE OR REPLACE FUNCTION get_leaderboard_with_privacy(
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  limit_count INTEGER DEFAULT 10
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  total_pages INTEGER,
  total_time INTEGER,
  session_count INTEGER,
  avg_speed NUMERIC,
  rank INTEGER,
  subscription_tier TEXT,
  privacy_settings JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      rs.user_id,
      SUM(rs.pages_read) as total_pages,
      SUM(rs.time_spent) as total_time,
      COUNT(*) as session_count,
      ROUND(AVG(rs.reading_speed), 1) as avg_speed
    FROM reading_submissions rs
    WHERE rs.submission_date >= start_date::DATE 
      AND rs.submission_date <= end_date::DATE
    GROUP BY rs.user_id
    HAVING SUM(rs.pages_read) > 0
  ),
  ranked_users AS (
    SELECT 
      us.*,
      p.full_name,
      COALESCE(p.full_name, 'Reader ' || substring(us.user_id::text, 1, 8)) as display_name,
      p.avatar_url,
      p.subscription_tier,
      p.privacy_settings,
      ROW_NUMBER() OVER (ORDER BY us.total_pages DESC, us.total_time DESC) as user_rank
    FROM user_stats us
    JOIN profiles p ON p.id = us.user_id
    WHERE 
      -- Only include users who want to be on leaderboard
      p.subscription_tier != 'free'
      AND (p.privacy_settings->>'leaderboard' IS NULL 
           OR (p.privacy_settings->'leaderboard'->>'showOnLeaderboard')::boolean IS NOT FALSE)
  )
  SELECT 
    ru.user_id,
    CASE 
      WHEN ru.privacy_settings->'profile'->>'showFullName' = 'false' THEN NULL
      ELSE ru.full_name 
    END as full_name,
    ru.display_name,
    CASE 
      WHEN ru.privacy_settings->'profile'->>'showAvatar' = 'false' THEN NULL
      ELSE ru.avatar_url 
    END as avatar_url,
    ru.total_pages::INTEGER,
    ru.total_time::INTEGER,
    ru.session_count::INTEGER,
    ru.avg_speed,
    ru.user_rank::INTEGER as rank,
    ru.subscription_tier,
    ru.privacy_settings
  FROM ranked_users ru
  WHERE ru.user_rank <= limit_count
  ORDER BY ru.user_rank;
END;
$$;

-- Function to get specific user's leaderboard rank
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(
  target_user_id UUID,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE
)
RETURNS TABLE (
  user_id UUID,
  full_name TEXT,
  display_name TEXT,
  avatar_url TEXT,
  total_pages INTEGER,
  total_time INTEGER,
  session_count INTEGER,
  avg_speed NUMERIC,
  rank INTEGER,
  subscription_tier TEXT,
  privacy_settings JSONB
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  WITH user_stats AS (
    SELECT 
      rs.user_id,
      SUM(rs.pages_read) as total_pages,
      SUM(rs.time_spent) as total_time,
      COUNT(*) as session_count,
      ROUND(AVG(rs.reading_speed), 1) as avg_speed
    FROM reading_submissions rs
    WHERE rs.submission_date >= start_date::DATE 
      AND rs.submission_date <= end_date::DATE
    GROUP BY rs.user_id
    HAVING SUM(rs.pages_read) > 0
  ),
  ranked_users AS (
    SELECT 
      us.*,
      p.full_name,
      COALESCE(p.full_name, 'Reader ' || substring(us.user_id::text, 1, 8)) as display_name,
      p.avatar_url,
      p.subscription_tier,
      p.privacy_settings,
      ROW_NUMBER() OVER (ORDER BY us.total_pages DESC, us.total_time DESC) as user_rank
    FROM user_stats us
    JOIN profiles p ON p.id = us.user_id
    WHERE 
      -- Only rank among users who want to be on leaderboard
      p.subscription_tier != 'free'
      AND (p.privacy_settings->>'leaderboard' IS NULL 
           OR (p.privacy_settings->'leaderboard'->>'showOnLeaderboard')::boolean IS NOT FALSE)
  )
  SELECT 
    ru.user_id,
    CASE 
      WHEN ru.privacy_settings->'profile'->>'showFullName' = 'false' THEN NULL
      ELSE ru.full_name 
    END as full_name,
    ru.display_name,
    CASE 
      WHEN ru.privacy_settings->'profile'->>'showAvatar' = 'false' THEN NULL
      ELSE ru.avatar_url 
    END as avatar_url,
    ru.total_pages::INTEGER,
    ru.total_time::INTEGER,
    ru.session_count::INTEGER,
    ru.avg_speed,
    ru.user_rank::INTEGER as rank,
    ru.subscription_tier,
    ru.privacy_settings
  FROM ranked_users ru
  WHERE ru.user_id = target_user_id;
END;
$$;

-- Create materialized view for faster leaderboard queries (optional optimization)
CREATE MATERIALIZED VIEW IF NOT EXISTS leaderboard_cache AS
SELECT 
  rs.user_id,
  DATE_TRUNC('day', rs.submission_date) as day,
  SUM(rs.pages_read) as daily_pages,
  SUM(rs.time_spent) as daily_time,
  COUNT(*) as session_count,
  AVG(rs.reading_speed) as avg_speed
FROM reading_submissions rs
WHERE rs.submission_date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY rs.user_id, DATE_TRUNC('day', rs.submission_date);

-- Create unique index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_leaderboard_cache_user_day 
ON leaderboard_cache(user_id, day);

-- Function to refresh leaderboard cache
CREATE OR REPLACE FUNCTION refresh_leaderboard_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard_cache;
END;
$$;

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION get_leaderboard_with_privacy(TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_leaderboard_rank(UUID, TIMESTAMP WITH TIME ZONE, TIMESTAMP WITH TIME ZONE) TO authenticated;
GRANT EXECUTE ON FUNCTION refresh_leaderboard_cache() TO authenticated;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_reading_submissions_user_date 
ON reading_submissions(user_id, submission_date);

CREATE INDEX IF NOT EXISTS idx_reading_submissions_date_pages 
ON reading_submissions(submission_date, pages_read);

CREATE INDEX IF NOT EXISTS idx_profiles_subscription_privacy 
ON profiles(subscription_tier, privacy_settings);

-- Comments for documentation
COMMENT ON FUNCTION get_leaderboard_with_privacy IS 'Returns privacy-filtered leaderboard for a given time range';
COMMENT ON FUNCTION get_user_leaderboard_rank IS 'Returns specific user rank and stats for leaderboard';
COMMENT ON FUNCTION refresh_leaderboard_cache IS 'Refreshes materialized view for leaderboard performance';

-- Set up periodic refresh of materialized view (runs every hour)
-- This would typically be set up as a cron job or scheduled function