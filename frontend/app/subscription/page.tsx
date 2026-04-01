"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api, type Subscription } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Alert } from "@/components/ui/alert";
import { Crown, Check, X, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const PLANS = [
  {
    name: "FREE",
    price: "$0",
    period: "forever",
    features: ["Browse free content", "Basic search", "Community access"],
  },
  {
    name: "MONTHLY",
    price: "$9.99",
    period: "/month",
    features: [
      "All free features",
      "Premium articles & videos",
      "Ad-free experience",
      "Cancel anytime",
    ],
  },
  {
    name: "YEARLY",
    price: "$89.99",
    period: "/year",
    features: [
      "All monthly features",
      "25% savings",
      "Priority support",
      "Early access to new content",
    ],
  },
];

export default function SubscriptionPage() {
  const { token, user, refreshProfile } = useAuth();
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!token) {
      router.push("/login");
      return;
    }
    api.getSubscription(token).then((res) => {
      if (res.ok) setSub(res.data);
      setLoading(false);
    });
  }, [token, router]);

  const handleUpgrade = async (plan: "MONTHLY" | "YEARLY") => {
    if (!token) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    const res = await api.upgradeSubscription(token, plan);
    if (res.ok) {
      setSub(res.data);
      setSuccess(`Upgraded to ${plan} plan!`);
      await refreshProfile();
    } else {
      setError((res.data as any)?.message || "Upgrade failed");
    }
    setActionLoading(false);
  };

  const handleCancel = async () => {
    if (!token) return;
    setActionLoading(true);
    setError("");
    setSuccess("");
    const res = await api.cancelSubscription(token);
    if (res.ok) {
      setSub(res.data);
      setSuccess("Subscription cancelled");
      await refreshProfile();
    } else {
      setError((res.data as any)?.message || "Cancel failed");
    }
    setActionLoading(false);
  };

  if (!token) return null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Subscription</h1>
      <p className="text-muted-foreground mb-8">
        Manage your plan and access premium content
      </p>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <span className="ml-2 text-sm">{error}</span>
        </Alert>
      )}
      {success && (
        <Alert className="mb-4 border-emerald-500">
          <Check className="h-4 w-4 text-emerald-500" />
          <span className="ml-2 text-sm">{success}</span>
        </Alert>
      )}

      {/* Current plan */}
      {!loading && sub && (
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Current Plan
              <Badge
                variant={sub.status === "ACTIVE" ? "default" : "secondary"}
              >
                {sub.status}
              </Badge>
            </CardTitle>
            <CardDescription>
              Plan: <strong>{sub.plan}</strong>
              {sub.endDate &&
                ` — Renews ${new Date(sub.endDate).toLocaleDateString()}`}
            </CardDescription>
          </CardHeader>
          {sub.plan !== "FREE" && sub.status === "ACTIVE" && (
            <CardContent>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                <X className="mr-1 h-4 w-4" />
                Cancel Subscription
              </Button>
            </CardContent>
          )}
        </Card>
      )}

      {/* Plan cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = sub?.plan === plan.name && sub?.status === "ACTIVE";
          return (
            <Card
              key={plan.name}
              className={isCurrent ? "border-primary border-2" : ""}
            >
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {plan.name !== "FREE" && (
                    <Crown className="h-5 w-5 text-yellow-500" />
                  )}
                  {plan.name}
                </CardTitle>
                <CardDescription>
                  <span className="text-2xl font-bold text-foreground">
                    {plan.price}
                  </span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 mb-4">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                ) : plan.name === "FREE" ? (
                  <Button variant="outline" disabled className="w-full">
                    Free Tier
                  </Button>
                ) : (
                  <Button
                    className="w-full"
                    onClick={() =>
                      handleUpgrade(plan.name as "MONTHLY" | "YEARLY")
                    }
                    disabled={actionLoading}
                  >
                    Upgrade to {plan.name}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
