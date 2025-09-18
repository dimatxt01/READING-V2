import { NextRequest, NextResponse } from 'next/server'

// Security headers configuration
export const SecurityHeaders = {
  // Content Security Policy
  contentSecurityPolicy: {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'unsafe-inline'", // Required for Next.js
      "'unsafe-eval'", // Required for development
      'https://js.stripe.com',
      'https://checkout.stripe.com',
    ],
    'style-src': [
      "'self'",
      "'unsafe-inline'", // Required for Tailwind CSS
      'https://fonts.googleapis.com',
    ],
    'img-src': [
      "'self'",
      'data:',
      'blob:',
      'https:',
      'https://supabase.dev.coolifyai.com',
    ],
    'font-src': [
      "'self'",
      'data:',
      'https://fonts.gstatic.com',
    ],
    'connect-src': [
      "'self'",
      'https://api.stripe.com',
      'https://*.supabase.co',
      'https://supabase.dev.coolifyai.com',
      'wss://*.supabase.co',
    ],
    'frame-src': [
      "'self'",
      'https://js.stripe.com',
      'https://checkout.stripe.com',
    ],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'frame-ancestors': ["'none'"],
    'upgrade-insecure-requests': [],
  },

  // Generate CSP header string
  generateCSP(): string {
    return Object.entries(this.contentSecurityPolicy)
      .map(([directive, sources]) => {
        if (sources.length === 0) return directive
        return `${directive} ${sources.join(' ')}`
      })
      .join('; ')
  },

  // Security headers for all responses
  getSecurityHeaders(): Record<string, string> {
    return {
      // Content Security Policy
      'Content-Security-Policy': this.generateCSP(),
      
      // Prevent MIME type sniffing
      'X-Content-Type-Options': 'nosniff',
      
      // XSS Protection
      'X-XSS-Protection': '1; mode=block',
      
      // Prevent clickjacking
      'X-Frame-Options': 'DENY',
      
      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      
      // HSTS (HTTP Strict Transport Security)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
      
      // Remove server information
      'X-Powered-By': '',
      
      // Permissions Policy (formerly Feature Policy)
      'Permissions-Policy': [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'interest-cohort=()',
        'payment=(self)',
        'usb=()',
      ].join(', '),
      
      // Cross-Origin Policies
      'Cross-Origin-Embedder-Policy': 'credentialless',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    }
  },

  // API-specific headers
  getAPIHeaders(): Record<string, string> {
    return {
      ...this.getSecurityHeaders(),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store, no-cache, must-revalidate, private',
      'Pragma': 'no-cache',
      'Expires': '0',
    }
  },
}

// CORS configuration
export const CORSConfig = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://readspeed.app', 'https://www.readspeed.app'] // Replace with your domains
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'X-CSRF-Token',
  ],
  credentials: true,
  maxAge: 86400, // 24 hours
}

// Apply CORS headers
export function setCORSHeaders(response: NextResponse, request: NextRequest): NextResponse {
  const origin = request.headers.get('origin')
  
  // Check if origin is allowed
  if (origin && CORSConfig.origin.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin)
  }
  
  response.headers.set('Access-Control-Allow-Methods', CORSConfig.methods.join(', '))
  response.headers.set('Access-Control-Allow-Headers', CORSConfig.allowedHeaders.join(', '))
  response.headers.set('Access-Control-Allow-Credentials', CORSConfig.credentials.toString())
  response.headers.set('Access-Control-Max-Age', CORSConfig.maxAge.toString())
  
  return response
}

// Security middleware
export function withSecurityHeaders(
  handler: (req: NextRequest) => Promise<NextResponse> | NextResponse
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      const response = new NextResponse(null, { status: 200 })
      return setCORSHeaders(response, req)
    }

    try {
      const response = await handler(req)
      
      // Apply security headers
      const securityHeaders = SecurityHeaders.getSecurityHeaders()
      Object.entries(securityHeaders).forEach(([key, value]) => {
        if (value) {
          response.headers.set(key, value)
        }
      })
      
      // Apply CORS headers
      setCORSHeaders(response, req)
      
      return response
    } catch {
      // Ensure error responses also have security headers
      const errorResponse = new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500 }
      )
      
      const securityHeaders = SecurityHeaders.getAPIHeaders()
      Object.entries(securityHeaders).forEach(([key, value]) => {
        if (value) {
          errorResponse.headers.set(key, value)
        }
      })
      
      return errorResponse
    }
  }
}

// Secure cookie configuration
export const SecureCookieConfig = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 7 * 24 * 60 * 60, // 7 days
}

// Set secure cookie
export function setSecureCookie(
  response: NextResponse,
  name: string,
  value: string,
  options: Partial<typeof SecureCookieConfig> = {}
) {
  const config = { ...SecureCookieConfig, ...options }
  
  const cookieValue = [
    `${name}=${value}`,
    `Path=${config.path}`,
    `Max-Age=${config.maxAge}`,
    `SameSite=${config.sameSite}`,
    config.httpOnly ? 'HttpOnly' : '',
    config.secure ? 'Secure' : '',
  ].filter(Boolean).join('; ')
  
  response.headers.set('Set-Cookie', cookieValue)
  return response
}

// Request logging for security monitoring
export function logSecurityEvent(
  event: 'auth_attempt' | 'rate_limit' | 'validation_error' | 'suspicious_activity',
  req: NextRequest,
  details?: Record<string, unknown>
) {
  const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
  const userAgent = req.headers.get('user-agent') || 'unknown'
  const timestamp = new Date().toISOString()
  
  const logEntry = {
    timestamp,
    event,
    ip,
    userAgent,
    url: req.url,
    method: req.method,
    ...details,
  }
  
  // In production, send to logging service (e.g., Datadog, LogRocket, etc.)
  console.log('[SECURITY]', JSON.stringify(logEntry))
  
  // Check for suspicious patterns
  checkSuspiciousActivity(logEntry)
}

// Detect suspicious activity patterns
function checkSuspiciousActivity(logEntry: Record<string, unknown>) {
  const url = typeof logEntry.url === 'string' ? logEntry.url : ''
  
  const suspiciousPatterns = [
    // Multiple failed auth attempts from same IP
    logEntry.event === 'auth_attempt' && logEntry.success === false,
    
    // SQL injection attempts
    url.includes('UNION') || url.includes('SELECT'),
    
    // XSS attempts
    url.includes('<script>') || url.includes('javascript:'),
    
    // Path traversal attempts
    url.includes('../') || url.includes('..\\'),
  ]
  
  if (suspiciousPatterns.some(Boolean)) {
    console.warn('[SECURITY ALERT]', 'Suspicious activity detected:', logEntry)
    
    // In production, implement:
    // - IP blocking
    // - Alert notifications
    // - Enhanced monitoring
  }
}

// HTTPS redirect in production
export function enforceHTTPS(req: NextRequest): NextResponse | null {
  if (process.env.NODE_ENV === 'production') {
    const proto = req.headers.get('x-forwarded-proto')
    
    if (proto !== 'https') {
      const url = new URL(req.url)
      url.protocol = 'https:'
      
      return NextResponse.redirect(url, 301)
    }
  }
  
  return null
}

// Bot detection
export function detectBot(req: NextRequest): boolean {
  const userAgent = req.headers.get('user-agent')?.toLowerCase() || ''
  
  const botPatterns = [
    'bot', 'crawler', 'spider', 'scraper',
    'curl', 'wget', 'python-requests',
    'googlebot', 'bingbot', 'facebookexternalhit'
  ]
  
  return botPatterns.some(pattern => userAgent.includes(pattern))
}

// Honeypot field validation (trap for bots)
export function validateHoneypot(formData: FormData): boolean {
  const honeypotField = formData.get('website') // Hidden field that should be empty
  return !honeypotField || honeypotField === ''
}