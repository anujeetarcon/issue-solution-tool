"use client";

import { Download } from "lucide-react";
import { buildPdfUrlFromSearch } from "@/lib/api";

interface ExportButtonProps {
  query: string;
  category: string;
  total: number;
}

export default function ExportButton({ query, category, total }: ExportButtonProps) {
  const handleExport = () => {
    const url = buildPdfUrlFromSearch(query, category);
    window.open(url, "_blank");
  };

  return (
    <button
      onClick={handleExport}
      disabled={total === 0}
      className="inline-flex items-center gap-2 text-sm px-3 py-1.5 rounded-md border border-border hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Download className="w-4 h-4" />
      Export {total > 0 ? `${total} issues` : ""} as PDF
    </button>
  );
}
