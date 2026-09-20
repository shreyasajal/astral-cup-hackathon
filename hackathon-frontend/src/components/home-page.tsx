"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Loader2, ArrowRight } from "lucide-react"
import { useConversation } from "@/lib/conversation-context"
import { analyzeLegalQuestion, RagApiError } from "@/lib/api"
import { ActsSearchPage } from "@/components/acts-search-page"
import { AppHeader } from "@/components/app-header"

type ViewMode = "chat" | "acts"

interface HomePageProps {
  onNavigateToChat: () => void
}

export function HomePage({ onNavigateToChat }: HomePageProps) {
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>("chat")
  const [isTransitioning, setIsTransitioning] = useState(false)
  const { dispatch } = useConversation()

  // Handle mode changes with transition
  const handleModeChange = (mode: ViewMode) => {
    if (mode === viewMode) return

    setIsTransitioning(true)
    setTimeout(() => {
      setViewMode(mode)
      setIsTransitioning(false)
    }, 200)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    setIsLoading(true)
    setError(null)
    const userMessage = input
    setInput("")

    // Add user message
    dispatch({
      type: "ADD_MESSAGE",
      payload: {
        id: `msg-${Date.now()}`,
        type: "user",
        text: userMessage,
        timestamp: Date.now(),
      },
    })

    // Add to chat history for follow-up
    dispatch({
      type: "ADD_CHAT_HISTORY",
      payload: { role: "user", content: userMessage },
    })

    // Get API response
    try {
      const response = await analyzeLegalQuestion(userMessage)

      // Store analysis context for follow-up chats
      if (response.analysisContext) {
        dispatch({
          type: "SET_ANALYSIS_CONTEXT",
          payload: response.analysisContext,
        })
      }

      // Add assistant message with report, cards, and citations
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: `msg-${Date.now()}-ai`,
          type: "assistant",
          text: response.responseChat,
          report: response.report,
          cards: response.cards,
          citations: response.citations,
          timestamp: Date.now(),
        },
      })

      // Add to chat history
      dispatch({
        type: "ADD_CHAT_HISTORY",
        payload: {
          role: "model",
          content: response.report || response.responseChat,
        },
      })

      // Navigate to chat view
      dispatch({
        type: "PUSH_NAVIGATION",
        payload: { type: "chat" },
      })
      onNavigateToChat()
    } catch (err) {
      console.error("Error analyzing question:", err)
      if (err instanceof RagApiError) {
        setError(err.message)
      } else {
        setError("Failed to analyze your question. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Render Acts Search Page if mode is "acts"
  if (viewMode === "acts") {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        {/* Floating toggle */}
        <div className="fixed top-4 right-4 z-50">
          <AppHeader currentMode={viewMode} onModeChange={handleModeChange} />
        </div>

        {/* Page content with transition */}
        <div
          className={`flex-1 ${
            isTransitioning
              ? "opacity-0 scale-95 transition-all duration-200"
              : "opacity-100 scale-100 transition-all duration-300"
          }`}
        >
          <ActsSearchPage />
        </div>
      </div>
    )
  }

  // Render Chat interface (default)
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4">
      {/* Error Alert */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive" className="glass-card border-red-500/50">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Floating toggle */}
      <div className="fixed top-4 right-4 z-50">
        <AppHeader currentMode={viewMode} onModeChange={handleModeChange} />
      </div>

      {/* Background glow effect */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl opacity-20"></div>
        <div className="absolute bottom-20 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl opacity-20"></div>
      </div>

      {/* Page content with transition */}
      <div
        className={`relative z-10 max-w-2xl w-full text-center ${
          isTransitioning
            ? "opacity-0 scale-95 transition-all duration-200"
            : "opacity-100 scale-100 transition-all duration-300"
        }`}
      >
        <div className="mb-8">
          <h1 className="text-5xl md:text-6xl font-bold mb-4 text-glow">Brief Case</h1>
          <p className="text-lg text-muted-foreground">
            The AI companion for Indian Litigators
          </p>
        </div>

        <div className="glass-card p-8 mb-6">
          <p className="text-foreground/90 mb-6">
            Describe your legal situation and get instant access to relevant case law, statutes,
            and AI-generated analysis with citations.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Describe your legal situation..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="bg-input/50 border-border dark:border-white/10 placeholder:text-muted-foreground/60"
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ArrowRight className="w-4 h-4" />
                )}
              </Button>
            </div>
          </form>

          <div className="mt-6 pt-6 border-t border-border dark:border-white/10">
            <p className="text-sm text-muted-foreground mb-3">Example queries:</p>
            <div className="space-y-2">
              {[
                "I am concerned about deforestation in Tamil Nadu and the displacement of tea estate workers",
                "My employer terminated me without notice after 5 years of service",
                "I want to file a consumer complaint against a faulty electronic product",
              ].map((question) => (
                <button
                  key={question}
                  onClick={() => setInput(question)}
                  disabled={isLoading}
                  className="block w-full text-left text-sm text-accent hover:text-accent/80 transition-colors p-2 hover:bg-muted/50 dark:hover:bg-white/5 rounded disabled:opacity-50"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
