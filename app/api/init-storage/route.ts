import { createAdminClient } from '@/lib/supabase-admin'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const adminClient = createAdminClient()

    // Check if bucket exists
    const { data: buckets, error: listError } = await adminClient.storage.listBuckets()

    if (listError) {
      console.error('Error listing buckets:', listError)
      return NextResponse.json(
        { error: 'Failed to list buckets: ' + listError.message },
        { status: 500 }
      )
    }

    const avatarBucketExists = buckets.some((b) => b.name === 'avatars')

    if (!avatarBucketExists) {
      // Create bucket if it doesn't exist
      const { data: createData, error: createError } = await adminClient.storage.createBucket(
        'avatars',
        {
          public: true,
          fileSizeLimit: 5242880, // 5MB
        }
      )

      if (createError) {
        console.error('Error creating bucket:', createError)
        return NextResponse.json(
          { error: 'Failed to create bucket: ' + createError.message },
          { status: 500 }
        )
      }

      console.log('Avatars bucket created:', createData)
    } else {
      console.log('Avatars bucket already exists')
      // Make sure bucket is public
      await adminClient.storage.updateBucket('avatars', { public: true }).catch(() => {
        // Ignore errors if already public
      })
    }

    return NextResponse.json({
      success: true,
      message: avatarBucketExists ? 'Bucket already exists' : 'Bucket created successfully',
    })
  } catch (error) {
    console.error('Bucket initialization error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : 'Unknown error') },
      { status: 500 }
    )
  }
}
