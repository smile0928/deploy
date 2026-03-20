import { createClient } from "@/lib/supabase-server"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, username } = body

    if (!userId || !email || !username) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    console.log("Attempting to insert user:", { userId, email, username })

    const { data, error } = await supabase
      .from("users")
      .insert([
        {
          id: userId,
          email: email,
          username: username,
          created_at: new Date().toISOString(),
        },
      ])
      .select()

    console.log("Insert response:", { data, error })

    if (error) {
      return NextResponse.json(
        { error: error.message, code: error.code, details: error.details },
        { status: 400 }
      )
    }

    return NextResponse.json({ success: true, data })
  } catch (error) {
    console.error("Test user creation error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const supabase = await createClient()

    // Check auth status
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    console.log("Auth user:", user?.id, "Error:", authError?.message)

    // Try to fetch users
    const { data: users, error: usersError, count } = await supabase
      .from("users")
      .select("*", { count: "exact" })
      .limit(5)

    console.log("Users count:", count, "Error:", usersError?.message)

    return NextResponse.json({
      authenticated: !!user,
      userId: user?.id,
      usersTableCount: count,
      usersTableError: usersError?.message,
      authError: authError?.message,
      sample_users: users,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
