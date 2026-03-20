import { createClient } from "@/lib/supabase-server"
import { createAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { sender_id } = body

    if (!sender_id) {
      return NextResponse.json(
        { error: "Sender ID is required" },
        { status: 400 }
      )
    }

    // Mark all messages from sender_id to current user as read
    const { data, error } = await adminClient
      .from("messages")
      .update({ is_read: true })
      .eq("sender_id", sender_id)
      .eq("recipient_id", user.id)
      .eq("is_read", false)
      .select()

    if (error) {
      console.error("Error marking messages as read:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(`✅ Marked ${data?.length || 0} messages as read from ${sender_id}`)

    return NextResponse.json({
      success: true,
      markedCount: data?.length || 0,
    })
  } catch (error) {
    console.error("Error in mark-read endpoint:", error)
    return NextResponse.json(
      { error: "Failed to mark messages as read" },
      { status: 500 }
    )
  }
}
