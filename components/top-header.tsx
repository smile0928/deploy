"use client"

import { useEffect, useState } from "react"
import { Bell, Search, LogOut } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAuth } from "@/context/auth-context"
import { useBadgeCounts } from "@/context/badge-counts-context"
import { useRouter } from "next/navigation"

const tabLabels: Record<string, string> = {
  feed: "Home",
  explore: "Explore",
  rooms: "Rooms",
  events: "Events",
  messages: "Messages",
  notifications: "Notifications",
  friends: "Friends",
  profile: "Profile",
}

export function TopHeader({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const { user, signOut } = useAuth()
  const router = useRouter()
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const { notifications: unreadNotifications } = useBadgeCounts()

  useEffect(() => {
    if (!user) return
    
    const fetchProfile = async () => {
      try {
        const res = await fetch("/api/users/profile")
        if (res.ok) {
          const data = await res.json()
          setAvatarUrl(data.avatar_url || null)
        }
      } catch (error) {
        console.error("Error fetching profile:", error)
      }
    }

    fetchProfile()
  }, [user])

  const handleLogout = async () => {
    await signOut()
    router.push("/signin")
    router.refresh()
  }

  const userInitials = user?.email?.substring(0, 2).toUpperCase() || "AV"

  return (
    <header className="glass sticky top-0 z-40 border-b border-border">
      <div className="relative mx-auto flex h-14 max-w-[1200px] items-center justify-between px-4">
        {/* Logo + Title */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 lg:hidden">
            <span className="text-sm font-bold text-white">S</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-foreground lg:text-base">
              <span className="bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">Senpai</span> Social
            </h1>
            <p className="text-[10px] text-muted-foreground lg:hidden">{tabLabels[activeTab]}</p>
          </div>
        </div>

        {/* Center - Search (desktop) */}
        <div className="hidden md:flex relative max-w-sm flex-1 mx-8">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search Senpai Social..."
            className="w-full rounded-xl border border-border bg-secondary pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            aria-label="Search"
          />
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-1">
          {!user ? (
            <>
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => router.push("/signin")}
              >
                Sign In
              </Button>
              <Button
                className="bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                onClick={() => router.push("/signup")}
              >
                Sign Up
              </Button>
            </>
          ) : (
            <>
              <Button
                size="icon"
                variant="ghost"
                className="relative h-9 w-9 text-muted-foreground hover:text-foreground md:hidden"
                onClick={() => onTabChange("explore")}
                aria-label="Search"
              >
                <Search className="h-5 w-5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="relative hidden h-9 w-9 text-muted-foreground hover:text-foreground lg:flex"
                onClick={() => onTabChange("notifications")}
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifications > 0 && (
                  <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                    {unreadNotifications > 99 ? "99+" : unreadNotifications}
                  </span>
                )}
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Avatar
                    className="ml-1 h-8 w-8 cursor-pointer ring-2 ring-border hover:ring-primary transition-all"
                  >
                    <AvatarImage src={avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${user?.id}&scale=80`} alt="Your profile" />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">{userInitials}</AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onTabChange("profile")}>
                    View Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
