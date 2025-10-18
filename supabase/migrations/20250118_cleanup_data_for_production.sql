-- Migration: Clean up all user data except admin for production
-- Created: 2025-01-18
-- Description: Removes all test user data while preserving the admin account (piskun.dzmitry.am@gmail.com)
--              Deletes ALL books, assessments, and activity data to prepare for production

-- ============================================
-- CLEANUP ALL DATA FOR PRODUCTION
-- ============================================

DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID from auth.users
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'piskun.dzmitry.am@gmail.com';

    -- Safety check: ensure admin user exists
    IF admin_user_id IS NULL THEN
        RAISE EXCEPTION 'Admin user piskun.dzmitry.am@gmail.com not found. Aborting cleanup.';
    END IF;

    RAISE NOTICE 'Admin user ID: %', admin_user_id;
    RAISE NOTICE 'Starting data cleanup...';

    -- ============================================
    -- STEP 1: Delete ALL activity/content data
    -- (Must be done first due to foreign key constraints)
    -- ============================================

    -- Delete ALL book reviews (references books)
    DELETE FROM book_reviews;
    RAISE NOTICE 'Cleaned book_reviews (all)';

    -- Delete ALL book exercise texts (references books)
    DELETE FROM book_exercise_texts;
    RAISE NOTICE 'Cleaned book_exercise_texts (all)';

    -- Delete ALL reading submissions (references books)
    DELETE FROM reading_submissions;
    RAISE NOTICE 'Cleaned reading_submissions (all)';

    -- Delete ALL exercise results
    DELETE FROM exercise_results;
    RAISE NOTICE 'Cleaned exercise_results (all)';

    -- Delete ALL assessment results (references assessment_texts)
    DELETE FROM assessment_results;
    RAISE NOTICE 'Cleaned assessment_results (all)';

    -- Delete ALL assessment attempt logs
    DELETE FROM assessment_attempt_logs;
    RAISE NOTICE 'Cleaned assessment_attempt_logs (all)';

    -- Delete ALL assessment questions (references assessment_texts)
    DELETE FROM assessment_questions;
    RAISE NOTICE 'Cleaned assessment_questions (all)';

    -- Delete ALL user custom texts
    DELETE FROM user_custom_texts;
    RAISE NOTICE 'Cleaned user_custom_texts (all)';

    -- Delete ALL user exercise stats (references exercises, but we keep exercises)
    DELETE FROM user_exercise_stats;
    RAISE NOTICE 'Cleaned user_exercise_stats (all)';

    -- Delete ALL user assessment stats (references assessment_texts via last_assessment_id)
    DELETE FROM user_assessment_stats;
    RAISE NOTICE 'Cleaned user_assessment_stats (all)';

    -- Delete ALL user assessment usage
    DELETE FROM user_assessment_usage;
    RAISE NOTICE 'Cleaned user_assessment_usage (all)';

    -- ============================================
    -- STEP 2: Delete content (books & assessments)
    -- ============================================

    -- Delete ALL books
    DELETE FROM books;
    RAISE NOTICE 'Cleaned books (all)';

    -- Delete ALL assessment texts
    DELETE FROM assessment_texts;
    RAISE NOTICE 'Cleaned assessment_texts (all)';

    -- ============================================
    -- STEP 3: Delete user metadata (except admin)
    -- ============================================

    -- Delete user monthly usage (except admin)
    DELETE FROM user_monthly_usage WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned user_monthly_usage';

    -- Delete user subscriptions (except admin)
    DELETE FROM user_subscriptions WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned user_subscriptions';

    -- Delete user activity logs (except admin)
    DELETE FROM user_activity_log WHERE user_id != admin_user_id;
    RAISE NOTICE 'Cleaned user_activity_log';

    -- Delete admin activity logs (except admin)
    DELETE FROM admin_activity_log WHERE admin_id != admin_user_id;
    RAISE NOTICE 'Cleaned admin_activity_log';

    -- ============================================
    -- STEP 4: Delete users (except admin)
    -- ============================================

    -- Delete profiles (except admin)
    DELETE FROM profiles WHERE id != admin_user_id;
    RAISE NOTICE 'Cleaned profiles';

    -- Delete auth users (except admin)
    -- This should be done last as it's the primary user record
    DELETE FROM auth.users WHERE id != admin_user_id;
    RAISE NOTICE 'Cleaned auth.users';

    RAISE NOTICE 'Data cleanup completed successfully!';
    RAISE NOTICE 'Admin user % preserved', admin_user_id;

END $$;

-- ============================================
-- RESET SEQUENCES (OPTIONAL)
-- ============================================
-- Uncomment if you want to reset auto-increment sequences for clean IDs in production

-- ALTER SEQUENCE IF EXISTS books_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS exercises_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS assessment_texts_id_seq RESTART WITH 1;
-- ALTER SEQUENCE IF EXISTS assessment_questions_id_seq RESTART WITH 1;

-- ============================================
-- VERIFY CLEANUP
-- ============================================

DO $$
DECLARE
    admin_user_id UUID;
    remaining_users INT;
    remaining_profiles INT;
    remaining_books INT;
    remaining_assessments INT;
    remaining_assessment_questions INT;
    remaining_reading_submissions INT;
    remaining_book_reviews INT;
BEGIN
    SELECT id INTO admin_user_id
    FROM auth.users
    WHERE email = 'piskun.dzmitry.am@gmail.com';

    SELECT COUNT(*) INTO remaining_users FROM auth.users;
    SELECT COUNT(*) INTO remaining_profiles FROM profiles;
    SELECT COUNT(*) INTO remaining_books FROM books;
    SELECT COUNT(*) INTO remaining_assessments FROM assessment_texts;
    SELECT COUNT(*) INTO remaining_assessment_questions FROM assessment_questions;
    SELECT COUNT(*) INTO remaining_reading_submissions FROM reading_submissions;
    SELECT COUNT(*) INTO remaining_book_reviews FROM book_reviews;

    RAISE NOTICE '=== CLEANUP VERIFICATION ===';
    RAISE NOTICE 'Admin user preserved: %', (admin_user_id IS NOT NULL);
    RAISE NOTICE 'Remaining users in auth.users: %', remaining_users;
    RAISE NOTICE 'Remaining profiles: %', remaining_profiles;
    RAISE NOTICE 'Remaining books: %', remaining_books;
    RAISE NOTICE 'Remaining assessment texts: %', remaining_assessments;
    RAISE NOTICE 'Remaining assessment questions: %', remaining_assessment_questions;
    RAISE NOTICE 'Remaining reading submissions: %', remaining_reading_submissions;
    RAISE NOTICE 'Remaining book reviews: %', remaining_book_reviews;

    IF remaining_users != 1 OR remaining_profiles != 1 THEN
        RAISE WARNING 'Expected 1 user and 1 profile, but found % users and % profiles', remaining_users, remaining_profiles;
    ELSIF remaining_books != 0 OR remaining_assessments != 0 OR remaining_reading_submissions != 0 OR remaining_book_reviews != 0 THEN
        RAISE WARNING 'Expected 0 content items, but found % books, % assessments, % submissions, % reviews',
            remaining_books, remaining_assessments, remaining_reading_submissions, remaining_book_reviews;
    ELSE
        RAISE NOTICE '✓ Cleanup verification successful!';
        RAISE NOTICE '✓ Database is clean and ready for production';
    END IF;
END $$;
