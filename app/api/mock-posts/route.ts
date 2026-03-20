import { NextResponse } from 'next/server'

export async function GET() {
  // Return mock posts for testing
  const mockPosts = [
    {
      id: 'post-001-test-12345678901234567890',
      user_id: 'user-001-test-12345678901234567890',
      content: 'This is a test post! Click the heart to like it 💖',
      image_url: null,
      anime_tags: ['anime', 'test'],
      likes_count: 5,
      comments_count: 2,
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 3600000).toISOString(),
      users: {
        id: 'user-001-test-12345678901234567890',
        username: 'test_user_1',
        email: 'test1@example.com',
        full_name: 'Test User 1',
        avatar_url: null,
      },
      post_likes: [],
      comments: [
        { id: 'comment-1' },
        { id: 'comment-2' },
      ],
    },
    {
      id: 'post-002-test-12345678901234567890',
      user_id: 'user-002-test-12345678901234567890',
      content: 'Anime is life! Try liking and commenting on this post 🎨',
      image_url: null,
      anime_tags: ['anime', 'slice-of-life'],
      likes_count: 12,
      comments_count: 4,
      created_at: new Date(Date.now() - 7200000).toISOString(),
      updated_at: new Date(Date.now() - 7200000).toISOString(),
      users: {
        id: 'user-002-test-12345678901234567890',
        username: 'test_user_2',
        email: 'test2@example.com',
        full_name: 'Test User 2',
        avatar_url: null,
      },
      post_likes: [],
      comments: [
        { id: 'comment-3' },
        { id: 'comment-4' },
      ],
    },
    {
      id: 'post-003-test-12345678901234567890',
      user_id: 'user-001-test-12345678901234567890',
      content: 'Testing the social features of SenpaiSocial! Can you interact with this post? 🚀',
      image_url: null,
      anime_tags: ['social', 'test'],
      likes_count: 8,
      comments_count: 1,
      created_at: new Date(Date.now() - 10800000).toISOString(),
      updated_at: new Date(Date.now() - 10800000).toISOString(),
      users: {
        id: 'user-001-test-12345678901234567890',
        username: 'test_user_1',
        email: 'test1@example.com',
        full_name: 'Test User 1',
        avatar_url: null,
      },
      post_likes: [],
      comments: [
        { id: 'comment-5' },
      ],
    },
  ]

  console.log('📊 Mock posts endpoint called - returning', mockPosts.length, 'mock posts')
  return NextResponse.json(mockPosts)
}
