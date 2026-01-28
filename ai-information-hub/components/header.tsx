"use client";

import { useState } from "react";
import { Menu, X, Sparkles, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const currentDate = new Date();
  const weekNumber = Math.ceil(
    (currentDate.getTime() - new Date(currentDate.getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight text-foreground">
                AI Weekly Intelligence
              </h1>
              <p className="text-xs text-muted-foreground">Analytics Team</p>
            </div>
          </div>

          {/* Desktop Nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <a
              href="#tech"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Tech Progress
            </a>
            <a
              href="#investment"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Investment News
            </a>
            <a
              href="#tips"
              className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Hands-on Tips
            </a>
          </nav>

          {/* Week Badge */}
          <div className="hidden items-center gap-4 md:flex">
            <div className="flex items-center gap-2 rounded-full border border-border bg-secondary px-4 py-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Week {weekNumber}, {currentDate.getFullYear()}
              </span>
            </div>
          </div>

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="border-t border-border py-4 md:hidden">
            <nav className="flex flex-col gap-4">
              <a
                href="#tech"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Tech Progress
              </a>
              <a
                href="#investment"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Investment News
              </a>
              <a
                href="#tips"
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                onClick={() => setMobileMenuOpen(false)}
              >
                Hands-on Tips
              </a>
              <div className="flex items-center gap-2 pt-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-foreground">
                  Week {weekNumber}, {currentDate.getFullYear()}
                </span>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
