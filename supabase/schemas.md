create table public.admin_activity_log (
  id uuid not null default gen_random_uuid (),
  admin_id uuid null,
  action character varying(100) null,
  entity_type character varying(50) null,
  entity_id uuid null,
  details jsonb null,
  created_at timestamp with time zone null default now(),
  constraint admin_activity_log_pkey primary key (id),
  constraint admin_activity_log_admin_id_fkey foreign KEY (admin_id) references profiles (id)
) TABLESPACE pg_default;

create table public.admin_activity_log (
  id uuid not null default gen_random_uuid (),
  admin_id uuid null,
  action character varying(100) null,
  entity_type character varying(50) null,
  entity_id uuid null,
  details jsonb null,
  created_at timestamp with time zone null default now(),
  constraint admin_activity_log_pkey primary key (id),
  constraint admin_activity_log_admin_id_fkey foreign KEY (admin_id) references profiles (id)
) TABLESPACE pg_default;

create table public.assessment_results (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  assessment_id uuid not null,
  wpm integer not null,
  comprehension_percentage numeric(5, 2) null,
  time_taken integer not null,
  answers jsonb null,
  percentile integer null,
  created_at timestamp with time zone null default now(),
  constraint assessment_results_pkey primary key (id),
  constraint assessment_results_assessment_id_fkey foreign KEY (assessment_id) references assessment_texts (id),
  constraint assessment_results_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint assessment_results_wpm_check check ((wpm > 0)),
  constraint assessment_results_comprehension_percentage_check check (
    (
      (comprehension_percentage >= (0)::numeric)
      and (comprehension_percentage <= (100)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_assessment_results_user on public.assessment_results using btree (user_id, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_assessment_results_assessment on public.assessment_results using btree (assessment_id) TABLESPACE pg_default;

create index IF not exists idx_assessment_results_wpm on public.assessment_results using btree (wpm desc) TABLESPACE pg_default;\

create table public.assessment_texts (
  id uuid not null default gen_random_uuid (),
  title text not null,
  content text not null,
  word_count integer not null,
  questions jsonb not null,
  difficulty_level text null,
  category text null,
  active boolean null default true,
  times_used integer null default 0,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint assessment_texts_pkey primary key (id),
  constraint assessment_texts_created_by_fkey foreign KEY (created_by) references profiles (id)
) TABLESPACE pg_default;

create table public.book_exercise_texts (
  id uuid not null default gen_random_uuid (),
  book_id uuid null,
  exercise_id uuid not null,
  text_content text not null,
  word_count integer null,
  page_start integer null,
  page_end integer null,
  difficulty_level text null,
  created_by uuid not null,
  created_at timestamp with time zone null default now(),
  constraint book_exercise_texts_pkey primary key (id),
  constraint book_exercise_texts_book_id_fkey foreign KEY (book_id) references books (id),
  constraint book_exercise_texts_exercise_id_fkey foreign KEY (exercise_id) references exercises (id),
  constraint book_exercise_texts_created_by_fkey foreign KEY (created_by) references profiles (id)
) TABLESPACE pg_default;

create table public.book_reviews (
  id uuid not null default gen_random_uuid (),
  book_id uuid not null,
  user_id uuid not null,
  rating integer null,
  review_text text null,
  is_edited boolean null default false,
  edited_at timestamp with time zone null,
  deleted_at timestamp with time zone null,
  can_recreate_after timestamp with time zone null,
  helpful_count integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint book_reviews_pkey primary key (id),
  constraint book_reviews_book_id_user_id_key unique (book_id, user_id),
  constraint book_reviews_book_id_fkey foreign KEY (book_id) references books (id),
  constraint book_reviews_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint book_reviews_rating_check check (
    (
      (rating >= 1)
      and (rating <= 5)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_reviews_book_user on public.book_reviews using btree (book_id, user_id) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_reviews_book on public.book_reviews using btree (book_id) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_reviews_user on public.book_reviews using btree (user_id) TABLESPACE pg_default
where
  (deleted_at is null);

create index IF not exists idx_reviews_rating on public.book_reviews using btree (rating) TABLESPACE pg_default
where
  (deleted_at is null);

  create table public.books (
  id uuid not null default gen_random_uuid (),
  title text not null,
  author text not null,
  isbn text null,
  cover_url text null,
  total_pages integer null,
  genre text null,
  publication_year integer null,
  status text null default 'pending'::text,
  merged_with_id uuid null,
  created_by uuid null,
  approved_by uuid null,
  approved_at timestamp with time zone null,
  rejection_reason text null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint books_pkey primary key (id),
  constraint books_merged_with_id_fkey foreign KEY (merged_with_id) references books (id),
  constraint books_created_by_fkey foreign KEY (created_by) references profiles (id),
  constraint books_approved_by_fkey foreign KEY (approved_by) references profiles (id),
  constraint books_status_check check (
    (
      status = any (
        array[
          'pending'::text,
          'approved'::text,
          'merged'::text,
          'rejected'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_books_status on public.books using btree (status) TABLESPACE pg_default
where
  (status = 'pending'::text);

create index IF not exists idx_books_approved on public.books using btree (status) TABLESPACE pg_default
where
  (status = 'approved'::text);

create index IF not exists idx_books_author on public.books using btree (author) TABLESPACE pg_default;

create index IF not exists idx_books_created_by on public.books using btree (created_by) TABLESPACE pg_default;

create index IF not exists idx_books_title_search on public.books using gin (to_tsvector('english'::regconfig, title)) TABLESPACE pg_default;

create index IF not exists idx_books_author_search on public.books using gin (to_tsvector('english'::regconfig, author)) TABLESPACE pg_default;

create table public.exercise_results (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  exercise_id uuid not null,
  session_date date not null default CURRENT_DATE,
  accuracy_percentage numeric(5, 2) null,
  avg_response_time integer null,
  total_attempts integer null default 0,
  correct_count integer null default 0,
  wpm integer null,
  completion_time integer null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint exercise_results_pkey primary key (id),
  constraint exercise_results_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint exercise_results_exercise_id_fkey foreign KEY (exercise_id) references exercises (id),
  constraint exercise_results_accuracy_percentage_check check (
    (
      (accuracy_percentage >= (0)::numeric)
      and (accuracy_percentage <= (100)::numeric)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_exercise_results_user on public.exercise_results using btree (user_id, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_exercise_results_exercise on public.exercise_results using btree (exercise_id) TABLESPACE pg_default;

create index IF not exists idx_exercise_results_date on public.exercise_results using btree (session_date desc) TABLESPACE pg_default;

create table public.exercise_texts (
  id uuid not null default gen_random_uuid (),
  exercise_id uuid null,
  book_id uuid null,
  title character varying(200) null,
  text_content text not null,
  word_count integer null,
  difficulty_level character varying(20) null,
  is_custom boolean null default false,
  created_by uuid null,
  created_at timestamp with time zone null default now(),
  constraint exercise_texts_pkey primary key (id),
  constraint exercise_texts_exercise_id_fkey foreign KEY (exercise_id) references exercises (id) on delete CASCADE,
  constraint exercise_texts_book_id_fkey foreign KEY (book_id) references books (id) on delete set null,
  constraint exercise_texts_created_by_fkey foreign KEY (created_by) references profiles (id)
) TABLESPACE pg_default;

create table public.exercises (
  id uuid not null default gen_random_uuid (),
  title text not null,
  type text not null,
  difficulty text null,
  tags text[] null,
  description text null,
  instructions text null,
  requires_subscription boolean null default false,
  min_subscription_tier text null default 'free'::text,
  config jsonb null default '{}'::jsonb,
  is_active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint exercises_pkey primary key (id),
  constraint exercises_type_check check (
    (
      type = any (
        array[
          'word_flasher'::text,
          '3-2-1'::text,
          'mindset'::text,
          'custom'::text
        ]
      )
    )
  ),
  constraint exercises_difficulty_check check (
    (
      difficulty = any (
        array[
          'beginner'::text,
          'intermediate'::text,
          'advanced'::text
        ]
      )
    )
  ),
  constraint exercises_min_subscription_tier_check check (
    (
      min_subscription_tier = any (array['free'::text, 'reader'::text, 'pro'::text])
    )
  )
) TABLESPACE pg_default;

create table public.feature_flags (
  id uuid not null default gen_random_uuid (),
  name character varying(100) not null,
  description text null,
  enabled boolean null default false,
  requires_subscription character varying(20) null default 'free'::character varying,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint feature_flags_pkey primary key (id),
  constraint feature_flags_name_key unique (name)
) TABLESPACE pg_default;

create table public.platform_settings (
  id uuid not null default gen_random_uuid (),
  key text not null,
  value jsonb not null,
  description text null,
  category text null default 'general'::text,
  updated_by uuid null,
  updated_at timestamp with time zone null default now(),
  constraint platform_settings_pkey primary key (id),
  constraint platform_settings_key_key unique (key),
  constraint platform_settings_updated_by_fkey foreign KEY (updated_by) references profiles (id)
) TABLESPACE pg_default;

create table public.profiles (
  id uuid not null,
  full_name text null,
  city text null,
  avatar_url text null,
  role text null default 'reader'::text,
  subscription_tier text null default 'free'::text,
  subscription_status text null default 'inactive'::text,
  privacy_settings jsonb null default '{"stats": {"showPagesRead": true, "showReadingSpeed": true, "showBooksCompleted": true, "showExercisePerformance": true}, "profile": {"showCity": true, "showAvatar": true, "showFullName": true}, "activity": {"showCurrentBooks": true, "showReadingHistory": true, "showSubmissionTimes": true}, "leaderboard": {"useRealName": true, "showOnLeaderboard": true}}'::jsonb,
  total_pages_read integer null default 0,
  total_books_completed integer null default 0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint profiles_pkey primary key (id),
  constraint profiles_id_fkey foreign KEY (id) references auth.users (id) on delete CASCADE,
  constraint profiles_role_check check (
    (role = any (array['reader'::text, 'admin'::text]))
  ),
  constraint profiles_subscription_tier_check check (
    (
      subscription_tier = any (array['free'::text, 'reader'::text, 'pro'::text])
    )
  ),
  constraint profiles_subscription_status_check check (
    (
      subscription_status = any (
        array[
          'active'::text,
          'inactive'::text,
          'canceled'::text,
          'past_due'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_profiles_role on public.profiles using btree (role) TABLESPACE pg_default
where
  (role = 'admin'::text);

create index IF not exists idx_profiles_subscription_tier on public.profiles using btree (subscription_tier) TABLESPACE pg_default;

create index IF not exists idx_profiles_created_at on public.profiles using btree (created_at desc) TABLESPACE pg_default;

create table public.reading_submissions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  book_id uuid not null,
  pages_read integer not null,
  time_spent integer not null,
  submission_date date not null,
  session_timestamp timestamp with time zone not null default now(),
  was_premium boolean null default false,
  notes text null,
  created_at timestamp with time zone null default now(),
  constraint reading_submissions_pkey primary key (id),
  constraint reading_submissions_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint reading_submissions_book_id_fkey foreign KEY (book_id) references books (id),
  constraint reading_submissions_pages_read_check check (
    (
      (pages_read > 0)
      and (pages_read <= 1000)
    )
  ),
  constraint reading_submissions_time_spent_check check (
    (
      (time_spent > 0)
      and (time_spent <= 240)
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_submissions_user_date on public.reading_submissions using btree (user_id, submission_date desc) TABLESPACE pg_default;

create index IF not exists idx_submissions_book_date on public.reading_submissions using btree (book_id, submission_date desc) TABLESPACE pg_default;

create index IF not exists idx_submissions_date on public.reading_submissions using btree (submission_date desc) TABLESPACE pg_default;

create index IF not exists idx_submissions_user_book on public.reading_submissions using btree (user_id, book_id) TABLESPACE pg_default;

create index IF not exists idx_submissions_premium on public.reading_submissions using btree (was_premium) TABLESPACE pg_default
where
  (was_premium = true);

create trigger update_stats_after_submission
after INSERT
or DELETE
or
update on reading_submissions for EACH row
execute FUNCTION update_user_stats ();

create trigger update_books_completed_trigger
after INSERT on reading_submissions for EACH row
execute FUNCTION update_books_completed ();

create table public.subscription_limits (
  id uuid not null default gen_random_uuid (),
  tier character varying(20) not null,
  max_submissions_per_month integer null,
  max_custom_texts integer null,
  max_exercises integer null,
  can_see_leaderboard boolean null default false,
  can_join_leaderboard boolean null default false,
  can_see_book_stats boolean null default false,
  can_export_data boolean null default false,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint subscription_limits_pkey primary key (id),
  constraint subscription_limits_tier_key unique (tier)
) TABLESPACE pg_default;

create table public.subscription_plans (
  id uuid not null default gen_random_uuid (),
  name text not null,
  display_name text not null,
  price_monthly numeric(10, 2) null,
  price_yearly numeric(10, 2) null,
  stripe_price_id_monthly text null,
  stripe_price_id_yearly text null,
  features jsonb not null default '{}'::jsonb,
  limits jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  active boolean null default true,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint subscription_plans_pkey primary key (id),
  constraint subscription_plans_name_key unique (name),
  constraint subscription_plans_name_check check (
    (
      name = any (array['free'::text, 'reader'::text, 'pro'::text])
    )
  )
) TABLESPACE pg_default;

create table public.user_activity_log (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  action text not null,
  entity_type text null,
  entity_id uuid null,
  metadata jsonb null default '{}'::jsonb,
  created_at timestamp with time zone null default now(),
  constraint user_activity_log_pkey primary key (id),
  constraint user_activity_log_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create index IF not exists idx_activity_log_user on public.user_activity_log using btree (user_id, created_at desc) TABLESPACE pg_default;

create index IF not exists idx_activity_log_action on public.user_activity_log using btree (action) TABLESPACE pg_default;

create index IF not exists idx_activity_log_entity on public.user_activity_log using btree (entity_type, entity_id) TABLESPACE pg_default;

create table public.user_custom_texts (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  title text not null,
  content text not null,
  word_count integer null,
  exercise_id uuid null,
  last_used_at timestamp with time zone null,
  times_used integer null default 0,
  created_at timestamp with time zone null default now(),
  constraint user_custom_texts_pkey primary key (id),
  constraint user_custom_texts_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint user_custom_texts_exercise_id_fkey foreign KEY (exercise_id) references exercises (id)
) TABLESPACE pg_default;

create table public.user_exercise_stats (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  exercise_type text not null,
  total_sessions integer null default 0,
  total_time_spent integer null default 0,
  best_score numeric(5, 2) null default 0,
  best_accuracy numeric(5, 2) null default 0,
  best_wpm integer null default 0,
  average_score numeric(5, 2) null default 0,
  average_accuracy numeric(5, 2) null default 0,
  average_wpm integer null default 0,
  current_difficulty text null default 'beginner'::text,
  current_level integer null default 1,
  consecutive_sessions integer null default 0,
  last_session_at timestamp with time zone null,
  adaptive_speed integer null default 150,
  adaptive_multiplier numeric(3, 2) null default 1.0,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_exercise_stats_pkey primary key (id),
  constraint user_exercise_stats_user_id_exercise_type_key unique (user_id, exercise_type),
  constraint user_exercise_stats_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.user_monthly_usage (
  id uuid not null default gen_random_uuid (),
  user_id uuid null,
  month date not null,
  submission_count integer null default 0,
  custom_texts_count integer null default 0,
  exercises_used text[] null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_monthly_usage_pkey primary key (id),
  constraint user_monthly_usage_user_id_month_key unique (user_id, month),
  constraint user_monthly_usage_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE
) TABLESPACE pg_default;

create table public.user_subscriptions (
  id uuid not null default gen_random_uuid (),
  user_id uuid not null,
  plan_id uuid not null,
  stripe_subscription_id text null,
  stripe_customer_id text null,
  status text not null,
  billing_cycle text null,
  current_period_start timestamp with time zone null,
  current_period_end timestamp with time zone null,
  cancel_at_period_end boolean null default false,
  canceled_at timestamp with time zone null,
  created_at timestamp with time zone null default now(),
  updated_at timestamp with time zone null default now(),
  constraint user_subscriptions_pkey primary key (id),
  constraint user_subscriptions_stripe_subscription_id_key unique (stripe_subscription_id),
  constraint user_subscriptions_user_id_fkey foreign KEY (user_id) references profiles (id) on delete CASCADE,
  constraint user_subscriptions_plan_id_fkey foreign KEY (plan_id) references subscription_plans (id),
  constraint user_subscriptions_status_check check (
    (
      status = any (
        array[
          'active'::text,
          'canceled'::text,
          'past_due'::text,
          'paused'::text,
          'trialing'::text
        ]
      )
    )
  ),
  constraint user_subscriptions_billing_cycle_check check (
    (
      billing_cycle = any (
        array['monthly'::text, 'yearly'::text, 'lifetime'::text]
      )
    )
  )
) TABLESPACE pg_default;

create index IF not exists idx_user_subscriptions_user on public.user_subscriptions using btree (user_id) TABLESPACE pg_default;

create index IF not exists idx_user_subscriptions_status on public.user_subscriptions using btree (status) TABLESPACE pg_default
where
  (status = 'active'::text);

create index IF not exists idx_user_subscriptions_stripe_id on public.user_subscriptions using btree (stripe_subscription_id) TABLESPACE pg_default;

views:
book_statistics
user_reading_stats