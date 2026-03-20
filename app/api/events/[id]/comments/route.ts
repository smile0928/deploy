import {createClient} from '@/lib/supabase-server'
import { createAdminClient } from '@/lib/supabase-admin'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		const { id: eventId } = await params

		console.log('🔵 Comments GET API called with postId:', eventId)

		if (!eventId || eventId === 'undefined' || eventId === '') {
      console.error('❌ Invalid postId:', eventId)
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

		const supabase = await createClient()

		const {data: comments, error} = await supabase
		.from("event_comments")
		.select(`
			id,
			content,
			user_id,
			event_id,
			created_at
		`)
		.eq('event_id', eventId)
		.order('created_at', { ascending: false })

		if (error) {
      console.error('Get comments error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

		// Enhance comments with user data by fetching users separately
		let enhancedComments = comments || []
		if (enhancedComments.length > 0) {
			const userIds = [...new Set(enhancedComments.map(c => c.user_id))]
			const { data: users, error: userError } = await supabase
				.from('users')
				.select('id, username, avatar_url')
				.in('id', userIds)

			if (!userError && users) {
				const userMap = Object.fromEntries(users.map(u => [u.id, u]))
				enhancedComments = enhancedComments.map(comment => ({
					...comment,
					users: userMap[comment.user_id] || null
				}))
			}
		}

		return NextResponse.json(enhancedComments || [])
  } catch (error) {
    console.error('GET comments error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
	}
}

export async function POST(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> }
) {
	try {
		// CRITICAL: params is a Promise in Next.js 16, must await it!
		const { id: eventId } = await params

		console.log('🔵 Comments EVENT API called with postId:', eventId)
    
		if (!eventId) {
      console.error('❌ Missing postId')
      return NextResponse.json({ error: 'Invalid event ID' }, { status: 400 })
    }

		const supabase = await createClient()
		const adminClient = createAdminClient()

		const {
			data: { user },
		} = await supabase.auth.getUser()

	if (!user) {
		console.error('No authenticated user for comment')
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
	}

	const body = await request.json()
	const { content } = body

	if (!content || content.trim().length === 0) {
		return NextResponse.json(
			{ error: 'Content is required' },
			{ status: 400 }
		)
	}

	console.log('Creating comment:', { eventId, userId: user.id, contentLength: content.length })

	// One comment per user per event
	const { data: existingComment } = await supabase
		.from('event_comments')
		.select('id')
		.eq('event_id', eventId)
		.eq('user_id', user.id)
		.maybeSingle()

	if (existingComment) {
		return NextResponse.json(
			{ error: 'You have already commented on this event' },
			{ status: 409 }
		)
	}

	// Verify event exists before creating comment
    const { data: eventExists, error: eventError } = await supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle()

		if (eventError) {
      console.error('Error checking event:', eventError)
      return NextResponse.json({ error: 'Failed to verify event: ' + eventError.message }, { status: 500 })
    }

		if (!eventExists) {
      console.error('Event not found:', eventId)
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

		// Verify user exists before creating comment
    const { data: userExists, error: userCheckError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (userCheckError) {
      console.error('User check error:', userCheckError)
    }

		// Insert event comment using regular client with user context
		const { data, error } = await supabase
			.from('event_comments')
			.insert([
				{
					event_id: eventId,
					user_id: user.id,
					content: content.trim(),
				},
			])

		if (error) {
			console.error('Error inserting event comment:', error)

			if (error.code === '23503') {
        return NextResponse.json(
          { error: 'Comment or user does not exist' },
          { status: 404 }
        )
      }
			if (error.code === '23505') {
        return NextResponse.json(
          { error: 'You have already commented on this event' },
          { status: 409 }
        )
      }

			return NextResponse.json(
        { error: 'Failed to create comment: ' + error.message },
        { status: 500 }
      )
		}

		// Fetch the inserted comment with user data
		const { data: newComment, error: fetchError } = await supabase
			.from('event_comments')
			.select('id, content, user_id, event_id, created_at')
			.eq('user_id', user.id)
			.eq('event_id', eventId)
			.order('created_at', { ascending: false })
			.limit(1)
			.single()

		if (fetchError) {
			console.error('Error fetching created comment:', fetchError)
			// Return success anyway since insert worked - create minimal response
			const responseData = {
				id: `temp-${Date.now()}`,
				event_id: eventId,
				user_id: user.id,
				content: content.trim(),
				created_at: new Date().toISOString(),
			}
			console.log('Returning minimal comment response:', responseData)
			return NextResponse.json(responseData, { status: 201 })
		}

		// Get new comment count
    const { count } = await supabase
      .from('event_comments')
      .select('id', { count: 'exact', head: true })
      .eq('event_id', eventId)

		// Update events table with new count
    const { error: updateError } = await supabase
      .from('events')
      .update({ comments_count: count || 0 })
      .eq('id', eventId)
    
    if (updateError) {
      console.error('Error updating comment count:', updateError)
    }

		// Notify event owner about new comment
    const { data: eventOwner } = await supabase
      .from('events')
      .select('user_id')
      .eq('id', eventId)
      .maybeSingle()

		if (eventOwner?.user_id && eventOwner.user_id !== user.id) {
      const { error: notifyError } = await supabase
        .from('notifications')
        .insert([
          {
            user_id: eventOwner.user_id,
            sender_id: user.id,
            notification_type: 'comment',
            title: 'New comment on your event',
            message: null,
          },
        ])
      
      if (notifyError) {
        console.error('Error creating notification:', notifyError)
      }
    }

		console.log('Event comment created successfully:', newComment?.id, 'new count:', count)
    return NextResponse.json(newComment, { status: 201 })
	} catch (error) {
    console.error('Event comment error:', error)
    return NextResponse.json(
      { error: 'Internal server error: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    )
  }
}
