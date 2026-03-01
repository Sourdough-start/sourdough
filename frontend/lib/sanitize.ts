import DOMPurify from "dompurify";

/**
 * Sanitize HTML from search highlights, allowing only formatting tags.
 */
export function sanitizeHighlight(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ["em", "mark", "strong", "b"],
  });
}
