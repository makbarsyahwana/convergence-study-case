"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, type ContentItem, type Tag } from "@/lib/api-client";
import { ContentCard } from "@/components/ContentCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function HomePage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ContentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("");
  const [premium, setPremium] = useState<string>("");
  const [tagSlug, setTagSlug] = useState("");
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const limit = 6;

  const fetchContent = useCallback(async () => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };
    if (search) params.search = search;
    if (type) params.type = type;
    if (premium) params.isPremium = premium;
    if (tagSlug) params.tagSlug = tagSlug;

    const res = await api.listContent(params, token || undefined);
    if (res.ok) {
      const d = res.data;
      setItems(d.data);
      setTotal(d.meta.total);
      setTotalPages(d.meta.totalPages);
    }
    setLoading(false);
  }, [page, search, type, premium, tagSlug, token]);

  useEffect(() => {
    fetchContent();
  }, [fetchContent]);

  useEffect(() => {
    api.listTags().then((res) => {
      if (res.ok) setTags(res.data as Tag[]);
    });
  }, []);

  const resetFilters = () => {
    setSearch("");
    setType("");
    setPremium("");
    setTagSlug("");
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Health Content</h1>
        <p className="text-muted-foreground mt-1">
          Browse articles and videos — {total} items
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search content…"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9"
            />
          </div>
          <Button variant="outline" size="sm" onClick={resetFilters}>
            Clear
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={type === "" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => { setType(""); setPage(1); }}
          >
            All Types
          </Badge>
          <Badge
            variant={type === "ARTICLE" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => { setType("ARTICLE"); setPage(1); }}
          >
            Articles
          </Badge>
          <Badge
            variant={type === "VIDEO" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => { setType("VIDEO"); setPage(1); }}
          >
            Videos
          </Badge>

          <span className="mx-1 border-l" />

          <Badge
            variant={premium === "" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => { setPremium(""); setPage(1); }}
          >
            All Access
          </Badge>
          <Badge
            variant={premium === "false" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => { setPremium("false"); setPage(1); }}
          >
            Free
          </Badge>
          <Badge
            variant={premium === "true" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => { setPremium("true"); setPage(1); }}
          >
            Premium
          </Badge>

          {tags.length > 0 && (
            <>
              <span className="mx-1 border-l" />
              <Badge
                variant={tagSlug === "" ? "default" : "outline"}
                className="cursor-pointer"
                onClick={() => { setTagSlug(""); setPage(1); }}
              >
                All Tags
              </Badge>
              {tags.map((t) => (
                <Badge
                  key={t.slug}
                  variant={tagSlug === t.slug ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => { setTagSlug(t.slug); setPage(1); }}
                >
                  {t.name}
                </Badge>
              ))}
            </>
          )}
        </div>
      </div>

      {/* Content grid */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="h-48 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center text-muted-foreground">
          No content found
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <ContentCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
