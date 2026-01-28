import { TrendingUp, Users, Zap } from "lucide-react";

export function HeroSection() {
  const currentDate = new Date();
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "long",
    day: "numeric",
  };
  const formattedDate = currentDate.toLocaleDateString("en-US", options);

  return (
    <section className="relative overflow-hidden border-b border-border bg-background py-16 sm:py-24">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute -bottom-1/2 right-0 h-[400px] w-[400px] rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-2">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-sm font-medium text-foreground">
              Updated: {formattedDate}
            </span>
          </div>

          {/* Title */}
          <h1 className="mx-auto max-w-4xl text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
            AI Intelligence{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Weekly Digest
            </span>
          </h1>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-pretty text-lg text-muted-foreground">
            Curated insights on AI technology advancements, market movements, and practical implementation strategies for the Analytics team.
          </p>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-3">
            <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/80">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">12+</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Tech Breakthroughs
              </p>
            </div>

            <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-accent/50 hover:bg-card/80">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                <Users className="h-6 w-6 text-accent" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">$2.8B</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Weekly AI Funding
              </p>
            </div>

            <div className="group rounded-xl border border-border bg-card p-6 transition-all hover:border-primary/50 hover:bg-card/80">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <Zap className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-3xl font-bold text-foreground">8</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Actionable Tips
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
