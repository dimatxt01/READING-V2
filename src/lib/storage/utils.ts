import { createClient } from '@/lib/supabase/client'

export interface FileValidation {
  isValid: boolean
  error?: string
}

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024 // 5MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']

/**
 * Validates an image file for upload
 */
export function validateImageFile(file: File): FileValidation {
  // Check file exists
  if (!file) {
    return { isValid: false, error: 'No file provided' }
  }

  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    return { 
      isValid: false, 
      error: `File size must be less than ${MAX_FILE_SIZE / 1024 / 1024}MB` 
    }
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
    return { 
      isValid: false, 
      error: 'File must be an image (JPEG, PNG, GIF, or WebP)' 
    }
  }

  // Check file extension
  const fileName = file.name.toLowerCase()
  const hasValidExtension = ALLOWED_IMAGE_EXTENSIONS.some(ext => fileName.endsWith(ext))
  
  if (!hasValidExtension) {
    return { 
      isValid: false, 
      error: 'Invalid file extension' 
    }
  }

  return { isValid: true }
}

/**
 * Creates a preview URL for a file
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Cleans up a preview URL to prevent memory leaks
 */
export function cleanupPreviewUrl(url: string): void {
  URL.revokeObjectURL(url)
}

/**
 * Formats file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Generates a unique file name for storage
 */
export function generateUniqueFileName(originalName: string, prefix?: string): string {
  const timestamp = Date.now()
  const randomString = Math.random().toString(36).substring(2, 8)
  const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg'
  const cleanedName = originalName
    .split('.')[0]
    .replace(/[^a-zA-Z0-9]/g, '-')
    .substring(0, 50)
  
  if (prefix) {
    return `${prefix}_${timestamp}_${randomString}_${cleanedName}.${extension}`
  }
  
  return `${timestamp}_${randomString}_${cleanedName}.${extension}`
}

/**
 * Uploads a book cover to Supabase storage
 */
export async function uploadBookCover(
  file: File,
  bookId?: string
): Promise<UploadResult> {
  try {
    // Validate file
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      return { success: false, error: validation.error }
    }

    const supabase = createClient()
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (userError || !user) {
      return { success: false, error: 'User not authenticated' }
    }

    // Generate unique file name
    const fileName = generateUniqueFileName(file.name, bookId || 'book')
    // Don't include 'book-covers' in the path since it's the bucket name
    const filePath = `${user.id}/${fileName}`

    // Upload to Supabase storage
    const { error } = await supabase.storage
      .from('book-covers')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false
      })

    if (error) {
      console.error('Upload error:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('book-covers')
      .getPublicUrl(filePath)

    return { success: true, url: publicUrl }
  } catch (error) {
    console.error('Error uploading book cover:', error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to upload image' 
    }
  }
}

/**
 * Deletes a book cover from Supabase storage
 */
export async function deleteBookCover(coverUrl: string): Promise<boolean> {
  try {
    if (!coverUrl) return true
    
    const supabase = createClient()
    
    // Extract file path from URL
    const url = new URL(coverUrl)
    const pathParts = url.pathname.split('/storage/v1/object/public/book-covers/')
    if (pathParts.length < 2) return false
    
    const filePath = pathParts[1]
    
    // Delete from storage
    const { error } = await supabase.storage
      .from('book-covers')
      .remove([filePath])
    
    if (error) {
      console.error('Delete error:', error)
      return false
    }
    
    return true
  } catch (error) {
    console.error('Error deleting book cover:', error)
    return false
  }
}

/**
 * Gets placeholder initials for a book
 */
export function getBookInitials(title: string): string {
  if (!title) return '📚'
  
  const words = title.trim().split(' ')
  if (words.length === 1) {
    return title.substring(0, 2).toUpperCase()
  }
  
  return (words[0][0] + words[1][0]).toUpperCase()
}

/**
 * Gets a deterministic color for book placeholder based on title
 */
export function getBookPlaceholderColor(title: string): string {
  if (!title) return 'bg-gray-500'
  
  const colors = [
    'bg-red-500',
    'bg-orange-500',
    'bg-amber-500',
    'bg-yellow-500',
    'bg-lime-500',
    'bg-green-500',
    'bg-emerald-500',
    'bg-teal-500',
    'bg-cyan-500',
    'bg-sky-500',
    'bg-blue-500',
    'bg-indigo-500',
    'bg-violet-500',
    'bg-purple-500',
    'bg-fuchsia-500',
    'bg-pink-500',
    'bg-rose-500'
  ]
  
  // Generate a consistent index based on title
  let hash = 0
  for (let i = 0; i < title.length; i++) {
    hash = title.charCodeAt(i) + ((hash << 5) - hash)
  }
  
  const index = Math.abs(hash) % colors.length
  return colors[index]
}