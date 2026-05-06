"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { addSolution, Issue } from "@/lib/api";
import { useRouter } from "next/navigation";

interface Props {
  issue: Issue;
}

export default function SolutionForm({ issue }: Props) {
  const router = useRouter();
  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isValid = summary.trim().length > 5 && steps.some(s => s.trim());

  function updateStep(idx: number, val: string) {
    setSteps(prev => prev.map((s, i) => i === idx ? val : s));
  }

  function addStep() {
    setSteps(prev => [...prev, ""]);
  }

  function removeStep(idx: number) {
    if (steps.length <= 1) return;
    setSteps(prev => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      await addSolution(issue.id, {
        solution_summary: summary.trim(),
        steps: steps.filter(s => s.trim()),
      });
      router.push("/");
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function saveDraft() {
    router.push("/");
  }

  return (
    <div className="space-y-5">
      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div className="p-3 rounded-md bg-green-50 border border-green-200 text-green-800 text-sm flex items-center gap-2">
        <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8l4 4 6-6"/></svg>
        Problem <strong>"{issue.title}"</strong> has been recorded. Now add the solution below.
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Solution summary *</label>
        <textarea
          value={summary}
          onChange={e => setSummary(e.target.value)}
          placeholder="Briefly describe the fix or workaround..."
          rows={3}
          className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-3">Resolution steps</label>
        <div className="space-y-2.5">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-blue-50 text-blue-800 text-xs font-medium flex items-center justify-center flex-shrink-0 border border-blue-200">
                {idx + 1}
              </div>
              <Input
                value={step}
                onChange={e => updateStep(idx, e.target.value)}
                placeholder={`Step ${idx + 1} — describe what to do`}
                className="flex-1"
              />
              {steps.length > 1 && (
                <button
                  onClick={() => removeStep(idx)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
                </button>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addStep}
          className="mt-3 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 transition-colors">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v10M3 8h10"/></svg>
          Add another step
        </button>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <button
          onClick={saveDraft}
          className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          Save problem only &rarr;
        </button>

        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
          {loading ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Submitting...</>
          ) : (
            <>Submit issue + solution</>
          )}
        </button>
      </div>
    </div>
  );
}
