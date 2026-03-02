"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HelpArticle } from "@/lib/help/help-content";

interface DownloadDocsButtonProps {
  articles: HelpArticle[];
  filename?: string;
}

export function DownloadDocsButton({
  articles,
  filename = "graphql-api-documentation.md",
}: DownloadDocsButtonProps) {
  const handleDownload = () => {
    const header = `# GraphQL API Documentation\n\nGenerated from the in-app help center.\n\n---\n\n`;
    const body = articles.map((article) => article.content).join("\n\n---\n\n");
    const markdown = header + body;

    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.parentNode?.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  return (
    <Button variant="outline" size="sm" onClick={handleDownload} className="gap-1.5">
      <Download className="h-3.5 w-3.5" />
      Download as Markdown
    </Button>
  );
}
