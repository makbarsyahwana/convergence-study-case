"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api, type ContentDetail } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Lock,
  Clock,
  Eye,
  Video,
  FileText,
  ArrowLeft,
  Crown,
} from "lucide-react";

export default function ContentDetailPage() {
  const params = useParams();
  const slug = params.slug as string;
  const { token, hasSubscription } = useAuth();
  const [content, setContent] = useState<ContentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!slug) return;
    setLoading(true);
    api
      .getContent(slug, token || undefined)
      .then((res) => {
        if (res.ok) {
          setContent(res.data);
        } else {
          setError((res.data as any)?.message || "Content not found");
        }
      })
      .finally(() => setLoading(false));
  }, [slug, token]);

  if (loading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="space-y-4">
          <div className="h-8 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h2 className="text-2xl font-bold mb-2">Not Found</h2>
        <p className="text-muted-foreground mb-4">{error || "Content not found"}</p>
        <Link href="/">
          <Button variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to content
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="mr-1 h-4 w-4" /> Back to content
      </Link>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          {content.type === "VIDEO" ? (
            <Video className="h-5 w-5 text-blue-500" />
          ) : (
            <FileText className="h-5 w-5 text-muted-foreground" />
          )}
          <Badge variant={content.isPremium ? "default" : "secondary"}>
            {content.isPremium ? "Premium" : "Free"}
          </Badge>
          {content._gated && (
            <Badge variant="destructive" className="flex items-center gap-1">
              <Lock className="h-3 w-3" /> Gated
            </Badge>
          )}
        </div>
        <h1 className="text-3xl font-bold leading-tight">{content.title}</h1>
        {content.excerpt && (
          <p className="mt-2 text-lg text-muted-foreground">{content.excerpt}</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
          {content.author && (
            <span>
              By {content.author.firstName} {content.author.lastName}
            </span>
          )}
          {content.readTimeMinutes && (
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" /> {content.readTimeMinutes} min read
            </span>
          )}
          <span className="flex items-center gap-1">
            <Eye className="h-4 w-4" /> {content.viewCount} views
          </span>
          {content.publishedAt && (
            <span>{new Date(content.publishedAt).toLocaleDateString()}</span>
          )}
        </div>
        {content.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {content.tags.map((t) => (
              <Badge key={t.tag.id} variant="outline" className="text-xs">
                {t.tag.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      <Separator className="mb-6" />

      {/* Gated overlay */}
      {content._gated ? (
        <Card className="border-dashed border-2">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 rounded-full bg-muted p-4">
              <Crown className="h-8 w-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Premium Content</h3>
            <p className="text-muted-foreground mb-6 max-w-md">
              {content._message ||
                "This content is available to premium subscribers. Upgrade your plan to read the full article."}
            </p>
            <Link href="/subscription">
              <Button>
                <Crown className="mr-2 h-4 w-4" /> Upgrade to Premium
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="prose prose-neutral max-w-none dark:prose-invert">
          {content.type === "VIDEO" && content.videoUrl && (
            <div className="mb-6 aspect-video rounded-lg bg-black flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="mx-auto h-12 w-12 mb-2 opacity-60" />
                <p className="text-sm opacity-60">
                  Video URL: {content.videoUrl}
                </p>
              </div>
            </div>
          )}
          {content.body ? (
            <div
              className="leading-relaxed whitespace-pre-wrap"
              dangerouslySetInnerHTML={{ __html: content.body }}
            />
          ) : (
            <p className="text-muted-foreground italic">No body content available.</p>
          )}
        </div>
      )}
    </div>
  );
}
