"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/lib/settings-context";

interface EthicalAdsProps {
  placement?: "sidebar" | "feed";
}

export function EthicalAds({ placement = "sidebar" }: EthicalAdsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoaded = useRef(false);
  const { t } = useSettings();

  useEffect(() => {
    if (scriptLoaded.current) return;
    scriptLoaded.current = true;

    const existing = document.querySelector(
      'script[src="https://media.ethicalads.io/media/client/ethicalads.min.js"]'
    );
    if (existing) return;

    const script = document.createElement("script");
    script.src = "https://media.ethicalads.io/media/client/ethicalads.min.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  return (
    <div className="rounded-xl border border-border bg-secondary/50 p-3">
      <p className="mb-2 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">
        {t("advertisingNotice")}
      </p>
      <div
        ref={containerRef}
        className="[&_.ea-callout]:rounded-lg [&_.ea-callout]:border-0 [&_.ea-callout]:bg-transparent [&_.ea-callout]:text-foreground [&_.ea-content]:text-sm [&_.ea-content]:text-muted-foreground"
        data-ea-publisher="datacubeai"
        data-ea-type="image"
        data-ea-style={placement === "sidebar" ? "stickybox" : "image"}
      />
    </div>
  );
}
