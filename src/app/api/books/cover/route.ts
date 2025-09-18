import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { validateImageFile, generateUniqueFileName } from '@/lib/storage/utils'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the form data
    const formData = await request.formData()
    const file = formData.get('file') as File
    const bookId = formData.get('bookId') as string
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Generate unique file name
    const fileName = generateUniqueFileName(file.name, bookId || 'book')
    // Don't include bucket name in the path
    const filePath = `${user.id}/${fileName}`

    // Upload to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('book-covers')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      return NextResponse.json({ 
        error: uploadError.message || 'Failed to upload file' 
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('book-covers')
      .getPublicUrl(filePath)

    // If bookId is provided, update the book's cover URL
    if (bookId) {
      const { error: updateError } = await supabase
        .from('books')
        .update({ 
          cover_url: publicUrl,
          updated_at: new Date().toISOString()
        })
        .eq('id', bookId)
        .eq('created_by', user.id) // Ensure user owns the book

      if (updateError) {
        // Try to delete the uploaded file if book update fails
        await supabase.storage
          .from('book-covers')
          .remove([filePath])
        
        return NextResponse.json({ 
          error: 'Failed to update book cover' 
        }, { status: 500 })
      }
    }

    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      path: filePath
    })

  } catch (error) {
    console.error('Error in book cover upload API:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Check authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the file path from query params
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')
    
    if (!filePath) {
      return NextResponse.json({ error: 'No file path provided' }, { status: 400 })
    }

    // Ensure the file belongs to the user
    if (!filePath.includes(`/${user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('book-covers')
      .remove([filePath])

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ 
        error: deleteError.message || 'Failed to delete file' 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      message: 'File deleted successfully'
    })

  } catch (error) {
    console.error('Error in book cover delete API:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}