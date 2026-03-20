import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase-server"
import { PostCard, PostData } from "@/components/post-card"

interface FeedPostPageProps {
  params: { id: string }
}

export default async function FeedPostPage({ params }: FeedPostPageProps) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from("posts")
    .select(
      `
        id,
        user_id,
        content,
        image_url,
        important_moment_url,
        best_scenes_url,
        anime_tags,
        created_at,
        updated_at,
        users (
          id,
          username,
          email,
          avatar_url,
          full_name
        ),
        post_likes (id, user_id),
        comments (id)
      `
    )
    .eq("id", params.id)
    .single()

  if (error || !data) {
    notFound()
  }

  const post: PostData = {
    id: data.id,
    user_id: data.user_id,
    content: data.content,
    image_url: data.image_url,
    important_moment_url: data.important_moment_url ?? null,
    best_scenes_url: data.best_scenes_url ?? null,
    anime_tags: data.anime_tags,
    likes_count: Array.isArray(data.post_likes) ? data.post_likes.length : 0,
    comments_count: Array.isArray(data.comments) ? data.comments.length : 0,
    created_at: data.created_at,
    updated_at: data.updated_at,
    users: data.users,
    post_likes: data.post_likes ?? [],
    comments: data.comments ?? [],
  }

  return (
    <div className="flex justify-center px-4 py-6">
      <div className="w-full max-w-[640px]">
        <PostCard post={post} isDetail />
      </div>
    </div>
  )
}

