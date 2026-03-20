"use server"

import { createClient } from "@/lib/supabase-server"
import { redirect } from "next/navigation"

export async function createUserProfile(userId: string, email: string, username: string) {
  try {
    const supabase = await createClient()

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

    if (error) {
      console.error("Profile creation error:", error)
      return { success: false, error: error.message }
    }

    return { success: true, data }
  } catch (error) {
    console.error("Server action error:", error)
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Unknown error" 
    }
  }
}
