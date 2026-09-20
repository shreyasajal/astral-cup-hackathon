"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Skeleton } from "@/components/ui/skeleton"

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

interface JudgementCardsProps {
  judgements: Judgement[]
  isLoading?: boolean
  onSelectJudgement: (judgement: Judgement) => void
}

const JudgementCardSkeleton = () => (
  <Card className="glass-card p-4">
    <div className="space-y-3">
      <div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-3 w-1/3" />
      </div>
      <div className="flex items-center justify-between gap-2">
        <Skeleton className="h-3 w-1/2" />
        <Skeleton className="h-3 w-20" />
      </div>
      <div className="flex items-center justify-between">
        <Skeleton className="h-6 w-24 rounded-full" />
        <Skeleton className="h-6 w-28 rounded-full" />
      </div>
      <div className="space-y-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  </Card>
)

export default function JudgementCards({
  judgements,
  isLoading = false,
  onSelectJudgement,
}: JudgementCardsProps) {
  const getOutcomeColor = (outcome: string) => {
    const normalizedOutcome = outcome.toLowerCase()
    if (normalizedOutcome === "petitioner" || normalizedOutcome.includes("allowed")) {
      return "bg-green-500/20 text-green-300 border-green-500/30"
    }
    if (normalizedOutcome === "respondent" || normalizedOutcome.includes("dismissed")) {
      return "bg-red-500/20 text-red-300 border-red-500/30"
    }
    return "bg-slate-500/20 text-slate-300 border-slate-500/30"
  }

  return (
    <div>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">Related Supreme Court Precedents</h3>
        <p className="text-sm text-muted-foreground">
          {isLoading ? "Loading judgements..." : `${judgements.length} judgements found`}
        </p>
      </div>

      <ScrollArea className="h-[700px] pr-4">
        <div className="space-y-3">
          {isLoading ? (
            // Loading skeletons
            <>
              <JudgementCardSkeleton />
              <JudgementCardSkeleton />
              <JudgementCardSkeleton />
            </>
          ) : judgements.length === 0 ? (
            <Card className="glass-card p-8 text-center">
              <p className="text-muted-foreground">No judgements found for this act</p>
            </Card>
          ) : (
            judgements.map((judgement) => (
              <Card
                key={judgement.caseNumber}
                className="glass-card p-4 hover:bg-card/50 transition-all cursor-pointer"
              >
                <div className="space-y-3">
                  {/* Case Title */}
                  <div>
                    <h4 className="font-semibold text-foreground text-sm leading-tight">{judgement.caseTitle}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{judgement.caseNumber}</p>
                  </div>

                  {/* Judges and Date */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-muted-foreground truncate" title={judgement.judges.join(", ")}>
                      {judgement.judges.join(", ")}
                    </span>
                    <span className="text-muted-foreground/70 whitespace-nowrap">{judgement.dateOfJudgement}</span>
                  </div>

                  {/* Outcome Badge */}
                  <div className="flex items-center justify-between">
                    <Badge className={`${getOutcomeColor(judgement.outcome)} border`} variant="outline">
                      {judgement.outcome}
                    </Badge>
                    <Badge variant="outline" className="bg-muted/30 text-muted-foreground border-border">
                      {judgement.category}
                    </Badge>
                  </div>

                  {/* Summary Snippet */}
                  <p className="text-foreground/90 text-sm leading-relaxed line-clamp-3">{judgement.summarySnippet}</p>

                  {/* Call to Action */}
                  <Button
                    onClick={() => onSelectJudgement(judgement)}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-sm"
                  >
                    View Strategic Brief
                  </Button>
                </div>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
