"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Download } from "lucide-react";
import { Issue, buildPdfUrl } from "@/lib/api";

interface IssueCardProps {
  issue: Issue;
  query?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  high: "bg-red-100 text-red-800 border-red-200",
  medium: "bg-amber-100 text-amber-800 border-amber-200",
  low: "bg-green-100 text-green-800 border-green-200",
};

function highlight(text: string, query: string) {
  if (!query.trim()) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-amber-100 text-amber-900 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export default function IssueCard({ issue, query = "" }: IssueCardProps) {
  const [expanded, setExpanded] = useState(false);

  const sortedSolutions = [...issue.solutions].sort(
    (a, b) => a.step_number - b.step_number
  );

  const handleExport = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(buildPdfUrl([issue.id]), "_blank");
  };

  return (
    <Card
      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
        expanded ? "ring-1 ring-blue-200" : ""
      }`}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                  SEVERITY_STYLES[issue.severity]
                }`}
              >
                {issue.severity.toUpperCase()}
              </span>
              <Badge variant="outline" className="text-xs">
                {issue.category}
              </Badge>
              {issue.tags.map((tag) => (
                <span key={tag.id} className="text-xs text-muted-foreground">
                  #{tag.name}
                </span>
              ))}
            </div>

            <h3 className="font-semibold text-base leading-snug">
              {highlight(issue.title, query)}
            </h3>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {highlight(issue.symptoms, query)}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {expanded && (
              <button
                onClick={handleExport}
                className="p-1.5 rounded-md hover:bg-muted transition-colors"
                title="Export this issue as PDF"
              >
                <Download className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
            {expanded ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>

        {expanded && (
          <div className="mt-4 space-y-4" onClick={(e) => e.stopPropagation()}>
            <Separator />

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                Root Cause
              </p>
              <p className="text-sm">{issue.cause}</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Resolution Steps
              </p>
              <ol className="space-y-2">
                {sortedSolutions.map((solution) => (
                  <li key={solution.id} className="flex gap-3 text-sm">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold flex items-center justify-center mt-0.5">
                      {solution.step_number}
                    </span>
                    <span className="leading-relaxed">{solution.description}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
