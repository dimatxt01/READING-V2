-- Migration: Assessment Tracking and Subscription Management Updates
-- Date: 2025-01-16
-- Description: Adds comprehensive assessment tracking, statistics, and subscription tier management

-- 1. Update assessment_results table with attempt tracking
ALTER TABLE assessment_results 
ADD COLUMN IF NOT EXISTS attempt_number INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS session_id UUID,
ADD COLUMN IF NOT EXISTS comparison_percentile INTEGER;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_assessment_results_user_attempts 
ON assessment_results(user_id, assessment_id, attempt_number);

CREATE INDEX IF NOT EXISTS idx_assessment_results_session 
ON assessment_results(session_id);

-- 2. Create user assessment statistics table
CREATE TABLE IF NOT EXISTS user_assessment_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  total_assessments_taken INTEGER DEFAULT 0,
  average_wpm INTEGER,
  average_comprehension NUMERIC(5,2),
  last_assessment_id UUID REFERENCES assessment_texts(id),
  last_assessment_date TIMESTAMP,
  last_assessment_wpm INTEGER,
  last_assessment_comprehension NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id)
);

-- 3. Create subscription tier limits table
CREATE TABLE IF NOT EXISTS subscription_tier_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_name TEXT NOT NULL UNIQUE,
  monthly_assessment_limit INTEGER NOT NULL,
  daily_assessment_limit INTEGER,
  features JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Insert default tier limits
INSERT INTO subscription_tier_limits (tier_name, monthly_assessment_limit, daily_assessment_limit) 
VALUES
  ('free', 5, 2),
  ('reader', 20, 5),
  ('pro', -1, -1) -- -1 means unlimited
ON CONFLICT (tier_name) DO UPDATE SET
  monthly_assessment_limit = EXCLUDED.monthly_assessment_limit,
  daily_assessment_limit = EXCLUDED.daily_assessment_limit,
  updated_at = NOW();

-- 4. Create user assessment usage tracking table
CREATE TABLE IF NOT EXISTS user_assessment_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  month_year TEXT NOT NULL, -- Format: 'YYYY-MM'
  assessments_taken INTEGER DEFAULT 0,
  last_assessment_date DATE,
  daily_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, month_year)
);

-- 5. Create assessment attempt logs table
CREATE TABLE IF NOT EXISTS assessment_attempt_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  assessment_id UUID REFERENCES assessment_texts(id) ON DELETE CASCADE,
  attempt_count INTEGER DEFAULT 0,
  last_attempt_date TIMESTAMP,
  best_wpm INTEGER,
  best_comprehension NUMERIC(5,2),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, assessment_id)
);

-- 6. Create function to update user statistics on assessment completion
CREATE OR REPLACE FUNCTION update_user_assessment_stats() 
RETURNS TRIGGER AS $$
BEGIN
  -- Update or insert user statistics
  INSERT INTO user_assessment_stats (
    user_id,
    total_assessments_taken,
    average_wpm,
    average_comprehension,
    last_assessment_id,
    last_assessment_date,
    last_assessment_wpm,
    last_assessment_comprehension
  ) VALUES (
    NEW.user_id,
    1,
    NEW.wpm,
    NEW.comprehension_percentage,
    NEW.assessment_id,
    NEW.created_at,
    NEW.wpm,
    NEW.comprehension_percentage
  )
  ON CONFLICT (user_id) DO UPDATE SET
    total_assessments_taken = user_assessment_stats.total_assessments_taken + 1,
    average_wpm = CASE 
      WHEN user_assessment_stats.total_assessments_taken > 0 THEN
        ((user_assessment_stats.average_wpm * user_assessment_stats.total_assessments_taken + NEW.wpm) 
        / (user_assessment_stats.total_assessments_taken + 1))::INTEGER
      ELSE NEW.wpm
    END,
    average_comprehension = CASE 
      WHEN user_assessment_stats.total_assessments_taken > 0 THEN
        (user_assessment_stats.average_comprehension * user_assessment_stats.total_assessments_taken + NEW.comprehension_percentage) 
        / (user_assessment_stats.total_assessments_taken + 1)
      ELSE NEW.comprehension_percentage
    END,
    last_assessment_id = NEW.assessment_id,
    last_assessment_date = NEW.created_at,
    last_assessment_wpm = NEW.wpm,
    last_assessment_comprehension = NEW.comprehension_percentage,
    updated_at = NOW();
    
  -- Update assessment attempt logs
  INSERT INTO assessment_attempt_logs (
    user_id,
    assessment_id,
    attempt_count,
    last_attempt_date,
    best_wpm,
    best_comprehension
  ) VALUES (
    NEW.user_id,
    NEW.assessment_id,
    1,
    NEW.created_at,
    NEW.wpm,
    NEW.comprehension_percentage
  )
  ON CONFLICT (user_id, assessment_id) DO UPDATE SET
    attempt_count = assessment_attempt_logs.attempt_count + 1,
    last_attempt_date = NEW.created_at,
    best_wpm = GREATEST(assessment_attempt_logs.best_wpm, NEW.wpm),
    best_comprehension = GREATEST(assessment_attempt_logs.best_comprehension, NEW.comprehension_percentage),
    updated_at = NOW();
    
  -- Update usage tracking
  INSERT INTO user_assessment_usage (
    user_id,
    month_year,
    assessments_taken,
    last_assessment_date,
    daily_count
  ) VALUES (
    NEW.user_id,
    TO_CHAR(NEW.created_at, 'YYYY-MM'),
    1,
    NEW.created_at::DATE,
    1
  )
  ON CONFLICT (user_id, month_year) DO UPDATE SET
    assessments_taken = user_assessment_usage.assessments_taken + 1,
    daily_count = CASE 
      WHEN user_assessment_usage.last_assessment_date = NEW.created_at::DATE 
      THEN user_assessment_usage.daily_count + 1
      ELSE 1
    END,
    last_assessment_date = NEW.created_at::DATE,
    updated_at = NOW();
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger for updating stats on assessment completion
DROP TRIGGER IF EXISTS update_stats_on_assessment ON assessment_results;
CREATE TRIGGER update_stats_on_assessment
AFTER INSERT ON assessment_results
FOR EACH ROW EXECUTE FUNCTION update_user_assessment_stats();

-- 8. Function to get next assessment for user
CREATE OR REPLACE FUNCTION get_next_assessment_for_user(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_assessment_id UUID;
  v_user_tier TEXT;
  v_monthly_limit INTEGER;
  v_daily_limit INTEGER;
  v_monthly_usage INTEGER;
  v_daily_usage INTEGER;
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(p.subscription_tier, 'free') INTO v_user_tier
  FROM profiles p
  WHERE p.id = p_user_id;
  
  -- Get tier limits
  SELECT monthly_assessment_limit, daily_assessment_limit 
  INTO v_monthly_limit, v_daily_limit
  FROM subscription_tier_limits
  WHERE tier_name = v_user_tier;
  
  -- Check usage limits if not unlimited (-1)
  IF v_monthly_limit != -1 OR v_daily_limit != -1 THEN
    SELECT assessments_taken, daily_count
    INTO v_monthly_usage, v_daily_usage
    FROM user_assessment_usage
    WHERE user_id = p_user_id 
    AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
    
    -- Check if limits exceeded
    IF (v_monthly_limit != -1 AND COALESCE(v_monthly_usage, 0) >= v_monthly_limit) OR
       (v_daily_limit != -1 AND COALESCE(v_daily_usage, 0) >= v_daily_limit) THEN
      RETURN NULL; -- Limit exceeded
    END IF;
  END IF;
  
  -- First, try to get an assessment the user hasn't taken
  SELECT at.id INTO v_assessment_id
  FROM assessment_texts at
  WHERE at.active = true
  AND NOT EXISTS (
    SELECT 1 FROM assessment_results ar
    WHERE ar.user_id = p_user_id
    AND ar.assessment_id = at.id
  )
  ORDER BY RANDOM()
  LIMIT 1;
  
  -- If all assessments have been taken, get the one with least attempts
  IF v_assessment_id IS NULL THEN
    SELECT aal.assessment_id INTO v_assessment_id
    FROM assessment_attempt_logs aal
    JOIN assessment_texts at ON at.id = aal.assessment_id
    WHERE aal.user_id = p_user_id
    AND at.active = true
    ORDER BY aal.attempt_count ASC, aal.last_attempt_date ASC
    LIMIT 1;
  END IF;
  
  -- If still null (new user), get any active assessment
  IF v_assessment_id IS NULL THEN
    SELECT id INTO v_assessment_id
    FROM assessment_texts
    WHERE active = true
    ORDER BY RANDOM()
    LIMIT 1;
  END IF;
  
  RETURN v_assessment_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Function to calculate user percentile
CREATE OR REPLACE FUNCTION calculate_user_percentile(
  p_assessment_id UUID,
  p_user_wpm INTEGER
)
RETURNS INTEGER AS $$
DECLARE
  v_total_count INTEGER;
  v_below_count INTEGER;
  v_percentile INTEGER;
BEGIN
  -- Get total count of results for this assessment
  SELECT COUNT(*) INTO v_total_count
  FROM assessment_results
  WHERE assessment_id = p_assessment_id;
  
  -- If no other results, return 50th percentile
  IF v_total_count <= 1 THEN
    RETURN 50;
  END IF;
  
  -- Get count of results below user's WPM
  SELECT COUNT(*) INTO v_below_count
  FROM assessment_results
  WHERE assessment_id = p_assessment_id
  AND wpm < p_user_wpm;
  
  -- Calculate percentile
  v_percentile := ROUND((v_below_count::NUMERIC / v_total_count) * 100);
  
  RETURN v_percentile;
END;
$$ LANGUAGE plpgsql;

-- 10. Function to check if user can take assessment
CREATE OR REPLACE FUNCTION can_user_take_assessment(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_tier TEXT;
  v_monthly_limit INTEGER;
  v_daily_limit INTEGER;
  v_monthly_usage INTEGER;
  v_daily_usage INTEGER;
  v_can_take BOOLEAN := true;
  v_reason TEXT := '';
BEGIN
  -- Get user's subscription tier
  SELECT COALESCE(p.subscription_tier, 'free') INTO v_user_tier
  FROM profiles p
  WHERE p.id = p_user_id;
  
  -- Get tier limits
  SELECT monthly_assessment_limit, daily_assessment_limit 
  INTO v_monthly_limit, v_daily_limit
  FROM subscription_tier_limits
  WHERE tier_name = v_user_tier;
  
  -- If unlimited, return true
  IF v_monthly_limit = -1 AND v_daily_limit = -1 THEN
    RETURN jsonb_build_object(
      'can_take', true,
      'reason', '',
      'monthly_remaining', -1,
      'daily_remaining', -1
    );
  END IF;
  
  -- Get current usage
  SELECT assessments_taken, daily_count
  INTO v_monthly_usage, v_daily_usage
  FROM user_assessment_usage
  WHERE user_id = p_user_id 
  AND month_year = TO_CHAR(CURRENT_DATE, 'YYYY-MM');
  
  -- Set defaults if null
  v_monthly_usage := COALESCE(v_monthly_usage, 0);
  v_daily_usage := COALESCE(v_daily_usage, 0);
  
  -- Check monthly limit
  IF v_monthly_limit != -1 AND v_monthly_usage >= v_monthly_limit THEN
    v_can_take := false;
    v_reason := 'Monthly assessment limit reached';
  -- Check daily limit
  ELSIF v_daily_limit != -1 AND v_daily_usage >= v_daily_limit THEN
    v_can_take := false;
    v_reason := 'Daily assessment limit reached';
  END IF;
  
  RETURN jsonb_build_object(
    'can_take', v_can_take,
    'reason', v_reason,
    'monthly_remaining', CASE 
      WHEN v_monthly_limit = -1 THEN -1 
      ELSE v_monthly_limit - v_monthly_usage 
    END,
    'daily_remaining', CASE 
      WHEN v_daily_limit = -1 THEN -1 
      ELSE v_daily_limit - v_daily_usage 
    END,
    'tier', v_user_tier
  );
END;
$$ LANGUAGE plpgsql;

-- 11. Enable RLS for new tables
ALTER TABLE user_assessment_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscription_tier_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_assessment_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_attempt_logs ENABLE ROW LEVEL SECURITY;

-- 12. Create RLS policies for user_assessment_stats
CREATE POLICY "Users can view own stats" ON user_assessment_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can insert stats" ON user_assessment_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update stats" ON user_assessment_stats
  FOR UPDATE USING (true);

-- 13. Create RLS policies for subscription_tier_limits
CREATE POLICY "Anyone can view tier limits" ON subscription_tier_limits
  FOR SELECT USING (true);

CREATE POLICY "Only admins can modify tier limits" ON subscription_tier_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'admin'
    )
  );

-- 14. Create RLS policies for user_assessment_usage
CREATE POLICY "Users can view own usage" ON user_assessment_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage usage" ON user_assessment_usage
  FOR ALL USING (true);

-- 15. Create RLS policies for assessment_attempt_logs
CREATE POLICY "Users can view own attempts" ON assessment_attempt_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "System can manage attempts" ON assessment_attempt_logs
  FOR ALL USING (true);