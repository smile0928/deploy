"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  Search,
  Send,
  Phone,
  Video,
  ImageIcon,
  SmilePlus,
  MoreHorizontal,
  ArrowLeft,
  RefreshCw,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/auth-context"
import { createClient } from "@/lib/supabase-client"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Conversation {
  id: string
  name: string
  avatar?: string
  last_message?: string
  last_message_time?: string
  unread_count: number
  is_online?: boolean
}

interface Message {
  id: string
  sender: "me" | "them"
  text: string
  time: string
  created_at?: string
}

function sortMessagesByTime(msgs: Message[]): Message[] {
  return [...msgs].sort((a, b) => {
    const tA = a.created_at ? new Date(a.created_at).getTime() : 0
    const tB = b.created_at ? new Date(b.created_at).getTime() : 0
    return tA - tB
  })
}

export function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [chatMessages, setChatMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [messagesLoading, setMessagesLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedChat, setSelectedChat] = useState<string | null>(null)
  const [message, setMessage] = useState("")
  const [manuallyAddedRecipient, setManuallyAddedRecipient] = useState<Conversation | null>(null)
  const [paginationCursor, setPaginationCursor] = useState<string | null>(null)
  const [hasMoreMessages, setHasMoreMessages] = useState(false)
  const [liveUpdatesEnabled, setLiveUpdatesEnabled] = useState(true)
  const { user, userprofile } = useAuth()
  const router = useRouter()
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const selectedChatRef = useRef<string | null>(null)
  selectedChatRef.current = selectedChat
  const manuallyAddedRecipientRef = useRef<Conversation | null>(null)
  manuallyAddedRecipientRef.current = manuallyAddedRecipient

  const refetchConversations = useCallback(async () => {
    try {
      const response = await fetch("/api/messages", { cache: "no-store" })
      if (!response.ok) return
      const data = await response.json()
      const convList = Array.isArray(data) ? data : data.messages || []
      const conversationsMap = new Map<string, Conversation>()
      convList.forEach((c: Conversation) => conversationsMap.set(c.id, c))
      const manual = manuallyAddedRecipientRef.current
      if (manual) conversationsMap.set(manual.id, manual)
      const updated = Array.from(conversationsMap.values()).sort((a, b) => {
        const timeA = new Date(a.last_message_time || 0).getTime()
        const timeB = new Date(b.last_message_time || 0).getTime()
        return timeB - timeA
      })
      setConversations(updated)
    } catch (err) {
      console.warn("Refetch conversations failed:", err)
    }
  }, [])

  // Function that runs after chat history loads
  const onMessagesLoaded = () => {
    console.log("✅ Chat history loaded successfully")
    // You can add any custom logic here that should run after messages load
    // For example: scroll to latest message, play notification sound, etc.
  }

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messagesContainerRef.current) {
      setTimeout(() => {
        messagesContainerRef.current?.scrollTo({
          top: messagesContainerRef.current.scrollHeight,
          behavior: 'smooth'
        })
      }, 0)
    }
  }, [chatMessages])

  // Handle recipient from query params
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    const params = new URLSearchParams(window.location.search)
    const recipient = params.get("recipient")
    
    if (recipient) {
      console.log("📨 Opening chat with recipient:", recipient)
      setSelectedChat(recipient)
      
      // Fetch recipient user data and add them to conversations if not already there
      const addRecipientToConversations = async () => {
        try {
          const response = await fetch(`/api/users/${recipient}`)
          if (response.ok) {
            const userData = await response.json()
            console.log("👤 Loaded recipient user data:", userData.username)
            const recipientConv: Conversation = {
              id: recipient,
              name: userData.username || 'User',
              avatar: userData.avatar_url,
              last_message: 'No messages yet',
              last_message_time: 'now',
              unread_count: 0,
              is_online: false
            }
            setManuallyAddedRecipient(recipientConv)
            setConversations(prev => {
              const exists = prev.some(conv => conv.id === recipient)
              if (exists) return prev
              return [recipientConv, ...prev]
            })
          }
        } catch (err) {
          console.error('Error fetching recipient user:', err)
        }
      }
      
      addRecipientToConversations()
      
      // Remove query params from URL after a brief delay to ensure state is set
      setTimeout(() => {
        window.history.replaceState({}, document.title, "/messages")
      }, 100)
    }
  }, [])

  useEffect(() => {
    if (!user) return

    let isMounted = true

    const fetchConversations = async () => {
      try {
        setLoading(true)
        console.log("📬 Loading conversations...")
        const response = await fetch("/api/messages", { cache: "no-store" })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch conversations")
        }
        const data = await response.json()
        const convList = Array.isArray(data) ? data : data.messages || []
        
        if (isMounted) {
          // Build final conversations list
          const conversationsMap = new Map<string, Conversation>()
          
          // First add conversations from API
          convList.forEach((conv: Conversation) => {
            conversationsMap.set(conv.id, conv)
          })
          
          // Then add or update manually-added recipient
          if (manuallyAddedRecipient) {
            conversationsMap.set(manuallyAddedRecipient.id, manuallyAddedRecipient)
          }
          
          const updatedConversations = Array.from(conversationsMap.values())
          
          // Sort by latest message time (most recent first)
          updatedConversations.sort((a, b) => {
            const timeA = new Date(a.last_message_time || 0).getTime()
            const timeB = new Date(b.last_message_time || 0).getTime()
            return timeB - timeA
          })
          
          setConversations(updatedConversations)
          
          // Auto-select latest conversation if none selected
          if (updatedConversations.length > 0 && !selectedChat) {
            const latestChat = updatedConversations[0].id
            console.log("✅ Auto-selecting latest conversation:", latestChat)
            setSelectedChat(latestChat)
          }
          
          setLoading(false)
          console.log("✅ Conversations loaded:", updatedConversations.length)
        }
      } catch (err) {
        if (isMounted) {
          console.error("❌ Error loading conversations:", err)
          setError(err instanceof Error ? err.message : "Error loading conversations")
          // Even on error, preserve manually-added recipient
          if (manuallyAddedRecipient) {
            setConversations([manuallyAddedRecipient])
            if (!selectedChat) {
              setSelectedChat(manuallyAddedRecipient.id)
            }
          } else {
            setConversations([])
          }
          setLoading(false)
        }
      }
    }

    // Fetch conversations only once on mount
    fetchConversations()
    
    // No polling - real-time updates handled by socket subscription below
    return () => {
      isMounted = false
    }
  }, [user, manuallyAddedRecipient])

  // Fetch messages for selected conversation
  useEffect(() => {
    if (!selectedChat) {
      setChatMessages([])
      setMessagesLoading(false)
      setPaginationCursor(null)
      setHasMoreMessages(false)
      return
    }

    let isMounted = true

    const fetchMessages = async () => {
      setMessagesLoading(true)
      try {
        console.log("📥 Fetching messages for chat:", selectedChat)
        
        const url = new URL(`/api/messages/${selectedChat}`, window.location.origin)
        url.searchParams.set('limit', '50')
        
        const response = await fetch(url.toString(), { cache: "no-store" })
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch messages")
        }
        const data = await response.json()
        const messages = Array.isArray(data) ? data : data.messages || []
        
        if (isMounted) {
          console.log("✅ Loaded messages:", messages.length)
          setChatMessages(sortMessagesByTime(messages))
          setPaginationCursor(data.nextCursor || null)
          setHasMoreMessages(data.hasMore || false)
          setMessagesLoading(false)
          // Call the callback function after messages load
          onMessagesLoaded()
          
          // Mark messages as read and clear unread count
          setConversations(prev =>
            prev.map(conv =>
              conv.id === selectedChat ? { ...conv, unread_count: 0 } : conv
            )
          )
          
          // Mark messages as read in database
          console.log("📝 Marking messages as read for:", selectedChat)
          
          const markMessagesAsRead = async () => {
            try {
              const markReadResponse = await fetch("/api/messages/mark-read", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ sender_id: selectedChat }),
              })
              
              if (markReadResponse.ok) {
                const markReadData = await markReadResponse.json()
                console.log(`✅ Marked ${markReadData.markedCount} messages as read`)
                
                // Emit event to notify sidebar to refresh badge counts
                console.log("🔔 Dispatching messagesRead event to sidebar...")
                const event = new CustomEvent('messagesRead', { 
                  detail: { 
                    count: markReadData.markedCount,
                    sender_id: selectedChat,
                    timestamp: new Date().getTime()
                  },
                  bubbles: true,
                  cancelable: true
                })
                window.dispatchEvent(event)
                console.log("✅ messagesRead event dispatched")
              } else {
                console.warn("⚠️ Failed to mark messages as read:", markReadResponse.status)
              }
            } catch (markReadErr) {
              console.warn("⚠️ Error marking messages as read:", markReadErr)
            }
          }
          
          // Mark as read without blocking
          markMessagesAsRead()
        }
      } catch (err) {
        console.error("Error loading messages:", err)
        if (isMounted) {
          setChatMessages([])
          setMessagesLoading(false)
        }
      }
    }

    // Fetch messages immediately (reset pagination)
    setPaginationCursor(null)
    setHasMoreMessages(false)
    fetchMessages()

    return () => {
      isMounted = false
    }
  }, [selectedChat])

  // Refetch conversation list and chat history when a new message arrives (recipient's view must always update).
  // Event is dispatched by MessageNotificationListener (layout) when Supabase notifies of messages INSERT for this user.

  const onNewMessageReceived = () => {
    console.log("################", "onNewMessageReceived")
    const currentSelected = selectedChatRef.current
    // Always refetch conversation list so left panel (last message, time, unread) updates
    refetchConversations()
    // Always refetch the currently open chat so the recipient sees the new message in their chat history
    if (currentSelected) {
      const url = new URL(`/api/messages/${currentSelected}`, window.location.origin)
      url.searchParams.set("limit", "50")
      fetch(url.toString(), { cache: "no-store" })
        .then((res) => (res.ok ? res.json() : Promise.reject(res)))
        .then((data) => {
          const messages = Array.isArray(data) ? data : data.messages || []
          setChatMessages(sortMessagesByTime(messages))
          setPaginationCursor(data.nextCursor ?? null)
          setHasMoreMessages(data.hasMore ?? false)
        })
        .catch((err) => console.warn("Refetch messages on newMessageReceived failed:", err))
    }
  }

  useEffect(() => {

    window.addEventListener("newMessageReceived", onNewMessageReceived)
    // return () => window.removeEventListener("newMessageReceived", onNewMessageReceived)
  }, [refetchConversations])

  // Realtime subscription for messages (only when live updates are enabled)
  useEffect(() => {
    if (!user || !liveUpdatesEnabled) return

    let isMounted = true
    const supabase = createClient()

    const handleNewMessage = (payload: { new: { id: string; sender_id: string; recipient_id: string; content: string; created_at: string } }) => {
      if (!isMounted) return

      const otherUserId = payload.new.sender_id === user.id ? payload.new.recipient_id : payload.new.sender_id
      const messageTime = new Date(payload.new.created_at).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
      const currentSelected = selectedChatRef.current

      if (currentSelected === otherUserId) {
        const newMessage: Message = {
          id: payload.new.id,
          sender: payload.new.sender_id === user.id ? ('me' as const) : ('them' as const),
          text: payload.new.content,
          time: messageTime,
          created_at: payload.new.created_at
        }

        setChatMessages((prev) => {
          const exists = prev.some(m => m.id === payload.new.id)
          if (exists) return prev

          let next: Message[]
          if (payload.new.sender_id === user.id) {
            next = prev.map(m =>
              m.id.startsWith('temp-') && m.text === payload.new.content && m.sender === 'me'
                ? newMessage
                : m
            )
          } else {
            next = [...prev, newMessage]
          }
          return sortMessagesByTime(next)
        })
      }

      setConversations((prev) => {
        const existingIndex = prev.findIndex(c => c.id === otherUserId)
        const updatedConversation: Conversation = {
          id: otherUserId,
          name: prev[existingIndex]?.name || 'User',
          avatar: prev[existingIndex]?.avatar,
          last_message: payload.new.content,
          last_message_time: messageTime,
          unread_count: currentSelected === otherUserId
            ? 0
            : (payload.new.sender_id !== user.id
              ? (prev[existingIndex]?.unread_count || 0) + 1
              : 0),
          is_online: prev[existingIndex]?.is_online
        }

        if (existingIndex === -1) {
          return [updatedConversation, ...prev]
        }
        const updated = [...prev]
        updated.splice(existingIndex, 1)
        return [updatedConversation, ...updated]
      })
    }

    const channel = supabase
      .channel(`user_messages_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `sender_id.eq.${user.id}`
        },
        handleNewMessage
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `recipient_id.eq.${user.id}`
        },
        handleNewMessage
      )
      .subscribe()

    return () => {
      isMounted = false
      supabase.removeChannel(channel)
    }
  }, [user, liveUpdatesEnabled])

  const activeConversation = conversations.find((c) => c.id === selectedChat)

  if (!user) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-120px)] md:h-[calc(100vh-40px)]">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Please sign in to view messages</p>
          <Button
            onClick={() => router.push("/signin")}
            className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
          >
            Sign In
          </Button>
        </div>
      </div>
    )
  }

  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat) return

    const messageContent = message
    setMessage("")
    
    // Create optimistic message with temp ID
    const tempId = `temp-${Date.now()}`
    const currentTime = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    })
    
    // Immediately add message to chat (optimistic update)
    const nowIso = new Date().toISOString()
    const optimisticMessage: Message = {
      id: tempId,
      sender: "me",
      text: messageContent,
      time: currentTime,
      created_at: nowIso
    }

    console.log("💬 Optimistic message added:", tempId)
    setChatMessages(prev => sortMessagesByTime([...prev, optimisticMessage]))
    
    // Also update conversation list immediately with the message
    setConversations(prev => {
      const existingIndex = prev.findIndex(c => c.id === selectedChat)
      if (existingIndex === -1) return prev
      
      const updated = [...prev]
      const existing = updated[existingIndex]
      updated.splice(existingIndex, 1)
      
      return [{
        ...existing,
        last_message: messageContent,
        last_message_time: currentTime,
        unread_count: 0 // Your own messages don't count as unread
      }, ...updated]
    })
    
    // Emit event to refresh sidebar badge count - mark as read since we just sent it
    console.log("🔔 Emitting messagesRead event after sending message...")
    const sendEvent = new CustomEvent('messagesRead', { 
      detail: { 
        source: 'sentMessage',
        count: 0,
        timestamp: new Date().getTime()
      },
      bubbles: true,
      cancelable: true
    })
    window.dispatchEvent(sendEvent)
    console.log("✅ messagesRead event dispatched")
    
    console.log("🔵 Sending message to:", selectedChat, "Content:", messageContent)

    try {
      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipient_id: selectedChat,
          content: messageContent,
        }),
      })
      
      console.log("📤 Send response status:", response.status)
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error("❌ Send error:", errorData)
        toast.error("Failed to send message: " + (errorData.error || "Unknown error"))
        setError(errorData.error || "Failed to send message")
        
        // Remove the optimistic message on error
        setChatMessages(prev => prev.filter(m => m.id !== tempId))
        return
      }

      const sentMessage = await response.json()
      console.log("✅ Message sent from server with ID:", sentMessage.id)
      console.log("📡 Real-time subscription will replace temp ID with real ID")
      
      toast.success("✅ Message sent!")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error sending message"
      console.error("❌ Error:", errorMessage)
      setError(errorMessage)
      toast.error(errorMessage)
      
      // Remove the optimistic message on error
      setChatMessages(prev => prev.filter(m => m.id !== tempId))
    }
  }

  return (
    <div className="flex gap-0 max-w-[960px] h-[calc(100vh-120px)] md:h-[calc(100vh-90px)] rounded-2xl border border-border bg-card overflow-hidden">
      {/* Conversations List */}
      <div className={cn(
        "w-full md:w-[320px] shrink-0 min-h-0 border-r border-border flex flex-col",
        selectedChat && "hidden md:flex"
      )}>
        <div className="p-3 border-b border-border">
          <h2 className="text-base font-bold text-foreground">Messages</h2>
          <div className="relative mt-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search messages..."
              className="w-full rounded-xl bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary transition-colors"
              aria-label="Search messages"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="flex flex-col items-center gap-3">
                <div className="inline-block">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                </div>
                <p className="text-sm text-muted-foreground">Loading conversations...</p>
              </div>
            </div>
          ) : error ? (
            <p className="text-sm text-red-500 p-3">Error: {error}</p>
          ) : conversations.length === 0 ? (
            <p className="text-sm text-muted-foreground p-3">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setSelectedChat(conv.id)}
                className={cn(
                  "flex w-full items-center gap-3 px-3 py-3 text-left transition-all hover-scale",
                  selectedChat === conv.id ? "bg-primary/10" : "hover:bg-secondary"
                )}
              >
                <div className="relative shrink-0">
                  <Avatar className="h-11 w-11">
                    <AvatarImage src={conv.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${conv.id}`} alt={conv.name} />
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{conv.name.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  {conv.is_online && (
                    <span className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card bg-accent animate-pulse-glow" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-semibold text-foreground">{conv.name}</span>
                    <span className="shrink-0 text-[10px] text-muted-foreground whitespace-nowrap">{conv.last_message_time}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{conv.last_message || "No messages yet"}</p>
                </div>
                {conv.unread_count > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground shrink-0">
                    {conv.unread_count}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      {selectedChat && activeConversation ? (
        <div className={cn("flex flex-1 flex-col min-h-0", !selectedChat && "hidden md:flex")}>
          {/* Chat Header */}
          <div className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 md:hidden text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setSelectedChat(null)}
              aria-label="Back to conversations"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Avatar className="h-9 w-9">
              <AvatarImage src={activeConversation.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${activeConversation.id}`} alt={activeConversation.name} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">{activeConversation.name.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{activeConversation.name}</p>
              <p className="text-[10px] text-accent">{activeConversation.is_online ? "Online" : "Offline"}</p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                size="sm"
                variant={liveUpdatesEnabled ? "secondary" : "ghost"}
                className={cn(
                  "h-8 gap-1.5 text-muted-foreground hover:text-foreground transition-colors hover-scale",
                  liveUpdatesEnabled && "text-foreground"
                )}
                onClick={() => setLiveUpdatesEnabled((v) => !v)}
                aria-label={liveUpdatesEnabled ? "Live updates on" : "Live updates off"}
                title={liveUpdatesEnabled ? "Live updates on – new messages appear automatically" : "Live updates off – turn on to see new messages automatically"}
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span className="text-[10px] hidden sm:inline">{liveUpdatesEnabled ? "Live" : "Off"}</span>
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors hover-scale" aria-label="Voice call">
                <Phone className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors hover-scale" aria-label="Video call">
                <Video className="h-4 w-4" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-colors hover-scale" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Messages */}
          <div ref={messagesContainerRef} className="flex-1 min-h-0 overflow-y-auto p-4 flex flex-col gap-3">
            {messagesLoading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">Loading chat history...</p>
              </div>
            ) : chatMessages.length === 0 ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-sm text-muted-foreground">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={cn(
                    "flex",
                    msg.sender === "me" ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-3.5 py-2 transition-all hover-lift",
                      msg.sender === "me"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-secondary-foreground rounded-bl-md"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                    <p className={cn(
                      "mt-1 text-[10px]",
                      msg.sender === "me" ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>{msg.time}</p>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Message Input */}
          <div className="border-t border-border p-3">
            <div className="flex items-center gap-2">
              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground transition-colors hover-scale" aria-label="Attach image">
                <ImageIcon className="h-4 w-4" />
              </Button>
              <div className="flex flex-1 items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  aria-label="Type a message"
                />
                <button className="text-muted-foreground hover:text-foreground transition-colors hover-scale" aria-label="Add emoji">
                  <SmilePlus className="h-4 w-4" />
                </button>
              </div>
              <Button
                size="icon"
                className="h-9 w-9 shrink-0 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover-scale"
                disabled={!message.trim()}
                onClick={handleSendMessage}
                aria-label="Send message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center text-muted-foreground">
          <p className="text-sm">Select a conversation to start chatting</p>
        </div>
      )}
    </div>
  )
}
