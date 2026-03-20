"use client"

import { useState, useEffect } from "react"
import { X, ChevronRight, ChevronLeft, Eye } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

interface Story {
  id: string
  user_id: string
  content?: string
  image_url?: string
  video_url?: string
  created_at: string
  expires_at: string
  view_count: number
  has_viewed: boolean
  user: {
    id: string
    username: string
    avatar_url?: string
  }
}

interface StoryViewerProps {
  stories: Story[]
  initialStoryId?: string
  onClose: () => void
  open: boolean
}

export function StoryViewer({ stories, initialStoryId, onClose, open }: StoryViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const initialIndex = stories.findIndex(s => s.id === initialStoryId)
    if (initialIndex !== -1) {
      setCurrentIndex(initialIndex)
    }
  }, [stories, initialStoryId, open])

  useEffect(() => {
    if (!open) return

    const currentStory = stories[currentIndex]
    if (!currentStory) return

    // Mark as viewed
    fetch(`/api/stories/${currentStory.id}/view`, { method: 'POST' }).catch(console.error)

    // Progress bar animation
    let startTime = Date.now()
    let animationId: NodeJS.Timeout

    const animate = () => {
      const elapsed = Date.now() - startTime
      const duration = 5000 // 5 seconds per story
      const newProgress = Math.min((elapsed / duration) * 100, 100)

      setProgress(newProgress)

      if (newProgress >= 100) {
        if (currentIndex < stories.length - 1) {
          setCurrentIndex(currentIndex + 1)
          setProgress(0)
          startTime = Date.now()
          animationId = setTimeout(animate, 50)
        } else {
          onClose()
        }
      } else {
        animationId = setTimeout(animate, 50)
      }
    }

    animationId = setTimeout(animate, 50)

    return () => clearTimeout(animationId)
  }, [open, currentIndex, stories, onClose])

  if (!open || stories.length === 0 || !stories[currentIndex]) {
    return null
  }

  const story = stories[currentIndex]
  const timeLeft = Math.max(
    0,
    Math.round((new Date(story.expires_at).getTime() - Date.now()) / 1000 / 60)
  )

  const handleNext = () => {
    setProgress(0)
    if (currentIndex < stories.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      onClose()
    }
  }

  const handlePrev = () => {
    setProgress(0)
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl h-screen max-h-screen flex flex-col bg-black border-0 p-0">
        <DialogTitle className="sr-only">Story Viewer</DialogTitle>
        {/* Progress bars */}
        <div className="flex gap-1 px-4 pt-4">
          {stories.map((_, idx) => (
            <div key={idx} className="flex-1 h-0.5 bg-white/30 rounded-full overflow-hidden">
              <div
                className="h-full bg-white transition-all duration-100"
                style={{
                  width: idx < currentIndex ? "100%" : idx === currentIndex ? `${progress}%` : "0%",
                }}
              />
            </div>
          ))}
        </div>

        {/* Header with user info */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={
                  story.user.avatar_url ||
                  `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.user.id}`
                }
              />
              <AvatarFallback>{story.user.username.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm">{story.user.username}</span>
              <span className="text-white/60 text-xs">{timeLeft}m left</span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:text-white/80">
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Story content */}
        <div className="flex-1 flex items-center justify-center bg-black relative overflow-hidden">
          {story.image_url && (
            <img
              src={story.image_url}
              alt="Story"
              className="w-full h-full object-contain"
            />
          )}
          {story.video_url && (
            <video
              src={story.video_url}
              className="w-full h-full object-contain"
              autoPlay
              muted
            />
          )}
          {story.content && !story.image_url && !story.video_url && (
            <div className="flex items-center justify-center px-8 py-12">
              <p className="text-white text-lg text-center break-words">{story.content}</p>
            </div>
          )}

          {/* Navigation buttons */}
          {currentIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handlePrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80"
            >
              <ChevronLeft className="h-6 w-6" />
            </Button>
          )}

          {currentIndex < stories.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white/80"
            >
              <ChevronRight className="h-6 w-6" />
            </Button>
          )}
        </div>

        {/* Footer with view count */}
        <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white/60">
            <Eye className="h-4 w-4" />
            <span className="text-sm">{story.view_count} views</span>
          </div>
          <span className="text-white/60 text-xs">
            {currentIndex + 1} / {stories.length}
          </span>
        </div>
      </DialogContent>
    </Dialog>
  )
}
