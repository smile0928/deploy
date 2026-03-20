# 🏗️ AniVerse Architecture

## System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                      CLIENT SIDE (Next.js)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Sign In    │  │  Sign Up     │  │  Home Feed   │              │
│  │   Page       │  │  Page        │  │ (Protected)  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
│         │                  │                 │                       │
│         └──────────────────┼─────────────────┘                       │
│                            │                                         │
│                   ┌────────▼─────────┐                              │
│                   │   Auth Context   │                              │
│                   │   (useAuth)      │                              │
│                   └────────┬─────────┘                              │
│                            │                                         │
│          ┌─────────────────┼─────────────────┐                     │
│          │                 │                 │                     │
│    ┌─────▼──────┐  ┌──────▼────────┐  ┌────▼────────┐             │
│    │  Components│  │   API Calls   │  │   Storage   │             │
│    │  (Feed,    │  │  (fetch)      │  │  (localStorage)           │
│    │   Rooms,   │  │               │  │             │             │
│    │   Events)  │  │               │  └─────────────┘             │
│    └─────┬──────┘  └──────┬────────┘                              │
│          │                 │                                      │
│          └─────────────────┼──────────────────────────┬─────────┘
│                            │                          │
└────────────────────────────┼──────────────────────────┼──────────────
                             │                          │
┌────────────────────────────┼──────────────────────────┼──────────────┐
│                 SERVER SIDE (Next.js API Routes)      │              │
├────────────────────────────┼──────────────────────────┼──────────────┤
│                            │                          │              │
│  ┌───────────────────┐     │       ┌─────────┐      │              │
│  │  Middleware      │     │       │ Sessions│      │              │
│  │  - Auth Check    │◄────┼───────│ Cookies │◄─────┘              │
│  │  - Route Guard   │     │       └─────────┘                      │
│  └─────────┬────────┘     │                                        │
│            │              │                                        │
│  ┌─────────▼──────────────▼────────────────────────┐              │
│  │  API Routes (All Authenticated)                │              │
│  │                                                │              │
│  │  • /api/posts          (CRUD posts)           │              │
│  │  • /api/posts/[id]/comments (Comments)        │              │
│  │  • /api/posts/[id]/likes    (Like system)     │              │
│  │  • /api/users/profile      (Profile)          │              │
│  │  • /api/messages           (Messages)         │              │
│  │  • /api/followers          (Follows)          │              │
│  │  • /api/notifications      (Alerts)           │              │
│  │  • /api/rooms              (Chat rooms)       │              │
│  │  • /api/events             (Events)           │              │
│  └─────────┬──────────────┬────────────────────┘              │
│            │              │                                    │
│            │      ┌───────▼────────┐                          │
│            │      │  Supabase Auth │                          │
│            │      │  - Signup      │                          │
│            │      │  - Signin      │                          │
│            │      │  - Sessions    │                          │
│            │      └───────────────┘                           │
│            │                                                  │
└────────────┼──────────────────────────────────────────────────┘
             │
┌────────────▼──────────────────────────────────────────────────────┐
│           DATABASE LAYER (Supabase PostgreSQL)                    │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌───────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Auth Tables      │  │  Content Tables  │  │  Social      │  │
│  │                   │  │                  │  │  Tables      │  │
│  │  • users          │  │  • posts         │  │              │  │
│  │  • sessions       │  │  • comments      │  │  • followers │  │
│  │  • audit_logs     │  │  • post_likes    │  │  • messages  │  │
│  └───────────────────┘  │  • rooms         │  │  • notifs    │  │
│                         │  • room_messages │  │  • events    │  │
│                         │  • room_members  │  │              │  │
│                         │  • events        │  │              │  │
│                         │  • event_attend  │  │              │  │
│                         └──────────────────┘  └──────────────┘  │
│                                                                    │
│  All tables have:                                                │
│  ✓ Row-Level Security (RLS) Policies                            │
│  ✓ Proper Indexes for Performance                               │
│  ✓ Foreign Key Constraints                                      │
│  ✓ Cascading Deletes                                            │
│  ✓ Auto Timestamps                                              │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Example: Sign Up → Post Creation

```
User Browser                Next.js Server              Supabase

    │                              │                         │
    │ 1. Enter email/password      │                         │
    ├─────────────────────────────► │                        │
    │                              │                         │
    │                              │ 2. POST /auth/signup   │
    │                              ├────────────────────────► │
    │                              │                         │
    │                              │ 3. Create user          │
    │                              │    (auth.users)         │
    │                              │◄────────────────────────┤
    │                              │  (user_id)              │
    │                              │                         │
    │                              │ 4. Create profile       │
    │                              │    (users table)        │
    │                              ├────────────────────────► │
    │                              │                         │
    │ 5. Success! Redirect         │◄────────────────────────┤
    │◄─────────────────────────────┤                         │
    │                              │                         │
    │ 6. Sign In with creds        │                         │
    ├─────────────────────────────► │                        │
    │                              │                         │
    │                              │ 7. Authenticate        │
    │                              ├────────────────────────► │
    │                              │                         │
    │                              │ 8. Session token       │
    │                              │◄────────────────────────┤
    │                              │  (JWT in cookie)        │
    │ 9. Token stored              │                         │
    │    (browser)                 │                         │
    │◄─────────────────────────────┤                         │
    │                              │                         │
    │ 10. Create post              │                         │
    │     with token               │                         │
    ├─────────────────────────────► │                        │
    │                              │                         │
    │                              │ 11. Verify token       │
    │                              │     (middleware)        │
    │                              │                         │
    │                              │ 12. Create post        │
    │                              ├────────────────────────► │
    │                              │                         │
    │                              │ 13. Post saved         │
    │                              │◄────────────────────────┤
    │                              │                         │
    │ 14. Post created! (Response) │                         │
    │◄─────────────────────────────┤                         │
    │                              │                         │
```

---

## Component Hierarchy

```
RootLayout
├── ThemeProvider
│   └── Toaster
└── AuthProvider (useAuth hook available here)
    ├── AppSidebar
    │   └── Navigation Items
    ├── MobileNav
    │   └── Mobile Menu
    ├── TopHeader
    │   ├── Search Bar
    │   ├── Notifications
    │   └── User Avatar Dropdown
    │       └── Logout Option
    │
    └── Route-Specific Page
        ├── FeedPage
        │   └── PostCard[]
        ├── ExplorePage
        ├── RoomsPage
        ├── EventsPage
        ├── MessagesPage
        ├── NotificationsPage
        ├── FriendsPage
        └── ProfilePage

SignIn Page (standalone)
└── Form with hooks-form

SignUp Page (standalone)
└── Form with hooks-form
```

---

## API Request-Response Flow

```
Browser                              Server                  Database

GET /api/posts
  │
  ├─ Headers: Authorization: Bearer {token}
  │
  ├──────────────────────────────────────────►
                                    │
                            1. Middleware
                            ├─ Check auth
                            ├─ Verify token
                            │
                            2. API Handler
                            ├─ Get user_id from token
                            │
                            3. Database Query
                            ├──────────────────────────►
                                                  │
                                            SELECT posts
                                            WHERE (public OR user_follows)
                                            │
                                  ◄──────────────────────
                                            │
                                       200 posts[]
                            │
                  ◄──────────────────────────────
              │
         JSON Response
         >[
  {
    id: "...",
    user_id: "...",
    content: "...",
    created_at: "...",
    users: { username, avatar },
    post_likes: [{ id }],
    comments: [{ id }]
  }
]<
```

---

## Database Table Relationships

```
auth.users (Supabase managed)
    │
    └─► users (our table)
            │
            ├─► posts (1:Many)
            │       │
            │       ├─► post_likes (1:Many)
            │       └─► comments (1:Many)
            │
            ├─► followers (1:Many) ◄──┐
            │       │                   │
            │       └─ (follower_id, following_id)
            │                          │
            └───── followers ──────────┘
            │
            ├─► messages (sent) (1:Many)
            │       └─ (sender_id, recipient_id)
            │
            ├─► messages (received) (1:Many)
            │
            ├─► notifications (1:Many)
            │
            ├─► rooms (created) (1:Many)
            │       │
            │       ├─► room_members (1:Many)
            │       │       └─► users (Many:Many)
            │       │
            │       └─► room_messages (1:Many)
            │
            └─► events (created) (1:Many)
                    │
                    └─► event_attendees (1:Many)
                            └─► users (Many:Many)
```

---

## Authentication Flow

```
┌─────────────────────────────────────────────────────────────┐
│                   Signup Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User fills signup form                                │
│     - username, email, password                           │
│                                                             │
│  2. Frontend validation (Zod)                            │
│     - Check password match                                │
│     - Validate email format                               │
│     - Check username length                               │
│                                                             │
│  3. POST /signup                                          │
│     - Send credentials to Supabase Auth                   │
│                                                             │
│  4. Supabase creates:                                     │
│     - auth.users row (managed by Supabase)               │
│     - users table row (our app)                           │
│                                                             │
│  5. Frontend redirects to /signin                         │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Signin Flow                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. User fills signin form                                │
│     - email, password                                      │
│                                                             │
│  2. POST to Supabase Auth                                │
│     - Returns session (JWT token)                         │
│                                                             │
│  3. Token stored in httpOnly cookie                       │
│     - Secure (not accessible to JS)                       │
│     - Sent with every request                             │
│                                                             │
│  4. Frontend sets AuthContext.user                        │
│                                                             │
│  5. Middleware/Pages check isAuthenticated                │
│                                                             │
│  6. Redirect to home page                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   Protected API Call                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Browser makes request to /api/posts                  │
│     - Cookie attached automatically                       │
│                                                             │
│  2. Middleware verifies:                                  │
│     - Token exists in cookie                              │
│     - Token not expired                                   │
│     - Token signature valid                               │
│                                                             │
│  3. Extract user_id from token                            │
│                                                             │
│  4. API handler executes:                                 │
│     - Query uses extracted user_id                        │
│     - Database RLS policies apply                         │
│     - Only authorized data returned                       │
│                                                             │
│  5. Return 200 with data OR 401 Unauthorized             │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Layers

```
┌──────────────────────────────────────────────────────────────┐
│                    PROTECTION LAYERS                        │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Layer 1: Input Validation (Client)                        │
│  ├─ Form validation (React Hook Form)                      │
│  ├─ Zod schemas                                            │
│  └─ Type checking (TypeScript)                             │
│                                                              │
│  Layer 2: HTTPS/TLS (Transport)                            │
│  ├─ Encrypted connection (https)                           │
│  ├─ httpOnly cookies                                       │
│  └─ CSRF protection (Next.js)                              │
│                                                              │
│  Layer 3: Authentication (Auth)                            │
│  ├─ Supabase Auth manages hashing                          │
│  ├─ JWT tokens                                             │
│  ├─ Session expiration                                     │
│  └─ Secure password requirements                           │
│                                                              │
│  Layer 4: Route Protection (Middleware)                    │
│  ├─ Check token validity                                   │
│  ├─ Verify user ID                                         │
│  ├─ Block unauthenticated access                           │
│  └─ Redirect to signin                                     │
│                                                              │
│  Layer 5: API Authorization                                │
│  ├─ Check auth in each endpoint                            │
│  ├─ Verify ownership of resources                          │
│  └─ Return 401/403 on violation                            │
│                                                              │
│  Layer 6: Database Security (RLS)                          │
│  ├─ Row-level security policies                            │
│  ├─ User can only see own data                             │
│  ├─ Foreign key constraints                                │
│  └─ Cascading deletes prevent orphans                      │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## Deployment Architecture

```
Local Development
├─ pnpm dev (Next.js dev server)
├─ http://localhost:3000
└─ Connected to Supabase project

Staging/Production
├─ Deployed to Vercel (or similar)
├─ https://yourdomain.com
├─ Environment variables configured
└─ Connected to same Supabase project

Database
├─ PostgreSQL (Supabase hosted)
├─ Automatic backups
├─ Connection pooling
└─ Post-auth security policies
```

---

## Technology Stack

```
Frontend Stack
├─ Next.js 16          (React framework)
├─ React 19            (UI library)
├─ TypeScript           (Type safety)
├─ Tailwind CSS         (Styling)
├─ React Hook Form      (Form handling)
├─ Zod                  (Validation)
├─ Radix UI             (Components)
├─ Lucide React         (Icons)
└─ Sonner              (Notifications)

Backend Stack
├─ Next.js API Routes   (Serverless functions)
├─ Node.js             (Runtime)
├─ Supabase SDK        (Client library)
└─ TypeScript           (Type safety)

Database Stack
├─ PostgreSQL          (Database)
├─ Supabase            (Backend as a service)
├─ RLS Policies        (Row-level security)
└─ Migrations          (Schema management)

Deployment Stack
├─ Vercel              (Hosting option)
├─ Environment vars    (Configuration)
└─ GitHub             (VCS)
```

---

**Architecture designed for scalability, security, and maintainability!** 🏗️
