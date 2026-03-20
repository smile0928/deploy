"use client"

import { Home, Compass, Flame, CalendarDays, Settings, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"

export function PublicSidebar({
  activeTab,
  onTabChange,
}: {
  activeTab: string
  onTabChange: (tab: string) => void
}) {
  const router = useRouter()

  const publicTabs = [
    { icon: Home, label: "Feed", id: "feed" },
    { icon: Compass, label: "Explore", id: "explore" },
    { icon: Flame, label: "Rooms", id: "rooms" },
    { icon: CalendarDays, label: "Events", id: "events" },
  ]

  return (
    <aside className="fixed left-0 top-0 z-50 hidden h-screen w-[72px] flex-col items-center gap-4 border-r border-border bg-background py-4 lg:flex">
      {/* Logo/Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-purple-500 to-pink-500">
        <span className="text-sm font-bold text-white">S</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-2">
        {publicTabs.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "group relative flex h-10 w-10 items-center justify-center rounded-lg transition-all",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
              title={tab.label}
            >
              <Icon className="h-5 w-5" />
              <span className="absolute left-full ml-2 hidden whitespace-nowrap rounded-md bg-secondary px-2 py-1 text-xs text-foreground group-hover:block">
                {tab.label}
              </span>
            </button>
          )
        })}
      </nav>

      {/* Auth Buttons */}
      <div className="flex flex-col gap-2 w-full px-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs w-full justify-center text-muted-foreground hover:text-foreground"
          onClick={() => router.push("/signin")}
          title="Sign In"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </aside>
  )
}
