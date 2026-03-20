"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase-client"
import {
  Search,
  UserPlus,
  UserCheck,
  UserX,
  MessageCircle,
  MoreHorizontal,
  Loader2,
  Trash2,
  Clock,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"

interface Friend {
  id: string
  username: string
  avatar?: string
  avatar_url?: string
  status?: string
  mutual_anime_count?: number
  is_verified?: boolean
  bio?: string
  isFollowing?: boolean
  isPendingRequest?: boolean
  requestId?: string
}

interface FriendRequest {
  id: string
  user_id?: string
  username: string
  avatar?: string
  avatar_url?: string
  mutual_friends_count: number
  status?: 'incoming' | 'sent'
}

export function FriendsPage() {
  const [friends, setFriends] = useState<Friend[]>([])
  const [following, setFollowing] = useState<Friend[]>([])
  const [requests, setRequests] = useState<FriendRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [followingLoading, setFollowingLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [activeTab, setActiveTab] = useState("all")
  const [addingFriendId, setAddingFriendId] = useState<string | null>(null)
  const { user } = useAuth()
  const router = useRouter()

  const handleMessage = (friendId: string, friendName: string) => {
    router.push(`/messages?recipient=${friendId}&name=${encodeURIComponent(friendName)}`)
    toast.success(`Opening messages with ${friendName}`)
  }

  const handleUnfriend = async (friendId: string, friendName: string) => {
    try {
      const response = await fetch(`/api/friends/${friendId}`, { method: "DELETE" })

      if (!response.ok) {
        throw new Error("Failed to unfriend")
      }

      setFriends((prev) => prev.filter((f) => f.id !== friendId))
      toast.success(`Unfriended ${friendName}`)
      fetchFollowing()
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to unfriend"
      toast.error(message)
    }
  }

  const fetchFriends = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/followers?type=friends")
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch friends")
      }
      const data = await response.json()
      setFriends(Array.isArray(data) ? data : data.following || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading friends")
      setFriends([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFriends()
  }, [])

  const fetchRequests = async () => {
    try {
      const response = await fetch("/api/friend-requests")
      
      if (response.ok) {
        const data = await response.json()
        console.log("############ requests", data.length)
        setRequests(Array.isArray(data) ? data : [])
      } else {
        setRequests([])
      }
    } catch {
      setRequests([])
    }
  }

  useEffect(() => {
    fetchRequests()
  }, [])

  // When notification listener shows "friend request received", refresh Requests tab (e.g. user already on Friends page)
  useEffect(() => {
    const onFriendRequestReceived = () => {
      fetchRequests()
    }
    window.addEventListener("friend-request-received", onFriendRequestReceived)
    return () => window.removeEventListener("friend-request-received", onFriendRequestReceived)
  }, [])

  // Realtime: when friend_requests or followers change, refetch so UI updates without polling
  useEffect(() => {
    if (!user?.id) return
    const supabase = createClient()

    const channel = supabase
      .channel(`friends_${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `or(from_user_id.eq.${user.id},to_user_id.eq.${user.id})`,
        },
        () => {
          fetchRequests()
          fetchFriends()
          fetchFollowing()
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "followers",
          filter: `or(follower_id.eq.${user.id},following_id.eq.${user.id})`,
        },
        () => {
          fetchFriends()
          fetchFollowing()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const fetchFollowing = async () => {
    try {
      setFollowingLoading(true)
      const response = await fetch("/api/followers")
      if (!response.ok) {
        if (response.status !== 401) throw new Error("Failed to fetch following")
        return
      }
      const data = await response.json()
      setFollowing(Array.isArray(data) ? data : [])
    } catch (err) {
      console.error("Error loading following:", err)
      setFollowing([])
    } finally {
      setFollowingLoading(false)
    }
  }

  useEffect(() => {
    fetchFollowing()
  }, [])

  const handleAddFriend = async (userId: string) => {
    if (addingFriendId) return
    const targetUser = following.find((u) => u.id === userId)
    if (!targetUser) return
    if (sentRequestUserIds.has(userId)) return

    setAddingFriendId(userId)
    try {
      const response = await fetch("/api/friend-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to_user_id: userId }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data.error || "Failed to send request")
      }

      const newRequest: FriendRequest = {
        id: data.id || crypto.randomUUID(),
        user_id: data.user_id || userId,
        username: data.username || targetUser.username,
        avatar_url: data.avatar_url ?? targetUser.avatar_url ?? targetUser.avatar,
        status: "sent",
        mutual_friends_count: data.mutual_friends_count ?? 0,
      }

      setRequests((prev) => [...prev, newRequest])
      toast.success("Friend request sent! They'll see it in their Friend Requests.")
      fetchRequests().catch(() => {})
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send request"
      toast.error(message)
    } finally {
      setAddingFriendId(null)
    }
  }

  const handleAcceptRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/friend-requests/${requestId}/accept`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to accept")
      const req = requests.find((r) => r.id === requestId)
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      if (req) {
        const newFriend = { id: req.user_id || req.id, username: req.username, avatar_url: req.avatar_url || req.avatar }
        setFriends((prev) => [...prev, newFriend])
      }
      toast.success("Friend added! You're both in All Friends now.")
      fetchFriends()
      fetchFollowing()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to accept")
    }
  }

  const handleDeclineRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/friend-requests/${requestId}/decline`, { method: "POST" })
      if (!res.ok) throw new Error("Failed to decline")
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      toast.success("Request declined")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to decline")
    }
  }

  const handleWithdrawRequest = async (requestId: string) => {
    try {
      const res = await fetch(`/api/friend-requests/${requestId}`, { method: "DELETE" })
      if (!res.ok) throw new Error("Failed to cancel request")
      setRequests((prev) => prev.filter((r) => r.id !== requestId))
      toast.success("Friend request cancelled")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to cancel request")
    }
  }

  // Search filters the list for the currently selected tab only
  const filteredFriends = friends.filter((friend) =>
    friend.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const incomingRequests = requests.filter((r) => r.status === 'incoming')
  const sentRequests = requests.filter((r) => r.status === 'sent')
  const sentRequestUserIds = new Set(
    sentRequests.map((r) => r.user_id).filter(Boolean) as string[]
  )
  const friendIds = new Set(friends.map((f) => f.id))
  const incomingRequestById = Object.fromEntries(
    incomingRequests.map((r) => [r.user_id, r])
  )
  const filteredPending = incomingRequests.filter((req) =>
    req.username.toLowerCase().includes(searchQuery.toLowerCase())
  )
  // Suggestions = users you follow who are not yet friends (accepted requests hide them)
  const suggestionList = following.filter((u) => !friendIds.has(u.id))
  const filteredSuggestions = suggestionList.filter((u) =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const searchPlaceholder =
    activeTab === "all"
      ? "Search friends..."
      : activeTab === "requests"
        ? "Search requests..."
        : "Search suggestions..."

  return (
    <div className="max-w-[720px] animate-fade-in">
      <h2 className="text-lg font-bold text-foreground">Friends</h2>
      <p className="mt-1 text-sm text-muted-foreground">Customize your friends list to suit your needs.</p>

      {/* Search */}
      <div className="relative mt-3 animate-fade-in-down">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={searchPlaceholder}
          className="w-full rounded-xl border border-border bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
          aria-label="Search friends"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4 animate-fade-in-up">
        <TabsList className="w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
          <TabsTrigger value="all" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all">
            All Friends
            <Badge className="ml-1.5 h-5 rounded-full bg-secondary px-1.5 text-[10px] text-muted-foreground">{friends.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="requests" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all">
            Requests
            <Badge className="ml-1.5 h-5 rounded-full bg-primary/20 px-1.5 text-[10px] text-primary">{incomingRequests.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none transition-all">
            Suggestions
            <Badge className="ml-1.5 h-5 rounded-full bg-secondary px-1.5 text-[10px] text-muted-foreground">{suggestionList.length}</Badge>
          </TabsTrigger>
        </TabsList>

        {/* All Friends */}
        <TabsContent value="all" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">A list of all your currently added friends.</p>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : filteredFriends.length === 0 ? (
            <p className="text-sm text-muted-foreground">No friends yet</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredFriends.map((friend) => (
                <div key={friend.id} className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-border/80">
                  <div className="relative shrink-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={friend.avatar_url || friend.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.id}`} alt={friend.username} />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{friend.username.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span
                      className={cn(
                        "absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-card",
                        friend.status === "online" && "bg-emerald-500",
                        friend.status === "busy" && "bg-amber-500",
                        (friend.status === "away" || friend.status === "offline" || !friend.status) && "bg-muted-foreground/60"
                      )}
                      aria-label={friend.status === "online" ? "Online" : friend.status === "busy" ? "Busy" : "Offline"}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-foreground">{friend.username}</span>
                      {friend.is_verified && (
                        <svg className="h-3.5 w-3.5 shrink-0 text-red-500" viewBox="0 0 24 24" fill="currentColor" aria-label="Verified">
                          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                        </svg>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(friend.mutual_anime_count ?? 0)} mutual anime
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
                      aria-label={`Message ${friend.username}`}
                      onClick={() => handleMessage(friend.id, friend.username)}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                          aria-label="More options"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={() => handleUnfriend(friend.id, friend.username)}
                          className="text-destructive cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Unfriend
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Friend Requests - incoming (people who sent you a request) */}
        <TabsContent value="requests" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">People who have sent you a friend request.</p>
          {filteredPending.length === 0 ? (
            <p className="text-sm text-muted-foreground">No friend requests</p>
          ) : (
            <div className="flex flex-col gap-3">
              {filteredPending.map((req) => (
                <div
                  key={req.id}
                  className="flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition-colors hover:border-border/80"
                >
                  <Avatar className="h-12 w-12 shrink-0">
                    <AvatarImage
                      src={req.avatar_url || req.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.user_id || req.id}`}
                      alt={req.username}
                    />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-sm">
                      {req.username.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{req.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {req.mutual_friends_count} mutual {req.mutual_friends_count === 1 ? 'friend' : 'friends'}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      className="h-9 gap-1.5 rounded-lg bg-primary px-4 text-sm text-primary-foreground hover:bg-primary/90"
                      onClick={() => handleAcceptRequest(req.id)}
                    >
                      <UserPlus className="h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-9 gap-1.5 rounded-lg border-muted-foreground/30 bg-secondary/80 px-4 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
                      onClick={() => handleDeclineRequest(req.id)}
                    >
                      <UserX className="h-4 w-4" />
                      Decline
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Suggestions: only users you follow (not yet friends); accepted requests are hidden */}
        <TabsContent value="suggestions" className="mt-4">
          <p className="text-sm text-muted-foreground mb-3">People you follow. Send a friend request to add them as friends.</p>
          {followingLoading && suggestionList.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredSuggestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No suggestions. Follow more people to see them here.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredSuggestions.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary/50"
                >
                  <Avatar className="h-11 w-11">
                    <AvatarImage
                      src={u.avatar_url || u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.id}`}
                      alt={u.username}
                    />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                      {u.username.slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <span className="truncate text-sm font-semibold text-foreground">{u.username}</span>
                    {u.bio && <p className="text-xs text-muted-foreground truncate">{u.bio}</p>}
                  </div>
                  {incomingRequestById[u.id] ? (
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" className="h-8 gap-1 rounded-full bg-primary px-3 text-xs text-primary-foreground hover:bg-primary/90" onClick={() => handleAcceptRequest(incomingRequestById[u.id].id)}>
                        <UserCheck className="h-3.5 w-3.5" />
                        Accept
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 rounded-full border-border px-3 text-xs text-muted-foreground hover:text-foreground" onClick={() => handleDeclineRequest(incomingRequestById[u.id].id)}>
                        <UserX className="h-3.5 w-3.5" />
                        Decline
                      </Button>
                    </div>
                  ) : sentRequestUserIds.has(u.id) ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 rounded-full px-3 text-xs text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        const req = sentRequests.find((r) => r.user_id === u.id)
                        if (req?.id) handleWithdrawRequest(req.id)
                      }}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      Cancel request
                    </Button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        if (sentRequestUserIds.has(u.id) || addingFriendId) return
                        handleAddFriend(u.id)
                      }}
                      disabled={sentRequestUserIds.has(u.id) || addingFriendId === u.id}
                      className={cn(
                        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-50",
                        "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                      )}
                      aria-label="Add friend"
                    >
                      {addingFriendId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

