// API service for Acts data - connects to Flask backend

// API base URL - can be configured via environment variable
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5034"

// Types
export interface Act {
  title: string
  year: string
  purpose: string
  category: string
  keySections: Array<{
    number: string
    title: string
    description: string
  }>
}

export interface Judgement {
  caseNumber: string
  caseTitle: string
  judges: string[]
  dateOfJudgement: string
  outcome: string
  category: string
  summarySnippet: string
  fullSummary: string
  winningArguments: string
  ratioDecidendi: string
  reliefGranted: string
  citedActs: string[]
  citedPrecedents: string[]
}

export interface ApiError {
  message: string
  status?: number
}

// Cache for all acts (to avoid repeated API calls for autocomplete)
let actsCache: string[] | null = null
let actsCacheTimestamp: number = 0
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes cache

/**
 * Custom error class for API errors
 */
export class ActsApiError extends Error {
  status?: number

  constructor(message: string, status?: number) {
    super(message)
    this.name = "ActsApiError"
    this.status = status
  }
}

/**
 * Generic fetch wrapper with error handling
 */
const apiFetch = async <T>(endpoint: string): Promise<T> => {
  const url = `${API_BASE_URL}${endpoint}`

  try {
    const response = await fetch(url)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new ActsApiError(
        errorData.error || `API request failed with status ${response.status}`,
        response.status
      )
    }

    return await response.json()
  } catch (error) {
    if (error instanceof ActsApiError) {
      throw error
    }

    // Network errors or other issues
    if (error instanceof TypeError && error.message.includes("fetch")) {
      throw new ActsApiError("Unable to connect to the server. Please ensure the backend is running.")
    }

    throw new ActsApiError(error instanceof Error ? error.message : "An unexpected error occurred")
  }
}

/**
 * Fetch all act titles (with caching for autocomplete)
 */
const fetchAllActTitles = async (): Promise<string[]> => {
  const now = Date.now()

  // Return cached data if valid
  if (actsCache && now - actsCacheTimestamp < CACHE_TTL_MS) {
    return actsCache
  }

  const acts = await apiFetch<string[]>("/api/acts")
  actsCache = acts
  actsCacheTimestamp = now

  return acts
}

/**
 * Search acts by query string (filters from cached list)
 */
export const searchActs = async (query: string): Promise<{ results: string[]; total: number }> => {
  const allActs = await fetchAllActTitles()

  const normalizedQuery = query.toLowerCase().trim()
  const filtered = allActs.filter((act) => act.toLowerCase().includes(normalizedQuery))

  return {
    results: filtered.slice(0, 10), // Limit to 10 results for autocomplete
    total: filtered.length,
  }
}

/**
 * Get all acts (returns cached list)
 */
export const getAllActs = async (): Promise<string[]> => {
  return fetchAllActTitles()
}

/**
 * Get detailed act information by title
 */
export const getActByTitle = async (title: string): Promise<Act | null> => {
  try {
    const encodedTitle = encodeURIComponent(title)
    const act = await apiFetch<Act>(`/api/act_details/${encodedTitle}`)
    return act
  } catch (error) {
    if (error instanceof ActsApiError && error.status === 404) {
      return null
    }
    throw error
  }
}

/**
 * Get judgements related to an act
 */
export const getJudgementsByActId = async (actTitle: string): Promise<Judgement[]> => {
  // Decode if already encoded, then re-encode properly
  const decodedTitle = decodeURIComponent(actTitle)
  const encodedTitle = encodeURIComponent(decodedTitle)

  const response = await apiFetch<{ judgements: Judgement[]; total_count: number }>(
    `/api/judgements_for_act/${encodedTitle}`
  )

  return response.judgements
}

/**
 * Check API health status
 */
export const checkApiHealth = async (): Promise<{
  status: string
  total_acts: number
  total_judgements: number
}> => {
  return apiFetch("/api/health")
}

/**
 * Clear the acts cache (useful for manual refresh)
 */
export const clearActsCache = (): void => {
  actsCache = null
  actsCacheTimestamp = 0
}
