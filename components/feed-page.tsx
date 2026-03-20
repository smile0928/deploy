"use client"

import { useState, useEffect } from "react"
import { StoriesBar } from "@/components/stories-bar"
import { PostCard, PostData } from "@/components/post-card"
import { TrendingSidebar } from "@/components/trending-sidebar"
import { CreatePost } from "@/components/create-post"
import { Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase-client"

export function FeedPage() {
  const [posts, setPosts] = useState<PostData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
      setError(null)
      console.log('📥 Fetching posts from /api/posts...')
      const res = await fetch("/api/posts")

      console.log('📬 Response status:', res.status)

      if (!res.ok) {
        if (res.status === 401) {
          console.log('⚠️ Not authenticated')
          setIsLoading(false)
          return
        }
        const errorData = await res.json()
        console.error('❌ API error:', errorData)
        throw new Error(errorData.error || "Failed to fetch posts")
      }

      const data = await res.json()
      console.log('✅ Posts received from API:', data?.length || 0, 'posts')
      
      // Exclude anime-tab uploads (type === "anime") — they appear only in profile Anime List
      if (data && Array.isArray(data)) {
        const feedPosts = data.filter((p: PostData) => p.type !== "anime")
        console.log(`Posts loaded: ${feedPosts.length} posts (anime excluded from feed)`)
        setPosts(feedPosts)
      } else {
        console.warn('No posts returned or invalid format:', data)
        setPosts([])
      }
    } catch (err) {
      console.error("Error fetching posts:", err)
      const errorMessage = err instanceof Error ? err.message : "Failed to load posts"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPosts()
    
    // Note: Real-time subscription disabled - optimistic updates in PostCard are fast enough
    // Re-enable this later with a smarter update strategy that doesn't refetch all posts
    
  }, [])

  return (
    <div className="flex gap-6 animate-fade-in">
      {/* Main Feed */}
      <main className="flex-1 max-w-[640px] min-w-0">
        <StoriesBar />
        <div className="mt-2 animate-fade-in-up">
          <CreatePost onPostCreated={() => {
            console.log('Post created - refetching...')
            fetchPosts()
          }} />
        </div>

        {isLoading ? (
          <div className="mt-12 flex justify-center animate-fade-in">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">Loading posts...</p>
            </div>
          </div>
        ) : error ? (
          <div className="mt-8 rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center animate-scale-in">
            <p className="text-sm text-destructive">{error}</p>
            <button
              onClick={fetchPosts}
              className="mt-2 text-sm text-primary hover:text-primary/80 underline transition-colors"
            >
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="mt-12 text-center animate-fade-in-up">
            <p className="text-sm text-muted-foreground">No posts yet. Be the first to post!</p>
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-4 animate-stagger">
            {posts.map((post) => (
              <PostCard 
                key={post.id} 
                post={post}
              />
            ))}
          </div>
        )}
      </main>

      {/* Trending Sidebar */}
      <aside className="hidden xl:block w-[320px] shrink-0 animate-slide-in-right">
        <TrendingSidebar />
      </aside>
    </div>
  )
}
