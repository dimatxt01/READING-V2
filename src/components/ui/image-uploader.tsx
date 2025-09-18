'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'
import { Upload, X } from 'lucide-react'
import { 
  validateImageFile, 
  createPreviewUrl, 
  cleanupPreviewUrl,
  formatFileSize 
} from '@/lib/storage/utils'
import { cn } from '@/lib/utils/cn'

interface ImageUploaderProps {
  onFileSelect: (file: File | null) => void
  onRemove?: () => void
  previewUrl?: string
  label?: string
  disabled?: boolean
  className?: string
  accept?: string
  maxSize?: number
}

export function ImageUploader({
  onFileSelect,
  onRemove,
  previewUrl: externalPreviewUrl,
  label = 'Upload Image',
  disabled = false,
  className,
  accept = 'image/*',
  maxSize = 5 * 1024 * 1024 // 5MB default
}: ImageUploaderProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewUrl) {
        cleanupPreviewUrl(previewUrl)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update preview when external URL changes
  useEffect(() => {
    if (externalPreviewUrl && !previewUrl) {
      setPreviewUrl(externalPreviewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalPreviewUrl])

  const handleFileSelect = (selectedFile: File) => {
    // Validate file
    const validation = validateImageFile(selectedFile)
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file')
      return
    }

    // Check size
    if (selectedFile.size > maxSize) {
      setError(`File size must be less than ${formatFileSize(maxSize)}`)
      return
    }

    // Clear previous preview
    if (previewUrl && !externalPreviewUrl) {
      cleanupPreviewUrl(previewUrl)
    }

    // Create new preview
    const newPreviewUrl = createPreviewUrl(selectedFile)
    setPreviewUrl(newPreviewUrl)
    setFile(selectedFile)
    setError(null)
    onFileSelect(selectedFile)
  }

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      handleFileSelect(selectedFile)
    }
  }

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (disabled) return

    const droppedFile = e.dataTransfer.files?.[0]
    if (droppedFile) {
      handleFileSelect(droppedFile)
    }
  }

  const handleRemove = () => {
    if (previewUrl && !externalPreviewUrl) {
      cleanupPreviewUrl(previewUrl)
    }
    setPreviewUrl(null)
    setFile(null)
    setError(null)
    onFileSelect(null)
    onRemove?.()
    
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click()
    }
  }

  const displayUrl = previewUrl || externalPreviewUrl

  return (
    <div className={cn('space-y-2', className)}>
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileInputChange}
        disabled={disabled}
        className="hidden"
      />

      {!displayUrl ? (
        <div
          onClick={handleClick}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          className={cn(
            'relative border-2 border-dashed rounded-lg p-6 cursor-pointer transition-colors',
            dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-destructive'
          )}
        >
          <div className="flex flex-col items-center justify-center space-y-2">
            <Upload className="h-8 w-8 text-muted-foreground" />
            <div className="text-center">
              <p className="text-sm font-medium">{label}</p>
              <p className="text-xs text-muted-foreground">
                Click to upload or drag and drop
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Max size: {formatFileSize(maxSize)}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="relative group">
          <div className="aspect-[3/4] w-full max-w-[200px] mx-auto rounded-lg overflow-hidden border bg-muted">
            {displayUrl.startsWith('data:') || displayUrl.startsWith('blob:') ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayUrl}
                alt="Preview"
                className="w-full h-full object-cover"
                onError={() => {
                  setError('Failed to load image')
                  if (previewUrl && !externalPreviewUrl) {
                    cleanupPreviewUrl(previewUrl)
                    setPreviewUrl(null)
                  }
                }}
              />
            ) : (
              <Image
                src={displayUrl}
                alt="Preview"
                fill
                className="object-cover"
                onError={() => {
                  setError('Failed to load image')
                  if (previewUrl && !externalPreviewUrl) {
                    cleanupPreviewUrl(previewUrl)
                    setPreviewUrl(null)
                  }
                }}
              />
            )}
          </div>
          
          {!disabled && (
            <button
              type="button"
              onClick={handleRemove}
              className="absolute top-2 right-2 p-1 bg-background/80 backdrop-blur rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          {file && (
            <div className="mt-2 text-xs text-muted-foreground text-center">
              {file.name} ({formatFileSize(file.size)})
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  )
}