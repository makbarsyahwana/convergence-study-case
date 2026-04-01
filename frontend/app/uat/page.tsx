"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Play,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
  FlaskConical,
  RotateCcw,
} from "lucide-react";

interface TestResult {
  name: string;
  expectedStatus: number;
  actualStatus: number | null;
  passed: boolean | null;
  response: unknown;
  running: boolean;
  extraChecks?: { label: string; passed: boolean }[];
}

interface TestFolder {
  name: string;
  description: string;
  tests: TestResult[];
  expanded: boolean;
}

const WEBHOOK_ARTICLE = {
  event: "entry.create",
  model: "article",
  entry: {
    id: 9999,
    title: "UAT Webhook Premium Article",
    slug: "uat-webhook-premium-article",
    body: "<p>This article was created via webhook for UAT testing.</p>",
    excerpt: "UAT webhook test article",
    type: "ARTICLE",
    isPremium: true,
    thumbnailUrl: null,
    videoUrl: null,
    readTimeMinutes: 5,
    publishedAt: new Date().toISOString(),
  },
};

function createInitialFolders(): TestFolder[] {
  return [
    {
      name: "1 — Health",
      description: "Health check endpoint",
      expanded: false,
      tests: [
        { name: "GET /health", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
      ],
    },
    {
      name: "2 — Auth",
      description: "Register & login flows — tokens auto-saved for later folders",
      expanded: false,
      tests: [
        { name: "Register new user", expectedStatus: 201, actualStatus: null, passed: null, response: null, running: false },
        { name: "Register duplicate email", expectedStatus: 409, actualStatus: null, passed: null, response: null, running: false },
        { name: "Register invalid data", expectedStatus: 400, actualStatus: null, passed: null, response: null, running: false },
        { name: "Login as admin", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Login as premium user", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Login as free user", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Login wrong password", expectedStatus: 401, actualStatus: null, passed: null, response: null, running: false },
      ],
    },
    {
      name: "3 — User",
      description: "Profile and preferences (requires auth tokens)",
      expanded: false,
      tests: [
        { name: "GET /users/me (premium token)", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET /users/me (no auth)", expectedStatus: 401, actualStatus: null, passed: null, response: null, running: false },
        { name: "PUT /users/me/preferences", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
      ],
    },
    {
      name: "4 — Content Public",
      description: "Content listing, search, filters, and public access gating",
      expanded: false,
      tests: [
        { name: "GET /content (list)", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET /content?page=2&limit=2", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET /content?search=nutrition", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET /content?tagSlug=mental-health", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET /content?type=VIDEO", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET /content?isPremium=true", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET free slug (full body)", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET premium slug (no auth → gated)", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET non-existent slug", expectedStatus: 404, actualStatus: null, passed: null, response: null, running: false },
      ],
    },
    {
      name: "5 — Content Gating ⭐",
      description: "Core subscription gating: free→gated, premium→full, admin→full",
      expanded: false,
      tests: [
        { name: "Free user → premium content", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false, extraChecks: [] },
        { name: "Premium user → premium content", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false, extraChecks: [] },
        { name: "Admin → premium content", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false, extraChecks: [] },
        { name: "Free user → free content", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false, extraChecks: [] },
      ],
    },
    {
      name: "6 — Subscription",
      description: "Get, upgrade, cancel subscription",
      expanded: false,
      tests: [
        { name: "GET /subscriptions/me (premium)", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "POST /subscriptions/upgrade (free→MONTHLY)", expectedStatus: 201, actualStatus: null, passed: null, response: null, running: false },
        { name: "DELETE /subscriptions/cancel", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET /subscriptions/me (no auth)", expectedStatus: 401, actualStatus: null, passed: null, response: null, running: false },
      ],
    },
    {
      name: "7 — Tags",
      description: "Tag listing and detail",
      expanded: false,
      tests: [
        { name: "GET /tags", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "GET /tags/nutrition", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
      ],
    },
    {
      name: "8 — CMS Sync",
      description: "Webhook lifecycle + full sync access control",
      expanded: false,
      tests: [
        { name: "Webhook: create premium article", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Verify: premium user reads new article", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false, extraChecks: [] },
        { name: "Verify: free user reads new article", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false, extraChecks: [] },
        { name: "Webhook: update article", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Webhook: unpublish article", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Webhook: publish article", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Webhook: delete article", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Webhook: unsupported model", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Full sync (admin)", expectedStatus: 200, actualStatus: null, passed: null, response: null, running: false },
        { name: "Full sync (no auth)", expectedStatus: 401, actualStatus: null, passed: null, response: null, running: false },
        { name: "Full sync (free user)", expectedStatus: 403, actualStatus: null, passed: null, response: null, running: false },
      ],
    },
  ];
}

export default function UATPage() {
  const [folders, setFolders] = useState<TestFolder[]>(createInitialFolders);
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [runningAll, setRunningAll] = useState(false);
  const [expandedResponse, setExpandedResponse] = useState<string | null>(null);

  const uatEmail = `uat-${Date.now()}@test.com`;

  const updateTest = (
    folderIdx: number,
    testIdx: number,
    update: Partial<TestResult>
  ) => {
    setFolders((prev) => {
      const next = [...prev];
      next[folderIdx] = {
        ...next[folderIdx],
        tests: next[folderIdx].tests.map((t, i) =>
          i === testIdx ? { ...t, ...update } : t
        ),
      };
      return next;
    });
  };

  const toggleFolder = (idx: number) => {
    setFolders((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, expanded: !f.expanded } : f))
    );
  };

  const runTest = useCallback(
    async (folderIdx: number, testIdx: number, currentTokens: Record<string, string>) => {
      updateTest(folderIdx, testIdx, { running: true, passed: null, actualStatus: null, response: null, extraChecks: [] });

      let res: { status: number; data: unknown; ok: boolean };
      let extraChecks: { label: string; passed: boolean }[] = [];

      try {
        // Folder 0: Health
        if (folderIdx === 0) {
          res = await api.health();
        }
        // Folder 1: Auth
        else if (folderIdx === 1) {
          if (testIdx === 0) {
            res = await api.register({ email: uatEmail, password: "UatTest123!", firstName: "UAT", lastName: "User" });
            if (res.ok) currentTokens.newUser = (res.data as any).accessToken;
          } else if (testIdx === 1) {
            res = await api.register({ email: uatEmail, password: "UatTest123!", firstName: "UAT", lastName: "User" });
          } else if (testIdx === 2) {
            res = await api.register({ email: "bad", password: "x", firstName: "", lastName: "" });
          } else if (testIdx === 3) {
            res = await api.login({ email: "admin@healthfulforu.com", password: "Admin123!" });
            if (res.ok) currentTokens.admin = (res.data as any).accessToken;
          } else if (testIdx === 4) {
            res = await api.login({ email: "premium@example.com", password: "Premium123!" });
            if (res.ok) currentTokens.premium = (res.data as any).accessToken;
          } else if (testIdx === 5) {
            res = await api.login({ email: "free@example.com", password: "FreeUser123!" });
            if (res.ok) currentTokens.free = (res.data as any).accessToken;
          } else {
            res = await api.login({ email: "admin@healthfulforu.com", password: "wrong" });
          }
        }
        // Folder 2: User
        else if (folderIdx === 2) {
          if (testIdx === 0) {
            res = await api.getProfile(currentTokens.premium || "");
          } else if (testIdx === 1) {
            res = await api.getProfile("");
          } else {
            res = await api.updatePreferences(currentTokens.premium || "", { topicIds: [], emailDigest: true, language: "en" });
          }
        }
        // Folder 3: Content Public
        else if (folderIdx === 3) {
          if (testIdx === 0) res = await api.listContent({});
          else if (testIdx === 1) res = await api.listContent({ page: "2", limit: "2" });
          else if (testIdx === 2) res = await api.listContent({ search: "nutrition" });
          else if (testIdx === 3) res = await api.listContent({ tagSlug: "mental-health" });
          else if (testIdx === 4) res = await api.listContent({ type: "VIDEO" });
          else if (testIdx === 5) res = await api.listContent({ isPremium: "true" });
          else if (testIdx === 6) {
            res = await api.getContent("10-simple-ways-improve-daily-nutrition");
            if (res.ok) {
              const d = res.data as any;
              extraChecks = [
                { label: "_gated === false", passed: d._gated === false },
                { label: "body is not null", passed: d.body !== null },
              ];
            }
          } else if (testIdx === 7) {
            res = await api.getContent("understanding-anxiety-comprehensive-guide");
            if (res.ok) {
              const d = res.data as any;
              extraChecks = [
                { label: "_gated === true", passed: d._gated === true },
                { label: "body is null", passed: d.body === null },
              ];
            }
          } else {
            res = await api.getContent("this-slug-does-not-exist");
          }
        }
        // Folder 4: Content Gating
        else if (folderIdx === 4) {
          const premiumSlug = "understanding-anxiety-comprehensive-guide";
          const freeSlug = "10-simple-ways-improve-daily-nutrition";
          if (testIdx === 0) {
            res = await api.getContent(premiumSlug, currentTokens.free);
            if (res.ok) {
              const d = res.data as any;
              extraChecks = [
                { label: "_gated === true", passed: d._gated === true },
                { label: "body is null", passed: d.body === null },
                { label: "videoUrl is null", passed: d.videoUrl === null },
              ];
            }
          } else if (testIdx === 1) {
            res = await api.getContent(premiumSlug, currentTokens.premium);
            if (res.ok) {
              const d = res.data as any;
              extraChecks = [
                { label: "_gated === false", passed: d._gated === false },
                { label: "body has content", passed: !!d.body },
              ];
            }
          } else if (testIdx === 2) {
            res = await api.getContent(premiumSlug, currentTokens.admin);
            if (res.ok) {
              const d = res.data as any;
              extraChecks = [
                { label: "_gated === false", passed: d._gated === false },
                { label: "body has content", passed: !!d.body },
              ];
            }
          } else {
            res = await api.getContent(freeSlug, currentTokens.free);
            if (res.ok) {
              const d = res.data as any;
              extraChecks = [
                { label: "_gated === false", passed: d._gated === false },
                { label: "body has content", passed: !!d.body },
              ];
            }
          }
        }
        // Folder 5: Subscription
        else if (folderIdx === 5) {
          if (testIdx === 0) res = await api.getSubscription(currentTokens.premium || "");
          else if (testIdx === 1) res = await api.upgradeSubscription(currentTokens.free || "", "MONTHLY");
          else if (testIdx === 2) res = await api.cancelSubscription(currentTokens.free || "");
          else res = await api.getSubscription("");
        }
        // Folder 6: Tags
        else if (folderIdx === 6) {
          if (testIdx === 0) res = await api.listTags();
          else res = await api.getTag("nutrition");
        }
        // Folder 7: CMS Sync
        else if (folderIdx === 7) {
          if (testIdx === 0) {
            res = await api.webhookSync(WEBHOOK_ARTICLE);
          } else if (testIdx === 1) {
            res = await api.getContent("uat-webhook-premium-article", currentTokens.premium);
            if (res.ok) {
              const d = res.data as any;
              extraChecks = [
                { label: "_gated === false", passed: d._gated === false },
                { label: "body has content", passed: !!d.body },
              ];
            }
          } else if (testIdx === 2) {
            res = await api.getContent("uat-webhook-premium-article", currentTokens.free);
            if (res.ok) {
              const d = res.data as any;
              extraChecks = [
                { label: "_gated === true", passed: d._gated === true },
                { label: "body is null", passed: d.body === null },
              ];
            }
          } else if (testIdx === 3) {
            res = await api.webhookSync({ ...WEBHOOK_ARTICLE, event: "entry.update", entry: { ...WEBHOOK_ARTICLE.entry, title: "Updated UAT Article" } });
          } else if (testIdx === 4) {
            res = await api.webhookSync({ event: "entry.unpublish", model: "article", entry: { id: 9999 } });
          } else if (testIdx === 5) {
            res = await api.webhookSync({ event: "entry.publish", model: "article", entry: { ...WEBHOOK_ARTICLE.entry } });
          } else if (testIdx === 6) {
            res = await api.webhookSync({ event: "entry.delete", model: "article", entry: { id: 9999 } });
          } else if (testIdx === 7) {
            res = await api.webhookSync({ event: "entry.create", model: "category", entry: { id: 1, name: "Test" } });
          } else if (testIdx === 8) {
            res = await api.fullSync(currentTokens.admin || "");
          } else if (testIdx === 9) {
            res = await api.fullSync("");
          } else {
            res = await api.fullSync(currentTokens.free || "");
          }
        } else {
          res = { status: 0, data: null, ok: false };
        }
      } catch (err: any) {
        res = { status: 0, data: { error: err.message }, ok: false };
      }

      const statusMatch = res.status === folders[folderIdx].tests[testIdx].expectedStatus;
      const allExtraPass = extraChecks.length === 0 || extraChecks.every((c) => c.passed);
      const passed = statusMatch && allExtraPass;

      updateTest(folderIdx, testIdx, {
        running: false,
        actualStatus: res.status,
        passed,
        response: res.data,
        extraChecks,
      });

      return currentTokens;
    },
    [folders, uatEmail]
  );

  const runFolder = async (folderIdx: number) => {
    setFolders((prev) =>
      prev.map((f, i) => (i === folderIdx ? { ...f, expanded: true } : f))
    );
    let currentTokens = { ...tokens };
    for (let i = 0; i < folders[folderIdx].tests.length; i++) {
      currentTokens = await runTest(folderIdx, i, currentTokens);
    }
    setTokens(currentTokens);
  };

  const runAll = async () => {
    setRunningAll(true);
    let currentTokens = { ...tokens };
    for (let fi = 0; fi < folders.length; fi++) {
      setFolders((prev) =>
        prev.map((f, i) => (i === fi ? { ...f, expanded: true } : f))
      );
      for (let ti = 0; ti < folders[fi].tests.length; ti++) {
        currentTokens = await runTest(fi, ti, currentTokens);
      }
      setTokens(currentTokens);
    }
    setRunningAll(false);
  };

  const reset = () => {
    setFolders(createInitialFolders());
    setTokens({});
    setExpandedResponse(null);
  };

  const totalTests = folders.reduce((s, f) => s + f.tests.length, 0);
  const passed = folders.reduce(
    (s, f) => s + f.tests.filter((t) => t.passed === true).length,
    0
  );
  const failed = folders.reduce(
    (s, f) => s + f.tests.filter((t) => t.passed === false).length,
    0
  );
  const pending = totalTests - passed - failed;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FlaskConical className="h-7 w-7" /> UAT Dashboard
          </h1>
          <p className="text-muted-foreground mt-1">
            Run all API test scenarios from TEST-GUIDE.md
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="mr-1 h-4 w-4" /> Reset
          </Button>
          <Button onClick={runAll} disabled={runningAll}>
            {runningAll ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Play className="mr-1 h-4 w-4" />
            )}
            Run All ({totalTests} tests)
          </Button>
        </div>
      </div>

      {/* Summary bar */}
      <div className="mb-6 flex gap-4">
        <Badge variant="outline" className="text-sm px-3 py-1">
          Total: {totalTests}
        </Badge>
        <Badge className="bg-emerald-600 text-sm px-3 py-1">
          Passed: {passed}
        </Badge>
        {failed > 0 && (
          <Badge variant="destructive" className="text-sm px-3 py-1">
            Failed: {failed}
          </Badge>
        )}
        {pending > 0 && (
          <Badge variant="secondary" className="text-sm px-3 py-1">
            Pending: {pending}
          </Badge>
        )}
      </div>

      {/* Token status */}
      <Card className="mb-6">
        <CardContent className="py-3">
          <p className="text-xs text-muted-foreground mb-1 font-medium">
            Stored Tokens (populated by Auth folder)
          </p>
          <div className="flex flex-wrap gap-2">
            {["admin", "premium", "free", "newUser"].map((k) => (
              <Badge
                key={k}
                variant={tokens[k] ? "default" : "outline"}
                className="text-xs"
              >
                {k}: {tokens[k] ? "✓" : "—"}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Folders */}
      <div className="space-y-3">
        {folders.map((folder, fi) => {
          const folderPassed = folder.tests.filter((t) => t.passed === true).length;
          const folderFailed = folder.tests.filter((t) => t.passed === false).length;
          const folderTotal = folder.tests.length;

          return (
            <Card key={folder.name}>
              <CardHeader
                className="cursor-pointer py-3 px-4"
                onClick={() => toggleFolder(fi)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {folder.expanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                    <CardTitle className="text-base">{folder.name}</CardTitle>
                    <span className="text-xs text-muted-foreground">
                      {folder.description}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {folderPassed > 0 && (
                      <Badge className="bg-emerald-600 text-xs">
                        {folderPassed}/{folderTotal}
                      </Badge>
                    )}
                    {folderFailed > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {folderFailed} failed
                      </Badge>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        runFolder(fi);
                      }}
                    >
                      <Play className="h-3 w-3 mr-1" /> Run
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {folder.expanded && (
                <CardContent className="pt-0 px-4 pb-4">
                  <div className="space-y-1">
                    {folder.tests.map((test, ti) => {
                      const responseKey = `${fi}-${ti}`;
                      return (
                        <div key={ti}>
                          <div
                            className="flex items-center justify-between py-2 px-3 rounded hover:bg-muted/50 cursor-pointer text-sm"
                            onClick={() =>
                              setExpandedResponse(
                                expandedResponse === responseKey
                                  ? null
                                  : responseKey
                              )
                            }
                          >
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {test.running ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-500 shrink-0" />
                              ) : test.passed === true ? (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                              ) : test.passed === false ? (
                                <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                              ) : (
                                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
                              )}
                              <span className="truncate">{test.name}</span>
                              {test.extraChecks &&
                                test.extraChecks.length > 0 && (
                                  <div className="flex gap-1 ml-2">
                                    {test.extraChecks.map((c, ci) => (
                                      <Badge
                                        key={ci}
                                        variant={
                                          c.passed ? "default" : "destructive"
                                        }
                                        className="text-[10px] px-1.5 py-0"
                                      >
                                        {c.label}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                            </div>
                            <div className="flex items-center gap-2 shrink-0 ml-2">
                              <Badge variant="outline" className="text-xs font-mono">
                                expect: {test.expectedStatus}
                              </Badge>
                              {test.actualStatus !== null && (
                                <Badge
                                  variant={
                                    test.actualStatus === test.expectedStatus
                                      ? "default"
                                      : "destructive"
                                  }
                                  className="text-xs font-mono"
                                >
                                  got: {test.actualStatus}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {expandedResponse === responseKey &&
                            test.response !== null && (
                              <div className="mx-3 mb-2 rounded bg-muted p-3 overflow-auto max-h-64">
                                <pre className="text-xs font-mono whitespace-pre-wrap">
                                  {JSON.stringify(test.response, null, 2)}
                                </pre>
                              </div>
                            )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
