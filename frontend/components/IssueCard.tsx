"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ChevronDown, ChevronUp, Download, Plus, X, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Issue, buildPdfUrl, addSolution, deleteIssue } from "@/lib/api";
import IssueFormModal from "@/components/IssueFormModal";

interface Props {
  issue: Issue;
  query?: string;
  onUpdated?: (issue: Issue) => void;
  onDeleted?: (id: number) => void;
}

const SEV: Record<string, string> = {
  high: "bg-red-50 text-red-800 border-red-200",
  medium: "bg-amber-50 text-amber-800 border-amber-200",
  low: "bg-green-50 text-green-800 border-green-200",
};

function highlight(text: string, query: string) {
  if (!query.trim()) return <>{text}</>;
  const re = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi");
  const parts = text.split(re);
  return <>{parts.map((p, i) => re.test(p) ? <mark key={i} className="bg-amber-100 text-amber-900 rounded px-0.5">{p}</mark> : p)}</>;
}

function AddSolutionPanel({ issue, onDone }: { issue: Issue; onDone: (updated: Issue) => void }) {
  const [summary, setSummary] = useState("");
  const [steps, setSteps] = useState(["", ""]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const isValid = summary.trim().length > 5 && steps.some(s => s.trim());

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      const updated = await addSolution(issue.id, { solution_summary: summary.trim(), steps: steps.filter(s => s.trim()) });
      onDone(updated);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ marginTop: "16px", padding: "16px", borderRadius: "10px", background: "var(--color-background-secondary)", border: "0.5px solid var(--color-border-secondary)" }}>
      <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "12px", display: "flex", alignItems: "center", gap: "6px" }}>
        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 2"/></svg>
        Add solution to this problem
      </p>
      {error && <div style={{ padding: "8px 10px", borderRadius: "6px", background: "#FCEBEB", border: "0.5px solid #F7C1C1", color: "#A32D2D", fontSize: "12px", marginBottom: "10px" }}>{error}</div>}
      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "4px" }}>Solution summary *</label>
        <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={2}
          placeholder="Briefly describe the fix or workaround..."
          style={{ width: "100%", fontSize: "12px", padding: "7px 9px", borderRadius: "7px", border: "0.5px solid var(--color-border-secondary)", background: "var(--color-background-primary)", color: "var(--color-text-primary)", resize: "vertical", fontFamily: "var(--font-sans)", outline: "none", lineHeight: "1.6" }} />
      </div>
      <div style={{ marginBottom: "10px" }}>
        <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Resolution steps</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          {steps.map((s, idx) => (
            <div key={idx} style={{ display: "flex", alignItems: "center", gap: "7px" }}>
              <div style={{ width: "20px", height: "20px", borderRadius: "50%", background: "#E6F1FB", color: "#0C447C", border: "0.5px solid #B5D4F4", fontSize: "10px", fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{idx + 1}</div>
              <Input value={s} onChange={e => setSteps(prev => prev.map((v, i) => i === idx ? e.target.value : v))} placeholder={`Step ${idx + 1}`} style={{ flex: 1, fontSize: "12px", height: "32px" }} />
              {steps.length > 1 && (
                <button onClick={() => setSteps(prev => prev.filter((_, i) => i !== idx))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-tertiary)", padding: "3px", display: "flex" }}><X size={13} /></button>
              )}
            </div>
          ))}
        </div>
        <button onClick={() => setSteps(prev => [...prev, ""])} style={{ marginTop: "7px", fontSize: "11px", color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "3px", fontFamily: "var(--font-sans)" }}>
          <Plus size={11} /> Add step
        </button>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button onClick={handleSubmit} disabled={!isValid || loading} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 16px", borderRadius: "7px", background: "#1a1a1a", color: "white", fontSize: "12px", fontWeight: 500, border: "none", fontFamily: "var(--font-sans)", cursor: isValid && !loading ? "pointer" : "not-allowed", opacity: isValid && !loading ? 1 : 0.4 }}>
          {loading ? "Saving..." : "Save solution"}
        </button>
      </div>
    </div>
  );
}

export default function IssueCard({ issue: initialIssue, query = "", onUpdated, onDeleted }: Props) {
  const [issue, setIssue] = useState(initialIssue);
  const [expanded, setExpanded] = useState(false);
  const [showAddSolution, setShowAddSolution] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasSolution = issue.status === "solution_added" && issue.solutions.length > 0;
  const sortedSolutions = [...issue.solutions].sort((a, b) => a.step_number - b.step_number);

  function handleExport(e: React.MouseEvent) {
    e.stopPropagation();
    window.open(buildPdfUrl([issue.id]), "_blank");
  }

  function handleSolutionSaved(updated: Issue) {
    setIssue(updated);
    setShowAddSolution(false);
    setExpanded(true);
    onUpdated?.(updated);
  }

  function handleEdited(updated: Issue) {
    setIssue(updated);
    setShowEditModal(false);
    onUpdated?.(updated);
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setDeleting(true);
    try {
      await deleteIssue(issue.id);
      onDeleted?.(issue.id);
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <>
      <Card className={`transition-all duration-200 hover:shadow-md ${expanded ? "ring-1 ring-blue-200" : ""}`}>
        <CardContent className="p-4">

          {/* Clickable header */}
          <div className="cursor-pointer" onClick={() => { setExpanded(!expanded); setConfirmDelete(false); }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${SEV[issue.severity]}`}>{issue.severity.toUpperCase()}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-border bg-muted text-muted-foreground">{issue.category}</span>
                  {issue.tags.map(tag => <span key={tag.id} className="text-xs text-muted-foreground">#{tag.name}</span>)}
                  {issue.status === "problem_complete" && (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-amber-200 bg-amber-50 text-amber-700">Needs solution</span>
                  )}
                </div>
                <h3 className="font-semibold text-base leading-snug">{highlight(issue.title, query)}</h3>
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{highlight(issue.symptoms, query)}</p>
              </div>

              {/* Action icons */}
              <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                {expanded && (
                  <>
                    <button onClick={handleExport} className="p-1.5 rounded-md hover:bg-muted transition-colors" title="Export as PDF">
                      <Download size={14} className="text-muted-foreground" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); setShowEditModal(true); }} className="p-1.5 rounded-md hover:bg-blue-50 transition-colors" title="Edit issue">
                      <Pencil size={14} className="text-muted-foreground hover:text-blue-600" />
                    </button>
                    {confirmDelete ? (
                      <div className="flex items-center gap-1 ml-1">
                        <span className="text-xs text-red-600 font-medium">Delete?</span>
                        <button onClick={handleDelete} disabled={deleting}
                          className="text-xs px-2 py-0.5 rounded bg-red-600 text-white font-medium hover:bg-red-700 transition-colors disabled:opacity-50">
                          {deleting ? "..." : "Yes"}
                        </button>
                        <button onClick={e => { e.stopPropagation(); setConfirmDelete(false); }}
                          className="text-xs px-2 py-0.5 rounded border border-border hover:bg-muted transition-colors">
                          No
                        </button>
                      </div>
                    ) 
                    : 
                    // (
                    //   <button onClick={handleDelete} className="p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete issue">
                    //     <Trash2 size={14} className="text-muted-foreground hover:text-red-600" />
                    //   </button>
                    // )
                    <> </>
                    }
                  </>
                )}
                <div onClick={() => setExpanded(!expanded)} className="cursor-pointer p-1">
                  {expanded ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
                </div>
              </div>
            </div>
          </div>

          {/* Expanded detail */}
          {expanded && (
            <div className="mt-4" onClick={e => e.stopPropagation()}>
              <Separator className="mb-4" />

              {issue.image_path && (
                <div className="mb-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Screenshot</p>
                  <img src={`http://localhost:8000${issue.image_path}`} alt="Issue screenshot" className="rounded-md border border-border max-h-48 object-cover w-full" />
                </div>
              )}

              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Symptoms</p>
                <p className="text-sm">{issue.symptoms}</p>
              </div>

              <div className="mb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Root Cause</p>
                <p className="text-sm">{issue.cause || <span className="text-muted-foreground italic">Not specified</span>}</p>
              </div>

              {hasSolution ? (
                <>
                  {issue.solution_summary && (
                    <div className="mb-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">Solution Summary</p>
                      <p className="text-sm">{issue.solution_summary}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">Resolution Steps</p>
                    <ol className="space-y-2">
                      {sortedSolutions.map(sol => (
                        <li key={sol.id} className="flex gap-3 text-sm">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 text-blue-800 text-xs font-semibold flex items-center justify-center mt-0.5">{sol.step_number}</span>
                          <span className="leading-relaxed">{sol.description}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                </>
              ) : (
                <div>
                  {!showAddSolution ? (
                    <button onClick={() => setShowAddSolution(true)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px dashed var(--color-border-secondary)", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", fontSize: "13px", color: "var(--color-text-secondary)", fontFamily: "var(--font-sans)" }}>
                      <Plus size={14} /> Add solution to this problem
                    </button>
                  ) : (
                    <AddSolutionPanel issue={issue} onDone={handleSolutionSaved} />
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {showEditModal && (
        <IssueFormModal
          issue={issue}
          onClose={() => setShowEditModal(false)}
          onSuccess={handleEdited}
        />
      )}
    </>
  );
}
