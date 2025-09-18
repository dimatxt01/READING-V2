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
    const fileName = generateUniqueFileName(file.name, 'avatar')
    const filePath = `${user.id}/${fileName}`

    // Upload to Supabase storage
    console.log('Attempting to upload to avatars bucket:', { filePath, userId: user.id })
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error details:', uploadError)
      return NextResponse.json({ 
        error: uploadError.message || 'Failed to upload file' 
      }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    // Update the user's profile with the new avatar URL
    console.log('Attempting to update profile with avatar URL:', { userId: user.id, publicUrl })
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: publicUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Profile update error details:', updateError)
      // Try to delete the uploaded file if profile update fails
      await supabase.storage
        .from('avatars')
        .remove([filePath])
      
      return NextResponse.json({ 
        error: `Failed to update profile avatar: ${updateError.message}` 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true,
      url: publicUrl,
      path: filePath
    })

  } catch (error) {
    console.error('Error in avatar upload API:', error)
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
    if (!filePath.includes(`${user.id}/`)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('avatars')
      .remove([filePath])

    if (deleteError) {
      console.error('Delete error:', deleteError)
      return NextResponse.json({ 
        error: deleteError.message || 'Failed to delete file' 
      }, { status: 500 })
    }

    // Remove avatar URL from profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ 
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Failed to update profile after avatar deletion:', updateError)
      // Don't return error since the file was deleted successfully
    }

    return NextResponse.json({ 
      success: true,
      message: 'Avatar deleted successfully'
    })

  } catch (error) {
    console.error('Error in avatar delete API:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Internal server error' 
    }, { status: 500 })
  }
}