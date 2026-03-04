"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface HelpArticleProps {
  content: string;
  className?: string;
}

export function HelpArticle({ content, className }: HelpArticleProps) {
  return (
    <div
      className={cn(
        "help-article-prose prose prose-sm dark:prose-invert max-w-none break-words",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base",
        "prose-p:text-muted-foreground prose-p:leading-relaxed",
        "prose-a:text-primary prose-a:no-underline hover:prose-a:underline",
        "prose-strong:text-foreground prose-strong:font-medium",
        "prose-ul:text-muted-foreground prose-ol:text-muted-foreground",
        "prose-li:marker:text-muted-foreground",
        // Code blocks (overflow handled by .help-article-prose pre in globals.css)
        "prose-pre:bg-muted prose-pre:border prose-pre:rounded-lg",
        "prose-pre:text-[0.8125rem] prose-pre:leading-relaxed",
        "prose-code:font-mono prose-code:text-[0.8125rem]",
        // Inline code (not inside pre)
        "[&_:not(pre)>code]:bg-muted [&_:not(pre)>code]:px-1.5 [&_:not(pre)>code]:py-0.5",
        "[&_:not(pre)>code]:rounded [&_:not(pre)>code]:text-[0.8125rem]",
        "[&_:not(pre)>code]:before:content-none [&_:not(pre)>code]:after:content-none",
        // Tables
        "prose-table:text-sm",
        className
      )}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
