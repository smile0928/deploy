import { createClient } from "@/lib/supabase-server"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // Test: Get users count
    const { count: usersCount, error: usersError } = await supabase
      .from("users")
      .select("*", { count: "exact" })

    // Test: Get posts count
    const { count: postsCount, error: postsError } = await supabase
      .from("posts")
      .select("*", { count: "exact" })

    // Test: Get messages count  
    const { count: messagesCount, error: messagesError } = await supabase
      .from("messages")
      .select("*", { count: "exact" })

    return NextResponse.json({
      status: "Testing Database",
      database: {
        users: {
          count: usersCount,
          error: usersError?.message || "OK"
        },
        posts: {
          count: postsCount,
          error: postsError?.message || "OK"
        },
        messages: {
          count: messagesCount,
          error: messagesError?.message || "OK"
        }
      },
      tables_working: !usersError && !postsError && !messagesError
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
      status: "FAILED"
    }, { status: 500 })
  }
}
