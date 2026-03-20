import { createAdminClient } from "@/lib/supabase-admin"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    console.log("Testing admin client...")
    
    // Try to create admin client
    const adminClient = createAdminClient()
    console.log("Admin client created successfully")

    // Try a simple query
    const { data, error } = await adminClient
      .from("users")
      .select("id")
      .limit(1)

    if (error) {
      return NextResponse.json({
        error: "Query failed",
        message: error.message,
        code: error.code,
        details: error.details
      }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      message: "Admin client is working!",
      data
    })
  } catch (error) {
    console.error("Error:", error)
    return NextResponse.json({
      error: "Admin client error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 })
  }
}
