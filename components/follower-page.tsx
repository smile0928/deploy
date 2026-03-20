"use client"

import { useState, useEffect } from "react"
import { UserPlus, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

interface Suggestion {
  id: string
  username: string
  display_name: string
  avatar_url?: string
  bio?: string
  mutual_friends_count: number
  loves: string
}

export function FollowerPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [loading, setLoading] = useState(true)
  const [addingId, setAddingId] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchSuggestions = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/users/suggestions")
      if (!response.ok) {
        if (response.status === 401) return
        throw new Error("Failed to load suggestions")
      }
      const data = await response.json()
      setSuggestions(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Suggestions error:", err)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSuggestions()
  }, [])

  const handleAddFriend = async (userId: string) => {
    if (addingId) return
    setAddingId(userId)
    try {
      const response = await fetch("/api/friend-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: userId }),
      })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || "Failed to send request")
      setSuggestions((prev) => prev.filter((s) => s.id !== userId))
      toast.success("Friend request sent!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send request"
      toast.error(message)
    } finally {
      setAddingId(null)
    }
  }

  return (
    <div className="max-w-[720px] animate-fade-in">
      <h2 className="text-lg font-bold text-foreground">Follower</h2>
      <p className="mt-1 text-sm text-muted-foreground">People you may know</p>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : suggestions.length === 0 ? (
        <p className="mt-6 text-sm text-muted-foreground">No suggestions right now. Check back later!</p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {suggestions.map((s) => (
            <div
              key={s.id}
              className={cn(
                "flex flex-col items-center rounded-xl border border-border bg-card p-5 text-center",
                "transition-colors hover:border-primary/30"
              )}
            >
              <Avatar className="h-16 w-16 rounded-full border-2 border-border bg-muted">
                <AvatarImage
                  src={
                    s.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.id}`
                  }
                  alt={s.display_name}
                />
                <AvatarFallback className="bg-muted text-muted-foreground text-lg">
                  {s.username.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <p className="mt-3 text-sm font-bold text-foreground">
                {s.display_name}
              </p>
              <p className="text-xs text-muted-foreground">@{s.username}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {s.mutual_friends_count} mutual friend{s.mutual_friends_count !== 1 ? "s" : ""}
              </p>
              <span
                className={cn(
                  "mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-medium",
                  "bg-primary text-primary-foreground"
                )}
              >
                Loves {s.loves}
              </span>
              <Button
                className="mt-4 w-full rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                onClick={() => handleAddFriend(s.id)}
                disabled={addingId === s.id}
              >
                {addingId === s.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <UserPlus className="mr-1.5 h-4 w-4" />
                    Add Friend
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
