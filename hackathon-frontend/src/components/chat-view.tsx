"use client"

import type React from "react"

import { useConversation } from "@/lib/conversation-context"
import { ChatMessage } from "./chat-message"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { ArrowRight, ChevronLeft, Trash2 } from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { chatWithAssistant, RagApiError } from "@/lib/api"
import { ThemeToggle } from "./theme-toggle"

interface ChatViewProps {
  onBack: () => void
}

export function ChatView({ onBack }: ChatViewProps) {
  const { state, dispatch } = useConversation()
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [state.messages])

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Core function to send a message (used by both form submit and programmatic calls)
  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return

    setIsLoading(true)
    setError(null)

    // Add user message
    dispatch({
      type: "ADD_MESSAGE",
      payload: {
        id: `msg-${Date.now()}`,
        type: "user",
        text: messageText,
        timestamp: Date.now(),
      },
    })

    // Add to chat history
    dispatch({
      type: "ADD_CHAT_HISTORY",
      payload: { role: "user", content: messageText },
    })

    try {
      // Call the chat endpoint with history and context
      const response = await chatWithAssistant(
        messageText,
        state.chatHistory,
        state.analysisContext
      )

      // Add assistant response
      dispatch({
        type: "ADD_MESSAGE",
        payload: {
          id: `msg-${Date.now()}-ai`,
          type: "assistant",
          text: response.response,
          timestamp: Date.now(),
        },
      })

      // Add to chat history
      dispatch({
        type: "ADD_CHAT_HISTORY",
        payload: { role: "model", content: response.response },
      })
    } catch (err) {
      console.error("Error in chat:", err)
      if (err instanceof RagApiError) {
        setError(err.message)
      } else {
        setError("Failed to get a response. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const messageText = input
    setInput("")
    await sendMessage(messageText)
  }

  const handleClear = () => {
    if (confirm("Clear conversation history?")) {
      dispatch({ type: "CLEAR_CONVERSATION" })
      onBack()
    }
  }

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Error Alert */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive" className="glass-card border-red-500/50">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Back button and clear button */}
      <div className="glass-card border-b border-border dark:border-white/10 p-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-2 hover:bg-muted dark:hover:bg-white/10 rounded-lg transition-colors text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="text-sm font-medium">Back</span>
        </button>

        <div className="flex-1 text-center">
          <span className="text-sm text-muted-foreground">
            {state.analysisContext?.category
              ? `Category: ${state.analysisContext.category}`
              : "Legal Analysis Chat"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleClear}
            className="flex items-center gap-2 px-3 py-2 hover:bg-destructive/20 rounded-lg transition-colors text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="space-y-6">
          {state.messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onExpandCard={(cardId) => {
                if (cardId) {
                  dispatch({
                    type: "SET_EXPANDED_CARD",
                    payload: cardId,
                  })
                  dispatch({
                    type: "PUSH_NAVIGATION",
                    payload: { type: "card_expanded", cardId },
                  })
                } else {
                  dispatch({
                    type: "SET_EXPANDED_CARD",
                    payload: null,
                  })
                  dispatch({ type: "POP_NAVIGATION" })
                }
              }}
              expandedCardId={state.expandedCardId}
              onSendMessage={sendMessage}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <footer className="glass-card border-t border-border dark:border-white/10 p-4">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <Input
            type="text"
            placeholder="Ask a follow-up question..."
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
              <span className="w-4 h-4 border-2 border-transparent border-t-primary-foreground rounded-full animate-spin" />
            ) : (
              <ArrowRight className="w-4 h-4" />
            )}
          </Button>
        </form>
      </footer>
    </div>
  )
}
