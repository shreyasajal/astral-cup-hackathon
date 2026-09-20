"use client"

import { useState, useMemo } from "react"
import { createPortal } from "react-dom"
import type { Card, CaseOutcome, ExactCitations } from "@/lib/types"
import { ExternalLink, X, FileText, Scale, BookOpen, Calendar, Users, Gavel, AlertTriangle, ListTree, Highlighter, ChevronLeft, UserCircle, Target, TrendingUp, Trophy, XCircle, HelpCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PDFViewerHighlighter } from "./pdf-viewer-highlighter"

interface CardComponentProps {
  card: Card
  isExpanded: boolean
  onExpand: () => void
  onClose: () => void
  onAskWithCard: () => void
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

/**
 * Extract all search strings from exact_citations for PDF highlighting
 * Returns flat array of all citation text values (not keys)
 * Multiline values are split into individual lines
 */
const extractSearchStrings = (exactCitations: ExactCitations | undefined): string[] => {
  if (!exactCitations) return []
  
  const searchStrings: string[] = []
  
  // Extract from acts_cited
  if (exactCitations.acts_cited) {
    Object.values(exactCitations.acts_cited).forEach((values) => {
      values.forEach(value => {
        searchStrings.push(...splitMultilineText(value))
      })
    })
  }
  
  // Extract from precedents_cited
  if (exactCitations.precedents_cited) {
    Object.values(exactCitations.precedents_cited).forEach((values) => {
      values.forEach(value => {
        searchStrings.push(...splitMultilineText(value))
      })
    })
  }
  
  // Extract from constitutional_provisions
  if (exactCitations.constitutional_provisions) {
    Object.values(exactCitations.constitutional_provisions).forEach((values) => {
      values.forEach(value => {
        searchStrings.push(...splitMultilineText(value))
      })
    })
  }
  
  // Filter out empty strings and duplicates
  return [...new Set(searchStrings.filter(s => s && s.trim()))]
}

const cardTypeConfig: Record<
  Card["type"],
  {
    bg: string
    border: string
    label: string
    icon: React.ReactNode
  }
> = {
  relevant_case: {
    bg: "from-primary/20 to-primary/10",
    border: "border-primary/30",
    label: "Relevant Case",
    icon: <Scale className="w-4 h-4" />,
  },
  relevant_act: {
    bg: "from-secondary/20 to-secondary/10",
    border: "border-secondary/30",
    label: "Relevant Act",
    icon: <BookOpen className="w-4 h-4" />,
  },
  citation: {
    bg: "from-accent/20 to-accent/10",
    border: "border-accent/30",
    label: "Citation",
    icon: <FileText className="w-4 h-4" />,
  },
  opponent_advocate: {
    bg: "from-rose-500/20 to-orange-500/10",
    border: "border-rose-500/30",
    label: "Opponent Advocate",
    icon: <UserCircle className="w-4 h-4" />,
  },
}

/**
 * Get outcome badge styling based on outcome text
 */
const getOutcomeStyle = (outcome: CaseOutcome | undefined): string => {
  if (!outcome) return "bg-white/10 text-muted-foreground"
  const outcomeText = outcome.judgement_outcome.toLowerCase()
  if (outcomeText.includes("allowed") || outcomeText.includes("petitioner")) {
    return "bg-green-500/20 text-green-300"
  }
  if (outcomeText.includes("dismissed") || outcomeText.includes("respondent")) {
    return "bg-red-500/20 text-red-300"
  }
  if (outcomeText.includes("partial")) {
    return "bg-yellow-500/20 text-yellow-300"
  }
  return "bg-white/10 text-muted-foreground"
}

// API base URL for document links (for citations)
const RAG_API_BASE_URL = import.meta.env.VITE_RAG_API_BASE_URL || "http://localhost:2222"

export function CardComponent({
  card,
  isExpanded,
  onExpand,
  onClose,
  onAskWithCard,
}: CardComponentProps) {
  const config = cardTypeConfig[card.type]
  const [showPdfViewer, setShowPdfViewer] = useState(false)
  
  // Memoize search strings extraction based on card type
  const searchStrings = useMemo(() => {
    // For cases: extract from exact_citations
    if (card.type === "relevant_case") {
      return extractSearchStrings(card.metadata?.exact_citations)
    }
    // For citations: use quoted_text (split multiline into separate searches)
    if (card.type === "citation" && card.metadata?.quoted_text) {
      return splitMultilineText(card.metadata.quoted_text)
    }
    return []
  }, [card.type, card.metadata?.exact_citations, card.metadata?.quoted_text])
  
  // Get PDF URL - use card.link for cases/acts, or build from file_name for citations
  const pdfUrl = useMemo(() => {
    if (card.link) return card.link
    if (card.type === "citation" && card.metadata?.file_name) {
      return `${RAG_API_BASE_URL}/documents/${encodeURIComponent(card.metadata.file_name)}`
    }
    return ""
  }, [card.link, card.type, card.metadata?.file_name])
  
  // Check if we have content to highlight
  const hasHighlights = searchStrings.length > 0 && pdfUrl

  if (isExpanded) {
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
            {/* Left Panel - Card Content (30% when PDF viewer is shown) */}
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
              <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium mb-3 bg-gradient-to-r ${config.bg} border ${config.border}`}>
                {config.icon}
                {config.label}
              </span>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {card.title}
              </h2>

              {/* Category & Outcome for cases */}
              {card.type === "relevant_case" && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {card.metadata?.category && (
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-muted-foreground">
                      {card.metadata.category}
                    </span>
                  )}
                  {card.metadata?.outcome && (
                    <span className={`px-2 py-1 rounded text-xs ${getOutcomeStyle(card.metadata.outcome)}`}>
                      {card.metadata.outcome.judgement_outcome}
                    </span>
                  )}
                  {card.metadata?.outcome?.judgement_type && (
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-300 rounded text-xs">
                      {card.metadata.outcome.judgement_type}
                    </span>
                  )}
                </div>
              )}

              {/* Date and Bench for cases */}
              {card.type === "relevant_case" && (
                <div className="flex flex-wrap gap-4 mt-3 text-xs text-muted-foreground">
                  {card.metadata?.dates?.date_of_judgement && (
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {card.metadata.dates.date_of_judgement}
                    </span>
                  )}
                  {card.metadata?.judicial_bench && (
                    <span className="inline-flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {card.metadata.judicial_bench.presiding_judge}
                      {card.metadata.judicial_bench.bench_strength > 1 && 
                        ` + ${card.metadata.judicial_bench.bench_strength - 1} more`}
                    </span>
                  )}
                </div>
              )}

              {/* Section title for acts */}
              {card.type === "relevant_act" && card.metadata?.section_title && (
                <p className="text-sm text-muted-foreground mt-2">
                  Section: {card.metadata.section_title}
                </p>
              )}

              {/* Citation ID for citations */}
              {card.type === "citation" && card.metadata?.citation_id && (
                <p className="text-sm text-accent mt-2">
                  {card.metadata.citation_id}
                </p>
              )}

              {/* Quick Stats for opponent advocate */}
              {card.type === "opponent_advocate" && card.metadata?.advocate_profile && (
                <div className="flex flex-wrap gap-3 mt-4">
                  {/* Win Rate Badge */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-500/20 to-emerald-500/10 rounded-lg border border-emerald-500/30">
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm font-semibold text-emerald-400">
                      {card.metadata.advocate_profile.win_rate} Win Rate
                    </span>
                  </div>
                  {/* Total Cases */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
                    <Scale className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-foreground/80">
                      {card.metadata.advocate_profile.total_cases} Cases Analyzed
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Description / Summary */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-3 text-foreground">
                {card.type === "citation" ? "Quoted Text" : card.type === "opponent_advocate" ? "Strategic Insight" : "Summary"}
              </h3>
              <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                {card.description}
              </p>
            </div>

            {/* Case Record Breakdown for opponent advocate */}
            {card.type === "opponent_advocate" && card.metadata?.advocate_profile && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-4 text-foreground inline-flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Case Record
                </h3>
                
                {/* Visual Win/Loss Bar */}
                <div className="mb-4">
                  <div className="flex h-4 rounded-full overflow-hidden bg-white/5">
                    {card.metadata.advocate_profile.wins > 0 && (
                      <div 
                        className="bg-gradient-to-r from-emerald-500 to-emerald-400 flex items-center justify-center"
                        style={{ width: `${(card.metadata.advocate_profile.wins / card.metadata.advocate_profile.total_cases) * 100}%` }}
                      >
                        {card.metadata.advocate_profile.wins >= 2 && (
                          <span className="text-[10px] font-bold text-white">{card.metadata.advocate_profile.wins}</span>
                        )}
                      </div>
                    )}
                    {card.metadata.advocate_profile.losses > 0 && (
                      <div 
                        className="bg-gradient-to-r from-red-500 to-red-400 flex items-center justify-center"
                        style={{ width: `${(card.metadata.advocate_profile.losses / card.metadata.advocate_profile.total_cases) * 100}%` }}
                      >
                        {card.metadata.advocate_profile.losses >= 2 && (
                          <span className="text-[10px] font-bold text-white">{card.metadata.advocate_profile.losses}</span>
                        )}
                      </div>
                    )}
                    {card.metadata.advocate_profile.unclear > 0 && (
                      <div 
                        className="bg-gradient-to-r from-amber-500 to-amber-400 flex items-center justify-center"
                        style={{ width: `${(card.metadata.advocate_profile.unclear / card.metadata.advocate_profile.total_cases) * 100}%` }}
                      >
                        {card.metadata.advocate_profile.unclear >= 2 && (
                          <span className="text-[10px] font-bold text-white">{card.metadata.advocate_profile.unclear}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <Trophy className="w-4 h-4 text-emerald-400" />
                    </div>
                    <p className="text-2xl font-bold text-emerald-400">{card.metadata.advocate_profile.wins}</p>
                    <p className="text-xs text-emerald-400/70">Wins</p>
                  </div>
                  <div className="p-3 bg-red-500/10 rounded-lg border border-red-500/20 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <XCircle className="w-4 h-4 text-red-400" />
                    </div>
                    <p className="text-2xl font-bold text-red-400">{card.metadata.advocate_profile.losses}</p>
                    <p className="text-xs text-red-400/70">Losses</p>
                  </div>
                  <div className="p-3 bg-amber-500/10 rounded-lg border border-amber-500/20 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                      <HelpCircle className="w-4 h-4 text-amber-400" />
                    </div>
                    <p className="text-2xl font-bold text-amber-400">{card.metadata.advocate_profile.unclear}</p>
                    <p className="text-xs text-amber-400/70">Unclear</p>
                  </div>
                </div>
              </div>
            )}

            {/* Primary Tactic Tag for opponent advocate */}
            {card.type === "opponent_advocate" && card.metadata?.advocate_profile?.primary_tactic_tag && (
              <div className="mb-6 p-4 bg-gradient-to-r from-rose-500/10 to-orange-500/10 rounded-lg border border-rose-500/20">
                <h3 className="text-sm font-semibold mb-2 text-foreground inline-flex items-center gap-2">
                  <Gavel className="w-4 h-4 text-rose-400" />
                  Primary Tactic
                </h3>
                <p className="text-lg font-medium text-rose-300">
                  {card.metadata.advocate_profile.primary_tactic_tag}
                </p>
              </div>
            )}

            {/* Alternative Names for opponent advocate */}
            {/* {card.type === "opponent_advocate" && 
              card.metadata?.advocate_profile?.all_original_names && 
              card.metadata.advocate_profile.all_original_names.length > 1 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Also Known As</h3>
                <div className="flex flex-wrap gap-2">
                  {card.metadata.advocate_profile.all_original_names.map((name, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/5 rounded text-xs text-foreground/70">
                      {name}
                    </span>
                  ))}
                </div>
              </div>
            )} */}

            {/* Relief Granted for cases */}
            {card.type === "relevant_case" && card.metadata?.outcome?.relief_granted && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground inline-flex items-center gap-2">
                  <Gavel className="w-5 h-5" />
                  Relief Granted
                </h3>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm">
                  {card.metadata.outcome.relief_granted}
                </p>
              </div>
            )}

            {/* Winning Arguments for cases */}
            {card.type === "relevant_case" && card.metadata?.winning_arguments && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground">
                  Winning Arguments
                </h3>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {card.metadata.winning_arguments}
                </p>
              </div>
            )}

            {/* Judicial Bench Details */}
            {card.type === "relevant_case" && card.metadata?.judicial_bench && (
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <h3 className="text-sm font-semibold mb-2 text-foreground inline-flex items-center gap-2">
                  <Users className="w-4 h-4" />
                  Judicial Bench ({card.metadata.judicial_bench.bench_strength} judges)
                </h3>
                <div className="flex flex-wrap gap-2">
                  {card.metadata.judicial_bench.bench_judges.map((judge, idx) => (
                    <span key={idx} className="px-2 py-1 bg-white/10 rounded text-xs text-foreground/80">
                      {idx === 0 && "Hon. "}
                      {judge}
                      {idx === 0 && " (Presiding)"}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Acts Cited for cases */}
            {card.type === "relevant_case" && card.metadata?.legal_citations_standardized?.acts_cited && 
              card.metadata.legal_citations_standardized.acts_cited.length > 0 && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2 text-foreground">Acts Cited</h3>
                <div className="flex flex-wrap gap-2">
                  {[...new Set(card.metadata.legal_citations_standardized.acts_cited)].map((act, idx) => (
                    <span key={idx} className="px-2 py-1 bg-secondary/20 rounded text-xs text-secondary-foreground">
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Precedents Cited for cases */}
            {card.type === "relevant_case" && card.metadata?.exact_citations?.precedents_cited && (
              <div className="mb-6">
                <h3 className="text-sm font-semibold mb-2 text-foreground">Precedents Cited</h3>
                <div className="flex flex-wrap gap-2">
                  {Object.keys(card.metadata.exact_citations.precedents_cited).slice(0, 5).map((precedent, idx) => (
                    <span key={idx} className="px-2 py-1 bg-primary/20 rounded text-xs text-primary-foreground">
                      {precedent.length > 50 ? precedent.substring(0, 50) + "..." : precedent}
                    </span>
                  ))}
                  {Object.keys(card.metadata.exact_citations.precedents_cited).length > 5 && (
                    <span className="px-2 py-1 bg-white/10 rounded text-xs text-muted-foreground">
                      +{Object.keys(card.metadata.exact_citations.precedents_cited).length - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Key Sections for acts */}
            {card.type === "relevant_act" && card.metadata?.key_sections && 
              card.metadata.key_sections.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground inline-flex items-center gap-2">
                  <ListTree className="w-5 h-5" />
                  Key Sections
                </h3>
                <div className="space-y-3 max-h-60 overflow-y-auto">
                  {card.metadata.key_sections.slice(0, 5).map((section, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10">
                      <div className="flex items-start gap-2">
                        <span className="px-2 py-0.5 bg-accent/20 text-accent rounded text-xs font-mono shrink-0">
                          §{section.section_number}
                        </span>
                        <div>
                          <p className="text-sm font-medium text-foreground">{section.title}</p>
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                            {section.description}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  {card.metadata.key_sections.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      +{card.metadata.key_sections.length - 5} more sections
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Offences and Penalties for acts */}
            {card.type === "relevant_act" && card.metadata?.offences_and_penalties && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold mb-3 text-foreground inline-flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-400" />
                  Offences & Penalties
                </h3>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap text-sm">
                  {card.metadata.offences_and_penalties}
                </p>
              </div>
            )}

            {/* Amendments and Related Acts */}
            {card.type === "relevant_act" && card.metadata?.amendments_and_related_acts && (
              <div className="mb-6">
                {card.metadata.amendments_and_related_acts.related_acts.length > 0 && (
                  <div className="mb-3">
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Related Acts</h4>
                    <div className="flex flex-wrap gap-2">
                      {card.metadata.amendments_and_related_acts.related_acts.slice(0, 5).map((act, idx) => (
                        <span key={idx} className="px-2 py-1 bg-secondary/20 rounded text-xs text-secondary-foreground">
                          {act}
                        </span>
                      ))}
                      {card.metadata.amendments_and_related_acts.related_acts.length > 5 && (
                        <span className="px-2 py-1 bg-white/10 rounded text-xs text-muted-foreground">
                          +{card.metadata.amendments_and_related_acts.related_acts.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>
                )}
                {card.metadata.amendments_and_related_acts.repealed_acts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold mb-2 text-foreground">Repealed Acts</h4>
                    <div className="flex flex-wrap gap-2">
                      {card.metadata.amendments_and_related_acts.repealed_acts.map((act, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-500/20 text-red-300 rounded text-xs line-through">
                          {act}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Similarity Score */}
            {card.metadata?.similarity_score !== undefined && (
              <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
                <p className="text-sm text-muted-foreground mb-1">
                  How Similar is this?
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-white/10 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-primary to-secondary h-full rounded-full"
                      style={{
                        width: `${card.metadata.similarity_score * 100}%`,
                      }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">
                    {(card.metadata.similarity_score * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            )}

            {/* Link to PDF */}
            {pdfUrl && (
              <div className="flex flex-col gap-2 mb-6">
                <a
                  href={pdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-accent hover:text-accent/80 transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  <span>View Source Document (PDF)</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
                
                {/* Show Source Highlights button - for cases with citations or citation cards with quoted_text */}
                {hasHighlights && !showPdfViewer && (
                  <Button
                    onClick={() => setShowPdfViewer(true)}
                    variant="outline"
                    size="sm"
                    className="w-fit border-amber-500/30 hover:bg-amber-500/10 hover:border-amber-500/50 text-amber-400"
                  >
                    <Highlighter className="w-4 h-4 mr-2" />
                    {card.type === "citation" 
                      ? "Show Quote in Document" 
                      : `Show Source Highlights (${searchStrings.length})`}
                  </Button>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-6 border-t border-border dark:border-white/10">
              <Button
                onClick={onAskWithCard}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Ask about this
              </Button>
              <Button
                onClick={onClose}
                variant="outline"
                className="border-border dark:border-white/20 hover:bg-muted dark:hover:bg-white/10 bg-transparent"
              >
                Close
              </Button>
            </div>
            
            </div>{/* End Left Panel */}
            
            {/* Right Panel - PDF Viewer with Highlights (70% of space) */}
            {showPdfViewer && pdfUrl && (
              <div className="w-[70%] h-full flex flex-col bg-muted/30 dark:bg-black/20 rounded-r-2xl overflow-hidden">
                <div className="p-4 border-b border-border dark:border-white/10 flex items-center justify-between shrink-0 bg-muted/50 dark:bg-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/20 rounded-lg">
                      <Highlighter className="w-4 h-4 text-amber-400" />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-foreground">Source Document</span>
                      <span className="text-xs text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded ml-2">
                        {searchStrings.length} {card.type === "citation" ? "quote" : "citations"} highlighted
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
                    pdfUrl={pdfUrl}
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

  // Collapsed card view
  return (
    <button
      onClick={onExpand}
      className={`glass-card glass-card-hover p-4 bg-gradient-to-br ${config.bg} ${config.border} text-left w-full transition-all duration-300 hover:shadow-lg group`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/10 rounded text-xs font-medium text-accent mb-2 group-hover:bg-white/20 transition-colors">
            {config.icon}
            {config.label}
          </span>
          <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-accent transition-colors">
            {card.title}
          </h3>
          <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
            {card.description}
          </p>

          {/* Metadata preview */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            {card.metadata?.similarity_score !== undefined && (
              <span className="text-xs text-muted-foreground">
                {(card.metadata.similarity_score * 100).toFixed(0)}% match
              </span>
            )}
            {card.type === "relevant_case" && card.metadata?.outcome && (
              <span className={`px-1.5 py-0.5 rounded text-xs ${getOutcomeStyle(card.metadata.outcome)}`}>
                {card.metadata.outcome.judgement_outcome}
              </span>
            )}
            {card.type === "relevant_case" && card.metadata?.dates?.date_of_judgement && (
              <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {card.metadata.dates.date_of_judgement}
              </span>
            )}
            {card.type === "relevant_act" && card.metadata?.key_sections && (
              <span className="text-xs text-muted-foreground">
                {card.metadata.key_sections.length} key sections
              </span>
            )}
            {card.type === "citation" && card.metadata?.citation_id && (
              <span className="text-xs text-accent">
                {card.metadata.citation_id}
              </span>
            )}
            {card.type === "opponent_advocate" && card.metadata?.advocate_profile && (
              <>
                <span className="px-1.5 py-0.5 rounded text-xs bg-emerald-500/20 text-emerald-400 inline-flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {card.metadata.advocate_profile.win_rate}
                </span>
                <span className="text-xs text-muted-foreground">
                  {card.metadata.advocate_profile.total_cases} cases
                </span>
                {card.metadata.advocate_profile.primary_tactic_tag && (
                  <span className="px-1.5 py-0.5 rounded text-xs bg-rose-500/20 text-rose-300 truncate max-w-[150px]">
                    {card.metadata.advocate_profile.primary_tactic_tag}
                  </span>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </button>
  )
}
