"use client";

import { useState, useEffect, useCallback } from "react";
import { searchIssues, getCategories, Issue } from "@/lib/api";
import SearchBar from "@/components/SearchBar";
import IssueCard from "@/components/IssueCard";
import ExportButton from "@/components/ExportButton";
import { Loader2, SearchX } from "lucide-react";

export default function Home() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [issues, setIssues] = useState<Issue[]>([]);
  const [total, setTotal] = useState(0);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  const fetchIssues = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await searchIssues(query, category, severity);
      setIssues(data.issues);
      setTotal(data.total);
    } catch {
      setError("Could not connect to the API. Make sure the backend is running on port 8000.");
      setIssues([]);
      setTotal(0);
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [query, category, severity]);

  useEffect(() => {
    const debounce = setTimeout(fetchIssues, 300);
    return () => clearTimeout(debounce);
  }, [fetchIssues]);

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-10">

        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-1">
            Issue & Solution Tool
          </h1>
          <p className="text-muted-foreground text-sm">
            Search known issues and find step-by-step resolutions instantly.
          </p>
        </div>

        <div className="mb-6">
          <SearchBar
            query={query}
            category={category}
            severity={severity}
            categories={categories}
            onQueryChange={setQuery}
            onCategoryChange={setCategory}
            onSeverityChange={setSeverity}
          />
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">
            {error}
          </div>
        )}

        {!initialLoad && (
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              {loading ? "Searching..." : `${total} issue${total !== 1 ? "s" : ""} found`}
            </p>
            <ExportButton query={query} category={category} total={total} />
          </div>
        )}

        {loading && initialLoad ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : issues.length === 0 && !loading && !initialLoad ? (
          <div className="flex flex-col items-center py-16 text-muted-foreground gap-3">
            <SearchX className="w-10 h-10" />
            <p className="text-sm">No issues match your search.</p>
            <p className="text-xs">Try different keywords or clear the filters.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {issues.map((issue) => (
              <IssueCard key={issue.id} issue={issue} query={query} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
