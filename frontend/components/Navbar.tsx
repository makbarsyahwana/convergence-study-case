"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LogOut,
  User,
  CreditCard,
  FlaskConical,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, isAdmin, hasSubscription, logout, loading } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-bold">
            Healthfulforu
          </Link>
          <div className="hidden items-center gap-4 md:flex">
            <Link
              href="/"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Content
            </Link>
            <Link
              href="/uat"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <FlaskConical className="h-3.5 w-3.5" />
              UAT
            </Link>
          </div>
        </div>

        <div className="hidden items-center gap-3 md:flex">
          {loading ? null : user ? (
            <>
              {isAdmin && (
                <Badge variant="outline" className="text-xs">
                  ADMIN
                </Badge>
              )}
              {hasSubscription ? (
                <Badge className="bg-emerald-600 text-xs">Premium</Badge>
              ) : (
                <Badge variant="secondary" className="text-xs">
                  Free
                </Badge>
              )}
              <Link href="/profile">
                <Button variant="ghost" size="sm">
                  <User className="mr-1 h-4 w-4" />
                  {user.firstName}
                </Button>
              </Link>
              <Link href="/subscription">
                <Button variant="ghost" size="sm">
                  <CreditCard className="mr-1 h-4 w-4" />
                  Plan
                </Button>
              </Link>
              <Button variant="ghost" size="sm" onClick={logout}>
                <LogOut className="mr-1 h-4 w-4" />
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Login
                </Button>
              </Link>
              <Link href="/register">
                <Button size="sm">Register</Button>
              </Link>
            </>
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="md:hidden"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t px-4 py-3 md:hidden space-y-2">
          <Link href="/" className="block text-sm py-1" onClick={() => setMobileOpen(false)}>
            Content
          </Link>
          <Link href="/uat" className="block text-sm py-1" onClick={() => setMobileOpen(false)}>
            UAT Dashboard
          </Link>
          {user ? (
            <>
              <Link href="/profile" className="block text-sm py-1" onClick={() => setMobileOpen(false)}>
                Profile
              </Link>
              <Link href="/subscription" className="block text-sm py-1" onClick={() => setMobileOpen(false)}>
                Subscription
              </Link>
              <button className="block text-sm py-1 text-destructive" onClick={() => { logout(); setMobileOpen(false); }}>
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="block text-sm py-1" onClick={() => setMobileOpen(false)}>
                Login
              </Link>
              <Link href="/register" className="block text-sm py-1" onClick={() => setMobileOpen(false)}>
                Register
              </Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
