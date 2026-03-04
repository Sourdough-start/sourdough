"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useHelp } from "@/components/help/help-provider";
import { HelpSidebar } from "@/components/help/help-sidebar";
import { HelpSearch } from "@/components/help/help-search";
import { HelpArticle } from "@/components/help/help-article";
import { DownloadDocsButton } from "@/components/help/download-docs-button";
import { useAuth } from "@/lib/auth";
import { useAppConfig } from "@/lib/app-config";
import {
  getAllCategories,
  findArticle,
  getSearchableArticles,
} from "@/lib/help/help-content";
import { initializeSearch } from "@/lib/help/help-search";

export function HelpCenterModal() {
  const { isOpen, setIsOpen, currentArticle, setCurrentArticle } = useHelp();
  const { user } = useAuth();
  const { features } = useAppConfig();
  // Stabilise the permissions reference so downstream memos/effects don't
  // re-run when the auth store returns a new array with identical values.
  const rawPermissions = user?.permissions;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const permissions = useMemo(() => rawPermissions ?? [], [JSON.stringify(rawPermissions)]);

  // Build feature flags from public settings. Depend on the primitive boolean
  // value so the object reference stays stable across renders when unchanged.
  const graphqlEnabled = features?.graphqlEnabled ?? false;
  const featureFlags = useMemo<Record<string, boolean>>(
    () => ({ graphqlEnabled }),
    [graphqlEnabled]
  );

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Get categories based on user permissions and feature flags
  const categories = useMemo(() => getAllCategories(permissions, featureFlags), [permissions, featureFlags]);

  // Initialize search index when modal opens
  useEffect(() => {
    if (isOpen) {
      const searchableItems = getSearchableArticles(permissions, featureFlags);
      initializeSearch(searchableItems);
    }
  }, [isOpen, permissions, featureFlags]);

  // Handle article selection from context (e.g., HelpLink)
  useEffect(() => {
    if (currentArticle && isOpen) {
      const result = findArticle(currentArticle, permissions, featureFlags);
      if (result) {
        setSelectedCategory(result.category.slug);
      }
    }
  }, [currentArticle, isOpen, permissions, featureFlags]);

  // Get current article content
  const articleData = useMemo(() => {
    if (!currentArticle) return null;
    return findArticle(currentArticle, permissions, featureFlags);
  }, [currentArticle, permissions, featureFlags]);

  const handleSelectCategory = useCallback((categorySlug: string) => {
    setSelectedCategory((prev) =>
      prev === categorySlug ? null : categorySlug
    );
  }, []);

  const handleSelectArticle = useCallback(
    (articleId: string) => {
      setCurrentArticle(articleId);
      const result = findArticle(articleId, permissions, featureFlags);
      if (result) {
        setSelectedCategory(result.category.slug);
      }
    },
    [setCurrentArticle, permissions, featureFlags]
  );

  const handleBack = useCallback(() => {
    setCurrentArticle(null);
  }, [setCurrentArticle]);

  const handleSearchResult = useCallback(
    (articleId: string) => {
      handleSelectArticle(articleId);
    },
    [handleSelectArticle]
  );

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-5xl h-[85vh] max-h-[800px] p-0 gap-0 overflow-hidden"
        hideClose
      >
        <DialogDescription className="sr-only">
          {articleData
            ? `Help article: ${articleData.article.title}`
            : "Help Center - browse topics or search for help articles"}
        </DialogDescription>
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentArticle && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={handleBack}
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back to categories</span>
                </Button>
              )}
              <DialogTitle>
                {articleData ? articleData.article.title : "Help Center"}
              </DialogTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          {!currentArticle && (
            <div className="mt-3">
              <HelpSearch onSelectResult={handleSearchResult} />
            </div>
          )}
        </DialogHeader>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar - hidden on mobile; category grid serves as nav */}
          <aside className="hidden md:block w-64 border-r shrink-0 overflow-hidden">
            <ScrollArea className="h-full p-4">
              <HelpSidebar
                categories={categories}
                selectedCategory={selectedCategory}
                selectedArticle={currentArticle}
                onSelectCategory={handleSelectCategory}
                onSelectArticle={handleSelectArticle}
              />
            </ScrollArea>
          </aside>

          {/* Content */}
          <main className="flex-1 min-w-0 overflow-hidden">
            <ScrollArea className="h-full w-full">
              <div className="p-6">
                {currentArticle && articleData ? (
                  <div>
                    {articleData.category.slug === "graphql-api" && (
                      <div className="flex justify-end mb-4">
                        <DownloadDocsButton articles={articleData.category.articles} />
                      </div>
                    )}
                    <HelpArticle content={articleData.article.content} />
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="text-center py-8">
                      <h2 className="text-2xl font-semibold mb-2">
                        How can we help?
                      </h2>
                      <p className="text-muted-foreground">
                        Browse topics or search for specific help articles.
                      </p>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-2">
                      {categories.map((category) => (
                        <button
                          key={category.slug}
                          type="button"
                          onClick={() => {
                            handleSelectCategory(category.slug);
                            if (category.articles.length > 0) {
                              handleSelectArticle(category.articles[0].id);
                            }
                          }}
                          className="p-4 text-left border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            {category.icon && (
                              <category.icon className="h-5 w-5 text-primary" />
                            )}
                            <span className="font-medium">{category.name}</span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {category.articles.length} article
                            {category.articles.length !== 1 ? "s" : ""}
                          </p>
                        </button>
                      ))}
                    </div>

                    <div className="text-center text-sm text-muted-foreground">
                      <p>Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">?</kbd> to open this help center anytime</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}
