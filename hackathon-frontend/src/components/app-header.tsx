"use client"

import { Button } from "@/components/ui/button"
import { MessageSquare, FileSearch } from "lucide-react"
import { cn } from "@/lib/utils"
import { ThemeToggle } from "./theme-toggle"

type ViewMode = "chat" | "acts"

interface AppHeaderProps {
  currentMode: ViewMode
  onModeChange: (mode: ViewMode) => void
  title?: string
}

export function AppHeader({ currentMode, onModeChange, title = "Brief Case" }: AppHeaderProps) {
  return (
    <header className="glass-card border-b border-border dark:border-white/10 p-4 flex items-center justify-between sticky top-0 z-50 bg-background/80 backdrop-blur-xl gap-2">
      <h1 className="text-lg font-bold text-foreground">{title}</h1>

      <div className="flex items-center gap-2">
        <Button
          variant={currentMode === "chat" ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange("chat")}
          className={cn(
            "flex items-center gap-2",
            currentMode === "chat"
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "border-border dark:border-white/20 hover:bg-muted dark:hover:bg-white/10 bg-transparent"
          )}
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Chat</span>
        </Button>
        <Button
          variant={currentMode === "acts" ? "default" : "outline"}
          size="sm"
          onClick={() => onModeChange("acts")}
          className={cn(
            "flex items-center gap-2",
            currentMode === "acts"
              ? "bg-primary hover:bg-primary/90 text-primary-foreground"
              : "border-border dark:border-white/20 hover:bg-muted dark:hover:bg-white/10 bg-transparent"
          )}
        >
          <FileSearch className="w-4 h-4" />
          <span className="hidden sm:inline">Acts</span>
        </Button>
        
        {/* Theme Toggle */}
        <ThemeToggle />
      </div>
    </header>
  )
}

