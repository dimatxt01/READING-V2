-- Create mindset_content table for managing the "Just Read More" exercise content
CREATE TABLE IF NOT EXISTS mindset_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  section VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  order_index INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_mindset_content_section ON mindset_content(section);
CREATE INDEX idx_mindset_content_order ON mindset_content(order_index);
CREATE INDEX idx_mindset_content_active ON mindset_content(is_active);

-- Create RLS policy for admin access only
ALTER TABLE mindset_content ENABLE ROW LEVEL SECURITY;

-- Admin can do everything
CREATE POLICY "Admin full access to mindset content" ON mindset_content
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Authenticated users can read active content (for the exercise)
CREATE POLICY "Users can read active mindset content" ON mindset_content
  FOR SELECT
  USING (is_active = true AND auth.role() = 'authenticated');

-- Insert default mindset content
INSERT INTO mindset_content (title, section, content, order_index, is_active) VALUES
(
  'The Most Important Principle: Just Read More',
  'introduction',
  'This isn''t an exercise; it''s the foundation of all reading improvement. The most scientifically-backed way to boost your reading speed, comprehension, and memory is simple: read consistently.

People who say "speed reading didn''t work" often tried a few exercises but missed this crucial step. Here''s the science behind why volume is the key.',
  0,
  true
),
(
  'You Get Faster, Automatically',
  'automaticity-principle',
  'The more you see a word, the faster your brain recognizes it. This process, called automaticity, becomes effortless. It frees up your mental energy to focus on understanding big ideas instead of just decoding individual words.

Research shows that frequent exposure to words creates neural pathways that allow for instant recognition. This is why avid readers naturally read faster than occasional readers.',
  1,
  true
),
(
  'You Understand More, Effortlessly',
  'vocabulary-growth',
  'Reading is the best way to grow your vocabulary, and a larger vocabulary is directly linked to better comprehension. You also build a library of background knowledge in your mind, which helps you grasp new topics much faster.

Studies indicate that readers encounter 2-3 times more vocabulary through reading than through conversation, making it the most effective way to expand linguistic knowledge.',
  2,
  true
),
(
  'You Remember Better, Scientifically',
  'neuroplasticity',
  'Consistent reading physically changes your brain. This process, known as neuroplasticity, strengthens the neural pathways for language and memory. The more you read, the more efficient your brain becomes at storing what you''ve learned.

Brain imaging studies show that regular readers have increased connectivity in areas associated with language processing, comprehension, and memory formation.',
  3,
  true
),
(
  'The Takeaway',
  'conclusion',
  'The exercises in this app are powerful tools. But they are most effective when combined with the fundamental habit of consistent reading. Submit your pages daily to build the most important skill of all.

Remember: There''s no substitute for volume. The more you read, the better you become at reading. It''s that simple.',
  4,
  true
)
ON CONFLICT DO NOTHING;

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_mindset_content_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER update_mindset_content_updated_at_trigger
  BEFORE UPDATE ON mindset_content
  FOR EACH ROW
  EXECUTE FUNCTION update_mindset_content_updated_at();

-- Create helper function for creating the table (used by the admin interface)
CREATE OR REPLACE FUNCTION create_mindset_content_table()
RETURNS void AS $$
BEGIN
  -- This function exists to provide a way for the admin interface
  -- to attempt table creation, but since the table already exists
  -- from this migration, this will be a no-op
  RAISE NOTICE 'mindset_content table already exists';
END;
$$ LANGUAGE plpgsql;

-- Grant permissions
GRANT ALL ON mindset_content TO authenticated;
GRANT USAGE ON SCHEMA public TO authenticated;