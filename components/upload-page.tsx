"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import {
  ImageIcon,
  Video,
  FileText,
  Film,
  Upload,
  X,
  Hash,
  AtSign,
  MapPin,
  SmilePlus,
  Scissors,
  Sparkles,
  Loader2,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useAuth } from "@/context/auth-context"
import { toast } from "sonner"

const uploadTypes = [
  { id: "post", label: "Post", icon: ImageIcon, description: "Share an image or text with your feed" },
  { id: "story", label: "Story", icon: Film, description: "Share a moment that disappears in 24h" },
  { id: "anime", label: "Anime", icon: Film, description: "Create anime content (image or video)" },
  { id: "video", label: "Video", icon: Video, description: "Upload an anime clip or review" },
  { id: "moment", label: "Best Scene", icon: Scissors, description: "Highlight your favorite anime scene" },
  { id: "article", label: "Article", icon: FileText, description: "Write a detailed review or analysis" },
]

const animeTags = [
  "Jujutsu Kaisen", "One Piece", "Demon Slayer", "Attack on Titan",
  "My Hero Academia", "Spy x Family", "Chainsaw Man", "Bleach",
]

export function UploadPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [selectedType, setSelectedType] = useState("post")
  const [content, setContent] = useState("")
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [isPublishing, setIsPublishing] = useState(false)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  if (!user) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">Please sign in to create content</p>
        <Button
          onClick={() => router.push("/signin")}
          className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
        >
          Sign In
        </Button>
      </div>
    )
  }

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  const handleFileSelect = (file: File, kind: "image" | "video") => {
    const isImage = file.type.startsWith("image/")
    const isVideo = file.type.startsWith("video/")
    if (kind === "image" && !isImage) {
      toast.error("Please select an image file")
      return
    }
    if (kind === "video" && !isVideo) {
      toast.error("Please select a video file")
      return
    }
    setSelectedFile(file)
    toast.success("File selected: " + file.name)
  }

  const handleImageInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files[0]) {
      handleFileSelect(files[0], "image")
    }
    e.target.value = ""
  }

  const handleVideoInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.currentTarget.files
    if (files && files[0]) {
      handleFileSelect(files[0], "video")
    }
    e.target.value = ""
  }

  const handlePublish = async () => {
    if (!user) {
      toast.error("Please sign in to publish")
      return
    }

    // Anime tab with image/video: caption and tags are optional
    if (selectedType === "anime") {
      if (!selectedFile) {
        toast.error("Please add an image or video")
        return
      }
    } else if (!content.trim()) {
      toast.error("Please add some content")
      return
    }

    try {
      setIsPublishing(true)

      let fileDataUrl: string | null = null

      if (selectedFile) {
        const reader = new FileReader()
        fileDataUrl = await new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(selectedFile)
        })
      }

      if (selectedType === "story") {
        // Create a story that appears in the feed stories bar
        const res = await fetch("/api/stories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: content.trim(),
            image_url: selectedFile && selectedFile.type.startsWith("image/") ? fileDataUrl : null,
            video_url: selectedFile && selectedFile.type.startsWith("video/") ? fileDataUrl : null,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Failed to publish story")
        }

        toast.success("Story published! It will appear in your stories bar.")
      } else {
        // Create a regular/anime/video/moment/article post (anime: caption optional)
        const contentToSend = content.trim()
        const res = await fetch("/api/posts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: contentToSend,
            image_url: fileDataUrl,
            type: selectedType,
            tags: selectedTags,
          }),
        })

        const data = await res.json()

        if (!res.ok) {
          throw new Error(data.error || "Failed to publish")
        }

        toast.success("Post published!")
      }

      setContent("")
      setSelectedFile(null)
      setSelectedTags([])
      setSelectedType("post")
    } catch (error) {
      console.error("Publish error:", error)
      toast.error(error instanceof Error ? error.message : "Failed to publish")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleSaveDraft = () => {
    try {
      const draft = {
        id: `draft-${Date.now()}`,
        type: selectedType,
        content: content.trim(),
        tags: selectedTags,
        fileName: selectedFile?.name || null,
        createdAt: new Date().toISOString(),
      }
      const raw = window.localStorage.getItem("uploadDrafts")
      const drafts = raw ? JSON.parse(raw) : []
      drafts.unshift(draft) 
      window.localStorage.setItem("uploadDrafts", JSON.stringify(drafts.slice(0, 100)))
      toast.success("Saved to drafts")
    } catch (err) {
      console.error("Failed to save draft:", err)
      toast.error("Could not save draft")
    }
  }

  return (
    <div className="max-w-[640px] animate-fade-in">
      <h2 className="text-lg font-bold text-foreground">Create Content</h2>

      {/* Upload Type Selector */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2 animate-slide-in-left">
        {uploadTypes.map((type) => (
          <button
            key={type.id}
            onClick={() => setSelectedType(type.id)}
            className={cn(
              "flex shrink-0 items-center gap-2 rounded-xl border px-4 py-3 text-left transition-all hover-scale",
              selectedType === type.id
                ? "border-primary bg-primary/10 text-primary"
                : "border-border bg-card text-muted-foreground hover:border-muted-foreground hover:text-foreground"
            )}
          >
            <type.icon className="h-5 w-5 shrink-0" />
            <div>
              <p className="text-sm font-medium">{type.label}</p>
              <p className="text-[10px] text-muted-foreground hidden sm:block">{type.description}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Drop Zone */}
      {selectedFile ? (
        <div className="mt-4 rounded-2xl border-2 border-border bg-card p-8 animate-scale-in">
          <div className="text-center">
            <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-primary/10 mx-auto mb-3">
              {selectedFile.type.startsWith("image/") ? (
                <ImageIcon className="h-12 w-12 text-primary" />
              ) : (
                <Video className="h-12 w-12 text-primary" />
              )}
            </div>
            <p className="text-sm font-medium text-foreground break-all">{selectedFile.name}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSelectedFile(null)}
              className="mt-3 rounded-full text-xs transition-all hover-scale"
            >
              <X className="mr-1.5 h-3.5 w-3.5" />
              Remove File
            </Button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setIsDragging(false)
            const files = e.dataTransfer.files
            if (files && files[0]) {
              const file = files[0]
              if (file.type.startsWith("image/")) {
                handleFileSelect(file, "image")
              } else if (file.type.startsWith("video/")) {
                handleFileSelect(file, "video")
              } else {
                toast.error("Please add an image or video using the buttons below")
              }
            }
          }}
          className={cn(
            "mt-4 flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 transition-all cursor-pointer",
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-card hover:border-muted-foreground"
          )}
        >
          <div className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl transition-colors",
            isDragging ? "bg-primary/20" : "bg-secondary"
          )}>
            <Upload className={cn("h-6 w-6", isDragging ? "text-primary" : "text-muted-foreground")} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium text-foreground">
              {isDragging ? "Drop your file here" : "Drag and drop or click to upload"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Supports PNG, JPG, GIF, MP4, WebM (max 100MB)
            </p>
          </div>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            aria-hidden="true"
            onChange={handleImageInputChange}
          />
          <input
            ref={videoInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            aria-hidden="true"
            onChange={handleVideoInputChange}
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                imageInputRef.current?.click()
              }}
              className="rounded-full bg-primary px-4 text-xs text-primary-foreground hover:bg-primary/90"
            >
              <ImageIcon className="mr-1.5 h-3.5 w-3.5" />
              Add Image
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-full border-border text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => {
                e.stopPropagation()
                videoInputRef.current?.click()
              }}
            >
              <Video className="mr-1.5 h-3.5 w-3.5" />
              Add Video
            </Button>
          </div>
        </div>
      )}

      {/* Content Area - hidden for Anime type */}
      {selectedType !== "anime" && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={
              selectedType === "article"
                ? "Write your article here... Use markdown for formatting."
                : "Write a caption for your content..."
            }
            className="w-full resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed"
            rows={selectedType === "article" ? 8 : 4}
            aria-label="Content caption or text"
          />

          {/* Toolbar */}
          <div className="mt-3 flex items-center gap-1 border-t border-border pt-3">
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-primary" aria-label="Add anime tag">
              <Sparkles className="h-4 w-4" />
              Anime Tag
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-neon-blue" aria-label="Mention someone">
              <AtSign className="h-4 w-4" />
              Mention
            </Button>
            <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-accent" aria-label="Add location">
              <MapPin className="h-4 w-4" />
              Location
            </Button>
            <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" aria-label="Add emoji">
              <SmilePlus className="h-4 w-4" />
            </Button>
            {selectedType === "moment" && (
              <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs text-muted-foreground hover:text-primary" aria-label="AI enhance">
                <Sparkles className="h-4 w-4" />
                AI Enhance
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Anime Tags - hidden for Anime type */}
      {selectedType !== "anime" && (
        <div className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-sm font-medium text-foreground">Tag Anime Series</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Select related anime to help others discover your content</p>
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
      )}

      {/* Submit */}
      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {selectedTags.length > 0 && `${selectedTags.length} anime tagged`}
          {selectedFile && ` • File: ${selectedFile.name}`}
        </p>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full border-border text-sm text-muted-foreground hover:text-foreground"
            type="button"
            onClick={handleSaveDraft}
          >
            Save Draft
          </Button>
          <Button
            onClick={handlePublish}
            disabled={
              isPublishing ||
              (selectedType === "anime" ? !selectedFile : !content.trim())
            }
            className="rounded-full bg-primary px-6 text-sm font-semibold text-primary-foreground hover:bg-primary/90 glow-pink"
          >
            {isPublishing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publishing...
              </>
            ) : (
              "Publish"
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
