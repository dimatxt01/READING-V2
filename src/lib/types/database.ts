export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_activity_log: {
        Row: {
          id: string
          admin_id: string | null
          action: string | null
          entity_type: string | null
          entity_id: string | null
          details: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          admin_id?: string | null
          action?: string | null
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          admin_id?: string | null
          action?: string | null
          entity_type?: string | null
          entity_id?: string | null
          details?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      assessment_questions: {
        Row: {
          id: string
          assessment_text_id: string | null
          question: string
          options: Json | null
          correct_answer: string | null
          order_index: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          assessment_text_id?: string | null
          question: string
          options?: Json | null
          correct_answer?: string | null
          order_index?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          assessment_text_id?: string | null
          question?: string
          options?: Json | null
          correct_answer?: string | null
          order_index?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          id: string
          user_id: string
          assessment_id: string
          wpm: number
          comprehension_percentage: number | null
          time_taken: number
          answers: Json | null
          percentile: number | null
          attempt_number: number | null
          session_id: string | null
          comparison_percentile: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          assessment_id: string
          wpm: number
          comprehension_percentage?: number | null
          time_taken: number
          answers?: Json | null
          percentile?: number | null
          attempt_number?: number | null
          session_id?: string | null
          comparison_percentile?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          assessment_id?: string
          wpm?: number
          comprehension_percentage?: number | null
          time_taken?: number
          answers?: Json | null
          percentile?: number | null
          attempt_number?: number | null
          session_id?: string | null
          comparison_percentile?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      assessment_texts: {
        Row: {
          id: string
          title: string
          content: string
          word_count: number
          questions: Json
          difficulty_level: string | null
          category: string | null
          active: boolean | null
          times_used: number | null
          created_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          content: string
          word_count: number
          questions: Json
          difficulty_level?: string | null
          category?: string | null
          active?: boolean | null
          times_used?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          content?: string
          word_count?: number
          questions?: Json
          difficulty_level?: string | null
          category?: string | null
          active?: boolean | null
          times_used?: number | null
          created_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      book_exercise_texts: {
        Row: {
          id: string
          book_id: string | null
          exercise_id: string
          text_content: string
          word_count: number | null
          page_start: number | null
          page_end: number | null
          difficulty_level: string | null
          created_by: string
          created_at: string | null
        }
        Insert: {
          id?: string
          book_id?: string | null
          exercise_id: string
          text_content: string
          word_count?: number | null
          page_start?: number | null
          page_end?: number | null
          difficulty_level?: string | null
          created_by: string
          created_at?: string | null
        }
        Update: {
          id?: string
          book_id?: string | null
          exercise_id?: string
          text_content?: string
          word_count?: number | null
          page_start?: number | null
          page_end?: number | null
          difficulty_level?: string | null
          created_by?: string
          created_at?: string | null
        }
        Relationships: []
      }
      book_reviews: {
        Row: {
          id: string
          book_id: string
          user_id: string
          rating: number | null
          review_text: string | null
          is_edited: boolean | null
          edited_at: string | null
          deleted_at: string | null
          can_recreate_after: string | null
          helpful_count: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          book_id: string
          user_id: string
          rating?: number | null
          review_text?: string | null
          is_edited?: boolean | null
          edited_at?: string | null
          deleted_at?: string | null
          can_recreate_after?: string | null
          helpful_count?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          book_id?: string
          user_id?: string
          rating?: number | null
          review_text?: string | null
          is_edited?: boolean | null
          edited_at?: string | null
          deleted_at?: string | null
          can_recreate_after?: string | null
          helpful_count?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      books: {
        Row: {
          id: string
          title: string
          author: string
          isbn: string | null
          cover_url: string | null
          total_pages: number | null
          genre: string | null
          publication_year: number | null
          status: string | null
          merged_with_id: string | null
          created_by: string | null
          approved_by: string | null
          approved_at: string | null
          rejection_reason: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          author: string
          isbn?: string | null
          cover_url?: string | null
          total_pages?: number | null
          genre?: string | null
          publication_year?: number | null
          status?: string | null
          merged_with_id?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          author?: string
          isbn?: string | null
          cover_url?: string | null
          total_pages?: number | null
          genre?: string | null
          publication_year?: number | null
          status?: string | null
          merged_with_id?: string | null
          created_by?: string | null
          approved_by?: string | null
          approved_at?: string | null
          rejection_reason?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      exercise_results: {
        Row: {
          id: string
          user_id: string
          exercise_id: string
          session_date: string
          accuracy_percentage: number | null
          avg_response_time: number | null
          total_attempts: number | null
          correct_count: number | null
          wpm: number | null
          completion_time: number | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          exercise_id: string
          session_date: string
          accuracy_percentage?: number | null
          avg_response_time?: number | null
          total_attempts?: number | null
          correct_count?: number | null
          wpm?: number | null
          completion_time?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          exercise_id?: string
          session_date?: string
          accuracy_percentage?: number | null
          avg_response_time?: number | null
          total_attempts?: number | null
          correct_count?: number | null
          wpm?: number | null
          completion_time?: number | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      exercise_texts: {
        Row: {
          id: string
          exercise_id: string | null
          book_id: string | null
          title: string | null
          text_content: string
          word_count: number | null
          difficulty_level: string | null
          is_custom: boolean | null
          created_by: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          exercise_id?: string | null
          book_id?: string | null
          title?: string | null
          text_content: string
          word_count?: number | null
          difficulty_level?: string | null
          is_custom?: boolean | null
          created_by?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          exercise_id?: string | null
          book_id?: string | null
          title?: string | null
          text_content?: string
          word_count?: number | null
          difficulty_level?: string | null
          is_custom?: boolean | null
          created_by?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          title: string
          type: string
          difficulty: string | null
          tags: Json | null
          description: string | null
          instructions: string | null
          requires_subscription: boolean | null
          min_subscription_tier: string | null
          config: Json | null
          is_active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          title: string
          type: string
          difficulty?: string | null
          tags?: Json | null
          description?: string | null
          instructions?: string | null
          requires_subscription?: boolean | null
          min_subscription_tier?: string | null
          config?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          title?: string
          type?: string
          difficulty?: string | null
          tags?: Json | null
          description?: string | null
          instructions?: string | null
          requires_subscription?: boolean | null
          min_subscription_tier?: string | null
          config?: Json | null
          is_active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          id: string
          name: string
          description: string | null
          enabled: boolean | null
          requires_subscription: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          enabled?: boolean | null
          requires_subscription?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          enabled?: boolean | null
          requires_subscription?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          id: string
          key: string
          value: Json
          description: string | null
          category: string | null
          updated_by: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          key: string
          value: Json
          description?: string | null
          category?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          key?: string
          value?: Json
          description?: string | null
          category?: string | null
          updated_by?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          full_name: string | null
          city: string | null
          avatar_url: string | null
          role: string | null
          subscription_tier: string | null
          subscription_status: string | null
          privacy_settings: Json | null
          total_pages_read: number | null
          total_books_completed: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          full_name?: string | null
          city?: string | null
          avatar_url?: string | null
          role?: string | null
          subscription_tier?: string | null
          subscription_status?: string | null
          privacy_settings?: Json | null
          total_pages_read?: number | null
          total_books_completed?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          full_name?: string | null
          city?: string | null
          avatar_url?: string | null
          role?: string | null
          subscription_tier?: string | null
          subscription_status?: string | null
          privacy_settings?: Json | null
          total_pages_read?: number | null
          total_books_completed?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      reading_submissions: {
        Row: {
          id: string
          user_id: string
          book_id: string
          pages_read: number
          time_spent: number
          submission_date: string
          session_timestamp: string
          was_premium: boolean | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          book_id: string
          pages_read: number
          time_spent: number
          submission_date: string
          session_timestamp: string
          was_premium?: boolean | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          book_id?: string
          pages_read?: number
          time_spent?: number
          submission_date?: string
          session_timestamp?: string
          was_premium?: boolean | null
          notes?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
      subscription_limits: {
        Row: {
          id: string
          tier: string
          max_submissions_per_month: number | null
          max_custom_texts: number | null
          max_exercises: number | null
          can_see_leaderboard: boolean | null
          can_join_leaderboard: boolean | null
          can_see_book_stats: boolean | null
          can_export_data: boolean | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tier: string
          max_submissions_per_month?: number | null
          max_custom_texts?: number | null
          max_exercises?: number | null
          can_see_leaderboard?: boolean | null
          can_join_leaderboard?: boolean | null
          can_see_book_stats?: boolean | null
          can_export_data?: boolean | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tier?: string
          max_submissions_per_month?: number | null
          max_custom_texts?: number | null
          max_exercises?: number | null
          can_see_leaderboard?: boolean | null
          can_join_leaderboard?: boolean | null
          can_see_book_stats?: boolean | null
          can_export_data?: boolean | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          display_name: string
          price_monthly: number | null
          price_yearly: number | null
          stripe_price_id_monthly: string | null
          stripe_price_id_yearly: string | null
          features: Json
          limits: Json
          sort_order: number
          active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          display_name: string
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          features: Json
          limits: Json
          sort_order: number
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          display_name?: string
          price_monthly?: number | null
          price_yearly?: number | null
          stripe_price_id_monthly?: string | null
          stripe_price_id_yearly?: string | null
          features?: Json
          limits?: Json
          sort_order?: number
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_activity_log: {
        Row: {
          id: string
          user_id: string
          action: string
          entity_type: string | null
          entity_id: string | null
          metadata: Json | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          entity_type?: string | null
          entity_id?: string | null
          metadata?: Json | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_custom_texts: {
        Row: {
          id: string
          user_id: string
          title: string
          content: string
          word_count: number | null
          exercise_id: string | null
          last_used_at: string | null
          times_used: number | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          title: string
          content: string
          word_count?: number | null
          exercise_id?: string | null
          last_used_at?: string | null
          times_used?: number | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          title?: string
          content?: string
          word_count?: number | null
          exercise_id?: string | null
          last_used_at?: string | null
          times_used?: number | null
          created_at?: string | null
        }
        Relationships: []
      }
      user_exercise_stats: {
        Row: {
          id: string
          user_id: string
          exercise_type: string
          total_sessions: number | null
          total_time_spent: number | null
          best_score: number | null
          best_accuracy: number | null
          best_wpm: number | null
          average_score: number | null
          average_accuracy: number | null
          average_wpm: number | null
          current_difficulty: string | null
          current_level: number | null
          consecutive_sessions: number | null
          last_session_at: string | null
          adaptive_speed: number | null
          adaptive_multiplier: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          exercise_type: string
          total_sessions?: number | null
          total_time_spent?: number | null
          best_score?: number | null
          best_accuracy?: number | null
          best_wpm?: number | null
          average_score?: number | null
          average_accuracy?: number | null
          average_wpm?: number | null
          current_difficulty?: string | null
          current_level?: number | null
          consecutive_sessions?: number | null
          last_session_at?: string | null
          adaptive_speed?: number | null
          adaptive_multiplier?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          exercise_type?: string
          total_sessions?: number | null
          total_time_spent?: number | null
          best_score?: number | null
          best_accuracy?: number | null
          best_wpm?: number | null
          average_score?: number | null
          average_accuracy?: number | null
          average_wpm?: number | null
          current_difficulty?: string | null
          current_level?: number | null
          consecutive_sessions?: number | null
          last_session_at?: string | null
          adaptive_speed?: number | null
          adaptive_multiplier?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_monthly_usage: {
        Row: {
          id: string
          user_id: string | null
          month: string
          submission_count: number | null
          custom_texts_count: number | null
          exercises_used: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          month: string
          submission_count?: number | null
          custom_texts_count?: number | null
          exercises_used?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          month?: string
          submission_count?: number | null
          custom_texts_count?: number | null
          exercises_used?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          status: string
          billing_cycle: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status: string
          billing_cycle?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          status?: string
          billing_cycle?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_assessment_stats: {
        Row: {
          id: string
          user_id: string | null
          total_assessments_taken: number | null
          average_wpm: number | null
          average_comprehension: number | null
          last_assessment_id: string | null
          last_assessment_date: string | null
          last_assessment_wpm: number | null
          last_assessment_comprehension: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          total_assessments_taken?: number | null
          average_wpm?: number | null
          average_comprehension?: number | null
          last_assessment_id?: string | null
          last_assessment_date?: string | null
          last_assessment_wpm?: number | null
          last_assessment_comprehension?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          total_assessments_taken?: number | null
          average_wpm?: number | null
          average_comprehension?: number | null
          last_assessment_id?: string | null
          last_assessment_date?: string | null
          last_assessment_wpm?: number | null
          last_assessment_comprehension?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      subscription_tier_limits: {
        Row: {
          id: string
          tier_name: string
          monthly_assessment_limit: number
          daily_assessment_limit: number | null
          features: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          tier_name: string
          monthly_assessment_limit: number
          daily_assessment_limit?: number | null
          features?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          tier_name?: string
          monthly_assessment_limit?: number
          daily_assessment_limit?: number | null
          features?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      user_assessment_usage: {
        Row: {
          id: string
          user_id: string | null
          month_year: string
          assessments_taken: number | null
          last_assessment_date: string | null
          daily_count: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          month_year: string
          assessments_taken?: number | null
          last_assessment_date?: string | null
          daily_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          month_year?: string
          assessments_taken?: number | null
          last_assessment_date?: string | null
          daily_count?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      assessment_attempt_logs: {
        Row: {
          id: string
          user_id: string | null
          assessment_id: string | null
          attempt_count: number | null
          last_attempt_date: string | null
          best_wpm: number | null
          best_comprehension: number | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id?: string | null
          assessment_id?: string | null
          attempt_count?: number | null
          last_attempt_date?: string | null
          best_wpm?: number | null
          best_comprehension?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string | null
          assessment_id?: string | null
          attempt_count?: number | null
          last_attempt_date?: string | null
          best_wpm?: number | null
          best_comprehension?: number | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
        Database["public"]["Views"])
    ? (Database["public"]["Tables"] &
        Database["public"]["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
    ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
    ? Database["public"]["Enums"][PublicEnumNameOrOptions]
    : never