// ==========================================
// RAG API Response Types
// ==========================================

// Case outcome structure
export interface CaseOutcome {
  judgement_outcome: string // e.g., "Partial", "Petitioner", "Allowed"
  judgement_type: string // e.g., "Interim Order", "Partly Allowed..."
  relief_granted: string
}

// Case dates
export interface CaseDates {
  date_of_judgement: string | null
  date_of_hearing: string | null
  date_of_filing: string | null
}

// Judicial bench information
export interface JudicialBench {
  presiding_judge: string
  bench_judges: string[]
  bench_strength: number
}

// Exact citations with line breaks
export interface ExactCitations {
  acts_cited: Record<string, string[]>
  precedents_cited: Record<string, string[]>
  constitutional_provisions: Record<string, string[]>
}

// Legal citations standardized
export interface LegalCitationsStandardized {
  acts_cited: string[]
  act_mappings: Record<string, string>
}

export interface RelevantCase {
  case_summary: string
  category: string
  winning_arguments: string
  outcome: CaseOutcome
  similarity_score: number
  file_name: string
  exact_citations_with_line_breaks?: ExactCitations
  dates?: CaseDates
  judicial_bench?: JudicialBench
  legal_citations_standardized?: LegalCitationsStandardized
}

// Act key section
export interface ActKeySection {
  section_number: string
  title: string
  description: string
}

// Amendments and related acts
export interface AmendmentsAndRelatedActs {
  amended_acts: string[]
  repealed_acts: string[]
  related_acts: string[]
}

export interface RelevantAct {
  act_title: string
  section_title: string
  description: string
  similarity_score: number
  file_name: string
  amendments_and_related_acts?: AmendmentsAndRelatedActs
  offences_and_penalties?: string
  key_sections?: ActKeySection[]
}

export interface Citation {
  citation_id: string // e.g., "1" (without brackets)
  file_name: string // PDF filename
  quoted_text: string
  is_verified?: boolean
}

// Opponent advocate profile from analysis
export interface OpponentAdvocateProfile {
  advocate_name: string
  total_cases: number
  wins: number
  losses: number
  unclear: number
  win_rate: string // e.g., "66.7%"
  primary_tactic_tag: string
  strategic_insight: string
  all_original_names: string[]
}

export interface AnalyzeResponse {
  category: string
  case_detail?: string // Description of the case
  opponent_advocate?: string | null
  opponent_advocate_profile?: OpponentAdvocateProfile | null
  relevant_cases: RelevantCase[]
  relevant_acts: RelevantAct[]
  report: string // Markdown report
  citations: Citation[]
}

export interface ChatHistoryItem {
  role: "user" | "model"
  content: string
}

export interface ChatRequest {
  message: string
  history: ChatHistoryItem[]
  context: AnalyzeResponse | null
}

export interface ChatResponse {
  response: string
}

// ==========================================
// Card Types for UI Display
// ==========================================

export type CardType = "relevant_case" | "relevant_act" | "citation" | "opponent_advocate"

export interface CardMetadata {
  similarity_score?: number
  category?: string
  outcome?: CaseOutcome
  winning_arguments?: string
  section_title?: string
  citation_id?: string
  quoted_text?: string
  file_name?: string
  // Case-specific metadata
  dates?: CaseDates
  judicial_bench?: JudicialBench
  exact_citations?: ExactCitations
  legal_citations_standardized?: LegalCitationsStandardized
  // Act-specific metadata
  amendments_and_related_acts?: AmendmentsAndRelatedActs
  offences_and_penalties?: string
  key_sections?: ActKeySection[]
  // Opponent advocate metadata
  advocate_profile?: OpponentAdvocateProfile
}

export interface Card {
  id: string
  type: CardType
  title: string
  description: string
  link: string // PDF link or empty
  metadata?: CardMetadata
}

// ==========================================
// Message and Conversation Types
// ==========================================

export interface Message {
  id: string
  type: "user" | "assistant"
  text: string
  report?: string // Markdown report for assistant messages
  cards?: Card[]
  citations?: Citation[] // Citations for clickable references in report
  timestamp: number
}

export interface ConversationState {
  messages: Message[]
  expandedCardId: string | null
  pinnedCardId: string | null
  navigationStack: NavigationState[]
  isLoading: boolean
  analysisContext: AnalyzeResponse | null // Store the analysis for follow-up chats
  chatHistory: ChatHistoryItem[] // For the /chat endpoint
}

export interface NavigationState {
  type: "home" | "chat" | "card_expanded"
  cardId?: string
  messageId?: string
}

export type ConversationAction =
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_EXPANDED_CARD"; payload: string | null }
  | { type: "SET_PINNED_CARD"; payload: string | null }
  | { type: "PUSH_NAVIGATION"; payload: NavigationState }
  | { type: "POP_NAVIGATION" }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ANALYSIS_CONTEXT"; payload: AnalyzeResponse | null }
  | { type: "ADD_CHAT_HISTORY"; payload: ChatHistoryItem }
  | { type: "CLEAR_CONVERSATION" }

// ==========================================
// API Response wrapper (legacy compat)
// ==========================================

export interface ApiResponse {
  responseChat: string
  report?: string
  cards: Card[]
  citations?: Citation[] // Citations for clickable references in report
  analysisContext?: AnalyzeResponse
}
