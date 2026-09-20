"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useState } from "react"

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

export default function ActDossier({ act }: { act: Act }) {
  const [expandedSection, setExpandedSection] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <Card className="glass-card p-6">
        {/* Header */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-foreground mb-2">{act.title}</h2>
          <p className="text-sm text-muted-foreground mb-4">{act.year}</p>
          <Badge className="bg-primary/20 text-primary border-primary/30" variant="outline">
            {act.category}
          </Badge>
        </div>

        {/* Purpose Section */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide">Purpose</h3>
          <p className="text-foreground/90 leading-relaxed text-sm">{act.purpose}</p>
        </div>
      </Card>

      {/* Key Sections */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wide px-2">Key Sections</h3>
        <ScrollArea className="h-[500px] pr-4">
          <div className="space-y-2">
            {act.keySections.map((section) => (
              <Card
                key={section.number}
                className="glass-card p-4 cursor-pointer hover:bg-card/50 transition-all"
                onClick={() => setExpandedSection(expandedSection === section.number ? null : section.number)}
              >
                <div className="flex items-start gap-3">
                  <span className="text-primary font-semibold text-sm whitespace-nowrap">{section.number}</span>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground text-sm">{section.title}</h4>
                    {expandedSection === section.number && (
                      <p className="text-muted-foreground text-xs mt-2 leading-relaxed">{section.description}</p>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    </div>
  )
}
