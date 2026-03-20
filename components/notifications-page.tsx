"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Heart,
  MessageCircle,
  UserPlus,
  Share2,
  Star,
  Bell,
  AtSign,
  Flame,
  Loader2,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

interface Notification {
  id: string
  user_id: string
  sender_id?: string
  notification_type: string
  title: string
  message?: string
  is_read: boolean
  created_at: string
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/notifications")
        if (!response.ok) {
          if (response.status === 401) {
            setLoading(false)
            return
          }
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch notifications")
        }
        const data = await response.json()
        setNotifications(Array.isArray(data) ? data : data.notifications || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading notifications")
        setNotifications([])
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [])

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const handleMarkAllRead = async () => {
    if (unreadCount === 0) return
    try {
      const res = await fetch("/api/notifications", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mark_all: true }),
      })
      if (!res.ok) throw new Error("Failed to mark as read")
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      window.dispatchEvent(new CustomEvent("notificationsRead"))
    } catch {
      setError("Failed to mark all as read")
    }
  }

  const handleNotificationClick = async (notif: Notification) => {
    const friendRelatedTypes = ["friend_request", "friend_request_declined", "friend_request_withdrawn", "friend_removed"]
    const goToFriendsPage = friendRelatedTypes.includes(notif.notification_type)

    if (!notif.is_read) {
      try {
        const res = await fetch("/api/notifications", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notification_id: notif.id, is_read: true }),
        })
        if (res.ok) {
          setNotifications((prev) =>
            prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
          )
          window.dispatchEvent(new CustomEvent("notificationsRead"))
        }
      } catch {
        setError("Failed to mark notification as read")
      }
    }

    if (goToFriendsPage) {
      router.push("/friends")
    }
  }

  if (loading) {
    return (
      <div className="max-w-[640px] flex items-center justify-center h-64 animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-[640px] animate-fade-in-up">
        <p className="text-sm text-red-500">Error: {error}</p>
      </div>
    )
  }

  if (notifications.length === 0) {
    return (
      <div className="max-w-[640px] flex flex-col items-center justify-center gap-2 py-8 animate-fade-in-up">
        <Bell className="h-12 w-12 text-muted-foreground/50" />
        <p className="text-sm text-muted-foreground">No notifications yet</p>
      </div>
    )
  }

  return (
    <div className="max-w-[640px] animate-fade-in">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-lg font-bold text-foreground">Notifications</h2>
          {unreadCount > 0 && (
            <span className="flex h-6 items-center rounded-full bg-primary px-2 text-xs font-bold text-primary-foreground">
              {unreadCount} new
            </span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground hover:text-primary transition-colors hover-scale shrink-0"
          onClick={handleMarkAllRead}
        >
          Mark all as read
        </Button>
      </div>

      <div className="mt-4 flex flex-col gap-1 animate-stagger">
        {notifications.map((notif) => {
          const getTypeIcon = (type: string) => {
            switch (type) {
              case "like":
                return Heart
              case "comment":
                return MessageCircle
              case "follow":
              case "friend_request":
              case "friend_request_declined":
              case "friend_request_withdrawn":
              case "friend_removed":
                return UserPlus
              case "mention":
                return AtSign
              case "share":
                return Share2
              case "event":
                return Star
              case "trending":
                return Flame
              default:
                return Bell
            }
          }

          const IconComponent = getTypeIcon(notif.notification_type)

          const friendRelatedTypes = ["friend_request", "friend_request_declined", "friend_request_withdrawn", "friend_removed"]
          const goToFriendsPage = friendRelatedTypes.includes(notif.notification_type)
          return (
            <div
              key={notif.id}
              role="button"
              tabIndex={0}
              onClick={() => handleNotificationClick(notif)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleNotificationClick(notif)
                }
              }}
              className={cn(
                "flex items-start gap-3 rounded-xl p-3 transition-all hover-lift cursor-pointer",
                !notif.is_read && "bg-primary/5 border border-primary/10",
                notif.is_read && "hover:bg-secondary"
              )}
            >
              <div className="relative shrink-0">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${notif.sender_id}`} alt={notif.title} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {notif.title.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-card">
                  <IconComponent className="h-3 w-3 text-primary" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-secondary-foreground leading-relaxed">
                  <span className="font-semibold text-foreground">{notif.title}</span>
                  {notif.message && ` ${notif.message}`}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(notif.created_at).toLocaleDateString()}
                </p>
              </div>
              {!notif.is_read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse-glow" />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
