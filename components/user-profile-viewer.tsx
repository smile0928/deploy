"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, MapPin, Link2, UserPlus, UserCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"

interface UserProfile {
  id: string
  username: string
  email: string
  full_name?: string
  avatar_url?: string
  bio?: string
  location?: string
  website?: string
  created_at: string
}

interface UserProfileViewerProps {
  userId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onFollowChange?: (userId: string, isFollowing: boolean) => void
}

export function UserProfileViewer({ userId, open, onOpenChange, onFollowChange }: UserProfileViewerProps) {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!open || !userId) return

    const fetchUserProfile = async () => {
      try {
        setLoading(true)
        const res = await fetch(`/api/users/${userId}`)
        
        // If user not found, show demo profile
        if (!res.ok && res.status === 404) {
          // Create a demo profile
          setProfile({
            id: userId,
            username: `User ${userId}`,
            email: `user${userId}@senpai.social`,
            full_name: `Anime Fan ${userId}`,
            avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}&scale=80`,
            bio: 'Passionate about anime and manga!',
            location: 'Japan',
            website: 'https://senpai.social',
            created_at: new Date().toISOString(),
          })
          setIsFollowing(false)
          setLoading(false)
          return
        }

        if (!res.ok) {
          throw new Error("Failed to fetch profile")
        }
        const data = await res.json()
        setProfile(data)

        // Check if current user is following this user
        if (user) {
          const followingRes = await fetch("/api/followers")
          if (followingRes.ok) {
            const following = await followingRes.json()
            const isFollowingUser = Array.isArray(following) && following.some((f: any) => f.id === userId)
            setIsFollowing(isFollowingUser)
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
        // Create demo profile on error
        setProfile({
          id: userId,
          username: `User ${userId}`,
          email: `user${userId}@senpai.social`,
          full_name: `Anime Fan ${userId}`,
          avatar_url: `https://api.dicebear.com/7.x/bottts/svg?seed=${userId}&scale=80`,
          bio: 'Passionate about anime and manga!',
          location: 'Japan',
          website: 'https://senpai.social',
          created_at: new Date().toISOString(),
        })
        setIsFollowing(false)
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [userId, open, user])

  const handleFollow = async () => {
    if (!user) {
      toast.error("Please sign in")
      router.push("/signin")
      return
    }

    if (!profile) return

    try {
      setFollowLoading(true)
      const response = await fetch("/api/followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: profile.id }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to follow user")
      }

      const data = await response.json()
      setIsFollowing(data.following)
      
      // Call the callback to update parent component's list
      onFollowChange?.(profile.id, data.following)
      
      toast.success(data.following ? "User followed!" : "User unfollowed!")
    } catch (error) {
      const message = error instanceof Error ? error.message : "Operation failed"
      toast.error(message)
    } finally {
      setFollowLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto p-0">
        <DialogTitle className="sr-only">User Profile</DialogTitle>
        {loading ? (
          <div className="flex items-center justify-center h-64 animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : !profile ? (
          <div className="p-6 text-center text-destructive">
            Failed to load profile
          </div>
        ) : (
          <div className="animate-fade-in">
            {/* Cover */}
            <div className="relative h-32 bg-gradient-to-br from-primary/20 to-accent/20">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </div>

            {/* Avatar and basic info */}
            <div className="px-6 pb-4">
              <div className="flex items-end justify-between mb-4">
                <Avatar className="h-24 w-24 -mt-12 border-4 border-background">
                  <AvatarImage
                    src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`}
                    alt={profile.username}
                  />
                  <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                    {profile.username.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                {user?.id !== profile.id && (
                  <Button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={cn(
                      "gap-2",
                      isFollowing
                        ? "bg-secondary hover:bg-secondary/80 text-foreground"
                        : "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                    )}
                  >
                    {followLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : isFollowing ? (
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
                )}
              </div>

              {/* User info */}
              <h2 className="text-2xl font-bold text-foreground">{profile.username}</h2>
              {profile.full_name && (
                <p className="text-sm text-muted-foreground">{profile.full_name}</p>
              )}

              {/* Bio */}
              {profile.bio && (
                <p className="mt-3 text-sm text-foreground">{profile.bio}</p>
              )}

              {/* Location and website */}
              <div className="mt-4 flex flex-col gap-2">
                {profile.location && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    {profile.location}
                  </div>
                )}
                {profile.website && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                    <Link2 className="h-4 w-4 shrink-0" />
                    <a
                      href={profile.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline truncate"
                    >
                      {profile.website.replace(/^https?:\/\//, "")}
                    </a>
                  </div>
                )}
              </div>

              {/* User since */}
              {profile.created_at && (
                <p className="text-xs text-muted-foreground mt-4">
                  Joined {new Date(profile.created_at).toLocaleDateString("en-US", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              )}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
