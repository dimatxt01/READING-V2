import { createClient } from '@/lib/supabase/server'

// GDPR compliance utilities
export interface DataExportRequest {
  userId: string
  requestDate: Date
  format: 'json' | 'csv' | 'xml'
  includePersonalData: boolean
  includeActivityData: boolean
  includePreferences: boolean
  [key: string]: unknown
}

export interface ExportData {
  exportDate: string
  userId: string
  requestId: string
  personalData?: {
    profile: Record<string, unknown> | null
    consentRecords: unknown[]
  }
  activityData?: {
    readingSessions: unknown[]
    exerciseResults: unknown[]
    assessmentResults: unknown[]
  }
  preferences?: Record<string, unknown>
  [key: string]: unknown
}

export interface ConsentMetadata {
  version?: string
  ip_address?: string
  user_agent?: string
  [key: string]: unknown
}

export interface UserProfile {
  id: string
  full_name?: string | null
  email?: string | null
  avatar_url?: string | null
  city?: string | null
  stripe_customer_id?: string | null
  internal_notes?: string | null
  privacy_settings?: Record<string, unknown> | null
  notification_preferences?: Record<string, unknown> | null
  updated_at?: string | null
  [key: string]: unknown
}

export interface UserUpdates {
  full_name?: string
  city?: string
  privacy_settings?: Record<string, unknown>
  notification_preferences?: Record<string, unknown>
  [key: string]: unknown
}

export interface DataDeletionRequest {
  userId: string
  requestDate: Date
  deleteProfile: boolean
  deleteReadingData: boolean
  deleteExerciseData: boolean
  retentionPeriod?: number // Days to keep essential data
  [key: string]: unknown
}

export class GDPRCompliance {
  private async getSupabase() {
    return await createClient()
  }

  // Right to Data Portability (Article 20)
  async exportUserData(request: DataExportRequest): Promise<string | ExportData> {
    const { userId, format, includePersonalData, includeActivityData, includePreferences } = request
    
    const exportData: ExportData = {
      exportDate: new Date().toISOString(),
      userId,
      requestId: crypto.randomUUID(),
    }

    try {
      // Personal data
      if (includePersonalData) {
        const supabase = await this.getSupabase()
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single()
        
        exportData.personalData = {
          profile: this.sanitizePersonalData(profile),
          consentRecords: [], // await this.getConsentRecords(userId), // Table doesn't exist yet
        }
      }

      // Activity data
      if (includeActivityData) {
        const supabase = await this.getSupabase()
        const [submissions, exercises, assessments] = await Promise.all([
          supabase
            .from('reading_submissions')
            .select(`
              id, pages_read, time_spent, submission_date, notes, created_at,
              books(title, author)
            `)
            .eq('user_id', userId),
          
          supabase
            .from('exercise_results')
            .select('*')
            .eq('user_id', userId),
          
          supabase
            .from('assessment_results')
            .select('*')
            .eq('user_id', userId)
        ])

        exportData.activityData = {
          readingSessions: submissions.data || [],
          exerciseResults: exercises.data || [],
          assessmentResults: assessments.data || [],
        }
      }

      // Preferences and settings
      if (includePreferences) {
        exportData.preferences = {} // await this.getUserPreferences(userId) // Column doesn't exist yet
      }

      // Log the export request
      await this.logDataRequest('export', userId, request)

      return this.formatExportData(exportData, format)
    } catch (error) {
      console.error('Data export failed:', error)
      throw new Error('Failed to export user data')
    }
  }

  // Right to Erasure/Deletion (Article 17)
  async deleteUserData(request: DataDeletionRequest): Promise<boolean> {
    const { userId, deleteProfile, deleteReadingData, deleteExerciseData, retentionPeriod } = request

    try {
      // Start transaction-like deletion process
      const deletionResults: string[] = []

      // Delete reading data
      if (deleteReadingData) {
        const supabase = await this.getSupabase()
        const { error: submissionsError } = await supabase
          .from('reading_submissions')
          .delete()
          .eq('user_id', userId)
        
        if (submissionsError) throw submissionsError
        deletionResults.push('reading_submissions')
      }

      // Delete exercise data
      if (deleteExerciseData) {
        const supabase = await this.getSupabase()
        const { error: exerciseError } = await supabase
          .from('exercise_results')
          .delete()
          .eq('user_id', userId)
        
        if (exerciseError) throw exerciseError
        deletionResults.push('exercise_results')

        const { error: assessmentError } = await supabase
          .from('assessment_results')
          .delete()
          .eq('user_id', userId)
        
        if (assessmentError) throw assessmentError
        deletionResults.push('assessment_results')
      }

      // Delete profile (complete account deletion)
      if (deleteProfile) {
        // Anonymize or delete profile data
        await this.anonymizeProfile(userId)
        deletionResults.push('profile_anonymized')
      }

      // Log the deletion request
      await this.logDataRequest('deletion', userId, request)

      // Schedule final cleanup if retention period specified
      if (retentionPeriod) {
        await this.scheduleDataCleanup(userId, retentionPeriod)
      }

      return true
    } catch (error) {
      console.error('Data deletion failed:', error)
      throw new Error('Failed to delete user data')
    }
  }

  // Right of Access (Article 15)
  async getUserDataSummary(userId: string) {
    try {
      const supabase = await this.getSupabase()
      const [profile, submissions, exercises, assessments] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase.from('reading_submissions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('exercise_results').select('*', { count: 'exact', head: true }).eq('user_id', userId),
        supabase.from('assessment_results').select('*', { count: 'exact', head: true }).eq('user_id', userId),
      ])

      return {
        personalData: {
          profileExists: !!profile.data,
          lastUpdated: profile.data?.updated_at,
          dataRetentionPeriod: '7 years from last activity',
        },
        activityData: {
          totalReadingSessions: submissions.count || 0,
          totalExerciseSessions: exercises.count || 0,
          totalAssessments: assessments.count || 0,
        },
        legalBasis: {
          processing: 'Legitimate interest and consent',
          retention: 'Data retention policy',
          rights: [
            'Right to access',
            'Right to rectification',
            'Right to erasure',
            'Right to restrict processing',
            'Right to data portability',
            'Right to object',
          ],
        },
      }
    } catch (error) {
      console.error('Failed to get user data summary:', error)
      throw new Error('Failed to retrieve user data summary')
    }
  }

  // Consent management
  async recordConsent(userId: string, consentType: string, granted: boolean, metadata?: ConsentMetadata) {
    try {
      // TODO: Implement when user_consents table is created
      console.log('Consent recorded:', { userId, consentType, granted, metadata })
      return true
    } catch (error) {
      console.error('Failed to record consent:', error)
      return false
    }
  }

  async getConsentRecords(/* userId: string */) {
    // TODO: Implement when user_consents table is created
    return []
  }

  // Data rectification (Article 16)
  async updateUserData(userId: string, updates: UserUpdates) {
    try {
      // Validate updates first
      const validatedUpdates = this.validateUserUpdates(updates)
      
      const supabase = await this.getSupabase()
      const { error } = await supabase
        .from('profiles')
        .update({
          ...validatedUpdates,
          updated_at: new Date().toISOString(),
        } as Record<string, unknown>) // Type assertion to handle Json vs Record mismatch
        .eq('id', userId)
      
      if (error) throw error
      
      // Log the update
      await this.logDataRequest('rectification', userId, { updates: Object.keys(validatedUpdates) })
      
      return true
    } catch (error) {
      console.error('Failed to update user data:', error)
      return false
    }
  }

  // Data minimization principle
  async cleanupExpiredData() {
    const cutoffDate = new Date()
    cutoffDate.setFullYear(cutoffDate.getFullYear() - 7) // 7 years retention

    try {
      // Clean up old activity data
      const supabase = await this.getSupabase()
      const { error: submissionsError } = await supabase
        .from('reading_submissions')
        .delete()
        .lt('created_at', cutoffDate.toISOString())
      
      if (submissionsError) throw submissionsError

      const { error: exercisesError } = await supabase
        .from('exercise_results')
        .delete()
        .lt('session_date', cutoffDate.toISOString())
      
      if (exercisesError) throw exercisesError

      console.log('Expired data cleanup completed')
    } catch (error) {
      console.error('Data cleanup failed:', error)
    }
  }

  // Privacy impact assessment
  async generatePrivacyReport() {
    return {
      dataTypes: [
        'Personal identifiers (name, email)',
        'Reading activity data',
        'Exercise performance data',
        'Usage analytics',
        'Preference settings',
      ],
      purposes: [
        'Service provision',
        'Performance analytics',
        'User experience improvement',
        'Communication',
      ],
      legalBasis: 'Consent and legitimate interest',
      dataSharing: 'No third-party sharing except service providers',
      retentionPeriod: '7 years from last activity',
      securityMeasures: [
        'Encryption at rest and in transit',
        'Access controls',
        'Regular security audits',
        'Data pseudonymization where possible',
      ],
      userRights: [
        'Access to data',
        'Data rectification',
        'Data erasure',
        'Data portability',
        'Processing restriction',
        'Object to processing',
      ],
    }
  }

  // Helper methods
  private sanitizePersonalData(profile: Record<string, unknown> | null) {
    if (!profile) return null
    
    // Remove sensitive fields that shouldn't be exported
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { stripe_customer_id, internal_notes, ...sanitized } = profile
    return sanitized
  }

  private async getUserPreferences(/* userId: string */) {
    // TODO: Implement when privacy_settings and notification_preferences columns are added
    return {}
  }

  private formatExportData(data: ExportData, format: 'json' | 'csv' | 'xml'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2)
      case 'csv':
        return this.convertToCSV(data)
      case 'xml':
        return this.convertToXML(data)
      default:
        return JSON.stringify(data)
    }
  }

  private convertToCSV(data: ExportData): string {
    // Simple CSV conversion - in production, use a proper CSV library
    const flattenedData = this.flattenObject(data)
    const headers = Object.keys(flattenedData).join(',')
    const values = Object.values(flattenedData).map(v => `"${v}"`).join(',')
    return `${headers}\n${values}`
  }

  private convertToXML(data: ExportData): string {
    // Simple XML conversion - in production, use a proper XML library
    return `<?xml version="1.0" encoding="UTF-8"?>\n<userdata>\n${this.objectToXML(data)}</userdata>`
  }

  private flattenObject(obj: Record<string, unknown>, prefix = ''): Record<string, unknown> {
    const flattened: Record<string, unknown> = {}
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        Object.assign(flattened, this.flattenObject(obj[key] as Record<string, unknown>, `${prefix}${key}.`))
      } else {
        flattened[`${prefix}${key}`] = obj[key]
      }
    }
    return flattened
  }

  private objectToXML(obj: Record<string, unknown>, indent = '  '): string {
    let xml = ''
    for (const key in obj) {
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        xml += `${indent}<${key}>\n${this.objectToXML(obj[key] as Record<string, unknown>, indent + '  ')}\n${indent}</${key}>\n`
      } else {
        xml += `${indent}<${key}>${obj[key]}</${key}>\n`
      }
    }
    return xml
  }

  private async anonymizeProfile(userId: string) {
    const supabase = await this.getSupabase()
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: 'Deleted User',
        email: `deleted-${userId}@example.com`,
        avatar_url: null,
        city: null,
        // Keep essential fields for data integrity
        updated_at: new Date().toISOString(),
      })
      .eq('id', userId)
    
    if (error) throw error
  }

  private validateUserUpdates(updates: UserUpdates): UserUpdates {
    // Implement validation logic for user updates
    const allowedFields = ['full_name', 'city', 'privacy_settings', 'notification_preferences']
    const validated: UserUpdates = {}
    
    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        validated[field] = updates[field]
      }
    }
    
    return validated
  }

  private async logDataRequest(type: string, userId: string, request: Record<string, unknown>) {
    try {
      // TODO: Implement when data_requests table is created
      console.log('Data request logged:', { type, userId, request })
    } catch (error) {
      console.error('Failed to log data request:', error)
    }
  }

  private async scheduleDataCleanup(userId: string, retentionPeriod: number) {
    const cleanupDate = new Date()
    cleanupDate.setDate(cleanupDate.getDate() + retentionPeriod)
    
    // In a real implementation, use a job queue or scheduled task
    console.log(`Scheduled data cleanup for user ${userId} on ${cleanupDate.toISOString()}`)
  }
}

// Data Processing Agreement compliance
export const DataProcessingAgreement = {
  purposes: [
    'Providing reading speed improvement services',
    'User progress tracking and analytics',
    'Exercise and assessment delivery',
    'User communication and support',
  ],
  
  categories: [
    'Identity data (name, email)',
    'Contact data (email, preferences)',
    'Usage data (reading sessions, exercises)',
    'Technical data (IP address, browser)',
  ],
  
  lawfulBasis: 'Consent and legitimate interests',
  
  retentionPeriod: '7 years from last account activity',
  
  securityMeasures: [
    'Encryption of data at rest and in transit',
    'Regular security testing and monitoring',
    'Access controls and authentication',
    'Staff training on data protection',
  ],
}