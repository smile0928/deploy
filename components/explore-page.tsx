"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Search, TrendingUp, Flame, Sparkles, Swords, Heart, Rocket, Ghost, Loader2, Users, UserPlus, UserCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { UserProfileViewer } from "@/components/user-profile-viewer"

interface Post {
  id: string
  content: string
  image_url?: string
  anime_tags?: string
  likes_count: number
  comments_count: number
  created_at: string
  users?: {
    username: string
    avatar?: string
  }
}

interface User {
  id: string
  username: string
  avatar_url?: string
  bio?: string
  isFollowing?: boolean
}

const categories = [
  { label: "All", icon: Sparkles, id: "all" },
  { label: "Trending", icon: TrendingUp, id: "trending" },
  { label: "Shonen", icon: Swords, id: "shonen" },
  { label: "Romance", icon: Heart, id: "romance" },
  { label: "Sci-Fi", icon: Rocket, id: "scifi" },
  { label: "Horror", icon: Ghost, id: "horror" },
]

export function ExplorePage() {
  const [posts, setPosts] = useState<Post[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [usersLoading, setUsersLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeCategory, setActiveCategory] = useState("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState<"posts" | "users">("posts")
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)
  const [profileViewerOpen, setProfileViewerOpen] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/posts")
        if (!response.ok) {
          if (response.status === 401) {
            setLoading(false)
            return
          }
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch posts")
        }
        const data = await response.json()
        setPosts(Array.isArray(data) ? data : data.posts || [])
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error loading posts"
        setError(errorMessage)
        setPosts([])
      } finally {
        setLoading(false)
      }
    }

    fetchPosts()
    const interval = setInterval(fetchPosts, 30000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setUsersLoading(true)
        const response = await fetch("/api/users/discover")
        if (!response.ok) {
          if (response.status === 401) {
            setUsersLoading(false)
            return
          }
          throw new Error("Failed to fetch users")
        }
        const data = await response.json()
        setUsers(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error loading users:", err)
        setUsers([])
      } finally {
        setUsersLoading(false)
      }
    }

    fetchUsers()
  }, [])

  const handleFollow = async (userId: string, e?: React.MouseEvent) => {
    // If called from card click, prevent opening profile
    if (e) {
      e.stopPropagation()
    }

    if (!user) {
      toast.error("Please sign in to follow users")
      return
    }

    try {
      const response = await fetch("/api/followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: userId }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to follow user")
      }

      const data = await response.json()
      
      // Update user's follow status
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, isFollowing: data.following } : u
        )
      )
      
      toast.success(data.following ? "User followed!" : "User unfollowed!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to follow user"
      toast.error(message)
    }
  }

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.anime_tags?.toLowerCase().includes(searchQuery.toLowerCase())
    
    if (activeCategory === "all") return matchesSearch
    return matchesSearch && post.anime_tags?.toLowerCase().includes(activeCategory)
  })

  return (
    <div className="max-w-[960px] animate-fade-in">
      {/* Search */}
      <div className="relative animate-fade-in-down">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={activeTab === "posts" ? "Search anime, characters, moments..." : "Search users..."}
          className="w-full rounded-2xl border border-border bg-card px-12 py-3.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          aria-label={activeTab === "posts" ? "Search anime content" : "Search users"}
        />
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 border-b border-border animate-fade-in-up">
        <button
          onClick={() => setActiveTab("posts")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === "posts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Sparkles className="h-4 w-4" />
          Posts
        </button>
        <button
          onClick={() => setActiveTab("users")}
          className={cn(
            "flex items-center gap-2 px-4 py-3 text-sm font-medium transition-all border-b-2",
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          <Users className="h-4 w-4" />
          Users to Follow
        </button>
      </div>

      {/* Categories - only for posts */}
      {activeTab === "posts" && (
        <div className="mt-4 flex gap-2 overflow-x-auto no-scrollbar pb-2 animate-slide-in-left">
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all hover-scale",
                activeCategory === cat.id
                  ? "bg-primary text-primary-foreground glow-pink"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground"
              )}
            >
              <cat.icon className="h-4 w-4" />
              {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Content - Posts or Users */}
      <div className="mt-6 animate-stagger">
        {activeTab === "posts" ? (
          // Posts Grid
          <>
            {loading ? (
              <div className="flex items-center justify-center h-64 animate-fade-in">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : error ? (
              <p className="text-sm text-red-500 animate-fade-in-up">Error: {error}</p>
            ) : filteredPosts.length === 0 ? (
              <div className="flex items-center justify-center h-64 animate-fade-in-up">
                <p className="text-sm text-muted-foreground">No posts found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 animate-stagger">
                {filteredPosts.map((post) => (
                  <div
                    key={post.id}
                    className="group relative overflow-hidden rounded-2xl aspect-square cursor-pointer hover-lift transition-all"
                  >
                    {post.image_url ? (
                      <Image
                        src={post.image_url}
                        alt={post.content}
                        fill
                        className="h-full w-full object-cover blur-sm transition-transform duration-500 group-hover:scale-110"
                      />
                    ) : (
                      <div className="h-full w-full bg-secondary flex items-center justify-center">
                        <span className="text-sm text-muted-foreground">No image</span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                    <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full transition-transform duration-300 group-hover:translate-y-0">
                      <p className="text-sm font-semibold text-foreground truncate">{post.content.substring(0, 50)}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">{post.likes_count} likes</span>
                        {post.anime_tags && (
                          <Badge variant="secondary" className="h-5 rounded-full bg-primary/20 px-2 text-[10px] text-primary">
                            {post.anime_tags}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          // Users Grid
          <>
            {usersLoading ? (
              <div className="flex items-center justify-center h-64 animate-fade-in">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : users.length === 0 ? (
              <div className="flex items-center justify-center h-64 animate-fade-in-up">
                <p className="text-sm text-muted-foreground">No more users to follow</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 animate-stagger">
                {users.filter((user) =>
                  user.username.toLowerCase().includes(searchQuery.toLowerCase())
                ).map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-all hover-lift"
                  >
                    <Avatar className="h-14 w-14 shrink-0" onClick={() => {
                      setSelectedUserId(user.id)
                      setProfileViewerOpen(true)
                    }} role="button">
                      <AvatarImage 
                        src={user.avatar_url || `https://api.dicebear.com/7.x/bottts/svg?seed=${user.id}&scale=80`} 
                        alt={user.username} 
                      />
                      <AvatarFallback className="bg-primary text-primary-foreground text-sm font-semibold">
                        {user.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground truncate">{user.username}</h3>
                      {user.bio && (
                        <p className="text-sm text-muted-foreground truncate">{user.bio}</p>
                      )}
                    </div>
                    <div className="flex gap-2 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="transition-all hover-scale"
                        onClick={() => {
                          setSelectedUserId(user.id)
                          setProfileViewerOpen(true)
                        }}
                      >
                        View Profile
                      </Button>
                      <Button
                        size="sm"
                        className={cn(
                          "gap-1 transition-all hover-scale",
                          user.isFollowing
                            ? "bg-secondary hover:bg-secondary/80 text-foreground"
                            : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                        )}
                        onClick={(e) => handleFollow(user.id, e)}
                      >
                        {user.isFollowing ? (
                          <>
                            <UserCheck className="h-4 w-4" />
                            Following
                          </>
                        ) : (
                          <>
                            <UserPlus className="h-4 w-4" />
                            Follow
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {/* User Profile Viewer */}
      {selectedUserId && (
        <UserProfileViewer
          userId={selectedUserId}
          open={profileViewerOpen}
          onOpenChange={setProfileViewerOpen}
          onFollowChange={(userId, isFollowing) => {
            // Update the users list when follow status changes
            setUsers(prev =>
              prev.map(u =>
                u.id === userId ? { ...u, isFollowing } : u
              )
            )
          }}
        />
      )}
    </div>
  )
}
