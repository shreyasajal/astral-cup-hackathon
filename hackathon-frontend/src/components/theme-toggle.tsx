"use client"

import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"

export const ThemeToggle = () => {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="icon"
        className="w-9 h-9 rounded-full bg-white/5 border border-white/10"
        disabled
      >
        <Sun className="w-4 h-4" />
      </Button>
    )
  }

  const isDark = theme === "dark"

  const handleToggle = () => {
    setTheme(isDark ? "light" : "dark")
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleToggle}
      className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-border dark:border-white/10 transition-all duration-300"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      <Sun 
        className={`w-4 h-4 absolute transition-all duration-300 ${
          isDark ? "opacity-0 rotate-90 scale-0" : "opacity-100 rotate-0 scale-100"
        } text-amber-500`} 
      />
      <Moon 
        className={`w-4 h-4 transition-all duration-300 ${
          isDark ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-0"
        } text-blue-300`} 
      />
      <span className="sr-only">Toggle theme</span>
    </Button>
  )
}

