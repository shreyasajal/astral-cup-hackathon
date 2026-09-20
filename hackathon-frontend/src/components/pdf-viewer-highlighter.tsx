"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import * as pdfjsLib from "pdfjs-dist"
import { ChevronUp, ChevronDown, ZoomIn, ZoomOut, RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

// Set up PDF.js worker for Vite
if (typeof window !== "undefined") {
  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl
}

interface PDFViewerHighlighterProps {
  pdfUrl: string
  searchStrings?: string[]
  className?: string
  onPageChange?: (pageNumber: number) => void
}

interface HighlightRect {
  x: number
  y: number
  width: number
  height: number
  pageNumber: number
}

export function PDFViewerHighlighter({
  pdfUrl,
  searchStrings = [],
  className,
  onPageChange,
}: PDFViewerHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const thumbnailContainerRef = useRef<HTMLDivElement>(null)
  const [pdfDocument, setPdfDocument] = useState<pdfjsLib.PDFDocumentProxy | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [scale, setScale] = useState(1.5)
  const [rotation, setRotation] = useState(0)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagesWithHighlights, setPagesWithHighlights] = useState<Set<number>>(new Set())
  const [highlightPositions, setHighlightPositions] = useState<Map<number, HighlightRect[]>>(new Map())
  const [thumbnailsRendered, setThumbnailsRendered] = useState(0) // Counter to trigger re-render when thumbnails are ready
  const pageRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const renderTasksRef = useRef<Map<number, pdfjsLib.RenderTask>>(new Map())

  // Fetch and load PDF document
  useEffect(() => {
    let isCancelled = false

    const fetchAndLoadPDF = async () => {
      try {
        setIsLoading(true)
        setError(null)
        
        // Fetch PDF from URL
        const response = await fetch(pdfUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch PDF: ${response.statusText}`)
        }
        
        if (isCancelled) return

        const arrayBuffer = await response.arrayBuffer()
        if (isCancelled) return

        // Create a copy of the buffer to avoid detachment issues
        const bufferCopy = new Uint8Array(arrayBuffer.byteLength)
        bufferCopy.set(new Uint8Array(arrayBuffer))
        
        // Load PDF document with PDF.js
        const loadingTask = pdfjsLib.getDocument({ data: bufferCopy })
        const pdf = await loadingTask.promise
        
        if (isCancelled) return

        setPdfDocument(pdf)
        setTotalPages(pdf.numPages)
        setIsLoading(false)
      } catch (err) {
        if (!isCancelled) {
        setError(err instanceof Error ? err.message : "Failed to load PDF")
        setIsLoading(false)
      }
    }
    }

    fetchAndLoadPDF()

    return () => {
      isCancelled = true
    }
  }, [pdfUrl])

  // Render a single page
  const renderPage = useCallback(
    async (pageNumber: number, canvas: HTMLCanvasElement, scaleValue: number, rotationValue: number) => {
      if (!pdfDocument) return

      try {
        // Cancel previous render task for this page
        const existingTask = renderTasksRef.current.get(pageNumber)
        if (existingTask) {
          existingTask.cancel()
        }

        const page = await pdfDocument.getPage(pageNumber)
        const viewport = page.getViewport({ scale: scaleValue, rotation: rotationValue })

        canvas.height = viewport.height
        canvas.width = viewport.width

        const context = canvas.getContext("2d")
        if (!context) return

        // Clear canvas
        context.clearRect(0, 0, canvas.width, canvas.height)

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas,
        }

        const renderTask = page.render(renderContext)
        renderTasksRef.current.set(pageNumber, renderTask)
        await renderTask.promise

        // Find and highlight text after rendering
        let highlights: HighlightRect[] = []
        if (searchStrings.length > 0) {
          highlights = await highlightTextOnPage(page, pageNumber, viewport, context)
        }

        // Return highlights for tracking
        return highlights
      } catch (err) {
        if (err instanceof Error && err.name !== "RenderingCancelledException") {
          console.error(`Error rendering page ${pageNumber}:`, err)
        }
      }
    },
    [pdfDocument, searchStrings],
  )

  // Highlight text on a page - returns array of highlight rects
  const highlightTextOnPage = useCallback(
    async (
      page: pdfjsLib.PDFPageProxy,
      pageNumber: number,
      viewport: pdfjsLib.PageViewport,
      context: CanvasRenderingContext2D,
    ): Promise<HighlightRect[]> => {
      if (!searchStrings || searchStrings.length === 0) return []

      const textContent = await page.getTextContent()
      const newHighlights: HighlightRect[] = []

      // Build a map of text items with their indices for efficient searching
      // Filter to only items with text content and valid transforms
      const textItems = textContent.items.filter(
        (item): item is typeof item & { str: string; transform: number[]; width?: number; height?: number; size?: number } =>
          "str" in item && !!item.str && !!item.transform && item.transform.length >= 6,
      )

      // Helper: Check if a character is a word boundary (not a letter or number)
      const isWordBoundary = (char: string | undefined): boolean => {
        if (char === undefined) return true // Start/end of string is a boundary
        return !/[a-z0-9]/i.test(char)
      }

      // Helper: Check if match at position is at word boundaries
      const isWordBoundaryMatch = (text: string, matchStart: number, matchEnd: number): boolean => {
        const charBefore = matchStart > 0 ? text[matchStart - 1] : undefined
        const charAfter = matchEnd < text.length ? text[matchEnd] : undefined
        return isWordBoundary(charBefore) && isWordBoundary(charAfter)
      }

      // Helper: Find all word-boundary matches in text
      const findWordBoundaryMatches = (text: string, search: string): Array<{ start: number; end: number }> => {
        const matches: Array<{ start: number; end: number }> = []
        let searchPos = 0
        while ((searchPos = text.indexOf(search, searchPos)) !== -1) {
          const matchStart = searchPos
          const matchEnd = searchPos + search.length
          if (isWordBoundaryMatch(text, matchStart, matchEnd)) {
            matches.push({ start: matchStart, end: matchEnd })
          }
          searchPos += 1
        }
        return matches
      }

      searchStrings.forEach((searchString) => {
        if (!searchString || !searchString.trim()) return

        const searchLower = searchString.toLowerCase().trim()
        const itemsToHighlight = new Set<number>()

        // Strategy 1: Check for exact word match within single text items
        textItems.forEach((item, index) => {
          const itemText = item.str.toLowerCase()
          const matches = findWordBoundaryMatches(itemText, searchLower)
          if (matches.length > 0) {
            itemsToHighlight.add(index)
          }
        })

        // Strategy 2: Check for matches spanning consecutive text items
        // Only if we haven't found single-item matches
        if (itemsToHighlight.size === 0 && textItems.length > 1) {
          // Build continuous text WITHOUT artificial spaces - preserve original text
          // Track exact character boundaries for each item
          let continuousText = ""
          const itemBoundaries: Array<{ itemIndex: number; startPos: number; endPos: number }> = []

          textItems.forEach((item, itemIndex) => {
            const startPos = continuousText.length
            continuousText += item.str.toLowerCase()
            const endPos = continuousText.length
            itemBoundaries.push({ itemIndex, startPos, endPos })
          })

          // Find all word-boundary matches in the continuous text
          const matches = findWordBoundaryMatches(continuousText, searchLower)
          matches.forEach(({ start: matchStart, end: matchEnd }) => {
            // Find which items this match spans (items that have actual overlap with match)
            itemBoundaries.forEach(({ itemIndex, startPos, endPos }) => {
              // Item overlaps with match if: item ends after match starts AND item starts before match ends
              const hasOverlap = endPos > matchStart && startPos < matchEnd
              if (hasOverlap) {
                itemsToHighlight.add(itemIndex)
              }
            })
          })
        }

        // Strategy 3: Try with normalized whitespace for phrases with spaces
        // This handles cases where PDF has "Hello  World" but we search for "Hello World"
        if (itemsToHighlight.size === 0 && searchLower.includes(" ")) {
          // Normalize the search string (collapse multiple spaces to single space)
          const normalizedSearch = searchLower.replace(/\s+/g, " ")
          
          // Build text with single space between items (for word-boundary cases)
          let spacedText = ""
          const spacedBoundaries: Array<{ itemIndex: number; startPos: number; endPos: number }> = []

        textItems.forEach((item, itemIndex) => {
            const itemText = item.str.toLowerCase().trim()
            if (itemText.length === 0) return // Skip empty items
            
            if (spacedText.length > 0 && !spacedText.endsWith(" ") && !itemText.startsWith(" ")) {
              spacedText += " " // Add space between items only if needed
            }
            const startPos = spacedText.length
            spacedText += itemText
            const endPos = spacedText.length
            spacedBoundaries.push({ itemIndex, startPos, endPos })
          })

          // Also normalize the built text
          const normalizedSpacedText = spacedText.replace(/\s+/g, " ")
          
          // Find all word-boundary matches
          const matches = findWordBoundaryMatches(normalizedSpacedText, normalizedSearch)
          matches.forEach(({ start: matchStart, end: matchEnd }) => {
            spacedBoundaries.forEach(({ itemIndex, startPos, endPos }) => {
              const hasOverlap = endPos > matchStart && startPos < matchEnd
              if (hasOverlap) {
                itemsToHighlight.add(itemIndex)
              }
            })
          })
        }

        // Draw highlights for matched items
        itemsToHighlight.forEach((itemIndex) => {
          const item = textItems[itemIndex]
          if (!item) return

          // Extract position from transform matrix [a, b, c, d, e, f]
          // transform[4] = e = x translation (left edge of text)
          // transform[5] = f = y translation (baseline position in PDF coordinates)
          const x = item.transform[4]
          const y = item.transform[5]
          
          // Get text dimensions
          const width = item.width || 0
          const fontSize = item.size || 12
          // Estimate text height - text extends above baseline
          const textHeight = item.height || fontSize * 1.2

          // Calculate bounding box in PDF coordinates (bottom-left origin, Y up)
          // The baseline (y) is where text sits, text extends upward from there
          const pdfLeft = x
          const pdfRight = x + width
          const pdfBottom = y - (fontSize * 0.2) // Slightly below baseline for descenders
          const pdfTop = y + textHeight - (fontSize * 0.2) // Above baseline for ascenders

          // Convert PDF coordinates to viewport/canvas coordinates
          // IMPORTANT: convertToViewportPoint already handles the coordinate system
          // transformation (including Y-axis flip), so we use results directly
          const [viewportX1, viewportY1] = viewport.convertToViewportPoint(pdfLeft, pdfBottom)
          const [viewportX2, viewportY2] = viewport.convertToViewportPoint(pdfRight, pdfTop)

          // The coordinates are now in canvas space (top-left origin, Y down)
          // Just need to normalize to ensure proper rect dimensions
          const canvasX = Math.min(viewportX1, viewportX2)
          const canvasY = Math.min(viewportY1, viewportY2)
          const canvasWidth = Math.abs(viewportX2 - viewportX1)
          const canvasHeight = Math.abs(viewportY2 - viewportY1)

          const rect: HighlightRect = {
            x: canvasX,
            y: canvasY,
            width: canvasWidth,
            height: canvasHeight,
            pageNumber,
          }

          // Only highlight if dimensions are valid
          if (rect.width > 0 && rect.height > 0) {
            newHighlights.push(rect)

            // Draw highlight with glow effect
            context.save()
            // Outer glow
            context.shadowColor = "rgba(251, 191, 36, 0.6)"
            context.shadowBlur = 8
            context.globalAlpha = 0.4
            context.fillStyle = "#fbbf24"
            context.fillRect(rect.x - 1, rect.y - 1, rect.width + 2, rect.height + 2)
            // Main highlight
            context.shadowBlur = 0
            context.globalAlpha = 0.3
            context.fillRect(rect.x, rect.y, rect.width, rect.height)
            // Border
            context.globalAlpha = 1
            context.strokeStyle = "#f59e0b"
            context.lineWidth = 1.5
            context.strokeRect(rect.x, rect.y, rect.width, rect.height)
            context.restore()
          }
        })
      })

      // Return the highlight rects found
      return newHighlights
    },
    [searchStrings],
  )

  // Render all pages when document, scale, rotation, or searchStrings changes
  useEffect(() => {
    if (!pdfDocument || totalPages === 0) return

    const renderAllPages = async () => {
      const highlightedPages = new Set<number>()
      const allHighlightPositions = new Map<number, HighlightRect[]>()
      
      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        const canvas = canvasRefs.current.get(pageNum)
        if (canvas) {
          const highlights = await renderPage(pageNum, canvas, scale, rotation)
          if (highlights && highlights.length > 0) {
            highlightedPages.add(pageNum)
            allHighlightPositions.set(pageNum, highlights)
          }
        }
      }
      
      setPagesWithHighlights(highlightedPages)
      setHighlightPositions(allHighlightPositions)
    }

    renderAllPages()
    onPageChange?.(currentPage)
  }, [pdfDocument, scale, rotation, renderPage, totalPages, onPageChange, searchStrings])

  // Update current page on scroll
  useEffect(() => {
    const scrollContainer = containerRef.current?.closest('[data-radix-scroll-area-viewport]')
    if (!scrollContainer) return

    const handleScroll = () => {
      const scrollTop = scrollContainer.scrollTop
      const containerHeight = scrollContainer.clientHeight
      const viewportCenter = scrollTop + containerHeight / 2

      let newCurrentPage = 1
      let minDistance = Infinity

      pageRefs.current.forEach((element, pageNum) => {
        const rect = element.getBoundingClientRect()
        const containerRect = scrollContainer.getBoundingClientRect()
        const elementTop = rect.top - containerRect.top + scrollTop
        const elementBottom = elementTop + rect.height
        const elementCenter = elementTop + rect.height / 2

        // Check if element is in viewport
        if (elementTop <= viewportCenter && elementBottom >= viewportCenter) {
          const distance = Math.abs(elementCenter - viewportCenter)
          if (distance < minDistance) {
            minDistance = distance
            newCurrentPage = pageNum
          }
        }
      })

      if (newCurrentPage !== currentPage && newCurrentPage > 0) {
        setCurrentPage(newCurrentPage)
      }
    }

    scrollContainer.addEventListener("scroll", handleScroll, { passive: true })
    return () => scrollContainer.removeEventListener("scroll", handleScroll)
  }, [currentPage])

  // Render thumbnails (only when PDF loads, not on page change)
  const thumbnailCanvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map())
  const thumbnailWrapperRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  const thumbnailIndicatorContainerRefs = useRef<Map<number, HTMLDivElement>>(new Map())
  
  useEffect(() => {
    if (!pdfDocument || !thumbnailContainerRef.current) return

    // Track if this effect instance is still valid (prevents duplicates from Strict Mode)
    let isCancelled = false

    const renderThumbnails = async () => {
      const container = thumbnailContainerRef.current
      if (!container) return

      console.log('[Thumbnails] Starting render, clearing refs')
      container.innerHTML = ""
      thumbnailCanvasRefs.current.clear()
      thumbnailWrapperRefs.current.clear()
      thumbnailIndicatorContainerRefs.current.clear()

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        // Check if effect was cancelled before each async operation
        if (isCancelled) return

        const page = await pdfDocument.getPage(pageNum)
        if (isCancelled) return

        const viewport = page.getViewport({ scale: 0.3 })

        // Create wrapper div for thumbnail + indicator
        const wrapper = document.createElement("div")
        wrapper.className = "relative mb-2"
        wrapper.dataset.pageNum = String(pageNum)

        const canvas = document.createElement("canvas")
        canvas.width = viewport.width
        canvas.height = viewport.height
        canvas.className = "cursor-pointer transition-all duration-200 rounded border-2 border-transparent hover:border-white/20"

        wrapper.onclick = () => {
          setCurrentPage(pageNum)
          scrollToPage(pageNum)
        }

        const context = canvas.getContext("2d")
        if (context) {
          await page.render({
            canvasContext: context,
            viewport: viewport,
            canvas: canvas,
          }).promise
        }

        // Final check before DOM manipulation
        if (isCancelled) return

        wrapper.appendChild(canvas)
        
        // Add container for highlight indicator circles (will be populated when highlights are found)
        const indicatorContainer = document.createElement("div")
        indicatorContainer.className = "absolute inset-0 pointer-events-none overflow-hidden rounded z-10"
        indicatorContainer.dataset.pageIndicator = String(pageNum)
        wrapper.appendChild(indicatorContainer)

        thumbnailCanvasRefs.current.set(pageNum, canvas)
        thumbnailWrapperRefs.current.set(pageNum, wrapper)
        thumbnailIndicatorContainerRefs.current.set(pageNum, indicatorContainer)
        console.log(`[Thumbnails] Set refs for page ${pageNum}, indicatorContainerRefs size: ${thumbnailIndicatorContainerRefs.current.size}`)
        container.appendChild(wrapper)
      }

      // Signal that thumbnails are ready
      console.log(`[Thumbnails] Loop complete, indicatorContainerRefs size: ${thumbnailIndicatorContainerRefs.current.size}, isCancelled: ${isCancelled}`)
      if (!isCancelled) {
        setThumbnailsRendered((prev) => prev + 1)
      }
    }

    renderThumbnails()

    // Cleanup: cancel if effect re-runs
    return () => {
      isCancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pdfDocument, totalPages])

  // Update thumbnail styling when current page changes (without re-rendering)
  useEffect(() => {
    thumbnailCanvasRefs.current.forEach((canvas, pageNum) => {
      if (pageNum === currentPage) {
        canvas.className = "cursor-pointer transition-all duration-200 rounded border-2 border-primary shadow-lg shadow-primary/50 scale-105"
      } else {
        canvas.className = "cursor-pointer transition-all duration-200 rounded border-2 border-transparent hover:border-white/20"
      }
    })
  }, [currentPage])

  // Update highlight indicators when highlightPositions or thumbnails change
  useEffect(() => {
    // Wait for thumbnails to be ready
    if (thumbnailsRendered === 0 || !thumbnailContainerRef.current) return

    console.log('[Indicators] Running update effect', {
      thumbnailsRendered,
      highlightPositionsSize: highlightPositions.size,
      indicatorContainerRefsSize: thumbnailIndicatorContainerRefs.current.size,
      scale
    })

    // Scale ratio: thumbnail scale (0.3) / main render scale
    const thumbnailScale = 0.3
    const scaleRatio = thumbnailScale / scale

    // Query DOM directly for indicator containers (more reliable than refs across async renders)
    highlightPositions.forEach((pageHighlights, pageNum) => {
      const indicatorContainer = thumbnailContainerRef.current?.querySelector(
        `[data-page-indicator="${pageNum}"]`
      ) as HTMLElement | null
      
      if (!indicatorContainer) {
        console.log(`[Indicators] No indicator container found for page ${pageNum}`)
        return
      }

      // Clear existing indicators
      indicatorContainer.innerHTML = ""

      if (!pageHighlights || pageHighlights.length === 0) return

      console.log(`[Indicators] Page ${pageNum} has ${pageHighlights.length} highlights`)

      // Get thumbnail canvas dimensions for bounds checking
      const canvas = thumbnailCanvasRefs.current.get(pageNum)
      if (!canvas) {
        console.log(`[Indicators] No canvas found for page ${pageNum}`)
        return
      }

      // Create indicator circles for each highlight
      pageHighlights.forEach((highlight, idx) => {
        const indicator = document.createElement("div")
        
        // Scale the highlight position to thumbnail size
        const scaledX = highlight.x * scaleRatio
        const scaledY = highlight.y * scaleRatio
        const scaledWidth = highlight.width * scaleRatio
        
        // Position the indicator at the center of the highlight
        const centerX = scaledX + scaledWidth / 2
        const indicatorSize = 6 // pixels
        
        // Ensure indicator stays within bounds
        const clampedX = Math.max(indicatorSize / 2, Math.min(centerX, canvas.width - indicatorSize / 2))
        const clampedY = Math.max(indicatorSize / 2, Math.min(scaledY + indicatorSize / 2, canvas.height - indicatorSize / 2))

        console.log(`[Indicators] Page ${pageNum}, highlight ${idx}:`, {
          original: { x: highlight.x, y: highlight.y },
          scaled: { x: scaledX, y: scaledY },
          clamped: { x: clampedX, y: clampedY },
          canvasSize: { w: canvas.width, h: canvas.height }
        })

        indicator.className = "absolute rounded-full bg-amber-400 shadow-lg shadow-amber-400/50 animate-pulse"
        indicator.style.cssText = `
          width: ${indicatorSize}px;
          height: ${indicatorSize}px;
          left: ${clampedX - indicatorSize / 2}px;
          top: ${clampedY - indicatorSize / 2}px;
          box-shadow: 0 0 8px 2px rgba(251, 191, 36, 0.6);
        `
        
        indicatorContainer.appendChild(indicator)
      })
    })
  }, [highlightPositions, scale, thumbnailsRendered])

  // Scroll to specific page in main view
  const scrollToPage = useCallback((pageNumber: number) => {
    const pageElement = pageRefs.current.get(pageNumber)
    if (pageElement) {
      // Find the scroll container (ScrollArea viewport)
      const scrollContainer = containerRef.current?.closest('[data-radix-scroll-area-viewport]') as HTMLElement
      if (scrollContainer) {
        const elementTop = pageElement.offsetTop
        scrollContainer.scrollTo({
          top: elementTop - 20, // Add small offset
          behavior: "smooth",
        })
      } else {
        pageElement.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    }
  }, [])

  // Scroll thumbnail into view in the sidebar
  const scrollThumbnailIntoView = useCallback((pageNumber: number) => {
    const wrapper = thumbnailWrapperRefs.current.get(pageNumber)
    if (wrapper) {
      // Find the thumbnail scroll container
      const scrollContainer = thumbnailContainerRef.current?.closest('[data-radix-scroll-area-viewport]') as HTMLElement
      if (scrollContainer) {
        const wrapperTop = wrapper.offsetTop
        const wrapperHeight = wrapper.offsetHeight
        const containerHeight = scrollContainer.clientHeight
        // Center the thumbnail in the view
        const scrollTop = wrapperTop - (containerHeight / 2) + (wrapperHeight / 2)
        scrollContainer.scrollTo({
          top: Math.max(0, scrollTop),
          behavior: "smooth",
        })
      } else {
        wrapper.scrollIntoView({ behavior: "smooth", block: "center" })
      }
    }
  }, [])

  // Scroll up
  const handleScrollUp = useCallback(() => {
    if (currentPage > 1) {
      const newPage = currentPage - 1
      setCurrentPage(newPage)
      scrollToPage(newPage)
    }
  }, [currentPage, scrollToPage])

  // Scroll down
  const handleScrollDown = useCallback(() => {
    if (currentPage < totalPages) {
      const newPage = currentPage + 1
      setCurrentPage(newPage)
      scrollToPage(newPage)
    }
  }, [currentPage, totalPages, scrollToPage])

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3))
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5))
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360)

  // Get sorted array of pages with highlights
  const sortedHighlightPages = Array.from(pagesWithHighlights).sort((a, b) => a - b)

  // Navigate to previous highlight
  const handlePrevHighlight = useCallback(() => {
    const prevPage = sortedHighlightPages.filter((p) => p < currentPage).pop()
    if (prevPage) {
      setCurrentPage(prevPage)
      scrollToPage(prevPage)
      scrollThumbnailIntoView(prevPage)
    }
  }, [currentPage, sortedHighlightPages, scrollToPage, scrollThumbnailIntoView])

  // Navigate to next highlight
  const handleNextHighlight = useCallback(() => {
    const nextPage = sortedHighlightPages.find((p) => p > currentPage)
    if (nextPage) {
      setCurrentPage(nextPage)
      scrollToPage(nextPage)
      scrollThumbnailIntoView(nextPage)
    }
  }, [currentPage, sortedHighlightPages, scrollToPage, scrollThumbnailIntoView])

  // Check if there are previous/next highlights
  const hasPrevHighlight = sortedHighlightPages.some((p) => p < currentPage)
  const hasNextHighlight = sortedHighlightPages.some((p) => p > currentPage)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      switch (e.key) {
        case "ArrowUp":
          e.preventDefault()
          handleScrollUp()
          break
        case "ArrowDown":
          e.preventDefault()
          handleScrollDown()
          break
        case "+":
        case "=":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleZoomIn()
          }
          break
        case "-":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleZoomOut()
          }
          break
        case "r":
        case "R":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            handleRotate()
          }
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [handleScrollUp, handleScrollDown])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full glass-card p-8">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full glass-card p-8">
        <div className="text-center">
          <p className="text-destructive mb-2">Error loading PDF</p>
          <p className="text-muted-foreground text-sm">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("flex h-full bg-background", className)}>
      {/* Main PDF Viewer */}
      <div className="flex-1 flex flex-col relative min-h-0 overflow-hidden">
        {/* Controls */}
        <div className="glass-card border-b border-white/10 p-3 flex items-center justify-between sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomOut}
              disabled={scale <= 0.5}
              className="border-white/20 hover:bg-white/10"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-sm text-foreground min-w-[60px] text-center">{Math.round(scale * 100)}%</span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleZoomIn}
              disabled={scale >= 3}
              className="border-white/20 hover:bg-white/10"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotate}
              className="border-white/20 hover:bg-white/10 ml-2"
            >
              <RotateCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              Page {currentPage} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrollUp}
              disabled={currentPage <= 1}
              className="border-white/20 hover:bg-white/10"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleScrollDown}
              disabled={currentPage >= totalPages}
              className="border-white/20 hover:bg-white/10"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* PDF Canvas Container */}
        <ScrollArea className="flex-1 min-h-0">
          <div ref={containerRef} className="flex flex-col items-center p-6" data-pdf-container>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <div
                key={pageNum}
                ref={(el) => {
                  if (el) pageRefs.current.set(pageNum, el)
                }}
                className={cn(
                  "mb-6 glass-card p-4 rounded-lg transition-all duration-300",
                  currentPage === pageNum && "ring-2 ring-primary/50 shadow-lg shadow-primary/30",
                )}
              >
                <canvas
                  ref={(el) => {
                    if (el) canvasRefs.current.set(pageNum, el)
                  }}
                  className="max-w-full h-auto shadow-xl"
                  style={{
                    filter: currentPage === pageNum ? "drop-shadow(0 0 15px rgba(168, 85, 247, 0.3))" : undefined,
                  }}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Thumbnail Sidebar */}
      <div className="w-48 border-l border-white/10 glass-card p-4 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-foreground">Pages</h3>
          {pagesWithHighlights.size > 0 && (
            <span className="text-xs text-amber-400/80 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              {pagesWithHighlights.size}
            </span>
          )}
        </div>
        
        {/* Highlight Navigation Arrows */}
        <div className="flex justify-center gap-2 mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevHighlight}
            disabled={!hasPrevHighlight}
            className={cn(
              "border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-300",
              !hasPrevHighlight && "opacity-0 pointer-events-none scale-90"
            )}
            title="Previous highlight"
          >
            <ChevronUp className="w-4 h-4 text-amber-400" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextHighlight}
            disabled={!hasNextHighlight}
            className={cn(
              "border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 transition-all duration-300",
              !hasNextHighlight && "opacity-0 pointer-events-none scale-90"
            )}
            title="Next highlight"
          >
            <ChevronDown className="w-4 h-4 text-amber-400" />
          </Button>
        </div>

        <ScrollArea className="flex-1 min-h-0">
          <div ref={thumbnailContainerRef} className="flex flex-col items-center relative">
            {/* Highlight indicators will be overlaid on thumbnails */}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}

