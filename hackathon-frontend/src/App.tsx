import { useState } from "react"
import { ConversationProvider } from "@/lib/conversation-context"
import { HomePage } from "@/components/home-page"
import { ChatView } from "@/components/chat-view"
import { ThemeProvider } from "@/components/theme-provider"
import "@/app/globals.css"

type AppView = "home" | "chat"

function App() {
  const [currentView, setCurrentView] = useState<AppView>("home")

  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <ConversationProvider>
        {currentView === "home" ? (
          <HomePage onNavigateToChat={() => setCurrentView("chat")} />
        ) : (
          <ChatView onBack={() => setCurrentView("home")} />
        )}
      </ConversationProvider>
    </ThemeProvider>
  )
}

export default App
