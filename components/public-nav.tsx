"use client"

import { Home, Compass, Flame, CalendarDays, Upload, MessageCircle, Bell, Users, User } from "lucide-react"
import { cn } from "@/lib/utils"

export function PublicNav({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const publicTabs = [
    { icon: Home, label: "Feed", id: "feed" },
    { icon: Compass, label: "Explore", id: "explore" },
    { icon: Flame, label: "Rooms", id: "rooms" },
    { icon: CalendarDays, label: "Events", id: "events" },
    { icon: Upload, label: "Create", id: "upload" },
    { icon: MessageCircle, label: "Messages", id: "messages" },
    { icon: Bell, label: "Notifications", id: "notifications" },
    { icon: Users, label: "Friends", id: "friends" },
    { icon: User, label: "Profile", id: "profile" },
  ]

  return (
    <div className="sticky top-14 z-30 border-b border-border bg-background/80 backdrop-blur-sm lg:hidden">
      <div className="flex gap-0 overflow-x-auto no-scrollbar">
        {publicTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-1 min-w-max items-center justify-center gap-2 px-4 py-3 text-sm font-medium transition-colors border-b-2",
              activeTab === tab.id
                ? "border-primary text-primary bg-primary/5"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
