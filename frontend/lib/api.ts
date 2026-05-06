const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Solution { id: number; step_number: number; description: string }
export interface Tag { id: number; name: string }
export interface Issue {
  id: number; title: string; category: string; severity: "low" | "medium" | "high";
  symptoms: string; cause?: string; image_path?: string;
  status: "problem_complete" | "solution_added";
  solution_summary?: string; solutions: Solution[]; tags: Tag[];
}
export interface SearchResponse { total: number; issues: Issue[] }

export async function searchIssues(q = "", category = "", severity = ""): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (severity) params.set("severity", severity);
  const res = await fetch(`${API_BASE}/issues/search?${params}`);
  if (!res.ok) throw new Error("Failed to fetch issues");
  return res.json();
}

export async function getCategories(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function registerIssue(formData: FormData): Promise<Issue> {
  const res = await fetch(`${API_BASE}/issues/register`, { method: "POST", body: formData });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed to register issue"); }
  return res.json();
}

export async function editIssue(id: number, formData: FormData): Promise<Issue> {
  const res = await fetch(`${API_BASE}/issues/${id}/edit`, { method: "PUT", body: formData });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed to update issue"); }
  return res.json();
}

export async function deleteIssue(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/issues/${id}`, { method: "DELETE" });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed to delete issue"); }
}

export async function addSolution(issueId: number, payload: { solution_summary: string; steps: string[]; tags?: string[] }): Promise<Issue> {
  const res = await fetch(`${API_BASE}/issues/${issueId}/solution`, {
    method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.detail || "Failed to add solution"); }
  return res.json();
}

export function buildPdfUrl(ids: number[]): string { return `${API_BASE}/export/pdf?ids=${ids.join(",")}`; }
export function buildPdfUrlFromSearch(q: string, category: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return `${API_BASE}/export/pdf?${params}`;
}
