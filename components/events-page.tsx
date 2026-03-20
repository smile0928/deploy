"use client"

import { useState, useEffect, useRef } from "react"
import Image from "next/image"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  MessageCircle,
  Star,
  ChevronRight,
  Flame,
  Loader2,
  X,
  ImageIcon,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"

interface Event {
  id: string
  title: string
  description?: string
  image_url?: string
  event_date: string
  event_time?: string
  location: string
  category?: string
  attendee_count: number
  interested_count?: number
  is_attending?: boolean
  is_interested?: boolean
  created_at: string
}

interface EventComment {
  id: string
  content: string
  user_id: string
  event_id: string
  created_at: string
  users: { id: string; username: string; avatar_url: string | null } | null
}

function formatEventDateTime(eventDate: string, eventTime?: string): string {
  let iso: string
  if (eventDate.includes("T")) {
    iso = eventDate
  } else if (eventTime) {
    const colons = (eventTime.match(/:/g) ?? []).length
    const time = colons >= 2 ? eventTime : `${eventTime}:00`
    iso = `${eventDate}T${time}`
  } else {
    iso = `${eventDate}T00:00:00`
  }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return eventDate
  const s = d.toLocaleString("en-CA", {
    timeZone: "America/New_York",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
  return s.replace(", ", " ") + " EST"
}

export function EventsPage() {
  const { user } = useAuth()
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [newComment, setNewComment] = useState("")
  const [commentsByEvent, setCommentsByEvent] = useState<Record<string, EventComment[]>>({})
  const [commentsLoading, setCommentsLoading] = useState<string | null>(null)
  const [commentPosting, setCommentPosting] = useState<string | null>(null)
  const [interestedLoading, setInterestedLoading] = useState<string | null>(null)
  const [calendarView, setCalendarView] = useState(false)
  const [showCreateEvent, setShowCreateEvent] = useState(false)
  const [isCreatingEvent, setIsCreatingEvent] = useState(false)
  const [createEventForm, setCreateEventForm] = useState({
    title: "",
    description: "",
    event_date: "",
    location: "",
    anime_theme: "",
    category: "",
    is_virtual: false,
  })
  const [eventImageFile, setEventImageFile] = useState<File | null>(null)
  const [eventImagePreview, setEventImagePreview] = useState<string | null>(null)
  const eventImageInputRef = useRef<HTMLInputElement>(null)
  const eventsFetchedRef = useRef(false)

  useEffect(() => {
    if (eventsFetchedRef.current) return
    eventsFetchedRef.current = true

    const fetchEvents = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await fetch("/api/events")
        if (!response.ok) {
          if (response.status === 401) {
            setLoading(false)
            return
          }
          const errorData = await response.json()
          throw new Error(errorData.error || "Failed to fetch events")
        }
        const data = await response.json()
        setEvents(Array.isArray(data) ? data : data.events || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading events")
        setEvents([])
      } finally {
        setLoading(false)
      }
    }

    fetchEvents()
  }, [])

  const fetchComments = async (eventId: string) => {
    setCommentsLoading(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}/comments`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to fetch comments")
      setCommentsByEvent((prev) => ({ ...prev, [eventId]: Array.isArray(data) ? data : [] }))
    } catch {
      setCommentsByEvent((prev) => ({ ...prev, [eventId]: [] }))
    } finally {
      setCommentsLoading(null)
    }
  }

  useEffect(() => {
    if (selectedEvent) fetchComments(selectedEvent)
  }, [selectedEvent])

  useEffect(() => {
    if (!showCreateEvent) {
      setEventImageFile(null)
      if (eventImagePreview) URL.revokeObjectURL(eventImagePreview)
      setEventImagePreview(null)
      if (eventImageInputRef.current) eventImageInputRef.current.value = ""
    }
  }, [showCreateEvent])

  const onCommentSubmit = async () => {
    if (!selectedEvent || !newComment.trim()) return
    setCommentPosting(selectedEvent)
    try {
      const res = await fetch(`/api/events/${selectedEvent}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: newComment.trim() }),
      })
      const data = await res.json()
      if (!res.ok) {
        const msg = data?.error || "Failed to post comment"
        if (res.status === 409) toast.error(msg)
        throw new Error(msg)
      }
      setNewComment("")
      await fetchComments(selectedEvent)
      toast.success("Comment posted")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setCommentPosting(null)
    }
  }

  const handleInterested = async (eventId: string) => {
    if (interestedLoading) return
    setInterestedLoading(eventId)
    try {
      const res = await fetch(`/api/events/${eventId}/interested`, { method: "POST" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update interest")
      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, is_interested: data.is_interested, interested_count: data.interested_count ?? 0 }
            : e
        )
      )
      toast.success(data.is_interested ? "Marked as interested" : "Removed interest")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setInterestedLoading(null)
    }
  }

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!createEventForm.title || !createEventForm.event_date || !createEventForm.location) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      setIsCreatingEvent(true)
      let image_url: string | null = null
      if (eventImageFile) {
        const formData = new FormData()
        formData.append("image", eventImageFile)
        const uploadRes = await fetch("/api/events/upload-image", {
          method: "POST",
          body: formData,
        })
        const uploadData = await uploadRes.json()
        if (!uploadRes.ok) {
          throw new Error(uploadData.error || "Failed to upload image")
        }
        image_url = uploadData.image_url ?? null
      }
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...createEventForm, image_url }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to create event")
      }

      toast.success("Event created!")
      setShowCreateEvent(false)
      setCreateEventForm({
        title: "",
        description: "",
        event_date: "",
        location: "",
        anime_theme: "",
        category: "",
        is_virtual: false,
      })
      setEventImageFile(null)
      setEventImagePreview(null)
      if (eventImageInputRef.current) eventImageInputRef.current.value = ""
      
      // Refresh events list
      const response = await fetch("/api/events")
      if (response.ok) {
        const newData = await response.json()
        setEvents(Array.isArray(newData) ? newData : newData.events || [])
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create event")
    } finally {
      setIsCreatingEvent(false)
    }
  }

  // Get upcoming events (next 5)
  const upcomingEvents = events
    .sort((a, b) => new Date(a.event_date).getTime() - new Date(b.event_date).getTime())
    .slice(0, 5)

  return (
    <div className="flex gap-6 max-w-[960px] animate-fade-in">
      {/* Events List */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-foreground">Anime Events</h2>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={() => setCalendarView(!calendarView)}
              className="rounded-full border-border text-xs text-muted-foreground hover:text-foreground transition-all hover-scale"
            >
              <Calendar className="mr-1.5 h-3.5 w-3.5" />
              Calendar View
            </Button>
            <Button 
              size="sm" 
              onClick={() => setShowCreateEvent(true)}
              className="rounded-full bg-primary text-xs text-primary-foreground hover:bg-primary/90 transition-all hover-scale"
            >
              Create Event
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64 animate-fade-in">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-500 animate-fade-in-up">Error: {error}</p>
        ) : events.length === 0 ? (
          <p className="text-sm text-muted-foreground animate-fade-in-up">No events found</p>
        ) : (
          <div className="flex flex-col gap-4 animate-stagger">
            {events.map((event) => (
              <article key={event.id} className="font-sans overflow-hidden rounded-2xl border border-border bg-card transition-all hover-lift">
                {/* Event Image */}
                <div className="relative h-40 md:h-48">
                  {event.image_url ? (
                    <Image src={event.image_url} alt={event.title} fill className="object-cover" />
                  ) : (
                    <div className="h-full w-full bg-secondary" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-card via-card/40 to-transparent" />
                  {/* Left: category pill badge (e.g. Watch Party) */}
                  {event.category && (
                    <span className="absolute left-3 top-3 rounded-full bg-[#FF4081] px-3 py-1 text-[10px] font-medium text-white shadow-sm">
                      {event.category}
                    </span>
                  )}
                </div>

                {/* Event Details */}
                <div className="p-4 font-sans">
                  <h3 className="text-lg font-bold text-foreground leading-tight tracking-tight">{event.title}</h3>
                  {event.description && (
                    <p className="mt-1.5 text-sm font-normal text-muted-foreground leading-snug">{event.description}</p>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-normal text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                      {formatEventDateTime(event.event_date, event.event_time)}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-neon-blue shrink-0" />
                      {event.location}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-4">
                    <span className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                      <Users className="h-3.5 w-3.5 shrink-0" />
                      {event.attendee_count} attending
                    </span>
                    {event.interested_count != null && (
                      <span className="flex items-center gap-1.5 text-sm font-normal text-muted-foreground">
                        <Star className="h-3.5 w-3.5 shrink-0" />
                        {event.interested_count} interested
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button size="sm" className="font-sans rounded-full bg-primary text-sm font-normal text-primary-foreground hover:bg-primary/90 transition-all hover-scale">
                      {event.is_attending ? "Attending" : "Attend"}
                    </Button>
                    <Button
                      size="sm"
                      variant={event.is_interested ? "default" : "outline"}
                      className={cn(
                        "font-sans rounded-full text-sm font-normal transition-all hover-scale",
                        event.is_interested ? "bg-primary text-primary-foreground hover:bg-primary/90" : "border-border text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => handleInterested(event.id)}
                      disabled={interestedLoading === event.id}
                    >
                      {interestedLoading === event.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        event.is_interested ? "Interested" : "Interested"
                      )}
                    </Button>
                    <Button size="sm" variant="ghost" className="font-sans rounded-full text-sm font-normal text-muted-foreground hover:text-foreground transition-all hover-scale" onClick={() => setSelectedEvent(selectedEvent === event.id ? null : event.id)}>
                      <MessageCircle className="mr-1 h-3.5 w-3.5" />
                      Comments
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {selectedEvent === event.id && (
                    <div className="mt-3 border-t border-border pt-3 animate-fade-in-up">
                      {commentsLoading === event.id ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          <ul className="space-y-2.5 max-h-48 overflow-y-auto">
                            {(commentsByEvent[event.id] ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">No comments yet. Be the first!</p>
                            ) : (
                              (commentsByEvent[event.id] ?? []).map((c) => (
                                <li key={c.id} className="flex gap-2 text-xs">
                                  <Avatar className="h-6 w-6 shrink-0 rounded-full">
                                    <AvatarImage src={c.users?.avatar_url ?? undefined} />
                                    <AvatarFallback className="text-[10px] bg-primary/20 text-primary">
                                      {(c.users?.username ?? "?").slice(0, 1).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="min-w-0 flex-1">
                                    <span className="font-medium text-foreground">{c.users?.username ?? "Unknown"}</span>
                                    <span className="text-muted-foreground"> · </span>
                                    <span className="text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</span>
                                    <p className="mt-0.5 text-foreground break-words">{c.content}</p>
                                  </div>
                                </li>
                              ))
                            )}
                          </ul>
                          {(commentsByEvent[event.id] ?? []).some((c) => c.user_id === user?.id) ? (
                            <p className="mt-2.5 text-xs text-muted-foreground">You&apos;ve already commented on this event.</p>
                          ) : (
                            <div className="mt-2.5 flex items-center gap-2 rounded-xl bg-secondary px-3 py-2">
                              <input
                                type="text"
                                value={newComment}
                                onChange={(e) => setNewComment(e.target.value)}
                                placeholder="Add a comment about this event..."
                                className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
                                aria-label="Write a comment about this event"
                                disabled={commentPosting === event.id}
                              />
                              <Button
                                onClick={onCommentSubmit}
                                size="sm"
                                className="h-7 rounded-full bg-primary px-3 text-[10px] text-primary-foreground hover:bg-primary/90"
                                disabled={!newComment.trim() || commentPosting === event.id}
                              >
                                {commentPosting === event.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Post"}
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
              </div>
            </article>
            ))}
          </div>
        )}
      </div>

      {/* Sidebar - Milestones */}
      <aside className="hidden lg:block w-[280px] shrink-0">
        <div className="sticky top-4 rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-foreground">
            <Flame className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Upcoming Milestones</h3>
          </div>
          <div className="mt-4 flex flex-col gap-3">
            {upcomingEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground">No upcoming events</p>
            ) : (
              upcomingEvents.map((event) => (
                <div
                  key={event.id}
                  className="rounded-lg border border-border/50 bg-secondary/50 p-2.5 hover:border-border/80 transition-colors cursor-pointer"
                >
                  <p className="text-xs font-medium text-foreground line-clamp-2">{event.title}</p>
                  <div className="mt-1.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>{formatEventDateTime(event.event_date, event.event_time)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground">
                    <Users className="h-3 w-3" />
                    <span>{event.attendee_count} attending</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>

      {/* Create Event Dialog */}
      {showCreateEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground">Create Event</h2>
              <button
                type="button"
                onClick={() => {
                  setShowCreateEvent(false)
                  setEventImageFile(null)
                  setEventImagePreview(null)
                  if (eventImageInputRef.current) eventImageInputRef.current.value = ""
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={createEventForm.category}
                  onChange={(e) => setCreateEventForm({ ...createEventForm, category: e.target.value })}
                  placeholder="e.g., Watch Party, Meetup, Convention"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  disabled={isCreatingEvent}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Event Title *
                </label>
                <input
                  type="text"
                  value={createEventForm.title}
                  onChange={(e) => setCreateEventForm({ ...createEventForm, title: e.target.value })}
                  placeholder="Enter event title"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  disabled={isCreatingEvent}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Description
                </label>
                <textarea
                  value={createEventForm.description}
                  onChange={(e) => setCreateEventForm({ ...createEventForm, description: e.target.value })}
                  placeholder="Event details"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none resize-none"
                  rows={3}
                  disabled={isCreatingEvent}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Event picture / video
                </label>
                <input
                  ref={eventImageInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) {
                      if (eventImagePreview) URL.revokeObjectURL(eventImagePreview)
                      setEventImageFile(file)
                      setEventImagePreview(URL.createObjectURL(file))
                    }
                  }}
                />
                {eventImagePreview ? (
                  <div className="relative rounded-lg border border-border overflow-hidden bg-secondary">
                    <div className="aspect-video w-full relative">
                      <Image
                        src={eventImagePreview}
                        alt="Event preview"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEventImageFile(null)
                        if (eventImagePreview) URL.revokeObjectURL(eventImagePreview)
                        setEventImagePreview(null)
                        if (eventImageInputRef.current) eventImageInputRef.current.value = ""
                      }}
                      className="absolute top-2 right-2 rounded-full bg-black/60 hover:bg-black/80 p-1.5 text-white"
                      aria-label="Remove picture"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => eventImageInputRef.current?.click()}
                    disabled={isCreatingEvent}
                    className="w-full rounded-lg border border-dashed border-border text-muted-foreground hover:text-foreground"
                  >
                    <ImageIcon className="mr-2 h-4 w-4" />
                    Add picture
                  </Button>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Event Date *
                </label>
                <input
                  type="date"
                  value={createEventForm.event_date}
                  onChange={(e) => setCreateEventForm({ ...createEventForm, event_date: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  disabled={isCreatingEvent}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Anime Theme
                </label>
                <input
                  type="text"
                  value={createEventForm.anime_theme}
                  onChange={(e) => setCreateEventForm({ ...createEventForm, anime_theme: e.target.value })}
                  placeholder="e.g., Jujutsu Kaisen, One Piece"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  disabled={isCreatingEvent}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Location *
                </label>
                <input
                  type="text"
                  value={createEventForm.location}
                  onChange={(e) => setCreateEventForm({ ...createEventForm, location: e.target.value })}
                  placeholder="Event location"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
                  disabled={isCreatingEvent}
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_virtual"
                  checked={createEventForm.is_virtual}
                  onChange={(e) => setCreateEventForm({ ...createEventForm, is_virtual: e.target.checked })}
                  className="rounded border-border cursor-pointer"
                  disabled={isCreatingEvent}
                />
                <label htmlFor="is_virtual" className="text-sm font-medium text-foreground cursor-pointer">
                  Virtual Event
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateEvent(false)}
                  disabled={isCreatingEvent}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isCreatingEvent}
                  className="flex-1"
                >
                  {isCreatingEvent ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Event"
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
