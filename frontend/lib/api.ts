const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface Solution {
  id: number;
  step_number: number;
  description: string;
}

export interface Tag {
  id: number;
  name: string;
}

export interface Issue {
  id: number;
  title: string;
  category: string;
  severity: "low" | "medium" | "high";
  symptoms: string;
  cause: string;
  solutions: Solution[];
  tags: Tag[];
}

export interface SearchResponse {
  total: number;
  issues: Issue[];
}

export async function searchIssues(
  q: string = "",
  category: string = "",
  severity: string = ""
): Promise<SearchResponse> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  if (severity) params.set("severity", severity);

  const res = await fetch(`${API_BASE}/issues/search?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch issues");
  return res.json();
}

export async function getCategories(): Promise<string[]> {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export function buildPdfUrl(ids: number[]): string {
  return `${API_BASE}/export/pdf?ids=${ids.join(",")}`;
}

export function buildPdfUrlFromSearch(q: string, category: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (category) params.set("category", category);
  return `${API_BASE}/export/pdf?${params.toString()}`;
}
