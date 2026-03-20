"use client"

import { useState, useEffect } from "react"
import { Plus, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { StoryViewer } from "@/components/story-viewer"
import { CreateStory } from "@/components/create-story"

interface Story {
  id: string
  user_id: string
  name: string
  avatar?: string
  isAdd: boolean
  hasNew: boolean
  content?: string
  image_url?: string
  video_url?: string
  created_at: string
  expires_at: string
  view_count: number
  user?: {
    id: string
    username: string
    avatar_url?: string
  }
}

export function StoriesBar() {
  const [stories, setStories] = useState<Story[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStoryId, setSelectedStoryId] = useState<string | undefined>()
  const [viewerOpen, setViewerOpen] = useState(false)

  useEffect(() => {
    const fetchStories = async () => {
      try {
        setLoading(true)
        // Fetch stories from following
        const response = await fetch("/api/stories")
        if (response.ok) {
          const storyData = await response.json()
          const processedStories = (Array.isArray(storyData) ? storyData : []).map((story: any) => ({
            id: story.id,
            user_id: story.user_id,
            name: story.user?.username || 'Unknown',
            avatar: story.user?.avatar_url,
            isAdd: false,
            hasNew: !story.has_viewed,
            content: story.content,
            image_url: story.image_url,
            video_url: story.video_url,
            created_at: story.created_at,
            expires_at: story.expires_at,
            view_count: story.view_count,
            user: story.user,
          }))

          setStories([
            {
              id: "add",
              user_id: "",
              name: "Your Story",
              avatar: "",
              isAdd: true,
              hasNew: false,
              created_at: "",
              expires_at: "",
              view_count: 0,
            },
            ...processedStories,
          ])
        }
      } catch (error) {
        console.error("Error fetching stories:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStories()
  }, [])

  return (
    <section aria-label="Stories" className="w-full">
      <ScrollArea className="w-full">
        <div className="flex gap-4 px-1 py-3">
          {/* Create Story Button */}
          <div className="flex flex-col items-center gap-1.5 shrink-0">
            <CreateStory onStoryCreated={() => {
              // Refresh stories
              fetch("/api/stories").then(r => r.json()).then(data => {
                const processedStories = (Array.isArray(data) ? data : []).map((story: any) => ({
                  id: story.id,
                  user_id: story.user_id,
                  name: story.user?.username || 'Unknown',
                  avatar: story.user?.avatar_url,
                  isAdd: false,
                  hasNew: !story.has_viewed,
                  content: story.content,
                  image_url: story.image_url,
                  video_url: story.video_url,
                  created_at: story.created_at,
                  expires_at: story.expires_at,
                  view_count: story.view_count,
                  user: story.user,
                }))
                setStories([
                  {
                    id: "add",
                    user_id: "",
                    name: "Your Story",
                    avatar: "",
                    isAdd: true,
                    hasNew: false,
                    created_at: "",
                    expires_at: "",
                    view_count: 0,
                  },
                  ...processedStories,
                ])
              })
            }} />
          </div>

          {/* Stories */}
          {stories.map((story) => {
            if (story.isAdd) return null

            return (
              <button
                key={story.id}
                onClick={() => {
                  setSelectedStoryId(story.id)
                  setViewerOpen(true)
                }}
                className="flex flex-col items-center gap-1.5 shrink-0 hover:opacity-80 transition-opacity"
                aria-label={`View ${story.name}'s story`}
              >
                <div className={story.hasNew ? "story-ring" : "rounded-full p-0.5"}>
                  <div className="relative rounded-full bg-background p-0.5">
                    <Avatar className="h-14 w-14 md:h-16 md:w-16">
                      <AvatarImage
                        src={
                          story.avatar ||
                          `https://api.dicebear.com/7.x/avataaars/svg?seed=${story.user_id}`
                        }
                        alt={story.name}
                      />
                      <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                        {story.name.slice(0, 2)}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                </div>
                <span className="w-16 truncate text-center text-[11px] text-muted-foreground">
                  {story.name}
                </span>
              </button>
            )
          })}
        </div>
        <ScrollBar orientation="horizontal" />
      </ScrollArea>

      {/* Story Viewer Modal */}
      <StoryViewer
        stories={stories.filter(s => !s.isAdd)}
        initialStoryId={selectedStoryId}
        open={viewerOpen}
        onClose={() => {
          setViewerOpen(false)
          setSelectedStoryId(undefined)
        }}
      />
    </section>
  )
}
