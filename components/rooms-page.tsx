"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import Image from "next/image"
import {
  Users,
  MessageSquare,
  Plus,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  X,
  Upload,
  LogOut,
  Trash2,
} from "lucide-react"
import { useSearchParams } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { createClient } from "@/lib/supabase-client"

interface Room {
  id: string
  name: string
  description: string
  image_url?: string
  creator_id?: string
  creator_avatar_url?: string
  creator_username?: string
  member_count: number
  online_count?: number
  category?: string
  message_count?: number
  is_member?: boolean
  created_at: string
}

interface RoomMessage {
  id: string
  sender_id: string
  content: string
  image_url?: string
  created_at: string
  username: string
  avatar_url?: string
}

interface VoiceMember {
  user_id: string
  username: string
  avatar_url?: string
}

export function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isMuted, setIsMuted] = useState(false)
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    topic: "",
    image_url: "",
  })
  const [roomCoverPreview, setRoomCoverPreview] = useState<string | null>(null)
  const [isUploadingCover, setIsUploadingCover] = useState(false)
  const [joiningRoomId, setJoiningRoomId] = useState<string | null>(null)
  const [leavingRoomId, setLeavingRoomId] = useState<string | null>(null)
  const [deletingRoomId, setDeletingRoomId] = useState<string | null>(null)
  const [messages, setMessages] = useState<RoomMessage[]>([])
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [messageInput, setMessageInput] = useState("")
  const [sendingMessage, setSendingMessage] = useState(false)
  const [voiceMembers, setVoiceMembers] = useState<VoiceMember[]>([])
  const [isInVoice, setIsInVoice] = useState(false)
  const voiceChannelRef = useRef<ReturnType<ReturnType<typeof createClient>["channel"]> | null>(null)
  const prevSelectedRoomIdRef = useRef<string | null>(null)
  const searchParams = useSearchParams()
  const { user, userprofile } = useAuth()

  const fetchRooms = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await fetch("/api/rooms")
      if (!response.ok) {
        if (response.status === 401) {
          setLoading(false)
          return
        }
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to fetch rooms")
      }
      const data = await response.json()
      const roomsList = Array.isArray(data) ? data : data.rooms || []
      setRooms(roomsList)

      if (roomsList.length === 0) return

      const initialRoomId = searchParams.get("room_id")

      if (initialRoomId) {
        const matching = roomsList.find((room) => room.id === initialRoomId)
        setSelectedRoom(matching || roomsList[0])
      } else if (!selectedRoom) {
        setSelectedRoom(roomsList[0])
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading rooms")
      setRooms([])
    } finally {
      setLoading(false)
    }
  }

  const fetchRoomMessages = useCallback(async (roomId: string) => {
    setMessagesLoading(true)
    try {
      const res = await fetch(`/api/rooms/${roomId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setMessages(Array.isArray(data) ? data : [])
      } else {
        setMessages([])
      }
    } catch {
      setMessages([])
    } finally {
      setMessagesLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchRooms()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    if (!selectedRoom?.id) {
      setMessages([])
      return
    }
    fetchRoomMessages(selectedRoom.id)
  }, [selectedRoom?.id, fetchRoomMessages])

  useEffect(() => {
    const prevId = prevSelectedRoomIdRef.current
    const nextId = selectedRoom?.id ?? null

    if (user) {
      setRooms((prev) => {
        let next = [...prev]
        if (prevId && prevId !== nextId) {
          const prevRoom = next.find((r) => String(r.id) === String(prevId))
          if (prevRoom?.is_member && (prevRoom.online_count ?? 0) > 0) {
            next = next.map((r) =>
              String(r.id) === String(prevId)
                ? { ...r, online_count: Math.max(0, (r.online_count ?? 0) - 1) }
                : r
            )
          }
        }
        if (nextId) {
          const nextRoom = next.find((r) => String(r.id) === String(nextId))
          if (nextRoom?.is_member) {
            next = next.map((r) =>
              String(r.id) === String(nextId)
                ? { ...r, online_count: (r.online_count ?? 0) + 1 }
                : r
            )
          }
        }
        return next
      })
    }

    prevSelectedRoomIdRef.current = nextId
  }, [selectedRoom?.id, user?.id])

  useEffect(() => {
    if (!selectedRoom) return
    const updated = rooms.find((r) => String(r.id) === String(selectedRoom.id))
    if (
      updated &&
      (updated.online_count !== selectedRoom.online_count ||
        updated.member_count !== selectedRoom.member_count ||
        updated.is_member !== selectedRoom.is_member)
    ) {
      setSelectedRoom(updated)
    }
  }, [rooms, selectedRoom])

  useEffect(() => {
    if (!selectedRoom?.id || !user) return

    const supabase = createClient()

    const channel = supabase
      .channel(`room:${selectedRoom.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `room_id=eq.${selectedRoom.id}`,
        },
        (payload) => {
          const newRow = payload.new as { id: string; sender_id: string; content: string; image_url?: string; created_at: string }
          setMessages((prev) => {
            if (prev.some((m) => m.id === newRow.id)) return prev
            return [
              ...prev,
              {
                id: newRow.id,
                sender_id: newRow.sender_id,
                content: newRow.content,
                image_url: newRow.image_url,
                created_at: newRow.created_at,
                username: newRow.sender_id === user.id ? "You" : "User",
              },
            ]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedRoom?.id, user?.id])

  useEffect(() => {
    if (!selectedRoom?.id || !user) {
      setVoiceMembers([])
      return
    }

    const supabase = createClient()
    const channelName = `room-voice:${selectedRoom.id}`

    const channel = supabase.channel(channelName, {
      config: { presence: { key: user.id } },
    })

    voiceChannelRef.current = channel

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState()
        const members: VoiceMember[] = []
        Object.entries(state).forEach(([, presences]) => {
          for (const p of presences as { user_id?: string; username?: string; avatar_url?: string }[]) {
            if (p?.user_id) {
              members.push({
                user_id: p.user_id,
                username: p.username || "User",
                avatar_url: p.avatar_url,
              })
            }
          }
        })
        setVoiceMembers(members)
      })
      .subscribe()

    return () => {
      voiceChannelRef.current = null
      supabase.removeChannel(channel)
    }
  }, [selectedRoom?.id, user?.id])

  const handleSendMessage = async () => {
    if (!selectedRoom?.id || !messageInput.trim() || !selectedRoom.is_member || sendingMessage || !user) return

    const content = messageInput.trim()
    const tempId = `temp-${Date.now()}`
    const optimisticMsg: RoomMessage = {
      id: tempId,
      sender_id: user.id,
      content,
      created_at: new Date().toISOString(),
      username: "You",
      avatar_url: userprofile?.avatar_url || user.user_metadata?.avatar_url,
    }

    setSendingMessage(true)
    setMessageInput("")
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const res = await fetch(`/api/rooms/${selectedRoom.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to send")

      const realId = data?.id
      if (realId) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...m,
                  id: realId,
                  created_at: data.created_at || m.created_at,
                }
              : m
          )
        )
      }
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId))
      setMessageInput(content)
      toast.error(err instanceof Error ? err.message : "Failed to send message")
    } finally {
      setSendingMessage(false)
    }
  }

  const handleToggleVoice = useCallback(async () => {
    if (!user) return

    const channel = voiceChannelRef.current
    if (!channel) return

    if (isInVoice) {
      await channel.untrack()
      setIsInVoice(false)
    } else {
      await channel.track({
        user_id: user.id,
        username: user.user_metadata?.username || user.email?.split("@")[0] || "User",
        avatar_url: user.user_metadata?.avatar_url,
      })
      setIsInVoice(true)
    }
  }, [user, isInVoice])

  const handleRoomCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file")
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB")
      return
    }

    setRoomCoverPreview(URL.createObjectURL(file))
    setIsUploadingCover(true)
    try {
      const fd = new FormData()
      fd.append("cover", file)
      const res = await fetch("/api/rooms/upload-cover", { method: "POST", body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Upload failed")
      setFormData((prev) => ({ ...prev, image_url: data.image_url }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to upload cover")
      setRoomCoverPreview(null)
    } finally {
      setIsUploadingCover(false)
      e.target.value = ""
    }
  }

  const handleJoinRoom = async (room: Room) => {
    if (!user) {
      toast.error("Please sign in to join a room")
      return
    }
    if (room.is_member) return

    const roomId = room.id
    const updatedRoom: Room = {
      ...room,
      is_member: true,
      member_count: (room.member_count || 0) + 1,
      online_count: (room.online_count || 0) + 1,
    }

    setJoiningRoomId(roomId)
    setRooms((prev) =>
      prev.map((r) => (String(r.id) === String(roomId) ? updatedRoom : r))
    )
    setSelectedRoom((prev) =>
      prev && String(prev.id) === String(roomId) ? updatedRoom : prev
    )

    try {
      const res = await fetch(`/api/rooms/${roomId}/join`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to join")
      toast.success("Joined room!")
    } catch (err) {
      setRooms((prev) =>
        prev.map((r) => (String(r.id) === String(roomId) ? room : r))
      )
      setSelectedRoom((prev) =>
        prev && String(prev.id) === String(roomId) ? room : prev
      )
      toast.error(err instanceof Error ? err.message : "Failed to join room")
    } finally {
      setJoiningRoomId(null)
    }
  }

  const handleLeaveRoom = async (room: Room) => {
    if (!user) return
    if (!room.is_member) return

    const roomId = room.id
    const updatedRoom: Room = {
      ...room,
      is_member: false,
      member_count: Math.max(0, (room.member_count || 0) - 1),
      online_count: Math.max(0, (room.online_count || 0) - 1),
    }

    setLeavingRoomId(roomId)
    setRooms((prev) =>
      prev.map((r) => (String(r.id) === String(roomId) ? updatedRoom : r))
    )
    setSelectedRoom((prev) =>
      prev && String(prev.id) === String(roomId) ? updatedRoom : prev
    )

    try {
      const res = await fetch(`/api/rooms/${roomId}/leave`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to leave")
      toast.success("Left room")
    } catch (err) {
      setRooms((prev) =>
        prev.map((r) => (String(r.id) === String(roomId) ? room : r))
      )
      setSelectedRoom((prev) =>
        prev && String(prev.id) === String(roomId) ? room : prev
      )
      toast.error(err instanceof Error ? err.message : "Failed to leave room")
    } finally {
      setLeavingRoomId(null)
    }
  }

  const handleDeleteRoom = async (room: Room) => {
    if (!user || String(user.id) !== String(room.creator_id)) return

    const roomId = room.id
    setDeletingRoomId(roomId)
    try {
      const res = await fetch(`/api/rooms/${roomId}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete room")
      let remaining: Room[] = []
      setRooms((prev) => {
        remaining = prev.filter((r) => String(r.id) !== String(roomId))
        return remaining
      })
      if (selectedRoom && String(selectedRoom.id) === String(roomId)) {
        setSelectedRoom(remaining[0] || null)
      }
      toast.success("Room deleted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete room")
    } finally {
      setDeletingRoomId(null)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast.error("Room name is required")
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          topic: formData.topic.trim() || null,
          image_url: formData.image_url || null,
          is_public: true,
        }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to create room")
      }

      toast.success("Room created!")
      setFormData({ name: "", description: "", topic: "", image_url: "" })
      setRoomCoverPreview(null)
      setShowCreateDialog(false)
      await fetchRooms()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create room"
      toast.error(errorMessage)
      console.error("Room creation error:", error)
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <div className="flex gap-4 max-w-[960px] animate-fade-in">
      {/* Room List */}
      <div className={cn("w-full md:w-[340px] shrink-0 flex flex-col gap-3 animate-slide-in-left h-full md:max-h-[calc(100vh-120px)]", selectedRoom && "hidden md:flex")}>
        <div className="flex items-center justify-between flex-shrink-0">
          <h2 className="text-lg font-bold text-foreground">Rooms</h2>
          <Button
            size="sm"
            onClick={() => setShowCreateDialog(true)}
            className="gap-1.5 rounded-full bg-primary text-xs text-primary-foreground hover:bg-primary/90 transition-all hover-scale"
          >
            <Plus className="h-3.5 w-3.5" />
            Create Room
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-32 animate-fade-in">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 animate-fade-in-up">Error: {error}</p>
        ) : rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground animate-fade-in-up">No rooms available</p>
        ) : (
          <div className="animate-stagger overflow-y-auto flex-1 pr-2 space-y-3">
            {rooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedRoom(room)}
                className={cn(
                  "flex gap-3 rounded-2xl border border-border bg-card p-3 text-left transition-all hover-lift w-full",
                  selectedRoom?.id === room.id && "border-primary/50 glow-pink"
                )}
              >
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl">
                  {room.image_url ? (
                    <Image src={room.image_url} alt={room.name} fill className="object-cover" />
                  ) : room.creator_avatar_url ? (
                    <Image src={room.creator_avatar_url} alt={room.name} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-secondary flex items-center justify-center">
                      <span className="text-lg font-bold text-muted-foreground">
                        {room.name.charAt(0)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-sm font-semibold text-foreground">{room.name}</h3>
                    {room.category && (
                      <Badge variant="secondary" className="h-5 shrink-0 rounded-full bg-secondary px-2 text-[10px] text-muted-foreground">
                        {room.category}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{room.description}</p>
                  <div className="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1" title="Members">
                      <Users className="h-3 w-3" />
                      {room.member_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1" title="Online">
                      <span className={cn("h-1.5 w-1.5 rounded-full", (room.online_count ?? 0) > 0 ? "bg-accent animate-pulse-glow" : "bg-muted-foreground/30")} />
                      {room.online_count ?? 0}
                    </span>
                    <span className="flex items-center gap-1" title="Messages">
                      <MessageSquare className="h-3 w-3" />
                      {room.message_count ?? 0}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Active Room Detail */}
      {selectedRoom && (
        <div className={cn("flex-1 flex flex-col gap-4 animate-slide-in-right", !selectedRoom && "hidden md:flex")}>
          {/* Room Header */}
          <div className="relative overflow-hidden rounded-2xl border border-border animate-fade-in-up">
            <div className="relative h-32">
              {(selectedRoom.creator_avatar_url || selectedRoom.image_url) ? (
                <Image
                  src={selectedRoom.creator_avatar_url || selectedRoom.image_url!}
                  alt={selectedRoom.name}
                  fill
                  className="object-cover"
                />
              ) : (
                <div className="h-full w-full bg-secondary flex items-center justify-center">
                  <span className="text-4xl font-bold text-muted-foreground">
                    {selectedRoom.name.charAt(0)}
                  </span>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-card to-transparent" />
              {user && String(user.id) === String(selectedRoom.creator_id) && (
                <Button
                  size="icon"
                  variant="secondary"
                  className="absolute top-3 right-3 h-8 w-8 rounded-full bg-black/40 hover:bg-destructive/90 text-white hover:text-white border-0"
                  onClick={() => handleDeleteRoom(selectedRoom)}
                  disabled={String(deletingRoomId) === String(selectedRoom.id)}
                  aria-label="Delete room"
                >
                  {String(deletingRoomId) === String(selectedRoom.id) ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
            <div className="relative -mt-8 px-4 pb-4">
              <h2 className="text-xl font-bold text-foreground">{selectedRoom.name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{selectedRoom.description}</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={selectedRoom.is_member ? "outline" : "default"}
                    className={cn(
                      "gap-1.5 rounded-full text-xs transition-all hover-scale",
                      selectedRoom.is_member && "border-border text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() =>
                      selectedRoom.is_member ? handleLeaveRoom(selectedRoom) : handleJoinRoom(selectedRoom)
                    }
                    disabled={
                      String(joiningRoomId) === String(selectedRoom.id) ||
                      String(leavingRoomId) === String(selectedRoom.id)
                    }
                  >
                    {String(joiningRoomId) === String(selectedRoom.id) || String(leavingRoomId) === String(selectedRoom.id) ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : selectedRoom.is_member ? (
                      <>
                        <LogOut className="h-3.5 w-3.5" />
                        Leave Room
                      </>
                    ) : (
                      "Join Room"
                    )}
                  </Button>
                </div>
                {(selectedRoom.creator_avatar_url || selectedRoom.creator_username) && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground shrink-0">Created by:</span>
                    <div className="flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1.5">
                      <Avatar className="h-6 w-6 shrink-0">
                        <AvatarImage src={selectedRoom.creator_avatar_url} />
                        <AvatarFallback className="text-[10px]">
                          {selectedRoom.creator_username?.slice(0, 2) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs font-medium text-foreground truncate">
                        {selectedRoom.creator_username || "Room creator"}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Voice Channel */}
          <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <Volume2 className="h-4 w-4 text-accent" />
                Voice Channel
              </div>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 rounded-full text-xs border-border"
                onClick={handleToggleVoice}
              >
                {isInVoice ? (
                  <>
                    <MicOff className="h-3.5 w-3.5" />
                    Leave Voice
                  </>
                ) : (
                  <>
                    <Mic className="h-3.5 w-3.5" />
                    Join Voice
                  </>
                )}
              </Button>
            </div>
            <div className="mt-3 flex flex-wrap gap-3">
              {voiceMembers.length === 0 ? (
                <p className="text-xs text-muted-foreground">Voice members will appear here when available</p>
              ) : (
                voiceMembers.map((m) => (
                  <div key={m.user_id} className="flex items-center gap-2 rounded-lg bg-secondary/50 px-3 py-2">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.avatar_url} />
                      <AvatarFallback className="text-xs">{m.username.slice(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span className="text-xs font-medium">{m.username}</span>
                    <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Chat Messages */}
          <div className="rounded-2xl border border-border bg-card p-4 flex flex-col gap-3 animate-fade-in-up min-h-[200px]">
            <h3 className="text-sm font-semibold text-foreground">Chat</h3>
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto max-h-[240px]">
              {messagesLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : messages.length === 0 ? (
                <p className="text-xs text-muted-foreground">No messages yet in this room</p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      "flex gap-2",
                      msg.sender_id === user?.id && "flex-row-reverse"
                    )}
                  >
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarImage src={msg.avatar_url} />
                      <AvatarFallback className="text-[10px]">
                        {msg.sender_id === user?.id
                          ? (userprofile?.username?.slice(0, 2) || user?.email?.slice(0, 2) || "U").toUpperCase()
                          : msg.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div
                      className={cn(
                        "rounded-lg px-3 py-1.5 max-w-[80%]",
                        msg.sender_id === user?.id
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary"
                      )}
                    >
                      <p className="text-[10px] font-medium opacity-80">{msg.username}</p>
                      <p className="text-xs break-words">{msg.content}</p>
                      <p className="text-[10px] opacity-70 mt-0.5">
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 mt-auto">
              <input
                type="text"
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSendMessage()}
                placeholder={selectedRoom.is_member ? "Type a message..." : "Join the room to send messages"}
                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                aria-label="Type a message in the room chat"
                disabled={!selectedRoom.is_member || sendingMessage}
              />
              <Button
                size="sm"
                className="h-7 rounded-full bg-primary px-3 text-[10px] text-primary-foreground hover:bg-primary/90 transition-all hover-scale disabled:opacity-60"
                onClick={handleSendMessage}
                disabled={!selectedRoom.is_member || sendingMessage || !messageInput.trim()}
              >
                {sendingMessage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Send"}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Room Dialog */}
      {showCreateDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg animate-scale-in">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Create Room</h2>
              <button
                onClick={() => {
                  setShowCreateDialog(false)
                  setRoomCoverPreview(null)
                }}
                className="text-muted-foreground hover:text-foreground transition-colors hover-scale"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Room Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter room name"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  required
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Enter room description (optional)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none transition-colors"
                  rows={3}
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Topic
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="Enter room topic (optional)"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors"
                  disabled={isCreating}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Cover Image
                </label>
                <div className="flex gap-3 items-start">
                  <div className="relative h-20 w-20 shrink-0 rounded-lg overflow-hidden bg-secondary">
                    {roomCoverPreview || formData.image_url ? (
                      <img
                        src={roomCoverPreview || formData.image_url}
                        alt="Room cover"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-muted-foreground">
                        <Upload className="h-6 w-6" />
                      </div>
                    )}
                    {isUploadingCover && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                        <Loader2 className="h-5 w-5 animate-spin text-white" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-background/50 px-3 py-2 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors">
                      <Upload className="h-4 w-4" />
                      <span>Choose image</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleRoomCoverChange}
                        disabled={isUploadingCover || isCreating}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, GIF up to 5MB</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateDialog(false)}
                  disabled={isCreating}
                  className="flex-1 transition-all hover-scale"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreating || !formData.name.trim()}
                  className="flex-1 transition-all hover-scale"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Room"
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
