"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import {
  Heart,
  MessageCircle,
  Share2,
  Bookmark,
  MoreHorizontal,
  Send,
  Mail,
  UserPlus,
  UserCheck,
} from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

export interface PostData {
  id: string
  user_id: string
  content: string
  image_url?: string | null
  important_moment_url?: string | null
  best_scenes_url?: string | null
  type?: string
  anime_tags?: string[] | null
  likes_count: number
  comments_count: number
  created_at: string
  updated_at?: string
  users?: {
    id: string
    username: string
    email?: string
    avatar_url?: string | null
    full_name?: string | null
  }
  post_likes?: Array<{ id: string; user_id?: string }>
  comments?: Array<{ id: string }>
}

/** Only treat as "uploaded" media: data URLs (user-selected files) or our storage URLs. */
function isUploadedMediaUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== "string" || !url.trim()) return false
  if (url.startsWith("data:image/") || url.startsWith("data:video/")) return true
  if (url.includes("supabase") && url.includes("storage")) return true
  return false
}

function MediaBlock({ url, alt }: { url: string; alt: string }) {
  const isVideo =
    url.startsWith("data:video") ||
    url.endsWith(".mp4") ||
    url.endsWith(".webm")
  return isVideo ? (
    <video
      src={url}
      controls
      className="w-full max-h-[480px] rounded-xl bg-black"
    />
  ) : (
    <Image
      src={url}
      alt={alt}
      width={600}
      height={400}
      className="w-full object-cover rounded-xl transition-transform duration-300 hover:scale-[1.02]"
    />
  )
}

export function PostCard({
  post,
  onLikeChange,
  isDetail = false,
}: {
  post: PostData
  onLikeChange?: (liked: boolean) => void
  isDetail?: boolean
}) {
  const { user, userprofile } = useAuth()
  const [isLiked, setIsLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(post.likes_count)
  const [commentCount, setCommentCount] = useState(post.comments_count)
  const [isBookmarked, setIsBookmarked] = useState(false)
  const [showCommentInput, setShowCommentInput] = useState(isDetail)
  const [isLoadingLike, setIsLoadingLike] = useState(false)
  const [comments, setComments] = useState<Array<any>>([])
  const [isLoadingComments, setIsLoadingComments] = useState(false)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const router = useRouter()

  const authorId = post?.users?.id || post?.user_id
  const isPostOwner = !!(user && authorId && authorId === user.id)

  const hasUserCommented = !!(
    user &&
    comments.some((comment) => comment.user_id === user.id)
  )

  useEffect(() => {
    if (!user?.id) {
      setIsLiked(false)
      return
    }

    const likedByUser =
      Array.isArray(post.post_likes) &&
      post.post_likes.some((like) => like.user_id === user.id)

    setIsLiked(!!likedByUser)
  }, [post.post_likes, user?.id])

  // On detail page: load comments and follow status
  useEffect(() => {
    if (!isDetail || !post?.id) return
    fetchComments()
  }, [isDetail, post?.id])

  useEffect(() => {
    if (!authorId || !user) return
    const checkFollowing = async () => {
      try {
        const res = await fetch("/api/followers")
        if (res.ok) {
          const following = await res.json()
          setIsFollowing(Array.isArray(following) && following.some((f: { id: string }) => f.id === authorId))
        }
      } catch (err) {
        console.error("Failed to check follow status:", err)
      }
    }
    checkFollowing()
  }, [authorId, user?.id])

  // Initialise bookmark state from localStorage so it persists per browser
  useEffect(() => {
    if (typeof window === "undefined" || !post?.id) return
    try {
      const raw = window.localStorage.getItem("bookmarkedPosts")
      if (!raw) return
      const ids: string[] = JSON.parse(raw)
      setIsBookmarked(ids.includes(post.id))
    } catch (err) {
      console.error("Failed to read bookmarks from storage:", err)
    }
  }, [post?.id])

  // Fetch comments when user clicks comment button
  const fetchComments = async () => {
    if (!post?.id) return
    
    setIsLoadingComments(true)
    try {
      const res = await fetch(`/api/posts/${post.id}/comments`)
      if (res.ok) {
        const data = await res.json()
        setComments(Array.isArray(data) ? data : [])
        console.log('📥 Comments loaded:', data?.length || 0)
      }
    } catch (error) {
      console.error('Error loading comments:', error)
    } finally {
      setIsLoadingComments(false)
    }
  }

  const handleCommentButtonClick = () => {
    if (!showCommentInput && commentCount > 0) {
      fetchComments()
    }
    setShowCommentInput(!showCommentInput)
  }

  const author = post.users
  const authorName = author?.full_name || author?.username || "User"
  const authorHandle = `@${author?.username || "user"}`
  const authorAvatar = author?.avatar_url
  const authorInitials = authorName.slice(0, 2).toUpperCase()

  // Format time ago
  const getTimeAgo = (date: string) => {
    const now = new Date()
    const postDate = new Date(date)
    const seconds = Math.floor((now.getTime() - postDate.getTime()) / 1000)
    
    if (seconds < 60) return "now"
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`
    return postDate.toLocaleDateString()
  }

  const handleLike = async () => {
    console.log('🎯 LIKE HANDLER FIRED - post:', post)
    console.log('🎯 post.id:', post?.id, 'isLiked:', isLiked, 'likeCount:', likeCount)
    
    if (!post?.id) {
      console.error('❌ Post ID undefined!')
      toast.error('Post ID missing - cannot like')
      return
    }

    if (!user) {
      toast.error('Please sign in to like posts')
      router.push('/signin')
      return
    }

    console.log('💜 Like toggle request for post ID:', post.id)
    
    setIsLoadingLike(true)
    const previousLiked = isLiked
    const previousCount = likeCount

    // Optimistically toggle like state
    const nextLiked = !previousLiked
    setIsLiked(nextLiked)
    setLikeCount((prev) => {
      const next = prev + (nextLiked ? 1 : -1)
      return next < 0 ? 0 : next
    })
    
    try {
      const url = `/api/posts/${post.id}/likes`
      console.log('📤 Sending POST to:', url)
      const res = await fetch(url, { method: "POST" })

      console.log('📬 Like API response:', res.status)
      const data = await res.json()
      console.log('📥 Like API data:', data)

      if (!res.ok) {
        // Revert on error
        setIsLiked(previousLiked)
        setLikeCount(previousCount)
        throw new Error(data.error || (nextLiked ? "Failed to like" : "Failed to unlike"))
      }

      // Sync with server response if it includes the count
      if (typeof data.likesCount === "number") {
        setLikeCount(data.likesCount)
      }
      setIsLiked(!!data.liked)

      if (data.liked) {
        toast.success("❤️ Liked!")
      } else {
        toast.success("Like removed")
      }
      console.log('✅ Like toggle successful, liked:', data.liked, 'count:', data.likesCount ?? likeCount)
    } catch (error) {
      const msg = error instanceof Error ? error.message : (nextLiked ? "Failed to like" : "Failed to unlike")
      console.error('❌ Like error:', msg)
      toast.error(msg)
    } finally {
      setIsLoadingLike(false)
    }
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: authorName,
        text: post.content,
        url: window.location.href,
      })
    } else {
      navigator.clipboard.writeText(window.location.href)
      toast.success("Link copied to clipboard")
    }
  }

  const handleToggleBookmark = () => {
    if (!post?.id || typeof window === "undefined") {
      setIsBookmarked((prev) => !prev)
      return
    }

    try {
      const raw = window.localStorage.getItem("bookmarkedPosts")
      const ids: string[] = raw ? JSON.parse(raw) : []
      let next: string[]

      if (ids.includes(post.id)) {
        next = ids.filter((id) => id !== post.id)
        setIsBookmarked(false)
      } else {
        next = [...ids, post.id]
        setIsBookmarked(true)
      }

      window.localStorage.setItem("bookmarkedPosts", JSON.stringify(next))
    } catch (err) {
      console.error("Failed to update bookmarks:", err)
      setIsBookmarked((prev) => !prev)
    }
  }

  const handleOpenDetail = () => {
    if (isDetail || !post?.id) return
    router.push(`/feed/${post.id}`)
  }

  const handleMessageAuthor = () => {
    router.push(`/messages?recipient=${authorId}&name=${encodeURIComponent(authorName)}`)
    toast.success(`Opening messages with ${authorName}`)
  }

  const handleFollow = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!user) {
      toast.error("Please sign in to follow")
      router.push("/signin")
      return
    }
    if (!authorId || authorId === user.id) return
    setFollowLoading(true)
    try {
      const res = await fetch("/api/followers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ following_id: authorId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to follow")
      }
      const data = await res.json()
      setIsFollowing(data.following)
      toast.success(data.following ? "Following!" : "Unfollowed")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to follow")
    } finally {
      setFollowLoading(false)
    }
  }

  const handleComment = async (commentText: string) => {
    console.log('🎯 COMMENT HANDLER FIRED')
    
    if (!commentText.trim()) {
      console.log('⚠️ Comment text empty')
      toast.error("Comment cannot be empty")
      return
    }

    if (!post?.id) {
      console.error('❌ Post ID undefined! post:', post)
      return
    }

    console.log('💬 Comment submitted for post:', post.id, 'text:', commentText)
    
    const currentCommentCount = commentCount
    const currentUserUsername = userprofile?.username || user?.email?.split('@')[0] || 'User'
    
    // Create optimistic comment object to show immediately
    const optimisticComment = {
      id: `temp-${Date.now()}`,
      content: commentText,
      user_id: user?.id || 'current-user',
      users: {
        username: currentUserUsername,
        avatar_url: userprofile?.avatar_url || null,
        id: user?.id || 'current-user'
      },
      created_at: new Date().toISOString(),
      post_id: post.id
    }
    
    // Optimistically add comment to list and increment count
    setComments(prev => [...prev, optimisticComment])
    setCommentCount(currentCommentCount + 1)
    
    try {
      const url = `/api/posts/${post.id}/comments`
      console.log('📤 Sending POST to:', url, 'body:', { content: commentText })
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: commentText }),
      })

      console.log('📬 Comment API response status:', res.status)
      const data = await res.json()
      console.log('📥 Comment API response data:', data)

      if (!res.ok) {
        // Revert on error
        setComments(prev => prev.filter(c => c.id !== optimisticComment.id))
        setCommentCount(currentCommentCount)
        throw new Error(data.error || "Failed to comment")
      }

      // Refresh comments to get real data from server
      await fetchComments()
      toast.success("💬 Comment added!")
      console.log('✅ Comment created successfully, count:', currentCommentCount + 1)
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Failed to comment"
      console.error('❌ Comment error:', msg)
      toast.error(msg)
      setShowCommentInput(true)  // Show input again so user can retry
    }
  }

  return (
    <>
    <article
      className="my-2 rounded-2xl border border-border bg-card p-4 transition-all hover-lift animate-fade-in-up cursor-pointer"
      onClick={handleOpenDetail}
      role={isDetail ? undefined : "button"}
      aria-label={isDetail ? undefined : "Open post details"}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <Link
            href={authorId ? `/profile?user_id=${authorId}` : "/profile"}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 rounded-full focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label={`View ${authorName}'s profile`}
          >
            <Avatar className="h-10 w-10 ring-2 ring-border">
              {authorAvatar && <AvatarImage src={authorAvatar} alt={authorName} />}
              <AvatarFallback className="bg-secondary text-secondary-foreground text-xs">
                {authorInitials}
              </AvatarFallback>
            </Avatar>
          </Link>
          <Link
            href={authorId ? `/profile?user_id=${authorId}` : "/profile"}
            onClick={(e) => e.stopPropagation()}
            className="min-w-0 flex-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
            aria-label={`View ${authorName}'s profile`}
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-foreground truncate hover:underline">{authorName}</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                <span className="truncate">{authorHandle}</span>
                <span>{"·"}</span>
                <span className="shrink-0">{getTimeAgo(post.created_at)}</span>
              </div>
            </div>
          </Link>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground transition-all hover-scale shrink-0" aria-label="More options">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleMessageAuthor(); }} className="cursor-pointer">
              <Mail className="h-4 w-4 mr-2" />
              Message author
            </DropdownMenuItem>
            {user && authorId && authorId !== user.id && (
              <DropdownMenuItem
                onClick={(e) => { e.stopPropagation(); handleFollow(e); }}
                className="cursor-pointer"
                disabled={followLoading}
              >
                {followLoading ? (
                  <span className="animate-pulse">...</span>
                ) : isFollowing ? (
                  <>
                    <UserCheck className="h-4 w-4 mr-2" />
                    Unfollow
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Follow
                  </>
                )}
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="cursor-pointer">Report post</DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer">Save to collection</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Content */}
      <div className="mt-3">
        <p className="text-sm leading-relaxed text-foreground">{post.content}</p>
        {post.anime_tags && post.anime_tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2 animate-stagger">
            {post.anime_tags.map((tag) => (
              <span
                key={tag}
                className="inline-block rounded-full bg-primary/10 px-3 py-0.5 text-xs font-medium text-primary hover-scale transition-transform"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Highlight tags: show only on feed when we have uploaded highlight media */}
      {!isDetail && (isUploadedMediaUrl(post.important_moment_url) || isUploadedMediaUrl(post.best_scenes_url)) && (
        <div className="mt-3 flex flex-wrap gap-2">
          {isUploadedMediaUrl(post.important_moment_url) && (
            <span className="inline-flex items-center rounded-full bg-fuchsia-500/15 px-3 py-0.5 text-xs font-medium text-fuchsia-300">
              Important moment
            </span>
          )}
          {isUploadedMediaUrl(post.best_scenes_url) && (
            <span className="inline-flex items-center rounded-full bg-sky-500/15 px-3 py-0.5 text-xs font-medium text-sky-300">
              Best scene
            </span>
          )}
        </div>
      )}

      {/* Media: only show uploaded images or videos (data URLs or our storage) */}
      {(() => {
        const hasMain = isUploadedMediaUrl(post.image_url)
        const hasMoment = isUploadedMediaUrl(post.important_moment_url)
        const hasBest = isUploadedMediaUrl(post.best_scenes_url)
        const primaryUrl = post.image_url && isUploadedMediaUrl(post.image_url)
          ? post.image_url
          : post.important_moment_url && isUploadedMediaUrl(post.important_moment_url)
            ? post.important_moment_url
            : post.best_scenes_url && isUploadedMediaUrl(post.best_scenes_url)
              ? post.best_scenes_url
              : null
        const showMedia = hasMain || hasMoment || hasBest
        if (!showMedia || !primaryUrl) return null
        return (
          <div className="mt-3 space-y-3">
            {isDetail ? (
              <>
                {hasMain && (
                  <MediaBlock url={post.image_url!} alt={`Post by ${authorName}`} />
                )}
                {hasMoment && (
                  <div className="overflow-hidden rounded-xl">
                    <p className="mb-1.5 text-xs font-medium text-fuchsia-300">Important moment</p>
                    <MediaBlock
                      url={post.important_moment_url!}
                      alt={`Important moment - ${authorName}`}
                    />
                  </div>
                )}
                {hasBest && (
                  <div className="overflow-hidden rounded-xl">
                    <p className="mb-1.5 text-xs font-medium text-sky-300">Best scene</p>
                    <MediaBlock
                      url={post.best_scenes_url!}
                      alt={`Best scene - ${authorName}`}
                    />
                  </div>
                )}
              </>
            ) : (
              <div className="overflow-hidden rounded-xl hover-lift">
                <MediaBlock url={primaryUrl} alt={`Post by ${authorName}`} />
              </div>
            )}
          </div>
        )
      })()}

      {/* Actions */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-1">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "gap-1.5 px-2 text-muted-foreground hover:text-foreground transition-all hover-scale",
              isLiked && "text-primary hover:text-primary"
            )}
            onClick={(e) => {
              e.stopPropagation()
              handleLike()
            }}
            disabled={isLoadingLike}
            aria-label={isLiked ? "Unlike" : "Like"}
          >
            <Heart className={cn("h-4 w-4 transition-transform", isLiked && "fill-primary scale-110")} />
            <span className="text-xs">{likeCount.toLocaleString()}</span>
          </Button>
          {isPostOwner ? (
            <div className="flex items-center gap-1.5 px-2 text-xs text-muted-foreground">
              <MessageCircle className="h-4 w-4" />
              <span>{commentCount}</span>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 px-2 text-muted-foreground hover:text-foreground transition-all hover-scale"
              onClick={(e) => {
                e.stopPropagation()
                handleCommentButtonClick()
              }}
              aria-label="Comment"
            >
              <MessageCircle className="h-4 w-4" />
              <span className="text-xs">{commentCount}</span>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 px-2 text-muted-foreground hover:text-foreground transition-all hover-scale"
            onClick={(e) => {
              e.stopPropagation()
              handleShare()
            }}
            aria-label="Share"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {isDetail && (
            <>
              {!isPostOwner && user && authorId && authorId !== user.id ? (
                <Button
                  variant={isFollowing ? "secondary" : "outline"}
                  size="sm"
                  className="gap-1.5 px-3 text-xs"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleFollow(e)
                  }}
                  disabled={followLoading}
                  aria-label={isFollowing ? "Unfollow" : "Follow"}
                >
                  {followLoading ? (
                    <span className="animate-pulse">...</span>
                  ) : isFollowing ? (
                    <>
                      <UserCheck className="h-3.5 w-3.5" />
                      Following
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-3.5 w-3.5" />
                      Follow
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 px-3 text-xs text-muted-foreground cursor-default"
                  disabled
                >
                  <UserCheck className="h-3.5 w-3.5" />
                  Follow
                </Button>
              )}
            </>
          )}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 text-muted-foreground hover:text-foreground transition-all hover-scale shrink-0",
              isBookmarked && "text-accent hover:text-accent"
            )}
            onClick={(e) => {
              e.stopPropagation()
              handleToggleBookmark()
            }}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <Bookmark className={cn("h-4 w-4 transition-transform", isBookmarked && "fill-accent scale-110")} />
          </Button>
        </div>
      </div>

      {/* Comment Input */}
      {showCommentInput && (
        <div className="mt-4 border-t border-border pt-4 space-y-3 animate-fade-in-up">
          {/* Display existing comments */}
          {commentCount > 0 && (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {isLoadingComments ? (
                <div className="text-center py-2">
                  <p className="text-xs text-muted-foreground">Loading comments...</p>
                </div>
              ) : comments.length > 0 ? (
                comments.map((comment) => {
                  const isPostOwner = post.user_id === user?.id
                  return (
                    <div key={comment.id} className={cn("flex gap-2 text-xs", isPostOwner && "flex-row-reverse justify-end")}>
                      <Avatar className="h-6 w-6 shrink-0">
                        {comment.users?.avatar_url && (
                          <AvatarImage src={comment.users.avatar_url} alt={comment.users?.username} />
                        )}
                        <AvatarFallback className="bg-secondary text-secondary-foreground text-[9px]">
                          {comment.users?.username?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className={cn("flex flex-col gap-1 max-w-[70%]", isPostOwner && "items-end")}>
                        <div className="flex items-center gap-1">
                          <span className="font-semibold text-foreground">{comment.users?.username || 'User'}</span>
                        </div>
                        <div className={cn(
                          "rounded-lg px-3 py-2 break-words",
                          isPostOwner 
                            ? "bg-gray-200 dark:bg-gray-700 text-foreground" 
                            : "bg-primary text-primary-foreground"
                        )}>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <p className="text-xs text-muted-foreground text-center py-2">No comments yet</p>
              )}
            </div>
          )}
          
          {/* Comment Input */}
          {!isPostOwner && !hasUserCommented && (
            <CommentInput onSubmit={handleComment} />
          )}
        </div>
      )}
    </article>
    </>
  )
}

function CommentInput({ onSubmit }: { onSubmit: (text: string) => void }) {
  const [comment, setComment] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { userprofile } = useAuth()

  const userInitials = userprofile?.username 
    ? userprofile.username.slice(0, 2).toUpperCase() 
    : "ME"

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await onSubmit(comment)
      setComment("")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="mt-3 flex flex-col sm:flex-row items-start sm:items-center gap-2 border-t border-border pt-3 animate-fade-in-up">
      <Avatar className="h-7 w-7 shrink-0">
        {userprofile?.avatar_url && (
          <AvatarImage src={userprofile.avatar_url} alt={userprofile.username} />
        )}
        <AvatarFallback className="bg-secondary text-secondary-foreground text-[10px]">{userInitials}</AvatarFallback>
      </Avatar>
      <div className="flex flex-1 items-center gap-2 rounded-full bg-secondary px-3 py-1.5 w-full sm:w-auto">
        <input
          type="text"
          placeholder="Add a comment..."
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && handleSubmit()}
          className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          aria-label="Write a comment"
          disabled={isLoading}
        />
        <button
          onClick={handleSubmit}
          disabled={isLoading || !comment.trim()}
          className="text-primary hover:text-primary/80 transition-colors hover-scale shrink-0 disabled:opacity-50"
          aria-label="Send comment"
        >
          <Send className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
