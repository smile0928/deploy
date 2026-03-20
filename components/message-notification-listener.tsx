"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { useAuth } from "@/context/auth-context"

/**
 * Subscribes to new messages where the current user is the recipient.
 * Dispatches newMessageReceived so the sidebar (and any other UI) can refresh
 * the unread message badge count.
 */
export function MessageNotificationListener() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()

    const channel = supabase
      .channel(`incoming_messages_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_id.eq.${user.id}`,
        },
        (payload: { new: { sender_id: string } }) => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("newMessageReceived", {
                detail: { sender_id: payload.new.sender_id },
              })
            )
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  return null
}
