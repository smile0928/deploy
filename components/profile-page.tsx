"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import {
  Settings,
  Edit3,
  Link2,
  MapPin,
  Calendar,
  Grid3X3,
  Bookmark,
  Heart,
  Film,
  Loader2,
  X,
  Upload,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

interface UserProfile {
  id: string
  username: string
  email: string
  full_name?: string
  avatar_url?: string
  cover_url?: string
  bio?: string
  location?: string
  website?: string
  created_at: string
  posts_count?: number
  followers_count?: number
  following_count?: number
}

interface Post {
  id: string
  user_id?: string
  type?: string
  content: string
  image_url?: string
  created_at: string
  likes_count: number
  comments_count: number
  anime_tags?: string[] | null
  post_likes?: Array<{ id: string; user_id?: string }>
  users?: {
    id: string
    username: string
    email?: string
    avatar_url?: string | null
    full_name?: string | null
  }
}

export function ProfilePage() {
  const [activeTab, setActiveTab] = useState("posts")
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [posts, setPosts] = useState<Post[]>([])
  const [savedPosts, setSavedPosts] = useState<Post[]>([])
  const [savedLoading, setSavedLoading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [formData, setFormData] = useState({
    full_name: "",
    bio: "",
    location: "",
    website: "",
  })
  const { user } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const viewUserId = searchParams.get("user_id") ?? undefined
  const isViewingOther = Boolean(viewUserId && viewUserId !== user?.id)

  const fetchProfile = async (showLoader = true) => {
    try {
      if (showLoader) setIsLoading(true)
      const url = isViewingOther && viewUserId
        ? `/api/users/${viewUserId}`
        : "/api/users/profile"
      const res = await fetch(url)
      if (!res.ok) {
        if (res.status === 401) {
          setIsLoading(false)
          return
        }
        const errorData = await res.json()
        throw new Error(errorData.error || "Failed to fetch profile")
      }

      const data = await res.json()
      setProfile(data)
      setFormData({
        full_name: data.full_name || "",
        bio: data.bio || "",
        location: data.location || "",
        website: data.website || "",
      })
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Failed to load profile")
    } finally {
      setIsLoading(false)
    }
  }

  const fetchUserPosts = async () => {
    try {
      setPostsLoading(true)
      const res = await fetch("/api/posts")
      if (!res.ok) {
        if (res.status === 401) {
          setPostsLoading(false)
          return
        }
        throw new Error("Failed to fetch posts")
      }

      const data = await res.json()
      const targetUserId = isViewingOther ? viewUserId : user?.id
      const userPosts = Array.isArray(data)
        ? data.filter((post: any) => post.user_id === targetUserId)
        : []
      setPosts(userPosts)
    } catch (error) {
      console.error("Error fetching posts:", error)
      setPosts([])
    } finally {
      setPostsLoading(false)
    }
  }

  useEffect(() => {
    // Initialize storage bucket on first load
    const initStorage = async () => {
      try {
        await fetch("/api/init-storage", { method: "POST" })
      } catch (error) {
        console.error("Failed to initialize storage:", error)
      }
    }
    initStorage()
  }, [])

  useEffect(() => {
    // Load saved posts (bookmarks) from local storage and fetch their full data
    const loadSavedPosts = async () => {
      if (typeof window === "undefined") return
      try {
        setSavedLoading(true)
        const raw = window.localStorage.getItem("bookmarkedPosts")
        const ids: string[] = raw ? JSON.parse(raw) : []

        if (!Array.isArray(ids) || ids.length === 0) {
          setSavedPosts([])
          return
        }

        const res = await fetch("/api/posts")
        if (!res.ok) {
          throw new Error("Failed to fetch saved posts")
        }

        const data = await res.json()
        const idSet = new Set(ids)
        const bookmarked = Array.isArray(data)
          ? data.filter((post: any) => post?.id && idSet.has(post.id))
          : []

        setSavedPosts(bookmarked)
      } catch (err) {
        console.error("Failed to load saved posts:", err)
        setSavedPosts([])
      } finally {
        setSavedLoading(false)
      }
    }

    loadSavedPosts()
  }, [])

  useEffect(() => {
    if (viewUserId) {
      fetchProfile()
      fetchUserPosts()
    } else if (user) {
      fetchProfile()
      fetchUserPosts()
    }
  }, [user, viewUserId])

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Show preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string)
    }
    reader.readAsDataURL(file)

    // Upload avatar
    try {
      setIsUploadingAvatar(true)
      const formDataToSend = new FormData()
      formDataToSend.append("avatar", file)

      const res = await fetch("/api/users/avatar", {
        method: "POST",
        body: formDataToSend,
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to upload avatar")
      }

      // Update profile with new avatar
      console.log("Avatar upload response:", responseData)
      console.log("New avatar URL:", responseData.avatar_url)
      
      setProfile((prev) =>
        prev ? { ...prev, avatar_url: responseData.avatar_url } : null
      )
      
      // Refresh profile to ensure avatar is loaded
      await fetchProfile()
      toast.success("Avatar updated!")
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to upload avatar"
      toast.error(errorMessage)
      console.error("Avatar upload error:", error)
      setAvatarPreview(null) // Clear preview on error
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onloadend = () => setCoverPreview(reader.result as string)
    reader.readAsDataURL(file)

    try {
      setIsUploadingCover(true)
      const formDataToSend = new FormData()
      formDataToSend.append("cover", file)

      const res = await fetch("/api/users/cover", {
        method: "POST",
        body: formDataToSend,
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to upload cover")
      }

      const newCoverUrl = data.cover_url + "?t=" + Date.now()
      setProfile((prev) =>
        prev ? { ...prev, cover_url: data.cover_url } : null
      )
      setCoverPreview(newCoverUrl)
      await fetchProfile(false)
      toast.success("Cover updated!")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to upload cover"
      toast.error(msg)
      setCoverPreview(null)
    } finally {
      setIsUploadingCover(false)
      e.target.value = ""
    }
  }

  const handleSaveProfile = async () => {
    try {
      setIsSaving(true)
      const res = await fetch("/api/users/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          full_name: formData.full_name || null,
          bio: formData.bio || null,
          location: formData.location || null,
          website: formData.website || null,
        }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to update profile")
      }

      setProfile(responseData)
      toast.success("Profile updated!")
      setShowEditDialog(false)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update profile"
      toast.error(errorMessage)
      console.error("Profile update error:", error)
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading && !profile) {
    return (
      <div className="flex justify-center items-center py-12 animate-fade-in">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user && !viewUserId) {
    return (
      <div className="text-center py-12 animate-fade-in-up">
        <p className="text-muted-foreground mb-4">Please sign in to view your profile</p>
        <Button
          onClick={() => router.push("/signin")}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-all hover-scale"
        >
          Sign In
        </Button>
      </div>
    )
  }

  if (!profile) {
    return <div className="text-center py-12 text-muted-foreground animate-fade-in-up">Failed to load profile</div>
  }

  const initials = profile.full_name?.substring(0, 2).toUpperCase() || profile.username.substring(0, 2).toUpperCase()

  const formatCount = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M"
    if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, "") + "K"
    return n.toString()
  }
  const postsCount = profile.posts_count ?? posts.length
  const followersCount = profile.followers_count ?? 0
  const followingCount = profile.following_count ?? 0

  return (
    <div className="max-w-[720px] animate-fade-in">
      {/* Cover / Banner - use avatar when no cover image */}
      <div className="relative h-44 md:h-56 overflow-hidden rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 animate-fade-in-down">
        {(coverPreview || profile.cover_url) ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={coverPreview || profile.cover_url}
            alt="Cover"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : profile.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={profile.avatar_url}
            alt="Cover"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
        {isUploadingCover && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        )}
        {!isViewingOther && (
          <label className="absolute right-3 top-3 cursor-pointer">
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverChange}
              disabled={isUploadingCover}
              className="hidden"
            />
            <span className="inline-flex items-center gap-1.5 rounded-full border border-foreground/20 bg-background/30 px-3 py-1.5 text-xs text-foreground backdrop-blur-sm hover:bg-background/50 transition-all">
              <Edit3 className="h-3 w-3" />
              Edit Cover
            </span>
          </label>
        )}
      </div>

      {/* Profile Info */}
      <div className="relative -mt-12 px-4 animate-fade-in-up">
        <div className="flex flex-col sm:flex-row items-end gap-4">
          <div className="story-ring shrink-0">
            <div className="rounded-full bg-background p-1">
              <div
                key={profile.avatar_url} // Force re-render when avatar changes
                className="relative h-24 w-24 md:h-28 md:w-28 rounded-full overflow-hidden bg-primary/10"
              >
                {profile.avatar_url ? (
                  <Image
                    src={profile.avatar_url}
                    alt={profile.username}
                    fill
                    className="object-cover"
                    priority
                    onError={(e) => {
                      console.error("Avatar image failed to load:", profile.avatar_url)
                      console.error("Error event:", e)
                    }}
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary text-primary-foreground text-xl font-bold">
                    {initials}
                  </div>
                )}
              </div>
            </div>
          </div>
          {!isViewingOther && (
            <div className="flex flex-col sm:flex-row flex-1 items-start sm:items-center justify-end gap-2 pb-2 w-full sm:w-auto">
              <Button
                size="sm"
                onClick={() => setShowEditDialog(true)}
                className="rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90 transition-all hover-scale w-full sm:w-auto"
              >
                <Edit3 className="mr-1.5 h-3 w-3" />
                Edit Profile
              </Button>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8 rounded-full border-border text-muted-foreground hover:text-foreground transition-all hover-scale shrink-0"
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        <div className="mt-3">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-foreground">
              {profile.full_name || profile.username}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 text-sm text-secondary-foreground leading-relaxed">{profile.bio}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                {profile.location}
              </span>
            )}
            {profile.website && (
              <span className="flex items-center gap-1">
                <Link2 className="h-3.5 w-3.5" />
                <a href={profile.website} className="text-primary hover:underline transition-colors">
                  {profile.website}
                </a>
              </span>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Posts · Followers · Following */}
          <div className="mt-4 flex items-center gap-6 text-sm">
            <span className="font-semibold text-foreground tabular-nums">
              {formatCount(postsCount)} <span className="font-normal text-muted-foreground">Posts</span>
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatCount(followersCount)} <span className="font-normal text-muted-foreground">Followers</span>
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatCount(followingCount)} <span className="font-normal text-muted-foreground">Following</span>
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="posts" className="mt-6 animate-fade-in-up">
        <TabsList className="w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger
            value="posts"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
          >
            <Grid3X3 className="mr-1.5 h-4 w-4" />
            Posts
          </TabsTrigger>
          <TabsTrigger
            value="anime"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
          >
            <Film className="mr-1.5 h-4 w-4" />
            Anime List
          </TabsTrigger>
          <TabsTrigger
            value="liked"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
          >
            <Heart className="mr-1.5 h-4 w-4" />
            Liked
          </TabsTrigger>
          <TabsTrigger
            value="saved"
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all"
          >
            <Bookmark className="mr-1.5 h-4 w-4" />
            Saved
          </TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="mt-4 animate-stagger">
          {postsLoading ? (
            <div className="flex justify-center py-12 animate-fade-in">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (() => {
            // Show all non-anime content here.
            // For older rows or databases without the column, we include them
            // so nothing disappears unexpectedly.
            const hasTypedPosts = posts.some((p) => typeof p.type === "string")
            const visiblePosts = hasTypedPosts
              ? posts.filter((p) => p.type !== "anime")
              : posts

            if (visiblePosts.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground animate-fade-in-up">
                  <p className="text-sm">No posts yet</p>
                </div>
              )
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-stagger">
                {visiblePosts.map((post) => (
                  <Link
                    key={post.id}
                    href={`/feed/${post.id}`}
                    className="group rounded-2xl border border-border bg-card p-4 transition-all hover-lift block"
                  >
                    {post.image_url && (
                      <div className="relative overflow-hidden rounded-xl">
                        <Image
                          src={post.image_url}
                          alt="Post image"
                          width={600}
                          height={400}
                          className="w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                        />
                        <div
                          className="absolute inset-0 flex items-center justify-center rounded-xl bg-background/40 opacity-0 backdrop-blur-sm transition-opacity duration-200 group-hover:opacity-100"
                          aria-hidden
                        >
                          <span className="flex items-center gap-1.5 rounded-full bg-background/60 px-3 py-1.5 text-sm font-medium text-foreground shadow-sm backdrop-blur-md">
                            <Heart className="h-4 w-4 fill-primary text-primary" />
                            {post.likes_count}
                          </span>
                        </div>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )
          })()}
        </TabsContent>

        {/* Anime List
            Prefer posts explicitly marked as type "anime" (from Upload page).
            If no posts have a type (older data or DB without the column),
            fall back to any post that has anime_tags, which matches the
            previous behaviour so the UI still shows something. */}
        <TabsContent value="anime" className="mt-4 animate-stagger">
          {postsLoading ? (
            <div className="flex justify-center py-12 animate-fade-in">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (() => {
            const hasTypedPosts = posts.some((p) => typeof p.type === "string")
            const animePosts = hasTypedPosts
              ? posts.filter(
                  (p) =>
                    p.type === "anime" ||
                    (typeof p.type === "undefined" || p.type === null) &&
                      Array.isArray(p.anime_tags) &&
                      p.anime_tags.length > 0
                )
              : posts.filter((p) => Array.isArray(p.anime_tags) && p.anime_tags.length > 0)

            if (animePosts.length === 0) {
              return (
                <div className="text-center py-12 text-muted-foreground animate-fade-in-up">
                  <p className="text-sm">No anime content yet</p>
                </div>
              )
            }

            return (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-stagger">
                {animePosts.map((post) => (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-border bg-card p-4 transition-all hover-lift"
                  >
                    <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
                    {post.image_url && (
                      <Image
                        src={post.image_url}
                        alt="Anime content"
                        width={600}
                        height={400}
                        className="mt-3 rounded-xl w-full object-cover hover-scale transition-transform"
                      />
                    )}
                    {post.anime_tags && (
                      <div className="mt-2 flex flex-wrap gap-1 text-[11px] text-primary">
                        {post.anime_tags.map((tag) => (
                          <Badge key={tag} variant="secondary" className="px-2 py-0.5">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          })()}
        </TabsContent>

        {/* Liked posts - posts the user has liked */}
        <TabsContent value="liked" className="mt-4 animate-stagger">
          {postsLoading ? (
            <div className="flex justify-center py-12 animate-fade-in">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : posts.filter((p) => p.post_likes?.some((l) => l.user_id === user?.id)).length === 0 ? (
            <div className="text-center py-12 text-muted-foreground animate-fade-in-up">
              <p className="text-sm">No liked posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-stagger">
              {posts
                .filter((p) => p.post_likes?.some((l) => l.user_id === user?.id))
                .map((post) => (
                  <div
                    key={post.id}
                    className="rounded-2xl border border-border bg-card p-4 transition-all hover-lift"
                  >
                    <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
                    {post.image_url && (
                      <Image
                        src={post.image_url}
                        alt="Post image"
                        width={600}
                        height={400}
                        className="mt-3 rounded-xl w-full object-cover hover-scale transition-transform"
                      />
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {post.likes_count}
                      </span>
                      <span className="flex items-center gap-1">
                        {post.comments_count}
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </TabsContent>

        {/* Saved posts (bookmarks) */}
        <TabsContent value="saved" className="mt-4 animate-stagger">
          {savedLoading ? (
            <div className="flex justify-center py-12 animate-fade-in">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : savedPosts.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground animate-fade-in-up">
              <p className="text-sm">No saved posts yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 animate-stagger">
              {savedPosts.map((post) => (
                <div
                  key={post.id}
                  className="rounded-2xl border border-border bg-card p-4 transition-all hover-lift"
                >
                  <p className="text-sm text-foreground leading-relaxed">{post.content}</p>
                  {post.image_url && (
                    <Image
                      src={post.image_url}
                      alt="Saved post image"
                      width={600}
                      height={400}
                      className="mt-3 rounded-xl w-full object-cover hover-scale transition-transform"
                    />
                  )}
                  <div className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="h-3 w-3" />
                      {post.likes_count}
                    </span>
                    <span className="flex items-center gap-1">
                      {post.comments_count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Profile Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Edit Profile</h2>
              <button
                onClick={() => {
                  setShowEditDialog(false)
                  setAvatarPreview(null) // Clear preview when closing
                }}
                className="text-muted-foreground hover:text-foreground transition-colors hover-scale"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleSaveProfile(); }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-3">
                  Profile Picture
                </label>
                <div className="flex items-center gap-4">
                  <div
                    key={avatarPreview || profile.avatar_url} // Force re-render on change
                    className="relative h-16 w-16 rounded-full overflow-hidden bg-primary/10 flex items-center justify-center shrink-0"
                  >
                    {avatarPreview ? (
                      <Image
                        src={avatarPreview}
                        alt="Avatar preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : profile.avatar_url ? (
                      <Image
                        src={profile.avatar_url}
                        alt={profile.username}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="flex items-center justify-center w-full h-full bg-primary text-primary-foreground font-bold text-sm">
                        {initials}
                      </div>
                    )}
                    {isUploadingAvatar && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors hover-scale">
                      <Upload className="h-4 w-4" />
                      <span>Choose image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        disabled={isUploadingAvatar}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      JPG, PNG, GIF up to 5MB
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <label className="block text-sm font-medium text-foreground mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  placeholder="Your full name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Bio
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none transition-colors"
                  rows={3}
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Location
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Your location"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  disabled={isSaving}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  placeholder="https://example.com"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  disabled={isSaving}
                />
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowEditDialog(false)
                    setAvatarPreview(null) // Clear preview when canceling
                  }}
                  disabled={isSaving || isUploadingAvatar}
                  className="flex-1 transition-all hover-scale"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSaving || isUploadingAvatar}
                  className="flex-1 transition-all hover-scale"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
