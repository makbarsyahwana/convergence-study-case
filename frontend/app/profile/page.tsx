"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, type Tag } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Check, AlertCircle, User } from "lucide-react";
import { useRouter } from "next/navigation";

export default function ProfilePage() {
  const { token, user, isAdmin, hasSubscription } = useAuth();
  const router = useRouter();
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [emailDigest, setEmailDigest] = useState(true);
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    api.listTags().then((res) => {
      if (res.ok) setTags(res.data as Tag[]);
    });
  }, [token, router]);

  const toggleTopic = (id: string) => {
    setSelectedTopics((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const handleSave = async () => {
    if (!token) return;
    setSaving(true);
    setError("");
    setSuccess("");
    const res = await api.updatePreferences(token, {
      topicIds: selectedTopics,
      emailDigest,
      language,
    });
    if (res.ok) {
      setSuccess("Preferences saved");
    } else {
      setError((res.data as any)?.message || "Failed to save");
    }
    setSaving(false);
  };

  if (!token || !user) return null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Profile</h1>
      <p className="text-muted-foreground mb-8">Your account & preferences</p>

      {/* User info */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-20">Name</span>
            <span className="text-sm">
              {user.firstName} {user.lastName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-20">Email</span>
            <span className="text-sm">{user.email}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-20">Role</span>
            <div className="flex gap-1">
              {isAdmin && <Badge>ADMIN</Badge>}
              {!isAdmin && <Badge variant="secondary">SUBSCRIBER</Badge>}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium w-20">Plan</span>
            {hasSubscription ? (
              <Badge className="bg-emerald-600">Premium</Badge>
            ) : (
              <Badge variant="secondary">Free</Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Content Preferences</CardTitle>
          <CardDescription>
            Choose topics you&apos;re interested in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <span className="ml-2 text-sm">{error}</span>
            </Alert>
          )}
          {success && (
            <Alert className="border-emerald-500">
              <Check className="h-4 w-4 text-emerald-500" />
              <span className="ml-2 text-sm">{success}</span>
            </Alert>
          )}

          <div>
            <label className="text-sm font-medium mb-2 block">Topics</label>
            <div className="flex flex-wrap gap-2">
              {tags.map((t) => (
                <Badge
                  key={t.id}
                  variant={
                    selectedTopics.includes(t.id) ? "default" : "outline"
                  }
                  className="cursor-pointer"
                  onClick={() => toggleTopic(t.id)}
                >
                  {t.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="emailDigest"
              checked={emailDigest}
              onChange={(e) => setEmailDigest(e.target.checked)}
              className="h-4 w-4"
            />
            <label htmlFor="emailDigest" className="text-sm">
              Receive weekly email digest
            </label>
          </div>

          <div>
            <label className="text-sm font-medium mb-1 block">Language</label>
            <Input
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="max-w-[120px]"
              placeholder="en"
            />
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Preferences"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
