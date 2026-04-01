const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export interface AuthResponse {
  accessToken: string;
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  roles?: { role: { name: string } }[];
  hasActiveSubscription?: boolean;
}

export interface ContentItem {
  id: string;
  title: string;
  slug: string;
  type: "ARTICLE" | "VIDEO";
  excerpt: string | null;
  thumbnailUrl: string | null;
  isPremium: boolean;
  publishedAt: string;
  viewCount: number;
  readTimeMinutes: number | null;
  author: { id: string; firstName: string; lastName: string } | null;
  tags: { tag: { id: string; name: string; slug: string } }[];
}

export interface ContentDetail extends ContentItem {
  body: string | null;
  videoUrl: string | null;
  _gated: boolean;
  _message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface Subscription {
  id: string;
  plan: "FREE" | "MONTHLY" | "YEARLY";
  status: "ACTIVE" | "CANCELLED" | "EXPIRED";
  startDate: string;
  endDate: string | null;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  _count?: { contents: number };
  contents?: ContentItem[];
}

interface RequestOptions {
  token?: string;
  headers?: Record<string, string>;
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions
): Promise<{ status: number; data: T; ok: boolean }> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...opts?.headers,
  };
  if (opts?.token) {
    headers["Authorization"] = `Bearer ${opts.token}`;
  }

  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data: T;
    try {
      data = await res.json();
    } catch {
      data = {} as T;
    }

    return { status: res.status, data, ok: res.ok };
  } catch (err: any) {
    return {
      status: 0,
      data: { error: "Network error", message: err?.message || "Cannot reach API server" } as unknown as T,
      ok: false,
    };
  }
}

export const api = {
  // Health
  health: () => request<{ status: string }>("GET", "/health"),

  // Auth
  register: (body: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
  }) => request<AuthResponse>("POST", "/auth/register", body),

  login: (body: { email: string; password: string }) =>
    request<AuthResponse>("POST", "/auth/login", body),

  // User
  getProfile: (token: string) =>
    request<User>("GET", "/users/me", undefined, { token }),

  updatePreferences: (
    token: string,
    body: { topicIds: string[]; emailDigest: boolean; language: string }
  ) => request<unknown>("PUT", "/users/me/preferences", body, { token }),

  // Content
  listContent: (
    params?: Record<string, string>,
    token?: string
  ) => {
    const qs = params
      ? "?" + new URLSearchParams(params).toString()
      : "";
    return request<PaginatedResponse<ContentItem>>(
      "GET",
      `/content${qs}`,
      undefined,
      { token }
    );
  },

  getContent: (slug: string, token?: string) =>
    request<ContentDetail>("GET", `/content/${slug}`, undefined, { token }),

  // Subscription
  getSubscription: (token: string) =>
    request<Subscription>("GET", "/subscriptions/me", undefined, { token }),

  upgradeSubscription: (token: string, plan: "MONTHLY" | "YEARLY") =>
    request<Subscription>("POST", "/subscriptions/upgrade", { plan }, { token }),

  cancelSubscription: (token: string) =>
    request<Subscription>("DELETE", "/subscriptions/cancel", undefined, { token }),

  // Tags
  listTags: () => request<Tag[]>("GET", "/tags"),

  getTag: (slug: string) => request<Tag>("GET", `/tags/${slug}`),

  // CMS Sync
  webhookSync: (
    body: unknown,
    headers?: Record<string, string>
  ) => request<{ status: string }>("POST", "/cms-sync/webhook", body, { headers }),

  fullSync: (token: string) =>
    request<{ synced: number; errors: number; total: number }>(
      "POST",
      "/cms-sync/full-sync",
      undefined,
      { token }
    ),
};
