-- Remove ALL privacy settings functionality
-- Make all user data publicly available
-- Drop privacy_settings column and all related logic

-- Step 1: Drop existing leaderboard functions (we'll recreate without privacy)
DROP FUNCTION IF EXISTS get_leaderboard_with_privacy(timestamp with time zone, timestamp with time zone, integer);
DROP FUNCTION IF EXISTS get_user_leaderboard_rank(uuid, timestamp with time zone, timestamp with time zone);

-- Step 2: Remove privacy_settings column from profiles
ALTER TABLE profiles DROP COLUMN IF EXISTS privacy_settings CASCADE;

-- Step 3: Recreate leaderboard function WITHOUT privacy filtering
CREATE OR REPLACE FUNCTION get_leaderboard_with_privacy(
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  limit_count integer DEFAULT 10
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  display_name text,
  avatar_url text,
  total_pages integer,
  total_time integer,
  session_count integer,
  avg_speed numeric,
  rank integer,
  subscription_tier text,
  privacy_settings jsonb
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
      CASE
        WHEN SUM(rs.time_spent) > 0 THEN
          ROUND((SUM(rs.pages_read)::numeric / SUM(rs.time_spent)::numeric) * 60, 1)
        ELSE 0
      END as avg_speed
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
      ROW_NUMBER() OVER (ORDER BY us.total_pages DESC, us.total_time DESC) as user_rank
    FROM user_stats us
    JOIN profiles p ON p.id = us.user_id
    -- NO PRIVACY FILTERING - ALL USERS INCLUDED
  )
  SELECT
    ru.user_id,
    ru.full_name,  -- Always show full name
    ru.display_name,
    ru.avatar_url,  -- Always show avatar
    ru.total_pages::INTEGER,
    ru.total_time::INTEGER,
    ru.session_count::INTEGER,
    ru.avg_speed,
    ru.user_rank::INTEGER as rank,
    ru.subscription_tier,
    NULL::jsonb as privacy_settings  -- Return null for backward compatibility
  FROM ranked_users ru
  WHERE
    CASE
      WHEN limit_count <= 0 THEN true
      ELSE ru.user_rank <= limit_count
    END
  ORDER BY ru.user_rank;
END;
$$;

-- Step 4: Recreate user rank function WITHOUT privacy filtering
CREATE OR REPLACE FUNCTION get_user_leaderboard_rank(
  target_user_id uuid,
  start_date timestamp with time zone,
  end_date timestamp with time zone
)
RETURNS TABLE(
  user_id uuid,
  full_name text,
  display_name text,
  avatar_url text,
  total_pages integer,
  total_time integer,
  session_count integer,
  avg_speed numeric,
  rank integer,
  subscription_tier text,
  privacy_settings jsonb
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
      CASE
        WHEN SUM(rs.time_spent) > 0 THEN
          ROUND((SUM(rs.pages_read)::numeric / SUM(rs.time_spent)::numeric) * 60, 1)
        ELSE 0
      END as avg_speed
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
      ROW_NUMBER() OVER (ORDER BY us.total_pages DESC, us.total_time DESC) as user_rank
    FROM user_stats us
    JOIN profiles p ON p.id = us.user_id
    -- NO PRIVACY FILTERING - ALL USERS INCLUDED
  )
  SELECT
    ru.user_id,
    ru.full_name,  -- Always show full name
    ru.display_name,
    ru.avatar_url,  -- Always show avatar
    ru.total_pages::INTEGER,
    ru.total_time::INTEGER,
    ru.session_count::INTEGER,
    ru.avg_speed,
    ru.user_rank::INTEGER as rank,
    ru.subscription_tier,
    NULL::jsonb as privacy_settings  -- Return null for backward compatibility
  FROM ranked_users ru
  WHERE ru.user_id = target_user_id;
END;
$$;

-- Step 5: Drop privacy-related indexes
DROP INDEX IF EXISTS idx_profiles_activity_visible;

-- Add comments
COMMENT ON FUNCTION get_leaderboard_with_privacy IS 'Returns leaderboard data for all users. Privacy settings removed - all data is public.';
COMMENT ON FUNCTION get_user_leaderboard_rank IS 'Returns user rank calculated against all users. Privacy settings removed - all data is public.';
COMMENT ON TABLE profiles IS 'User profiles - all data is now public';
