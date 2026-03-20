"use client"

import { useEffect } from "react"
import { createClient } from "@/lib/supabase-client"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

/**
 * Subscribes to new friend requests (where current user is the recipient)
 * and to friend_request notifications. When either fires, the Friends page
 * Requests tab is refreshed with new data from the database.
 */
export function FriendRequestNotificationListener() {
  const { user } = useAuth()

  useEffect(() => {
    if (!user?.id) return

    const supabase = createClient()
console.log("friend ###################")
    const channel = supabase
      .channel(`friend_request_notifications_${user.id}`)
      // .on(
      //   "postgres_changes",
      //   {
      //     event: "INSERT",
      //     schema: "public",
      //     table: "friend_requests",
      //     filter: `to_user_id.eq.${user.id}`,
      //   },
      //   async (payload) => {
      //     const newRow = payload.new as { from_user_id?: string; status?: string }
      //     if (newRow.status !== "pending") return

      //     // Notify Friends page to refresh Requests tab with new data from Supabase
      //     if (typeof window !== "undefined") {
      //       console.log("##############################################", payload)
      //       window.dispatchEvent(new CustomEvent("friend-request-received"))
      //     }

      //     const fromUserId = newRow.from_user_id
      //     if (!fromUserId) {
      //       toast.info("You received a friend request")
      //       return
      //     }

      //     try {
      //       const res = await fetch(`/api/users/${fromUserId}`)
      //       if (res.ok) {
      //         const data = await res.json()
      //         const name = data.username || data.full_name || "Someone"
      //         toast.info(`${name} sent you a friend request`, {
      //           action: {
      //             label: "View",
      //             onClick: () => window.location.assign("/friends"),
      //           },
      //         })
      //       } else {
      //         toast.info("You received a friend request")
      //       }
      //     } catch {
      //       toast.info("You received a friend request")
      //     }
      //   }
      // )
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id.eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as { notification_type?: string }
          const type = row.notification_type
          if(type === "friend_request") {
            console.log("############ ########## ###########")
            window.dispatchEvent(new CustomEvent("friend-request-received"))
          }
          // Incoming friend request or request withdrawn: refresh Requests tab so list stays in sync
          if (type === "friend_request" || type === "friend_request_withdrawn") {
            if (typeof window !== "undefined") {
              // window.dispatchEvent(new CustomEvent("friend-request-received"))
            }
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
