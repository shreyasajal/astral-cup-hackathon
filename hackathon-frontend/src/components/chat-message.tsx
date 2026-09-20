"use client"

import type { Message, Card, Citation } from "@/lib/types"
import { CardComponent } from "./card-component"
import { useConversation } from "@/lib/conversation-context"
import { useState, useEffect } from "react"
import { createPortal } from "react-dom"
import { X, FileText, ExternalLink, Highlighter, ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDFViewerHighlighter } from "./pdf-viewer-highlighter"

// API base URL for document links
const RAG_API_BASE_URL = import.meta.env.VITE_RAG_API_BASE_URL || "http://localhost:2222"

interface ChatMessageProps {
  message: Message
  onExpandCard: (cardId: string | null) => void
  expandedCardId: string | null
  onSendMessage?: (message: string) => void
}

/**
 * Citation Modal Component
 */
interface CitationModalProps {
  citation: Citation
  onClose: () => void
}

/**
 * Split multiline text into individual lines for searching
 */
const splitMultilineText = (text: string): string[] => {
  return text
    .split(/[\r\n]+/) // Split on newlines
    .map(line => line.trim()) // Trim whitespace
    .filter(line => line.length > 0) // Remove empty lines
}

const CitationModal = ({ citation, onClose }: CitationModalProps) => {
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  const documentUrl = `${RAG_API_BASE_URL}/documents/${encodeURIComponent(citation.file_name)}`
  // Split multiline quoted text into individual search strings
  const searchStrings = citation.quoted_text ? splitMultilineText(citation.quoted_text) : []

  // Render modal at document body level using portal
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={() => {
          if (showPdfViewer) {
            setShowPdfViewer(false)
          } else {
            onClose()
          }
        }}
      ></div>

      {/* Modal Container - centered page modal */}
      <div 
        className={`
          relative z-10 
          ${showPdfViewer 
            ? 'w-[95vw] h-[90vh]' 
            : 'w-[90vw] max-w-3xl'
          } 
          max-h-[90vh]
          transition-all duration-300 ease-out
          animate-in fade-in zoom-in-95
        `}
      >
        {/* Modal Content */}
        <div 
          className={`
            max-h-[90vh]
            bg-background/95 backdrop-blur-xl
            border border-border dark:border-white/10
            rounded-2xl
            shadow-2xl shadow-black/20 dark:shadow-black/50
            ${showPdfViewer ? 'flex h-full' : 'overflow-y-auto'}
          `}
        >
          {/* Left Panel - Citation Content */}
          <div className={`${showPdfViewer ? 'w-[30%] p-6 overflow-y-auto border-r border-border dark:border-white/10' : 'w-full p-8'}`}>
          
          {/* Modal Action Buttons */}
          <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
            {/* Back Button - only when PDF viewer is open */}
            {showPdfViewer && (
              <button
                onClick={() => setShowPdfViewer(false)}
                className="p-2.5 bg-muted/50 hover:bg-muted dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors border border-border dark:border-white/10"
                title="Close PDF viewer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2.5 bg-muted/50 hover:bg-muted dark:bg-white/5 dark:hover:bg-white/10 rounded-full transition-colors border border-border dark:border-white/10"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Header */}
          <div className="mb-6 pr-12">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-accent/20 to-accent/10 border border-accent/30 rounded-full text-xs font-medium text-accent mb-3">
              <FileText className="w-4 h-4" />
              Citation [{citation.citation_id}]
            </span>
            <h2 className="text-xl font-bold text-foreground mb-2">
              {citation.file_name.replace(/\.[^/.]+$/, "").replace(/_/g, " ")}
            </h2>
          </div>

          {/* Quoted Text */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">
              Quoted Text
            </h3>
            <blockquote className="text-foreground/80 leading-relaxed whitespace-pre-wrap border-l-4 border-accent/50 pl-4 italic">
              "{citation.quoted_text}"
            </blockquote>
          </div>

          {/* Source Document Links */}
          <div className="flex flex-col gap-2 mb-6">
            <a
              href={documentUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span>View Source Document (PDF)</span>
              <ExternalLink className="w-4 h-4" />
            </a>
            
            {/* Show Quote in Document button */}
            {searchStrings.length > 0 && !showPdfViewer && (
              <Button
                onClick={() => setShowPdfViewer(true)}
                variant="outline"
                size="sm"
                className="w-fit border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 text-amber-400"
              >
                <Highlighter className="w-4 h-4 mr-2" />
                Show Quote in Document
              </Button>
            )}
          </div>

          {/* Close Button */}
          <div className="flex gap-3 pt-6 border-t border-border dark:border-white/10">
            <Button
              onClick={onClose}
              variant="outline"
              className="border-white/20 hover:bg-white/10 bg-transparent"
            >
              Close
            </Button>
          </div>
          
          </div>{/* End Left Panel */}
          
          {/* Right Panel - PDF Viewer with Highlights (70% of space) */}
          {showPdfViewer && (
            <div className="w-[70%] h-full flex flex-col bg-muted/30 dark:bg-black/20 rounded-r-2xl overflow-hidden">
              <div className="p-4 border-b border-border dark:border-white/10 flex items-center justify-between shrink-0 bg-muted/50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Highlighter className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <span className="text-sm font-medium text-foreground">Source Document</span>
                    <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded ml-2">
                      Quote highlighted
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowPdfViewer(false)}
                  className="hover:bg-white/10 rounded-full"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex-1 min-h-0">
                <PDFViewerHighlighter
                  pdfUrl={documentUrl}
                  searchStrings={searchStrings}
                  className="h-full"
                />
              </div>
            </div>
          )}
          
        </div>
      </div>
    </div>,
    document.body
  )
}

/**
 * Simple markdown renderer for legal reports
 * Handles headers, bold, lists, and paragraphs
 * Citations are rendered as clickable buttons
 */
interface MarkdownRendererProps {
  content: string
  citations?: Citation[]
  onCitationClick: (citation: Citation) => void
}

const MarkdownRenderer = ({ content, citations = [], onCitationClick }: MarkdownRendererProps) => {
  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let listType: "ul" | "ol" | null = null

  // Create a map of citation IDs for quick lookup
  const citationMap = new Map<string, Citation>()
  citations.forEach((citation) => {
    citationMap.set(citation.citation_id, citation)
  })

  const flushList = () => {
    if (listItems.length > 0 && listType) {
      const ListTag = listType
      elements.push(
        <ListTag
          key={`list-${elements.length}`}
          className={`${listType === "ul" ? "list-disc" : "list-decimal"} list-inside space-y-1 my-3 text-foreground/80`}
        >
          {listItems.map((item, idx) => (
            <li key={idx}>{renderInlineMarkdown(item)}</li>
          ))}
        </ListTag>
      )
      listItems = []
      listType = null
    }
  }

  const renderInlineMarkdown = (text: string): React.ReactNode => {
    // Handle bold **text** and *text*
    const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
    return parts.map((part, idx) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={idx} className="font-semibold text-foreground">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith("*") && part.endsWith("*")) {
        return (
          <em key={idx} className="italic">
            {part.slice(1, -1)}
          </em>
        )
      }
      // Handle citation references like [1], [2]
      return part.split(/(\[\d+\])/g).map((segment, segIdx) => {
        const citationMatch = segment.match(/^\[(\d+)\]$/)
        if (citationMatch) {
          const citationId = citationMatch[1]
          const citation = citationMap.get(citationId)
          
          // Only render clickable citation if it exists in the citations list
          if (citation) {
            return (
              <button
                key={`${idx}-${segIdx}`}
                onClick={() => onCitationClick(citation)}
                className="inline-flex items-center justify-center min-w-[1.5rem] px-1.5 py-0.5 mx-0.5 text-xs font-bold bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors cursor-pointer align-baseline"
                title={`View citation: ${citation.file_name}`}
              >
                {segment}
              </button>
            )
          }
          // If citation not found, don't render it
          return null
        }
        return segment
      })
    })
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim()

    // Headers
    if (trimmedLine.startsWith("# ")) {
      flushList()
      elements.push(
        <h1
          key={index}
          className="text-2xl font-bold text-foreground mt-6 mb-3 first:mt-0"
        >
          {renderInlineMarkdown(trimmedLine.slice(2))}
        </h1>
      )
    } else if (trimmedLine.startsWith("## ")) {
      flushList()
      elements.push(
        <h2
          key={index}
          className="text-xl font-semibold text-foreground mt-5 mb-2"
        >
          {renderInlineMarkdown(trimmedLine.slice(3))}
        </h2>
      )
    } else if (trimmedLine.startsWith("### ")) {
      flushList()
      elements.push(
        <h3
          key={index}
          className="text-lg font-medium text-foreground mt-4 mb-2"
        >
          {renderInlineMarkdown(trimmedLine.slice(4))}
        </h3>
      )
    }
    // Unordered list items
    else if (trimmedLine.startsWith("- ") || trimmedLine.startsWith("* ")) {
      if (listType !== "ul") {
        flushList()
        listType = "ul"
      }
      listItems.push(trimmedLine.slice(2))
    }
    // Ordered list items
    else if (/^\d+\.\s/.test(trimmedLine)) {
      if (listType !== "ol") {
        flushList()
        listType = "ol"
      }
      listItems.push(trimmedLine.replace(/^\d+\.\s/, ""))
    }
    // Horizontal rule
    else if (trimmedLine === "---" || trimmedLine === "***") {
      flushList()
      elements.push(
        <hr key={index} className="border-border dark:border-white/10 my-4" />
      )
    }
    // Empty line
    else if (trimmedLine === "") {
      flushList()
    }
    // Regular paragraph
    else {
      flushList()
      elements.push(
        <p key={index} className="text-foreground/80 leading-relaxed my-2">
          {renderInlineMarkdown(trimmedLine)}
        </p>
      )
    }
  })

  flushList()

  return <div className="prose prose-invert max-w-none">{elements}</div>
}

export function ChatMessage({
  message,
  onExpandCard,
  expandedCardId,
  onSendMessage,
}: ChatMessageProps) {
  const { dispatch } = useConversation()
  const [displayedText, setDisplayedText] = useState("")
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null)
  const isStreaming = message.type === "assistant" && !message.report

  // Simulate streaming for short assistant messages (not reports)
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(message.text)
      return
    }

    let currentIndex = 0
    const interval = setInterval(() => {
      if (currentIndex < message.text.length) {
        setDisplayedText(message.text.slice(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(interval)
      }
    }, 15)

    return () => clearInterval(interval)
  }, [message.text, isStreaming])

  const handleAskWithCard = (card: Card) => {
    // Close the expanded card modal first
    onExpandCard(null)
    
    // Set pinned card for reference
    dispatch({
      type: "SET_PINNED_CARD",
      payload: card.id,
    })

    // Send the message (this will add to messages, history, and call the API)
    const messageText = `Tell me more about: ${card.title}`
    if (onSendMessage) {
      onSendMessage(messageText)
    }
  }

  const handleCitationClick = (citation: Citation) => {
    setSelectedCitation(citation)
  }

  const handleCloseCitation = () => {
    setSelectedCitation(null)
  }

  return (
    <>
      <div
        className={`flex ${
          message.type === "user" ? "justify-end" : "justify-start"
        } mb-6 animate-in fade-in slide-in-from-bottom-2`}
      >
        <div
          className={`max-w-4xl ${
            message.type === "user"
              ? "glass-card bg-primary/20 border-primary/30"
              : "glass-card bg-secondary/10 border-secondary/30"
          } p-4`}
        >
          {/* Short text message */}
          {!message.report && (
            <p className="text-foreground/90 whitespace-pre-wrap mb-4">
              {displayedText}
              {isStreaming && displayedText.length < message.text.length && (
                <span className="inline-block w-2 h-4 ml-1 bg-primary animate-pulse"></span>
              )}
            </p>
          )}

          {/* Markdown Report with clickable citations */}
          {message.report && (
            <div className="mb-4">
              <MarkdownRenderer
                content={message.report}
                citations={message.citations}
                onCitationClick={handleCitationClick}
              />
            </div>
          )}

          {/* Cards Display */}
          {message.cards && message.cards.length > 0 && (
            <div className="space-y-3 mt-4 pt-4 border-t border-border dark:border-white/10">
              <p className="text-xs text-muted-foreground font-medium">
                References ({message.cards.length})
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {message.cards.map((card) => (
                  <CardComponent
                    key={card.id}
                    card={card}
                    isExpanded={expandedCardId === card.id}
                    onExpand={() => onExpandCard(card.id)}
                    onClose={() => onExpandCard(null)}
                    onAskWithCard={() => handleAskWithCard(card)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Citation Modal */}
      {selectedCitation && (
        <CitationModal
          citation={selectedCitation}
          onClose={handleCloseCitation}
        />
      )}
    </>
  )
}
