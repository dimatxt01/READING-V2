-- Populate default exercises for the ReadSpeed application

-- Insert default exercises that match the actual database schema
INSERT INTO exercises (type, title, description, instructions, difficulty, min_subscription_tier, requires_subscription, config, is_active) VALUES
(
    'mindset',
    'Just Read More',
    'The Most Important Principle: Understanding the Foundation of Reading Improvement',
    'Read through this foundational content about the importance of consistent reading. This isn''t just an exercise—it''s the key principle behind all reading improvement.',
    'beginner',
    'free',
    false,
    '{
        "content": "The Most Important Principle: Just Read More\n\nThis isn''t an exercise; it''s the foundation of all reading improvement. The most scientifically-backed way to boost your reading speed, comprehension, and memory is simple: read consistently.\n\nPeople who say \"speed reading didn''t work\" often tried a few exercises but missed this crucial step. Here''s the science behind why volume is the key.\n\n1. You Get Faster, Automatically\nThe more you see a word, the faster your brain recognizes it. This process, called automaticity, becomes effortless. It frees up your mental energy to focus on understanding big ideas instead of just decoding individual words.\n\n2. You Understand More, Effortlessly\nReading is the best way to grow your vocabulary, and a larger vocabulary is directly linked to better comprehension. You also build a library of background knowledge in your mind, which helps you grasp new topics much faster.\n\n3. You Remember Better, Scientifically\nConsistent reading physically changes your brain. This process, known as neuroplasticity, strengthens the neural pathways for language and memory. The more you read, the more efficient your brain becomes at storing what you''ve learned.\n\nThe Takeaway: The exercises in this app are powerful tools. But they are most effective when combined with the fundamental habit of consistent reading. Submit your pages daily to build the most important skill of all."
    }'
),
(
    'word_flasher',
    'Word Flasher',
    'Flash words one at a time in the center of the screen for focus training',
    'Words will flash briefly on screen. Type each word you see as accurately as possible. The speed will adapt based on your accuracy.',
    'beginner',
    'reader',
    true,
    '{
        "default_speed": 200,
        "min_speed": 50,
        "max_speed": 500,
        "words_per_round": 15,
        "accuracy_threshold": 75,
        "speed_adjustment": 10,
        "vocabulary_levels": {
            "foundation": "Common everyday words",
            "intermediate": "Academic and business vocabulary", 
            "advanced": "Complex and technical terms"
        }
    }'
),
(
    '3-2-1',
    '3-2-1 Speed Exercise',
    'Three rounds of reading the same text at increasing speeds',
    'Read the same passage three times: first at normal pace (3 min), then faster (2 min), then at maximum speed (1 min). A visual pacer will guide your reading speed.',
    'intermediate',
    'reader',
    true,
    '{
        "rounds": [
            {"name": "Normal", "duration": 180, "multiplier": 1.0},
            {"name": "Faster", "duration": 120, "multiplier": 1.5},
            {"name": "Sprint", "duration": 60, "multiplier": 2.0}
        ],
        "allow_custom_text": true,
        "min_text_length": 200,
        "max_text_length": 2000
    }'
)
ON CONFLICT (id) DO NOTHING;

-- Insert sample exercise texts that match the actual schema
INSERT INTO exercise_texts (title, text_content, difficulty_level, is_custom, created_by) VALUES
(
    'Technology and Society',
    'The rapid advancement of technology has fundamentally changed how we communicate, work, and live. Social media platforms connect billions of people worldwide, enabling instant communication across vast distances. However, this connectivity comes with challenges including privacy concerns, misinformation, and digital addiction. As we navigate this digital landscape, we must balance the benefits of technological progress with the need to preserve human connection and mental well-being. The future will likely bring even more dramatic changes as artificial intelligence, virtual reality, and other emerging technologies become more prevalent in our daily lives.',
    'intermediate',
    false,
    null
),
(
    'Climate Change Basics',
    'Climate change refers to long-term shifts in global temperatures and weather patterns. While climate variations occur naturally, scientific evidence shows that human activities have been the main driver of climate change since the 1800s. The burning of fossil fuels generates greenhouse gas emissions that trap heat in our atmosphere. The consequences include rising sea levels, extreme weather events, and threats to food security. Addressing climate change requires global cooperation, renewable energy adoption, and changes in how we produce food, transport goods, and power our communities.',
    'intermediate',
    false,
    null
),
(
    'The Benefits of Reading',
    'Reading regularly provides numerous cognitive and emotional benefits. Studies show that reading improves vocabulary, enhances critical thinking skills, and increases empathy by exposing us to diverse perspectives and experiences. Reading fiction helps develop emotional intelligence and social understanding. Non-fiction reading expands knowledge and keeps our minds sharp. Regular reading has even been linked to reduced stress levels and better sleep quality. Whether you prefer physical books, e-readers, or audiobooks, incorporating reading into your daily routine can significantly improve your mental health and intellectual capacity.',
    'beginner',
    false,
    null
)
ON CONFLICT (id) DO NOTHING;