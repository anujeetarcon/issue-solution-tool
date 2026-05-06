"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { registerIssue, editIssue, Issue } from "@/lib/api";
import { Input } from "@/components/ui/input";

const CATEGORIES = ["Database", "Network", "Auth", "Performance", "UI", "Other"];

interface Props {
  issue?: Issue;           // if provided → edit mode, else → create mode
  onClose: () => void;
  onSuccess: (issue: Issue) => void;
}

function ModalContent({ issue, onClose, onSuccess }: Props) {
  const isEdit = !!issue;

  const [title, setTitle]         = useState(issue?.title ?? "");
  const [category, setCategory]   = useState(issue?.category ?? "");
  const [severity, setSeverity]   = useState(issue?.severity ?? "");
  const [symptoms, setSymptoms]   = useState(issue?.symptoms ?? "");
  const [cause, setCause]         = useState(issue?.cause ?? "");
  const [tags, setTags]           = useState(issue?.tags.map(t => t.name).join(", ") ?? "");
  const [image, setImage]         = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(
    issue?.image_path ? `http://localhost:8000${issue.image_path}` : null
  );
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState("");

  const isValid = title.trim() && category && severity && symptoms.trim().length > 10;

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImage(file);
    const reader = new FileReader();
    reader.onload = ev => setImagePreview(ev.target?.result as string);
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
      const result = isEdit ? await editIssue(issue!.id, fd) : await registerIssue(fd);
      onSuccess(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const textarea: React.CSSProperties = {
    width: "100%", fontSize: "13px", padding: "8px 10px", borderRadius: "8px",
    border: "0.5px solid var(--color-border-secondary)",
    background: "var(--color-background-primary)", color: "var(--color-text-primary)",
    resize: "vertical", fontFamily: "var(--font-sans)", outline: "none", lineHeight: "1.6",
  };

  return (
    <>
      <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "#ffff" }} />

      <div style={{
        position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
        zIndex: 9999, width: "100%", maxWidth: "640px",
        background: "var(--color-background-primary)",
        borderRadius: "16px 16px 0 0",
        boxShadow: "0 -4px 32px rgba(0,0,0,0.14)",
        display: "flex", flexDirection: "column", maxHeight: "92vh",
      }}>
        {/* Handle */}
        <div style={{ display: "flex", justifyContent: "center", padding: "10px 0 4px" }}>
          <div style={{ width: "36px", height: "4px", borderRadius: "99px", background: "var(--color-border-secondary)" }} />
        </div>

        {/* Header */}
        <div style={{ padding: "8px 20px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
          <div>
            <p style={{ fontSize: "15px", fontWeight: 500 }}>{isEdit ? "Edit problem" : "Register a problem"}</p>
            <p style={{ fontSize: "12px", color: "var(--color-text-secondary)", marginTop: "2px" }}>
              {isEdit ? "Update the details below and save." : "Once submitted, you can add a solution from the issue card."}
            </p>
          </div>
          <button onClick={onClose} style={{ padding: "7px", borderRadius: "8px", border: "0.5px solid var(--color-border-secondary)", background: "transparent", cursor: "pointer", display: "flex" }}>
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 20px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {error && <div style={{ padding: "10px 12px", borderRadius: "8px", background: "#FCEBEB", border: "0.5px solid #F7C1C1", color: "#A32D2D", fontSize: "13px" }}>{error}</div>}

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "5px" }}>Issue title *</label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Database connection timeout on login" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "5px" }}>Category *</label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "5px" }}>
                {CATEGORIES.map(c => (
                  <button key={c} type="button" onClick={() => setCategory(c)} style={{
                    fontSize: "12px", padding: "5px 10px", borderRadius: "6px", cursor: "pointer",
                    fontFamily: "var(--font-sans)", fontWeight: category === c ? 500 : 400,
                    border: `0.5px solid ${category === c ? "#1a1a1a" : "var(--color-border-secondary)"}`,
                    background: category === c ? "#1a1a1a" : "transparent",
                    color: category === c ? "white" : "var(--color-text-primary)",
                  }}>{c}</button>
                ))}
              </div>
            </div>
            <div>
              <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "5px" }}>Severity *</label>
              <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                {[
                  { val: "high",   bg: "#FCEBEB", border: "#F7C1C1", text: "#A32D2D" },
                  { val: "medium", bg: "#FAEEDA", border: "#FAC775", text: "#854F0B" },
                  { val: "low",    bg: "#EAF3DE", border: "#C0DD97", text: "#3B6D11" },
                ].map(({ val, bg, border, text }) => (
                  <button key={val} type="button" onClick={() => setSeverity(val)} style={{
                    fontSize: "12px", padding: "6px 12px", borderRadius: "6px", cursor: "pointer",
                    fontFamily: "var(--font-sans)", fontWeight: 500, textAlign: "left",
                    border: `0.5px solid ${severity === val ? border : "var(--color-border-secondary)"}`,
                    background: severity === val ? bg : "transparent",
                    color: severity === val ? text : "var(--color-text-primary)",
                  }}>{val.charAt(0).toUpperCase() + val.slice(1)}</button>
                ))}
              </div>
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "5px" }}>
              Symptoms / what you observed *
              <span style={{ fontWeight: 400, marginLeft: "6px", color: symptoms.trim().length > 10 ? "#3B6D11" : "var(--color-text-tertiary)" }}>
                {symptoms.trim().length}/10+ {symptoms.trim().length > 10 ? "✓" : ""}
              </span>
            </label>
            <textarea value={symptoms} onChange={e => setSymptoms(e.target.value)} rows={3}
              placeholder="Describe what happened — error messages, behaviour, when it occurs..." style={textarea} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "5px" }}>Root cause (if known)</label>
            <textarea value={cause} onChange={e => setCause(e.target.value)} rows={2}
              placeholder="What do you think caused this issue?" style={{ ...textarea, minHeight: "60px" }} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "5px" }}>Tags (comma separated)</label>
            <Input value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. PostgreSQL, timeout, FastAPI" />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 500, color: "var(--color-text-secondary)", marginBottom: "5px" }}>Screenshot / image</label>
            <input type="file" id="imgUpload" accept="image/*" onChange={handleImage} style={{ display: "none" }} />
            {imagePreview ? (
              <div style={{ position: "relative" }}>
                <img src={imagePreview} alt="preview" style={{ width: "100%", maxHeight: "140px", objectFit: "cover", borderRadius: "8px", border: "0.5px solid var(--color-border-secondary)" }} />
                <button onClick={() => { setImage(null); setImagePreview(null); }}
                  style={{ position: "absolute", top: "8px", right: "8px", fontSize: "11px", padding: "3px 8px", borderRadius: "6px", background: "var(--color-background-primary)", border: "0.5px solid var(--color-border-secondary)", cursor: "pointer" }}>
                  Remove
                </button>
              </div>
            ) : (
              <label htmlFor="imgUpload" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", padding: "16px", border: "1px dashed var(--color-border-secondary)", borderRadius: "8px", cursor: "pointer", color: "var(--color-text-secondary)", fontSize: "13px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 16l5-5 4 4 3-3 6 6"/><circle cx="8" cy="9" r="1.5"/>
                </svg>
                Click to upload screenshot
                <span style={{ fontSize: "11px", color: "var(--color-text-tertiary)" }}>PNG, JPG, GIF, WEBP up to 10MB</span>
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: "12px 20px", borderTop: "0.5px solid var(--color-border-tertiary)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--color-background-primary)", flexShrink: 0 }}>
          <button onClick={onClose} style={{ fontSize: "13px", color: "var(--color-text-secondary)", background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-sans)" }}>Cancel</button>
          <button onClick={handleSubmit} disabled={!isValid || loading} style={{
            display: "inline-flex", alignItems: "center", gap: "8px", padding: "9px 20px",
            borderRadius: "8px", background: isEdit ? "#185FA5" : "#1a1a1a", color: "white",
            fontSize: "13px", fontWeight: 500, border: "none", fontFamily: "var(--font-sans)",
            cursor: isValid && !loading ? "pointer" : "not-allowed",
            opacity: isValid && !loading ? 1 : 0.4, transition: "opacity 0.15s",
          }}>
            {loading
              ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" strokeOpacity=".25"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>Saving...</>
              : isEdit ? "Save changes" : "Register problem"}
          </button>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}

export default function IssueFormModal(props: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(<ModalContent {...props} />, document.body);
}
