import { Sparkles } from "lucide-react";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-sm font-medium text-foreground">
              AI Weekly Intelligence
            </span>
          </div>

          {/* Info */}
          <div className="text-center sm:text-right">
            <p className="text-sm text-muted-foreground">
              Internal publication for Analytics Team
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              © {currentYear} · Updated Every Monday · Confidential
            </p>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 rounded-lg border border-border bg-card p-4 text-center">
          <p className="text-xs leading-relaxed text-muted-foreground">
            <span className="font-medium text-foreground">Disclaimer:</span> This
            digest is for informational purposes only. Investment data reflects
            publicly available information and should not be construed as
            financial advice. Always verify information from primary sources
            before making decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
