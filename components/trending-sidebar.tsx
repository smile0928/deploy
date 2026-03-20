"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { TrendingUp, Users, Flame, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TrendingTag {
  tag: string
  posts: number
  category?: string
}

interface Room {
  id: string
  name: string
  member_count: number
  image_url?: string
}

interface UserProfile {
  id: string
  username: string
  avatar_url?: string
  bio?: string
  followers_count?: number
}

export function TrendingSidebar() {
  const [trending, setTrending] = useState<TrendingTag[]>([])
  const [rooms, setRooms] = useState<Room[]>([])
  const [followers, setFollowers] = useState<UserProfile[]>([])
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())
  const [followLoadingId, setFollowLoadingId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)

        // Fetch posts to find trending anime tags
        const postsRes = await fetch("/api/posts")
        if (postsRes.ok) {
          const posts = await postsRes.json()
          const tagCounts: Record<string, number> = {}

          // Count anime tags from all posts
          if (Array.isArray(posts)) {
            posts.forEach((post) => {
              if (post.anime_tags) {
                const tags = Array.isArray(post.anime_tags)
                  ? post.anime_tags
                  : String(post.anime_tags).split(",").map((t) => t.trim())
                tags.forEach((tag) => {
                  if (tag) {
                    tagCounts[`#${tag}`] = (tagCounts[`#${tag}`] || 0) + 1
                  }
                })
              }
            })
          }

          // Sort by count and keep only tags with at least 10 posts
          const trendingTags = Object.entries(tagCounts)
            .filter(([, count]) => count >= 10)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([tag, count]) => ({
              tag,
              posts: count,
              category: "Anime",
            }))

          setTrending(trendingTags)
        }

        // Fetch rooms
        const roomsRes = await fetch("/api/rooms")
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json()
          setRooms(Array.isArray(roomsData) ? roomsData.slice(0, 3) : [])
        }

        // Fetch top 3 users by follower count (sorted decreasing, excludes 0)
        const topRes = await fetch("/api/users/top-followers")
        if (topRes.ok) {
          const topData = await topRes.json()
          setFollowers(Array.isArray(topData) ? topData : [])
        }

        // Fetch current user's following so we can show Follow vs Following
        const followingRes = await fetch("/api/followers")
        if (followingRes.ok) {
          const following = await followingRes.json()
          const ids = new Set(
            Array.isArray(following) ? following.map((f: { id: string }) => f.id) : []
          )
          setFollowingIds(ids)
        }
      } catch (error) {
        console.error("Error fetching trending data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
    const interval = setInterval(fetchData, 60000) // Refresh every minute
    return () => clearInterval(interval)
  }, [])

  const handleFollow = async (userId: string) => {
    setFollowLoadingId(userId)
    try {
      const res = await fetch("/api/followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: userId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to follow")
      setFollowingIds((prev) => {
        const next = new Set(prev)
        if (data.following) next.add(userId)
        else next.delete(userId)
        return next
      })
      toast.success(data.following ? "Following!" : "Unfollowed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to follow")
    } finally {
      setFollowLoadingId(null)
    }
  }

  return (
    <div className="sticky top-4 flex flex-col gap-4">
      {/* Search */}
      <div className="relative">
        <input
          type="search"
          placeholder="Search AniVerse..."
          className="w-full rounded-xl border border-border bg-secondary px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          aria-label="Search AniVerse"
        />
      </div>

      {/* Trending */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-foreground">
          <TrendingUp className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">Trending Now</h2>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : trending.length === 0 ? (
            <p className="text-xs text-muted-foreground">No trending tags yet</p>
          ) : (
            trending.map((item) => (
              <button key={item.tag} className="flex items-start justify-between text-left transition-colors hover:opacity-80">
                <div>
                  <p className="text-sm font-medium text-foreground">{item.tag}</p>
                  <p className="text-xs text-muted-foreground">{item.posts} posts</p>
                </div>
                <span className="rounded-full bg-secondary px-2 py-0.5 text-[10px] text-muted-foreground">
                  {item.category}
                </span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Active Rooms */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-foreground">
          <Flame className="h-5 w-5 text-accent" />
          <h2 className="font-semibold">Active Rooms</h2>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : rooms.length === 0 ? (
            <p className="text-xs text-muted-foreground">No active rooms</p>
          ) : (
            rooms.map((room) => (
              <button
                key={room.id}
                className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-secondary"
                onClick={() => router.push(`/rooms?room_id=${room.id}`)}
              >
                <Avatar className="h-10 w-10 rounded-xl">
                  <AvatarImage src={room.image_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${room.id}&scale=80`} alt={room.name} />
                  <AvatarFallback className="rounded-xl bg-secondary text-secondary-foreground text-xs">
                    {room.name.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{room.name}</p>
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent" />
                    {room.member_count} members
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Followers Section */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-foreground">
          <Users className="h-5 w-5 text-neon-blue" />
          <h2 className="font-semibold">Who to Follow</h2>
        </div>
        <div className="mt-3 flex flex-col gap-3">
          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : followers.length === 0 ? (
            <p className="text-xs text-muted-foreground">No users with followers yet</p>
          ) : (
            followers.map((user) => (
              <div key={user.id} className="flex items-center gap-3">
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} alt={user.username} />
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                    {user.username.slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{user.username}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.followers_count != null
                      ? `${user.followers_count} follower${user.followers_count === 1 ? '' : 's'}`
                      : (user.bio || 'No bio yet')}
                  </p>
                </div>
                <Button 
                  size="sm" 
                  onClick={() => handleFollow(user.id)}
                  disabled={followLoadingId === user.id}
                  className="h-7 rounded-full px-3 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {followLoadingId === user.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : followingIds.has(user.id) ? (
                    "Following"
                  ) : (
                    "Follow"
                  )}
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
