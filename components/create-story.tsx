"use client"

import { useState, useRef } from "react"
import { Plus, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"

interface CreateStoryProps {
  onStoryCreated: () => void
}

export function CreateStory({ onStoryCreated }: CreateStoryProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [content, setContent] = useState("")
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Check file size (max 10MB)
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 10MB', variant: 'destructive' })
      return
    }

    // Check file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm']
    if (!validTypes.includes(selectedFile.type)) {
      toast({ title: 'Invalid file type', description: 'Only images and videos allowed', variant: 'destructive' })
      return
    }

    setFile(selectedFile)

    // Create preview
    const reader = new FileReader()
    reader.onload = (e) => {
      setPreview(e.target?.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }

  const handleSubmit = async () => {
    if (!content && !file) {
      toast({ title: 'Empty story', description: 'Add text or media', variant: 'destructive' })
      return
    }

    setLoading(true)
    try {
      let imageUrl: string | undefined = undefined

      // Upload file if present
      if (file) {
        // For demo, we'll use a data URL
        // In production, upload to Supabase Storage
        const reader = new FileReader()
        imageUrl = await new Promise((resolve) => {
          reader.onload = () => resolve(reader.result as string)
          reader.readAsDataURL(file)
        })
      }

      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          image_url: imageUrl,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error)
      }

      toast({ title: 'Story created!', description: 'Your story is now visible' })
      setContent('')
      setPreview(null)
      setFile(null)
      setOpen(false)
      onStoryCreated()
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create story',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="rounded-full bg-primary hover:bg-primary/90"
        size="icon"
      >
        <Plus className="h-5 w-5" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create Story</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Preview */}
            {preview && (
              <div className="relative aspect-square rounded-lg overflow-hidden bg-black">
                <img src={preview} alt="Preview" className="w-full h-full object-cover" />
                <button
                  onClick={() => {
                    setPreview(null)
                    setFile(null)
                    if (fileInputRef.current) fileInputRef.current.value = ''
                  }}
                  className="absolute top-2 right-2 rounded-full bg-black/60 hover:bg-black/80 p-1.5"
                >
                  <X className="h-4 w-4 text-white" />
                </button>
              </div>
            )}

            {/* Text content */}
            <Textarea
              placeholder="What's on your mind? (optional)"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="min-h-20 resize-none"
            />

            {/* File upload */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                {preview ? 'Change media' : 'Add photo/video'}
              </Button>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setOpen(false)
                  setContent('')
                  setPreview(null)
                  setFile(null)
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading || (!content && !file)}
                className="flex-1"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Share Story
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
