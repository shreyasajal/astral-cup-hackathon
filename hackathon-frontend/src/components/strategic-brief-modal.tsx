"use client"

import { createPortal } from "react-dom"
import { X, Scale } from "lucide-react"
import { Badge } from "@/components/ui/badge"

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

export default function StrategicBriefModal({
  isOpen,
  onClose,
  judgement,
}: {
  isOpen: boolean
  onClose: () => void
  judgement: Judgement
}) {
  const getOutcomeColor = (outcome: string) => {
    if (outcome === "Petitioner") return "bg-green-500/20 text-green-300 border-green-500/30"
    if (outcome === "Respondent") return "bg-red-500/20 text-red-300 border-red-500/30"
    return "bg-slate-500/20 text-slate-300 border-slate-500/30"
  }

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop - more opaque */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="
          relative z-10 
          w-[90vw] max-w-3xl
          max-h-[90vh]
          transition-all duration-300 ease-out
          animate-in fade-in zoom-in-95
        "
      >
        {/* Modal Content */}
        <div 
          className="
            max-h-[90vh]
            bg-background/95 backdrop-blur-xl
            border border-white/10
            rounded-2xl
            shadow-2xl shadow-black/50
            overflow-y-auto
          "
        >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2.5 bg-white/5 hover:bg-white/10 rounded-full transition-colors z-20 border border-white/10"
            title="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Content */}
          <div className="p-8">
            {/* Header */}
            <div className="mb-6 pr-12">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30 rounded-full text-xs font-medium text-primary mb-3">
                <Scale className="w-4 h-4" />
                Strategic Brief
              </span>
              <h2 className="text-2xl font-bold text-foreground">{judgement.caseTitle}</h2>
            </div>

            <div className="space-y-6">
              {/* Case Details */}
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Case Number:</span> {judgement.caseNumber}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Date:</span> {judgement.dateOfJudgement}
                </p>
                <p className="text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">Judges:</span> {judgement.judges.join(", ")}
                </p>
                <div className="flex items-center gap-2 pt-2">
                  <Badge className={`${getOutcomeColor(judgement.outcome)} border`} variant="outline">
                    {judgement.outcome}
                  </Badge>
                  <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border">
                    {judgement.category}
                  </Badge>
                </div>
              </div>

              <div className="border-t border-white/10" />

              {/* Case Summary */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Case Summary</h3>
                <p className="text-foreground/90 text-sm leading-relaxed">{judgement.fullSummary}</p>
              </div>

              {/* Winning Arguments */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Key Arguments That Prevailed</h3>
                <p className="text-foreground/90 text-sm leading-relaxed">{judgement.winningArguments}</p>
              </div>

              {/* Ratio Decidendi */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Core Legal Principle (Ratio Decidendi)</h3>
                <p className="text-foreground/90 text-sm leading-relaxed">{judgement.ratioDecidendi}</p>
              </div>

              {/* Relief Granted */}
              <div>
                <h3 className="font-semibold text-foreground mb-2">Relief Granted</h3>
                <p className="text-foreground/90 text-sm leading-relaxed">{judgement.reliefGranted}</p>
              </div>

              {/* Cited Acts */}
              {judgement.citedActs.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Acts Cited</h3>
                  <div className="flex flex-wrap gap-2">
                    {judgement.citedActs.map((act, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-primary/10 text-primary border-primary/30 text-xs"
                      >
                        {act}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Cited Precedents */}
              {judgement.citedPrecedents.length > 0 && (
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Precedents Cited</h3>
                  <div className="flex flex-wrap gap-2">
                    {judgement.citedPrecedents.map((precedent, index) => (
                      <Badge
                        key={index}
                        variant="outline"
                        className="bg-secondary/10 text-secondary border-secondary/30 text-xs"
                      >
                        {precedent}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
