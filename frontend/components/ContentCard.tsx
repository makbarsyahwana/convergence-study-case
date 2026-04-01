"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Lock, Clock, Eye, Video, FileText } from "lucide-react";
import type { ContentItem } from "@/lib/api-client";

export function ContentCard({ item }: { item: ContentItem }) {
  return (
    <Link href={`/content/${item.slug}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 mb-1">
            {item.type === "VIDEO" ? (
              <Video className="h-4 w-4 text-blue-500" />
            ) : (
              <FileText className="h-4 w-4 text-muted-foreground" />
            )}
            <Badge variant={item.isPremium ? "default" : "secondary"} className="text-xs">
              {item.isPremium ? (
                <span className="flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Premium
                </span>
              ) : (
                "Free"
              )}
            </Badge>
          </div>
          <CardTitle className="text-base leading-snug">{item.title}</CardTitle>
          {item.excerpt && (
            <CardDescription className="line-clamp-2 text-sm">
              {item.excerpt}
            </CardDescription>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            {item.readTimeMinutes && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.readTimeMinutes} min
              </span>
            )}
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {item.viewCount}
            </span>
            {item.author && (
              <span>
                {item.author.firstName} {item.author.lastName}
              </span>
            )}
          </div>
          {item.tags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {item.tags.map((t) => (
                <Badge key={t.tag.id} variant="outline" className="text-xs font-normal">
                  {t.tag.name}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}
