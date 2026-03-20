"use client"

import { useEffect } from "react"
import { supabase } from "@/lib/supabase/client"
import { useAuth } from "@/context/auth-context"

/**
 * Subscribes to new notifications and notification read updates for the current user
 * via Supabase Realtime. Dispatches newNotificationReceived so the sidebar (and mobile nav)
 * can refresh the unread notification badge count in real time.
 */
export function NotificationBadgeListener() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    const channel = supabase
      .channel(`notification_badge_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("newNotificationReceived"))
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("newNotificationReceived"))
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
