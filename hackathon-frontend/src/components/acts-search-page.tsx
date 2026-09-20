"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Spinner } from "@/components/ui/spinner"
import ActDossier from "@/components/act-dossier"
import JudgementCards from "@/components/judgement-cards"
import StrategicBriefModal from "@/components/strategic-brief-modal"
import {
  searchActs,
  getActByTitle,
  getJudgementsByActId,
  ActsApiError,
  type Act,
  type Judgement,
} from "@/lib/acts-api"

interface ActsSearchPageProps {
  onNavigateToChat?: () => void
}

export function ActsSearchPage({ onNavigateToChat: _onNavigateToChat }: ActsSearchPageProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedAct, setSelectedAct] = useState<Act | null>(null)
  const [selectedJudgement, setSelectedJudgement] = useState<Judgement | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const [isLoadingAct, setIsLoadingAct] = useState(false)
  const [isLoadingJudgements, setIsLoadingJudgements] = useState(false)
  const [judgements, setJudgements] = useState<Judgement[]>([])
  const [error, setError] = useState<string | null>(null)

  // Clear error after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  // Fetch acts for autocomplete
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSuggestions([])
      return
    }

    setIsLoadingSuggestions(true)
    const timeoutId = setTimeout(async () => {
      try {
        const data = await searchActs(searchQuery)
        if (data?.results) {
          setSuggestions(data.results)
        }
        setError(null)
      } catch (err) {
        console.error("Error fetching acts:", err)
        setSuggestions([])
        if (err instanceof ActsApiError) {
          setError(err.message)
        } else {
          setError("Failed to search acts. Please try again.")
        }
      } finally {
        setIsLoadingSuggestions(false)
      }
    }, 300) // Debounce

    return () => {
      clearTimeout(timeoutId)
      setIsLoadingSuggestions(false)
    }
  }, [searchQuery])

  // Fetch judgements when act is selected
  useEffect(() => {
    if (!selectedAct) {
      setJudgements([])
      return
    }

    const fetchJudgements = async () => {
      setIsLoadingJudgements(true)
      try {
        const data = await getJudgementsByActId(selectedAct.title)
        setJudgements(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error("Error fetching judgements:", err)
        setJudgements([])
        if (err instanceof ActsApiError) {
          setError(err.message)
        } else {
          setError("Failed to fetch judgements. Please try again.")
        }
      } finally {
        setIsLoadingJudgements(false)
      }
    }

    fetchJudgements()
  }, [selectedAct])

  const handleSelectAct = async (actTitle: string) => {
    setIsLoadingAct(true)
    setError(null)
    try {
      const foundAct = await getActByTitle(actTitle)

      if (foundAct) {
        setSelectedAct(foundAct)
        setSearchQuery("")
        setSuggestions([])
      } else {
        setError(`Act "${actTitle}" not found. Please try a different search.`)
      }
    } catch (err) {
      console.error("Error fetching act details:", err)
      if (err instanceof ActsApiError) {
        setError(err.message)
      } else {
        setError("Failed to fetch act details. Please try again.")
      }
    } finally {
      setIsLoadingAct(false)
    }
  }

  const handleBackToSearch = () => {
    setSelectedAct(null)
    setSelectedJudgement(null)
    setIsModalOpen(false)
    setJudgements([])
    setError(null)
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Error Alert */}
      {error && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-md px-4">
          <Alert variant="destructive" className="glass-card border-red-500/50">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {!selectedAct ? (
          // Welcome/Search Screen
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
            <div className="text-center">
              <h2 className="text-5xl font-bold mb-4 text-foreground">Research Legal Acts & Precedents</h2>
              <p className="text-muted-foreground text-lg">
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
                  className="w-full h-14 bg-input/50 border-white/10 text-base"
                  disabled={isLoadingAct}
                />
                {(isLoadingSuggestions || isLoadingAct) && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <Spinner className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Autocomplete Suggestions */}
              {suggestions.length > 0 && searchQuery && !isLoadingAct && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-card border border-white/10 rounded-lg shadow-xl z-50">
                  {suggestions.slice(0, 5).map((act) => (
                    <button
                      key={act}
                      onClick={() => handleSelectAct(act)}
                      className="w-full text-left px-4 py-3 hover:bg-white/10 first:rounded-t-lg last:rounded-b-lg transition-colors text-foreground"
                    >
                      {act}
                    </button>
                  ))}
                </div>
              )}

              {/* No results message */}
              {searchQuery.trim() && !isLoadingSuggestions && suggestions.length === 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 glass-card border border-white/10 rounded-lg shadow-xl z-50 p-4 text-center text-muted-foreground">
                  No acts found matching "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        ) : (
          // Two-Column Dashboard
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Column - Act Dossier (30%) */}
            <div className="lg:col-span-1">
              <Button onClick={handleBackToSearch} variant="outline" className="mb-4 w-full">
                ← Back to Search
              </Button>
              <ActDossier act={selectedAct} />
            </div>

            {/* Right Column - Judgement Cards (70%) */}
            <div className="lg:col-span-2">
              <JudgementCards
                judgements={judgements}
                isLoading={isLoadingJudgements}
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
