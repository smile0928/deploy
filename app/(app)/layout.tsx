"use client"

import { useRouter, usePathname } from "next/navigation"
import { AppSidebar, MobileNav } from "@/components/app-sidebar"
import { TopHeader } from "@/components/top-header"
import { FriendRequestNotificationListener } from "@/components/friend-request-notification-listener"
import { MessageNotificationListener } from "@/components/message-notification-listener"
import { NotificationBadgeListener } from "@/components/notification-badge-listener"
import { BadgeCountsProvider } from "@/context/badge-counts-context"
import { useAuth } from "@/context/auth-context"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <BadgeCountsProvider>
      <div className="min-h-screen bg-background">
        <FriendRequestNotificationListener />
        <MessageNotificationListener />
        <NotificationBadgeListener />
        <AppSidebar activeTab="" onTabChange={() => {}} />
        <MobileNav activeTab="" onTabChange={() => {}} />

        <div className="lg:pl-[72px]">
          <TopHeader activeTab="" onTabChange={() => {}} />

          <div className="px-4 py-4 pb-24 lg:pb-4 mx-auto max-w-[1200px]">
            {children}
          </div>
        </div>
      </div>
    </BadgeCountsProvider>
  )
}

