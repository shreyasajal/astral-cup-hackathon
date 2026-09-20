"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import ActDossier from "@/components/act-dossier"
import JudgementCards from "@/components/judgement-cards"
import StrategicBriefModal from "@/components/strategic-brief-modal"

const fetcher = (url: string) => fetch(url).then((r) => r.json())

interface Act {
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

interface Judgement {
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

export default function Home() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAct, setSelectedAct] = useState<Act | null>(null)
  const [selectedJudgement, setSelectedJudgement] = useState<Judgement | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])

  // Fetch acts for autocomplete
  const { data: actsResponse } = useSWR(
    searchQuery ? "/api/search/acts?q=" + encodeURIComponent(searchQuery) : null,
    fetcher,
  )

  // Fetch judgements when act is selected
  const { data: judgementData } = useSWR(
    selectedAct ? `/api/acts/${encodeURIComponent(selectedAct.title)}/judgements` : null,
    fetcher,
  )

  useEffect(() => {
    if (actsResponse?.results) {
      setSuggestions(actsResponse.results)
    }
  }, [actsResponse])

  const handleSelectAct = (actTitle: string) => {
    fetch(`/api/acts?search=${encodeURIComponent(actTitle)}`)
      .then((r) => r.json())
      .then((data) => {
        // Find the matching act from full acts list
        const foundAct = data.find((act: Act) => act.title.toLowerCase() === actTitle.toLowerCase())
        if (foundAct) {
          setSelectedAct(foundAct)
          setSearchQuery("")
          setSuggestions([])
        }
      })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-foreground">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <h1 className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-magenta-400">
            Legal AI
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12">
        {!selectedAct ? (
          // Welcome/Search Screen
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center">
              <h2 className="text-5xl font-bold mb-4">Research Legal Acts & Precedents</h2>
              <p className="text-slate-400 text-lg">
                Search for legal acts and discover related Supreme Court judgements
              </p>
            </div>

            <div className="w-full max-w-2xl relative">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search for a Legal Act by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-14 bg-slate-800/50 border-slate-700 text-base"
                />
              </div>

              {/* Autocomplete Suggestions */}
              {suggestions.length > 0 && searchQuery && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 border border-slate-700 rounded-lg shadow-xl z-50">
                  {suggestions.slice(0, 5).map((act) => (
                    <button
                      key={act}
                      onClick={() => handleSelectAct(act)}
                      className="w-full text-left px-4 py-3 hover:bg-slate-700 first:rounded-t-lg last:rounded-b-lg transition-colors text-slate-100"
                    >
                      {act}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          // Two-Column Dashboard
          <div className="grid grid-cols-3 gap-6">
            {/* Left Column - Act Dossier (30%) */}
            <div className="col-span-1">
              <Button onClick={() => setSelectedAct(null)} variant="outline" className="mb-4 w-full">
                ← Back to Search
              </Button>
              <ActDossier act={selectedAct} />
            </div>

            {/* Right Column - Judgement Cards (70%) */}
            <div className="col-span-2">
              <JudgementCards
                judgements={judgementData?.judgements || []}
                onSelectJudgement={(judgement) => {
                  setSelectedJudgement(judgement)
                  setIsModalOpen(true)
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Strategic Brief Modal */}
      {selectedJudgement && (
        <StrategicBriefModal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false)
            setSelectedJudgement(null)
          }}
          judgement={selectedJudgement}
        />
      )}
    </div>
  )
}
