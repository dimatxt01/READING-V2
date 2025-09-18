'use client'

import { toast as sonnerToast } from 'sonner'

interface ToastProps {
  title?: string
  description?: string
  variant?: 'default' | 'destructive'
}

export function useToast() {
  const toast = ({ title, description, variant = 'default' }: ToastProps) => {
    const message = title || description || ''
    const descriptionText = title && description ? description : undefined
    
    if (variant === 'destructive') {
      sonnerToast.error(message, {
        description: descriptionText,
      })
    } else {
      sonnerToast.success(message, {
        description: descriptionText,
      })
    }
  }

  return { toast }
}