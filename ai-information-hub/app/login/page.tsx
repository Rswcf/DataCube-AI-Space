"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Brain,
  Sparkles,
  Cpu,
  TrendingUp,
  Lightbulb,
  Youtube,
  ArrowRight,
  Languages,
  Zap,
} from "lucide-react";

const translations = {
  de: {
    badge: "KI-gestützte Intelligenz",
    title1: "Data Cube",
    title2: "AI Hub",
    tagline:
      "Ihr intelligentes Gateway zu kuratierten KI-Nachrichten, Investment-Insights und praktischen Tipps – täglich von KI analysiert und kuratiert.",
    features: [
      "Tech-Durchbrüche",
      "Investment-News",
      "Praktische Tipps",
      "KI-Videos",
    ],
    aiPipeline: "40+ Quellen täglich",
    aiProcess: "KI-kuratiert zu den wichtigsten Insights",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ mehr",
    ],
    welcome: "Willkommen",
    enterCredentials: "Entdecken Sie die neuesten KI-Trends und Insights",
    enter: "Eintreten",
    newsletterPitch: "Erhalte täglich KI-News in 3 Minuten — kostenlos",
    emailPlaceholder: "E-Mail-Adresse",
  },
  en: {
    badge: "AI-Powered Intelligence",
    title1: "Data Cube",
    title2: "AI Hub",
    tagline:
      "Your intelligent gateway to curated AI news, investment insights, and practical tips – analyzed daily by AI.",
    features: [
      "Tech Breakthroughs",
      "Investment News",
      "Practical Tips",
      "AI Videos",
    ],
    aiPipeline: "40+ sources daily",
    aiProcess: "AI-curated to key insights",
    sourceCategories: [
      "MIT Tech Review",
      "Crunchbase",
      "Financial Times",
      "YouTube",
      "Reddit",
      "& 30+ more",
    ],
    welcome: "Welcome",
    enterCredentials: "Discover the latest AI trends and insights",
    enter: "Enter",
    newsletterPitch: "Get daily AI news in 3 minutes — free",
    emailPlaceholder: "Email address",
  },
};

function NeuralNetwork() {
  const nodes = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2,
      })),
    []
  );

  return (
    <svg
      aria-hidden="true"
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid slice"
    >
      {nodes.slice(0, 15).map((node, i) => {
        const target = nodes[(i + 3) % nodes.length];
        return (
          <line
            key={`l-${node.id}`}
            x1={`${node.x}%`}
            y1={`${node.y}%`}
            x2={`${target.x}%`}
            y2={`${target.y}%`}
            stroke="currentColor"
            strokeWidth="0.1"
            className="text-primary/30"
            style={{
              animation: `neural-pulse 3s ease-in-out infinite`,
              animationDelay: `${node.delay}s`,
            }}
          />
        );
      })}
      {nodes.map((node) => (
        <circle
          key={`n-${node.id}`}
          cx={`${node.x}%`}
          cy={`${node.y}%`}
          r="0.4"
          className="fill-primary/50"
          style={{
            animation: `neural-pulse 3s ease-in-out infinite`,
            animationDelay: `${node.delay}s`,
          }}
        />
      ))}
    </svg>
  );
}

function FloatingParticles() {
  const particles = useMemo(
    () =>
      Array.from({ length: 15 }, (_, i) => ({
        id: i,
        left: 10 + Math.random() * 80,
        duration: 8 + Math.random() * 4,
        delay: Math.random() * 5,
      })),
    []
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute w-1 h-1 rounded-full bg-accent/60"
          style={{
            left: `${particle.left}%`,
            animation: `float-up ${particle.duration}s linear infinite`,
            animationDelay: `${particle.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function LoginPage() {
  const [language, setLanguage] = useState<"de" | "en">("de");
  const [email, setEmail] = useState("");
  const router = useRouter();

  const t = translations[language];

  const handleEnter = () => {
    // Subscribe if email provided (fire-and-forget)
    if (email.trim()) {
      fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), language }),
      }).catch(() => {});
    }
    // Set visited cookie (expires in 30 days)
    document.cookie = "visited=true; path=/; max-age=2592000";
    router.push("/");
  };

  const featureIcons = [Cpu, TrendingUp, Lightbulb, Youtube];

  return (
    <div className="login-page min-h-screen flex flex-col lg:flex-row bg-background">
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .login-page *, .login-page *::before, .login-page *::after {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
          }
        }
      `}</style>
      {/* Left Hero Panel - Hidden on mobile, visible on lg+ */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden bg-gradient-to-br from-background via-secondary/30 to-background">
        <NeuralNetwork />
        <FloatingParticles />

        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-16">
          {/* AI Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur-sm w-fit mb-8">
            <span className="relative flex h-2 w-2">
              <span className="absolute h-full w-full rounded-full bg-accent animate-ping" />
              <span className="relative h-2 w-2 rounded-full bg-accent" />
            </span>
            <span className="text-sm font-medium">{t.badge}</span>
          </div>

          {/* Title */}
          <h1 className="text-5xl xl:text-6xl font-bold mb-6">
            {t.title1}
            <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              {t.title2}
            </span>
          </h1>

          {/* Tagline */}
          <p className="text-lg xl:text-xl text-muted-foreground max-w-md mb-8">
            {t.tagline}
          </p>

          {/* Feature Pills */}
          <div className="flex flex-wrap gap-3 mb-8">
            {featureIcons.map((Icon, i) => (
              <div
                key={i}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-card/50 border border-border backdrop-blur-sm"
              >
                <Icon aria-hidden="true" className="w-4 h-4 text-primary" />
                <span className="text-sm">{t.features[i]}</span>
              </div>
            ))}
          </div>

          {/* AI Pipeline Stats */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/20 border border-accent/30">
                <Zap aria-hidden="true" className="w-4 h-4 text-accent" />
                <span className="text-sm font-medium">{t.aiPipeline}</span>
              </div>
              <ArrowRight aria-hidden="true" className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                {t.aiProcess}
              </span>
            </div>

            {/* Source Categories */}
            <div className="flex flex-wrap gap-2">
              {t.sourceCategories.map((category, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded bg-secondary/50 text-muted-foreground"
                >
                  {category}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Hero - Visible only on mobile */}
      <div className="lg:hidden relative h-[35vh] bg-gradient-to-b from-primary/10 to-background p-6 flex flex-col justify-end overflow-hidden">
        <NeuralNetwork />
        <div className="relative z-10">
          <h1 className="text-3xl font-bold mb-2">
            {t.title1}{" "}
            <span className="text-primary">{t.title2}</span>
          </h1>
          <p className="text-sm text-muted-foreground line-clamp-2">
            {t.tagline}
          </p>
        </div>
      </div>

      {/* Right Login Panel */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md relative">
          {/* Glow effect */}
          <div
            className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 rounded-3xl blur-xl opacity-50"
            style={{ animation: "glow-pulse 4s ease-in-out infinite" }}
          />

          {/* Card */}
          <div className="relative bg-card/80 backdrop-blur-xl border border-border/50 rounded-2xl p-8 shadow-2xl">
            {/* AI Icon */}
            <div className="flex justify-center mb-8">
              <div className="relative w-20 h-20">
                <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-2xl animate-pulse opacity-30 blur-lg" />
                <div className="relative w-full h-full bg-gradient-to-br from-primary to-accent rounded-2xl flex items-center justify-center shadow-lg">
                  <Brain aria-hidden="true" className="w-10 h-10 text-primary-foreground" />
                  <Sparkles aria-hidden="true" className="absolute -top-1 -right-1 w-5 h-5 text-accent-foreground" />
                </div>
              </div>
            </div>

            {/* Welcome */}
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold mb-2">{t.welcome}</h2>
              <p className="text-muted-foreground text-sm">
                {t.enterCredentials}
              </p>
            </div>

            {/* Newsletter Capture */}
            <div className="mb-6">
              <p className="text-sm text-muted-foreground mb-3 text-center">{t.newsletterPitch}</p>
              <input
                type="email"
                placeholder={t.emailPlaceholder}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-background px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary mb-2"
              />
            </div>

            {/* Enter Button */}
            <button
              onClick={handleEnter}
              className="w-full h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-lg shadow-primary/25 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none"
            >
              <span>{t.enter}</span>
              <ArrowRight aria-hidden="true" className="w-5 h-5" />
            </button>

            {/* Language Toggle */}
            <div className="flex justify-center mt-6">
              <button
                onClick={() => setLanguage(language === "de" ? "en" : "de")}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:outline-none rounded"
              >
                <Languages aria-hidden="true" className="w-4 h-4" />
                {language === "de" ? "English" : "Deutsch"}
              </button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
