"use client";

import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, X } from "lucide-react";

interface SearchBarProps {
  query: string;
  category: string;
  severity: string;
  categories: string[];
  onQueryChange: (q: string) => void;
  onCategoryChange: (c: string) => void;
  onSeverityChange: (s: string) => void;
}

const SEVERITIES = ["low", "medium", "high"];

export default function SearchBar({
  query,
  category,
  severity,
  categories,
  onQueryChange,
  onCategoryChange,
  onSeverityChange,
}: SearchBarProps) {
  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <Input
          className="pl-9 pr-9"
          placeholder="Search issues by title, symptom, or keyword..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />
        {query && (
          <button
            onClick={() => onQueryChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-muted-foreground font-medium">Category:</span>
        <Badge
          variant={category === "" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => onCategoryChange("")}
        >
          All
        </Badge>
        {categories.map((cat) => (
          <Badge
            key={cat}
            variant={category === cat ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onCategoryChange(category === cat ? "" : cat)}
          >
            {cat}
          </Badge>
        ))}

        <span className="text-xs text-muted-foreground font-medium ml-2">Severity:</span>
        {SEVERITIES.map((sev) => (
          <Badge
            key={sev}
            variant={severity === sev ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => onSeverityChange(severity === sev ? "" : sev)}
          >
            {sev}
          </Badge>
        ))}
      </div>
    </div>
  );
}
