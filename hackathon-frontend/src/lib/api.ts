// RAG API service - connects to FastAPI backend

import type {
  ApiResponse,
  Card,
  AnalyzeResponse,
  ChatRequest,
  ChatResponse,
  ChatHistoryItem,
  RelevantCase,
  RelevantAct,
  OpponentAdvocateProfile,
} from "./types"

// API base URL - configurable via environment variable
const RAG_API_BASE_URL = import.meta.env.VITE_RAG_API_BASE_URL || "http://localhost:2222"

/**
 * Custom error class for RAG API errors
 */
export class RagApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "RagApiError"
    this.status = status
  }
}

/**
 * Generic fetch wrapper with error handling
 */
const apiFetch = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> => {
  const url = `${RAG_API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new RagApiError(
        errorData.detail || errorData.error || `API request failed with status ${response.status}`,
        response.status
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof RagApiError) {
      throw error
    }

    // Network errors or other issues
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new RagApiError(
        `Unable to connect to the RAG server at ${RAG_API_BASE_URL}. Please ensure the backend is running.`
      )
    }

    throw new RagApiError(
      error instanceof Error ? error.message : "An unexpected error occurred"
    )
  }
}

/**
 * Format file name to readable title
 * e.g., "A_John_Kennedy_vs_The_State_Of_Tamil_Nadu_on_24_March_2025_1.PDF" -> "A. John Kennedy vs The State Of Tamil Nadu (24 March 2025)"
 */
const formatCaseTitle = (fileName: string): string => {
  if (!fileName) return "Legal Case"
  
  // Remove file extension
  let name = fileName.replace(/\.[^/.]+$/, "")
  
  // Replace underscores with spaces
  name = name.replace(/_/g, " ")
  
  // Remove trailing numbers like "_1" that were part of file naming
  name = name.replace(/\s+\d+$/, "")
  
  // Try to format date pattern "on DD Month YYYY" to "(DD Month YYYY)"
  const dateMatch = name.match(/\s+on\s+(\d+\s+\w+\s+\d{4})$/i)
  if (dateMatch) {
    name = name.replace(/\s+on\s+\d+\s+\w+\s+\d{4}$/i, ` (${dateMatch[1]})`)
  }
  
  return name
}

/**
 * Convert relevant cases to Card format for UI display
 */
const casesToCards = (cases: RelevantCase[]): Card[] => {
  return cases.map((caseItem, index) => ({
    id: `case-${Date.now()}-${index}`,
    type: "relevant_case" as const,
    title: formatCaseTitle(caseItem.file_name),
    description: caseItem.case_summary,
    link: caseItem.file_name ? `${RAG_API_BASE_URL}/documents/${encodeURIComponent(caseItem.file_name)}` : "",
    metadata: {
      similarity_score: caseItem.similarity_score,
      category: caseItem.category,
      outcome: caseItem.outcome,
      winning_arguments: caseItem.winning_arguments,
      file_name: caseItem.file_name,
      dates: caseItem.dates,
      judicial_bench: caseItem.judicial_bench,
      exact_citations: caseItem.exact_citations_with_line_breaks,
      legal_citations_standardized: caseItem.legal_citations_standardized,
    },
  }))
}

/**
 * Convert relevant acts to Card format for UI display
 */
const actsToCards = (acts: RelevantAct[]): Card[] => {
  return acts.map((act, index) => ({
    id: `act-${Date.now()}-${index}`,
    type: "relevant_act" as const,
    title: act.act_title,
    description: act.description,
    link: act.file_name ? `${RAG_API_BASE_URL}/documents/${encodeURIComponent(act.file_name)}` : "",
    metadata: {
      similarity_score: act.similarity_score,
      section_title: act.section_title,
      file_name: act.file_name,
      amendments_and_related_acts: act.amendments_and_related_acts,
      offences_and_penalties: act.offences_and_penalties,
      key_sections: act.key_sections,
    },
  }))
}

/**
 * Convert opponent advocate profile to Card format for UI display
 */
const advocateProfileToCard = (profile: OpponentAdvocateProfile): Card => {
  return {
    id: `advocate-${Date.now()}`,
    type: "opponent_advocate" as const,
    title: profile.advocate_name,
    description: profile.strategic_insight,
    link: "",
    metadata: {
      advocate_profile: profile,
    },
  }
}


/**
 * Analyze a legal description/question
 * Calls POST /analyze endpoint
 */
export const analyzeLegalQuestion = async (
  description: string
): Promise<ApiResponse> => {
  const response = await apiFetch<AnalyzeResponse>("/analyze", {
    method: "POST",
    body: JSON.stringify({ description }),
  })

  // Convert response to card format (cases, acts, and advocate profile - not citations)
  const caseCards = casesToCards(response.relevant_cases)
  const actCards = actsToCards(response.relevant_acts)

  // Add opponent advocate card if profile exists
  const advocateCard = response.opponent_advocate_profile 
    ? advocateProfileToCard(response.opponent_advocate_profile) 
    : null

  // Combine all cards: advocate first (if present), then cases, then acts
  const allCards: Card[] = [
    ...(advocateCard ? [advocateCard] : []),
    ...caseCards, 
    ...actCards,
  ]

  return {
    responseChat: `Analysis complete. Category: **${response.category}**`,
    report: response.report,
    cards: allCards,
    citations: response.citations, // Return citations separately for in-text clickable references
    analysisContext: response,
  }
}

/**
 * Chat with the assistant about the analysis
 * Calls POST /chat endpoint
 */
export const chatWithAssistant = async (
  message: string,
  history: ChatHistoryItem[],
  context: AnalyzeResponse | null
): Promise<ChatResponse> => {
  const request: ChatRequest = {
    message,
    history,
    context,
  }

  return apiFetch<ChatResponse>("/chat", {
    method: "POST",
    body: JSON.stringify(request),
  })
}

/**
 * Get document PDF URL
 */
export const getDocumentUrl = (filename: string): string => {
  return `${RAG_API_BASE_URL}/documents/${encodeURIComponent(filename)}`
}

/**
 * Legacy function name for compatibility
 * For initial questions, use analyze; for follow-ups, use chat
 */
export const askLegalQuestion = analyzeLegalQuestion
