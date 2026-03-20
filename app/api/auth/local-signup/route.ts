import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase-admin"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body as { email?: string; password?: string }

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Derive a simple username from the email
    const username = email.split("@")[0] || "user"

    // Create auth user without sending any email (email_confirm true)
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        username,
      },
    })

    if (error || !data.user) {
      console.error("Admin createUser error:", error)
      return NextResponse.json(
        { error: error?.message || "Failed to create user" },
        { status: 400 }
      )
    }

    const user = data.user

    // Ensure a profile row exists in users table
    const { error: insertError } = await supabase
      .from("users")
      .upsert(
        {
          id: user.id,
          email: user.email || email,
          username,
          bio: null,
          full_name: null,
          avatar_url: null,
          website: null,
          location: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )

    if (insertError) {
      console.error("User profile upsert error:", insertError)
      // Still treat signup as successful; auth user exists
    }

    return NextResponse.json(
      {
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("local-signup API error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

