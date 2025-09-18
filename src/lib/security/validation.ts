import { z } from 'zod'
import DOMPurify from 'isomorphic-dompurify'

// Custom validation schemas
export const ValidationSchemas = {
  // User input schemas
  profile: z.object({
    full_name: z.string()
      .min(1, 'Name is required')
      .max(100, 'Name too long')
      .regex(/^[a-zA-Z\s\-'\.]+$/, 'Name contains invalid characters'),
    city: z.string()
      .max(100, 'City name too long')
      .regex(/^[a-zA-Z\s\-'\.]+$/, 'City contains invalid characters')
      .optional(),
    avatar_url: z.string().url('Invalid URL').optional(),
  }),

  // Reading submission validation
  readingSubmission: z.object({
    book_id: z.string().uuid('Invalid book ID'),
    pages_read: z.number()
      .int('Pages must be a whole number')
      .min(1, 'Must read at least 1 page')
      .max(1000, 'Maximum 1000 pages per session'),
    time_spent: z.number()
      .int('Time must be a whole number')
      .min(1, 'Minimum 1 minute')
      .max(240, 'Maximum 240 minutes per session'),
    submission_date: z.string()
      .datetime('Invalid date format')
      .refine((date) => {
        const submissionDate = new Date(date)
        const now = new Date()
        const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
        return submissionDate <= now && submissionDate >= oneYearAgo
      }, 'Date must be within the last year and not in the future'),
    notes: z.string()
      .max(500, 'Notes too long')
      .optional()
      .transform((val) => val ? sanitizeHtml(val) : val),
  }),

  // Book creation validation
  book: z.object({
    title: z.string()
      .min(1, 'Title is required')
      .max(200, 'Title too long')
      .transform(sanitizeHtml),
    author: z.string()
      .min(1, 'Author is required')
      .max(100, 'Author name too long')
      .transform(sanitizeHtml),
    isbn: z.string()
      .regex(/^(?:ISBN(?:-1[03])?:? )?(?=[0-9X]{10}$|(?=(?:[0-9]+[- ]){3})[- 0-9X]{13}$|97[89][0-9]{10}$|(?=(?:[0-9]+[- ]){4})[- 0-9]{17}$)(?:97[89][- ]?)?[0-9]{1,5}[- ]?[0-9]+[- ]?[0-9]+[- ]?[0-9X]$/, 'Invalid ISBN format')
      .optional(),
    total_pages: z.number()
      .int('Pages must be a whole number')
      .min(1, 'Must have at least 1 page')
      .max(10000, 'Maximum 10,000 pages')
      .optional(),
    genre: z.string()
      .max(50, 'Genre too long')
      .optional()
      .transform((val) => val ? sanitizeHtml(val) : val),
    cover_url: z.string().url('Invalid cover URL').optional(),
  }),

  // Exercise result validation
  exerciseResult: z.object({
    exercise_id: z.string().uuid('Invalid exercise ID'),
    accuracy_percentage: z.number()
      .min(0, 'Accuracy cannot be negative')
      .max(100, 'Accuracy cannot exceed 100%')
      .optional(),
    avg_response_time: z.number()
      .min(0, 'Response time cannot be negative')
      .max(60000, 'Response time too high') // 60 seconds max
      .optional(),
    wpm: z.number()
      .min(0, 'WPM cannot be negative')
      .max(2000, 'WPM too high') // Reasonable upper limit
      .optional(),
    completion_time: z.number()
      .min(1, 'Completion time must be at least 1 second')
      .max(3600, 'Completion time too long'), // 1 hour max
    metadata: z.record(z.string(), z.any()).optional(),
  }),

  // Search validation
  search: z.object({
    q: z.string()
      .min(1, 'Search query required')
      .max(100, 'Search query too long')
      .transform(sanitizeSearchQuery),
    limit: z.number()
      .int('Limit must be a whole number')
      .min(1, 'Minimum limit is 1')
      .max(100, 'Maximum limit is 100')
      .optional()
      .default(10),
    offset: z.number()
      .int('Offset must be a whole number')
      .min(0, 'Offset cannot be negative')
      .optional()
      .default(0),
  }),

  // Assessment validation
  assessment: z.object({
    assessment_id: z.string().uuid('Invalid assessment ID'),
    answers: z.array(z.string().max(1000, 'Answer too long')).min(1, 'At least one answer required'),
    reading_time: z.number()
      .min(10, 'Reading time too short')
      .max(3600, 'Reading time too long'), // 1 hour max
  }),

  // File upload validation
  fileUpload: z.object({
    file: z.instanceof(File)
      .refine((file) => file.size <= 5 * 1024 * 1024, 'File too large (max 5MB)')
      .refine(
        (file) => ['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type),
        'Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed'
      ),
  }),

  // Admin actions validation
  adminBookAction: z.object({
    book_id: z.string().uuid('Invalid book ID'),
    action: z.enum(['approve', 'reject', 'merge'], 'Invalid action'),
    reason: z.string()
      .max(500, 'Reason too long')
      .optional()
      .transform((val) => val ? sanitizeHtml(val) : val),
    merge_target_id: z.string().uuid('Invalid merge target ID').optional(),
  }),

  // Privacy settings validation
  privacySettings: z.object({
    profile: z.object({
      showFullName: z.boolean(),
      showCity: z.boolean(),
      showAvatar: z.boolean(),
    }),
    stats: z.object({
      showPagesRead: z.boolean(),
      showBooksCompleted: z.boolean(),
      showReadingSpeed: z.boolean(),
      showExercisePerformance: z.boolean(),
    }),
    activity: z.object({
      showCurrentBooks: z.boolean(),
      showReadingHistory: z.boolean(),
      showSubmissionTimes: z.boolean(),
    }),
    leaderboard: z.object({
      showOnLeaderboard: z.boolean(),
      useRealName: z.boolean(),
    }),
  }),
}

// HTML sanitization
function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
    ALLOW_DATA_ATTR: false,
  })
}

// Search query sanitization
function sanitizeSearchQuery(query: string): string {
  // Remove potentially dangerous characters
  return query
    .replace(/[<>'"&]/g, '') // Remove HTML chars
    .replace(/[;(){}[\]]/g, '') // Remove SQL injection chars
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
}

// SQL injection prevention
export function escapeSqlString(str: string): string {
  return str.replace(/'/g, "''")
}

// XSS prevention utilities
export const XSSPrevention = {
  // Sanitize user input for display
  sanitizeForDisplay(input: string): string {
    return DOMPurify.sanitize(input, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
      ALLOWED_ATTR: [],
    })
  },

  // Sanitize for JSON output
  sanitizeForJson(input: string): string {
    return input
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t')
  },

  // Validate and sanitize URLs
  sanitizeUrl(url: string): string | null {
    try {
      const parsed = new URL(url)
      const allowedProtocols = ['http:', 'https:']
      
      if (!allowedProtocols.includes(parsed.protocol)) {
        return null
      }
      
      return parsed.toString()
    } catch {
      return null
    }
  },
}

// CSRF token validation
export class CSRFProtection {
  private static tokens = new Map<string, { token: string; expires: number }>()

  static generateToken(sessionId: string): string {
    const token = crypto.randomUUID()
    const expires = Date.now() + (24 * 60 * 60 * 1000) // 24 hours
    
    this.tokens.set(sessionId, { token, expires })
    return token
  }

  static validateToken(sessionId: string, token: string): boolean {
    const stored = this.tokens.get(sessionId)
    
    if (!stored || stored.expires < Date.now()) {
      this.tokens.delete(sessionId)
      return false
    }
    
    return stored.token === token
  }

  static cleanup() {
    const now = Date.now()
    for (const [sessionId, data] of this.tokens.entries()) {
      if (data.expires < now) {
        this.tokens.delete(sessionId)
      }
    }
  }
}

// Content validation for user-generated content
export const ContentValidation = {
  // Check for spam patterns
  isSpam(text: string): boolean {
    const spamPatterns = [
      /(.)\1{10,}/, // Repeated characters
      /https?:\/\/[^\s]+/gi, // Multiple URLs
      /\b(click here|buy now|free money|urgent|winner)\b/gi, // Spam keywords
    ]
    
    return spamPatterns.some(pattern => pattern.test(text))
  },

  // Profanity filter (basic implementation)
  containsProfanity(text: string): boolean {
    const profanityList = [
      // Add your profanity list here
      'badword1', 'badword2'
    ]
    
    const lowercaseText = text.toLowerCase()
    return profanityList.some(word => lowercaseText.includes(word))
  },

  // Check text length and quality
  validateTextQuality(text: string): { valid: boolean; issues: string[] } {
    const issues: string[] = []
    
    if (text.length < 10) {
      issues.push('Text too short')
    }
    
    if (text.length > 10000) {
      issues.push('Text too long')
    }
    
    if (this.isSpam(text)) {
      issues.push('Content appears to be spam')
    }
    
    if (this.containsProfanity(text)) {
      issues.push('Content contains inappropriate language')
    }
    
    return {
      valid: issues.length === 0,
      issues
    }
  }
}

// Input validation middleware
export function validateInput<T>(schema: z.ZodSchema<T>) {
  return (data: unknown): T => {
    try {
      return schema.parse(data)
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formattedErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }))
        
        throw new ValidationError('Input validation failed', formattedErrors)
      }
      throw error
    }
  }
}

// Custom validation error class
export class ValidationError extends Error {
  public errors: Array<{
    field: string
    message: string
    code: string
  }>

  constructor(message: string, errors: Array<{ field: string; message: string; code: string }>) {
    super(message)
    this.name = 'ValidationError'
    this.errors = errors
  }
}

// Cleanup expired CSRF tokens periodically
setInterval(() => {
  CSRFProtection.cleanup()
}, 60 * 60 * 1000) // Every hour