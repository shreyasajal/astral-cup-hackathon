"use client"

import { useState } from "react"
import { ConversationProvider } from "@/lib/conversation-context"
import { HomePage } from "@/components/home-page"
import { ChatView } from "@/components/chat-view"

type AppView = "home" | "chat"

export default function Page() {
  const [currentView, setCurrentView] = useState<AppView>("home")

  return (
    <ConversationProvider>
      <div className="min-h-screen bg-background flex flex-col">
        {/* Page content */}
        {currentView === "home" ? (
          <HomePage
            onNavigateToChat={() => {
              setCurrentView("chat")
            }}
          />
        ) : (
          <ChatView
            onBack={() => {
              setCurrentView("home")
            }}
          />
        )}
      </div>
    </ConversationProvider>
  )
}
