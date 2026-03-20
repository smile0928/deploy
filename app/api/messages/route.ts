import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    console.log("📬 Fetching conversations for user:", user.id)
    
    // Try with admin client first (bypass RLS)
    const { data: messages, error: messagesError } = await adminClient
      .from("messages")
      .select("id, sender_id, recipient_id, content, created_at, is_read")
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false })
      .limit(100)

    if (messagesError) {
      console.error("❌ Messages fetch error:", messagesError)
      return NextResponse.json({ 
        error: messagesError.message,
        code: messagesError.code,
        details: messagesError.details,
        hint: messagesError.hint
      }, { status: 500 })
    }

    console.log("✅ Fetched messages:", messages?.length || 0)

    // Build map of conversations (last message per partner)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    const isValidUuid = (id: string | null | undefined) =>
      id && typeof id === "string" && uuidRegex.test(id)

    const conversationMap = new Map<string, any>()
    const unreadMap = new Map<string, number>()

    messages?.forEach((msg) => {
      const otherUserId = msg.sender_id === user.id ? msg.recipient_id : msg.sender_id
      if (!isValidUuid(otherUserId)) return

      if (!conversationMap.has(otherUserId)) {
        conversationMap.set(otherUserId, msg)
      }

      // Count unread only for incoming messages that haven't been marked read
      if (
        msg.sender_id !== user.id &&
        msg.recipient_id === user.id &&
        msg.is_read === false
      ) {
        unreadMap.set(otherUserId, (unreadMap.get(otherUserId) || 0) + 1)
      }
    })

    const userIds = Array.from(conversationMap.keys()).filter(isValidUuid)
    if (userIds.length === 0) {
      console.log("✅ No conversations found, returning empty array")
      return NextResponse.json([])
    }

    const { data: usersData, error: usersError } = await adminClient
      .from("users")
      .select("id, username, avatar_url")
      .in("id", userIds)

    if (usersError) {
      console.error("❌ Users fetch error:", usersError)
      throw usersError
    }

    const usersMap = new Map(usersData?.map((u) => [u.id, u]) || [])
    const conversations = userIds
      .map((userId) => {
        const userData = usersMap.get(userId)
        const lastMsg = conversationMap.get(userId)

        return {
          id: userId,
          name: userData?.username || "Unknown",
          avatar: userData?.avatar_url || null,
          last_message: lastMsg?.content || "No messages yet",
          last_message_time: lastMsg?.created_at
            ? new Date(lastMsg.created_at).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            : "now",
          unread_count: unreadMap.get(userId) || 0,
          is_online: false,
        }
      })
      .sort((a, b) => {
        const timeA = new Date(a.last_message_time).getTime()
        const timeB = new Date(b.last_message_time).getTime()
        return timeB - timeA
      })

    return NextResponse.json(conversations)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const adminClient = createAdminClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log("❌ Message send failed: Not authenticated")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { recipient_id, content, image_url } = body

    console.log("📤 Attempting to send message:", { sender: user.id, recipient: recipient_id, content: content?.substring(0, 50) })

    if (!recipient_id || !content) {
      console.log("❌ Message send failed: Missing recipient_id or content")
      return NextResponse.json(
        { error: "Recipient ID and content are required" },
        { status: 400 }
      )
    }

    // Validate that recipient exists
    const { data: recipientData, error: recipientError } = await adminClient
      .from("users")
      .select("id")
      .eq("id", recipient_id)
      .single()

    if (recipientError || !recipientData) {
      return NextResponse.json(
        { error: "Recipient not found" },
        { status: 400 }
      )
    }

    // Don't allow sending messages to yourself
    if (recipient_id === user.id) {
      return NextResponse.json(
        { error: "Cannot send messages to yourself" },
        { status: 400 }
      )
    }

    const { data, error } = await adminClient.from("messages").insert([
      {
        sender_id: user.id,
        recipient_id,
        content,
        image_url: image_url || null,
      },
    ]).select().single()

    if (error) {
      console.error("❌ Message insert error:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log("✅ Message sent successfully:", { id: data.id, sender: user.id, recipient: recipient_id })
    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error("Error sending message:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
