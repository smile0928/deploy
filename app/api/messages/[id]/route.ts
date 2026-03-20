import { createClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // CRITICAL: params is a Promise in Next.js 16, must await it!
    const { id: conversationId } = await params
    
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Support pagination via cursor
    const url = new URL(request.url)
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50'), 100)
    const cursor = url.searchParams.get('cursor')

    // Build query with pagination
    let query = supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${conversationId}),and(sender_id.eq.${conversationId},recipient_id.eq.${user.id})`)
      .order("created_at", { ascending: true })

    // Apply cursor-based pagination if provided (cursor is ISO created_at of oldest message in current page)
    if (cursor) {
      try {
        const cursorDate = new Date(cursor)
        if (!isNaN(cursorDate.getTime())) query = query.lt("created_at", cursor)
      } catch {
        // ignore invalid cursor
      }
    }

    const { data, error } = await query.limit(limit)

    if (error) throw error

    // Transform to match UI expectations (include created_at for sorting)
    const messages = data.map((msg: { id: string; sender_id: string; content: string; created_at: string }) => ({
      id: msg.id,
      sender: msg.sender_id === user.id ? "me" : "them",
      text: msg.content,
      time: new Date(msg.created_at).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      created_at: msg.created_at,
    }))

    // Return messages with pagination info (cursor = oldest message's created_at for "load older")
    const nextCursor =
      messages.length === limit && data.length > 0
        ? (data as { created_at: string }[])[0]?.created_at
        : null
    return NextResponse.json({
      messages,
      nextCursor,
      hasMore: messages.length === limit,
    })
  } catch (error) {
    console.error("Error fetching messages:", error)
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    )
  }
}
