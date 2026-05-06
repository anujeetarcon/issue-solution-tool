"use client";

import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { registerIssue, Issue } from "@/lib/api";

const CATEGORIES = ["Database", "Network", "Auth", "Performance", "UI", "Other"];
const SEVERITIES = ["high", "medium", "low"] as const;

const SEV_STYLES: Record<string, string> = {
  high: "border-red-300 bg-red-50 text-red-800",
  medium: "border-amber-300 bg-amber-50 text-amber-800",
  low: "border-green-300 bg-green-50 text-green-800",
};

interface Props {
  onComplete: (issue: Issue) => void;
}

export default function ProblemForm({ onComplete }: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("");
  const [severity, setSeverity] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [cause, setCause] = useState("");
  const [tags, setTags] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const isValid = title.trim() && category && severity && symptoms.trim().length > 10;

  const progress = [
    !!title.trim(), !!category, !!severity, symptoms.trim().length > 10
  ].filter(Boolean).length;

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function handleSubmit() {
    if (!isValid) return;
    setLoading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("title", title.trim());
      fd.append("category", category);
      fd.append("severity", severity);
      fd.append("symptoms", symptoms.trim());
      if (cause.trim()) fd.append("cause", cause.trim());
      if (tags.trim()) fd.append("tags", tags.trim());
      if (image) fd.append("image", image);
      const issue = await registerIssue(fd);
      onComplete(issue);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-foreground rounded-full transition-all duration-500"
          style={{ width: `${(progress / 4) * 100}%` }}
        />
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 border border-red-200 text-red-700 text-sm">{error}</div>
      )}

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Issue title *</label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Database connection timeout on login" />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Category *</label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button key={c} type="button"
                onClick={() => setCategory(c)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-all ${category === c ? "bg-foreground text-background border-foreground" : "border-border hover:border-foreground/40"}`}>
                {c}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Severity *</label>
          <div className="flex flex-col gap-1.5">
            {SEVERITIES.map(s => (
              <button key={s} type="button"
                onClick={() => setSeverity(s)}
                className={`text-xs px-3 py-1.5 rounded-md border text-left font-medium capitalize transition-all ${severity === s ? SEV_STYLES[s] : "border-border hover:border-foreground/40"}`}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">
          Symptoms / what you observed *
          <span className="ml-2 font-normal">(min 10 chars)</span>
        </label>
        <textarea
          value={symptoms}
          onChange={e => setSymptoms(e.target.value)}
          placeholder="Describe what happened — error messages, behaviour, when it occurs, how often..."
          rows={4}
          className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
        <p className="text-xs text-muted-foreground mt-1">{symptoms.trim().length} / 10+ characters</p>
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Root cause (if known)</label>
        <textarea
          value={cause}
          onChange={e => setCause(e.target.value)}
          placeholder="What do you think caused this issue?"
          rows={2}
          className="w-full text-sm px-3 py-2 rounded-md border border-border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-foreground/20"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Tags (comma separated)</label>
        <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. PostgreSQL, connection pool, FastAPI" />
      </div>

      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1.5">Screenshot / image</label>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} className="hidden" />
        {imagePreview ? (
          <div className="relative">
            <img src={imagePreview} alt="preview" className="w-full max-h-48 object-cover rounded-md border border-border" />
            <button
              onClick={() => { setImage(null); setImagePreview(null); }}
              className="absolute top-2 right-2 text-xs px-2 py-1 rounded bg-background border border-border hover:bg-muted">
              Remove
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full py-6 border border-dashed border-border rounded-md hover:border-foreground/40 transition-colors text-sm text-muted-foreground flex flex-col items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="8" cy="9" r="1.5"/>
            </svg>
            Click to upload screenshot or drag &amp; drop
            <span className="text-xs text-muted-foreground/60">PNG, JPG, GIF, WEBP up to 10MB</span>
          </button>
        )}
      </div>

      <div className="pt-2 flex justify-end">
        <button
          onClick={handleSubmit}
          disabled={!isValid || loading}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md bg-foreground text-background text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity">
          {loading ? (
            <><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin"><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Saving...</>
          ) : (
            <><svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M3 8l4 4 6-6"/></svg>Mark problem complete</>
          )}
        </button>
      </div>
    </div>
  );
}
