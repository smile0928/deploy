"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { useAuth } from "@/context/auth-context"

export interface BadgeCounts {
  messages: number
  notifications: number
  rooms: number
  events: number
}

const initial: BadgeCounts = {
  messages: 0,
  notifications: 0,
  rooms: 0,
  events: 0,
}

const BadgeCountsContext = createContext<BadgeCounts>(initial)

export function BadgeCountsProvider({ children }: { children: React.ReactNode }) {
  const { user, isAuthenticated } = useAuth()
  const [counts, setCounts] = useState<BadgeCounts>(initial)

  const fetchBadgeCounts = useCallback(async (signal?: AbortSignal) => {
    if (!isAuthenticated) {
      setCounts(initial)
      return
    }
    try {
      let unreadMessages = 0
      let unreadNotifications = 0
      let activeRooms = 0
      let upcomingEvents = 0

      const [messagesRes, notificationsRes, roomsRes, eventsRes] = await Promise.all([
        fetch("/api/messages", { cache: "no-store", signal }),
        fetch("/api/notifications", { cache: "no-store", signal }),
        fetch("/api/rooms", { signal }),
        fetch("/api/events", { signal }),
      ])

      const messagesData = messagesRes.ok ? await messagesRes.json() : []
      unreadMessages = Array.isArray(messagesData)
        ? messagesData.reduce((sum: number, conv: { unread_count?: number }) => sum + (conv.unread_count || 0), 0)
        : 0

      const notificationsData = notificationsRes.ok ? await notificationsRes.json() : []
      unreadNotifications = Array.isArray(notificationsData)
        ? notificationsData.filter((n: { is_read?: boolean }) => !n.is_read).length
        : 0

      const roomsData = roomsRes.ok ? await roomsRes.json() : []
      activeRooms = Array.isArray(roomsData) ? roomsData.length : 0

      const eventsData = eventsRes.ok ? await eventsRes.json() : []
      upcomingEvents = Array.isArray(eventsData) ? eventsData.length : 0

      setCounts({
        messages: unreadMessages,
        notifications: unreadNotifications,
        rooms: activeRooms > 0 ? Math.min(activeRooms, 9) : 0,
        events: upcomingEvents > 0 ? Math.min(upcomingEvents, 9) : 0,
      })
    } catch (err) {
      if (err instanceof Error && err.name !== "AbortError") {
        console.error("Error fetching badge counts:", err)
      }
    }
  }, [isAuthenticated])

  useEffect(() => {
    if (!user) {
      setCounts(initial)
      return
    }

    const ac = new AbortController()
    fetchBadgeCounts(ac.signal)
    const interval = setInterval(() => fetchBadgeCounts(ac.signal), 1000)

    const onMessagesRead = () => fetchBadgeCounts(ac.signal)
    const onNewMessageReceived = () => fetchBadgeCounts(ac.signal)
    const onNotificationsRead = () => {
      setCounts((prev) => ({ ...prev, notifications: 0 }))
      fetchBadgeCounts(ac.signal)
    }
    const onNewNotificationReceived = () => fetchBadgeCounts(ac.signal)

    window.addEventListener("messagesRead", onMessagesRead, true)
    window.addEventListener("newMessageReceived", onNewMessageReceived)
    window.addEventListener("notificationsRead", onNotificationsRead)
    window.addEventListener("newNotificationReceived", onNewNotificationReceived)

    return () => {
      ac.abort()
      clearInterval(interval)
      window.removeEventListener("messagesRead", onMessagesRead, true)
      window.removeEventListener("newMessageReceived", onNewMessageReceived)
      window.removeEventListener("notificationsRead", onNotificationsRead)
      window.removeEventListener("newNotificationReceived", onNewNotificationReceived)
    }
  }, [user, fetchBadgeCounts])

  return (
    <BadgeCountsContext.Provider value={counts}>
      {children}
    </BadgeCountsContext.Provider>
  )
}

export function useBadgeCounts() {
  const context = useContext(BadgeCountsContext)
  return context ?? initial
}
