"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Home,
  Compass,
  MessageCircle,
  Bell,
  User,
  CalendarDays,
  Users,
  Search,
  Settings,
  Flame,
  Upload,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useBadgeCounts } from "@/context/badge-counts-context"

const MAIN_NAV_ICONS = [
  { icon: Home, label: "Feed", id: "feed", path: "/feed" },
  { icon: Compass, label: "Explore", id: "explore", path: "/explore" },
  { icon: Upload, label: "Upload", id: "upload", path: "/upload" },
  { icon: Flame, label: "Rooms", id: "rooms", path: "/rooms", badgeKey: "rooms" as const },
  { icon: CalendarDays, label: "Events", id: "events", path: "/events", badgeKey: "events" as const },
  { icon: MessageCircle, label: "Messages", id: "messages", path: "/messages", badgeKey: "messages" as const },
  { icon: Bell, label: "Notifications", id: "notifications", path: "/notifications", badgeKey: "notifications" as const },
  { icon: Users, label: "Friends", id: "friends", path: "/friends" },
  { icon: User, label: "Profile", id: "profile", path: "/profile" },
]

export function AppSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const pathname = usePathname()
  const badges = useBadgeCounts()
  const [notificationsOverride, setNotificationsOverride] = useState<number | null>(null)

  useEffect(() => {
    const onNotificationsRead = () => setNotificationsOverride(0)
    window.addEventListener("notificationsRead", onNotificationsRead)
    return () => window.removeEventListener("notificationsRead", onNotificationsRead)
  }, [])

  useEffect(() => {
    if (badges.notifications > 0) setNotificationsOverride(null)
  }, [badges.notifications])

  const notificationsBadge = notificationsOverride !== null ? notificationsOverride : badges.notifications
  const mainNav = MAIN_NAV_ICONS.map((item) => {
    const badgeKey = "badgeKey" in item ? item.badgeKey : undefined
    const rawBadge = badgeKey != null ? badges[badgeKey] : 0
    const badge = badgeKey === "notifications" ? notificationsBadge : rawBadge
    return {
      icon: item.icon,
      label: item.label,
      id: item.id,
      path: item.path,
      badge,
    }
  })

  return (
    <TooltipProvider delayDuration={0}>
      <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[72px] flex-col items-center gap-1 border-r border-border bg-sidebar py-4 lg:flex">
        {/* Logo */}
        <div className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <span className="text-lg font-bold text-primary-foreground font-sans">A</span>
        </div>

        {/* Search */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right">Search</TooltipContent>
        </Tooltip>

        <div className="h-px w-8 bg-border" />

        {/* Nav items */}
        <nav className="mt-2 flex flex-1 flex-col items-center gap-1">
          {mainNav.map((item) => {
            const isActive = pathname === item.path
            return (
              <Tooltip key={item.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.path}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-primary text-primary-foreground glow-pink"
                        : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.badge > 0 && (
                      <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom section */}
        <div className="flex flex-col items-center gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label="Settings"
              >
                <Settings className="h-5 w-5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
          <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-primary/50">
            <AvatarImage src="/images/hero-anime.jpg" alt="Your avatar" />
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">AV</AvatarFallback>
          </Avatar>
        </div>
      </aside>
    </TooltipProvider>
  )
}

/* Mobile bottom nav */
export function MobileNav({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const pathname = usePathname()
  const badges = useBadgeCounts()
  const [notificationsOverride, setNotificationsOverride] = useState<number | null>(null)

  useEffect(() => {
    const onNotificationsRead = () => setNotificationsOverride(0)
    window.addEventListener("notificationsRead", onNotificationsRead)
    return () => window.removeEventListener("notificationsRead", onNotificationsRead)
  }, [])

  useEffect(() => {
    if (badges.notifications > 0) setNotificationsOverride(null)
  }, [badges.notifications])

  const notificationsBadge = notificationsOverride !== null ? notificationsOverride : badges.notifications
  const mobileItems = [
    { icon: Home, label: "Feed", id: "feed", path: "/feed" },
    { icon: Compass, label: "Explore", id: "explore", path: "/explore" },
    { icon: Bell, label: "Alerts", id: "notifications", path: "/notifications", badge: notificationsBadge },
    { icon: User, label: "Profile", id: "profile", path: "/profile" },
  ]

  return (
    <nav className="glass fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-border px-2 py-2 lg:hidden" role="navigation" aria-label="Main navigation">
      {mobileItems.map((item) => {
        const isActive = pathname === item.path
        return (
          <Link
            key={item.id}
            href={item.path}
            className={cn(
              "relative flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-xs transition-all",
              isActive
                ? "text-primary"
                : "text-muted-foreground"
            )}
            aria-label={item.label}
            aria-current={isActive ? "page" : undefined}
          >
            <item.icon className={cn("h-5 w-5", isActive && "drop-shadow-[0_0_8px_rgba(225,29,124,0.5)]")} />
            <span className="text-[10px]">{item.label}</span>
            {item.badge && item.badge > 0 && (
              <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
                {item.badge}
              </span>
            )}
          </Link>
        )
      })}
    </nav>
  )
}
