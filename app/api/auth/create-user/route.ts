import { createAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { userId, email, username } = body

    if (!userId || !email || !username) {
      return NextResponse.json(
        { error: "Missing userId, email, or username" },
        { status: 400 }
      )
    }

    // Use ADMIN client to bypass RLS
    const supabase = createAdminClient()

    // First update auth user to confirm email
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      userId,
      { email_confirm: true }
    )

    if (updateError) {
      console.error("Email confirmation error:", updateError)
      // Don't fail - continue with profile creation
    } else {
      console.log("Email confirmed for user:", userId)
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from("users")
      .select("id")
      .eq("id", userId)
      .single()

    if (existingUser) {
      console.log("User already exists:", userId)
      return NextResponse.json({ success: true }, { status: 201 })
    }

    // Insert user with explicit values
    const { error } = await supabase
      .from("users")
      .insert({
        id: userId,
        email: email,
        username: username,
        bio: null,
        full_name: null,
        avatar_url: null,
        website: null,
        location: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })

    if (error) {
      console.error("User insert error:", {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      })
      // Don't fail - the user still got created in auth
      return NextResponse.json({ success: true }, { status: 201 })
    }

    console.log("User created successfully")
    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error("Signup API error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}
