"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ImageIcon, Video, SmilePlus, MapPin, Hash, Loader2, X, Sparkles, Scissors } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { useAuth } from "@/context/auth-context"
import { cn } from "@/lib/utils"
import { supabase } from "@/lib/supabase/client"

const defaultTags = [
  "Jujutsu Kaisen",
  "One Piece",
  "Demon Slayer",
  "Attack on Titan",
  "My Hero Academia",
  "Spy x Family",
  "Chainsaw Man",
  "Bleach",
]

export function CreatePost({ onPostCreated }: { onPostCreated?: () => void }) {
  const [content, setContent] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [importantMomentFile, setImportantMomentFile] = useState<File | null>(null)
  const [bestScenesFile, setBestScenesFile] = useState<File | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [nextFileTarget, setNextFileTarget] = useState<"main" | "moment" | "best">("main")
  const { user } = useAuth()
  const router = useRouter()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const highlightInputRef = useRef<HTMLInputElement>(null)
  const [animeTags, setAnimeTags] = useState<string[]>(defaultTags)

  const fileToDataUrl = (file: File) => {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleSubmit = async () => {
    if (!user) {
      toast.error("Please sign in to create a post")
      router.push("/signin")
      return
    }

    if (!content.trim()) {
      toast.error("Please write something")
      return
    }

    setIsLoading(true)
    try {
      let imageUrl: string | null = null
      let importantMomentUrl: string | null = null
      let bestScenesUrl: string | null = null

      // Convert files to base64 (image or video)
      if (selectedFile) {
        imageUrl = await fileToDataUrl(selectedFile)
      }
      if (importantMomentFile) {
        importantMomentUrl = await fileToDataUrl(importantMomentFile)
      }
      if (bestScenesFile) {
        bestScenesUrl = await fileToDataUrl(bestScenesFile)
      }

      const tags: string[] = [...selectedTags]
      // if (highlightType === "moment") tags.push("important-moment")
      // if (highlightType === "best") tags.push("best-scene")
      // tags.push(highlightType);

      const res = await fetch("/api/posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: content.trim(),
          image_url: imageUrl,
          important_moment_url: importantMomentUrl,
          best_scenes_url: bestScenesUrl,
          type: "post",
          tags,
        }),
      })

      const responseData = await res.json()

      if (!res.ok) {
        throw new Error(responseData.error || "Failed to create post")
      }

      toast.success("Post created!")
      setContent("")
      setSelectedFile(null)
      setImportantMomentFile(null)
      setBestScenesFile(null)
      setSelectedTags([])
      onPostCreated?.()
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to create post"
      toast.error(errorMessage)
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleFileSelect = (file: File, target: "main" | "moment" | "best", mainMediaKind?: "image" | "video") => {
    if (target === "moment") {
      setImportantMomentFile(file)
    } else if (target === "best") {
      setBestScenesFile(file)
    } else {
      if (mainMediaKind === "image" && !file.type.startsWith("image/")) {
        toast.error("Please select an image file")
        return
      }
      if (mainMediaKind === "video" && !file.type.startsWith("video/")) {
        toast.error("Please select a video file")
        return
      }
      setSelectedFile(file)
    }

    const kind = file.type.startsWith("video/") ? "Video" : "File"
    toast.success(`${kind} selected: ` + file.name)
  }

  const handleFileInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
    target: "main" | "moment" | "best",
    mainMediaKind?: "image" | "video"
  ) => {
    const files = e.currentTarget.files
    if (files && files[0]) {
      handleFileSelect(files[0], target, mainMediaKind)
    }
    e.target.value = ""
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "AV"

  return (
    <div className="rounded-2xl border border-border bg-card p-4 animate-fade-in-up">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 ring-2 ring-border shrink-0">
          <AvatarImage src="" alt="Your avatar" />
          <AvatarFallback className="bg-primary text-primary-foreground text-xs">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          {user ? (
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Share your anime moment..."
              className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
              rows={2}
              aria-label="Create a new post"
              disabled={isLoading}
            />
          ) : (
            <button
              onClick={() => router.push("/signin")}
              className="w-full resize-none bg-transparent text-sm text-muted-foreground hover:text-foreground focus:outline-none leading-relaxed py-2 text-left transition-colors"
            >
              Sign in to share your anime moment...
            </button>
          )}
        </div>
      </div>

      {/* Selected file preview */}
      {selectedFile && (
        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <ImageIcon className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-foreground truncate flex-1">{selectedFile.name}</span>
          <button
            onClick={() => setSelectedFile(null)}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove image"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Highlight media previews */}
      {importantMomentFile && (
        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-foreground truncate flex-1">
            Important moment: {importantMomentFile.name}
          </span>
          <button
            onClick={() => {
              setImportantMomentFile(null)
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove important moment media"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      {bestScenesFile && (
        <div className="mt-3 flex items-center gap-2 p-2 rounded-lg bg-primary/10 border border-primary/20">
          <Scissors className="h-4 w-4 text-primary shrink-0" />
          <span className="text-xs text-foreground truncate flex-1">
            Best scenes: {bestScenesFile.name}
          </span>
          <button
            onClick={() => {
              setBestScenesFile(null)
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Remove best scenes media"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {user && (
        <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between border-t border-border pt-3 gap-2">
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary transition-all hover-scale"
              aria-label="Add image"
              onClick={() => {
                if (imageInputRef.current) {
                  imageInputRef.current.value = ""
                  imageInputRef.current.click()
                }
              }}
              disabled={isLoading}
            >
              <ImageIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Image</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-primary transition-all hover-scale"
              aria-label="Add video"
              onClick={() => {
                if (videoInputRef.current) {
                  videoInputRef.current.value = ""
                  videoInputRef.current.click()
                }
              }}
              disabled={isLoading}
            >
              <Video className="h-4 w-4" />
              <span className="hidden sm:inline">Video</span>
            </Button>
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              aria-hidden="true"
              onChange={(e) => handleFileInputChange(e, "main", "image")}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              aria-hidden="true"
              onChange={(e) => handleFileInputChange(e, "main", "video")}
            />
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-neon-blue transition-all hover-scale"
              aria-label="Add anime tag"
              onClick={() => {
                const tag = prompt("Add an anime tag (e.g. Jujutsu Kaisen)")
                if (tag && tag.trim()) {
                  setSelectedTags((prev) => {
                    setAnimeTags([...animeTags, tag.trim()])
                    return prev.includes(tag.trim()) ? prev : [...prev, tag.trim()]
                  })
                  toast.success("Anime tag added")
                }
              }}
              disabled={isLoading}
            >
              <Hash className="h-4 w-4" />
              <span className="hidden sm:inline">Anime</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-all hover-scale"
              aria-label="Add emoji"
              disabled={isLoading}
            >
              <SmilePlus className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 flex-wrap">
            <Button
              variant={importantMomentFile ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs transition-all hover-scale"
              aria-label="Mark as important moment"
              onClick={() => {
                setNextFileTarget("moment")
                if (highlightInputRef.current) {
                  highlightInputRef.current.value = ""
                  highlightInputRef.current.click()
                }
              }}
              disabled={isLoading}
            >
              <Sparkles className="h-4 w-4" />
              <span className="hidden sm:inline">Important Moment</span>
            </Button>
            <Button
              variant={bestScenesFile ? "default" : "ghost"}
              size="sm"
              className="h-8 gap-1.5 text-xs transition-all hover-scale"
              aria-label="Mark as best scene"
              onClick={() => {
                setNextFileTarget("best")
                if (highlightInputRef.current) {
                  highlightInputRef.current.value = ""
                  highlightInputRef.current.click()
                }
              }}
              disabled={isLoading}
            >
              <Scissors className="h-4 w-4" />
              <span className="hidden sm:inline">Best Scenes</span>
            </Button>
          </div>
          <input
            ref={highlightInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            aria-hidden="true"
            onChange={(e) => handleFileInputChange(e, nextFileTarget, undefined)}
          />
          <Button
            size="sm"
            className="h-8 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-all hover-scale w-full sm:w-auto shrink-0"
            disabled={!content.trim() || isLoading}
            onClick={handleSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                Posting...
              </>
            ) : (
              "Post"
            )}
          </Button>
        </div>
      )}

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <div className="mt-3 flex flex-wrap gap-2">
          {animeTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition-all",
                selectedTags.includes(tag)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
