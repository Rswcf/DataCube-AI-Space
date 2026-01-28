"use client";

import { useState } from "react";
import { Share, Check } from "lucide-react";
import { useSettings } from "@/lib/settings-context";

interface ShareButtonProps {
  title: string;
  text: string;
  url?: string;
}

export function ShareButton({ title, text, url }: ShareButtonProps) {
  const { t } = useSettings();
  const [copied, setCopied] = useState(false);

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();

    const shareData: ShareData = {
      title,
      text,
      ...(url && { url }),
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or share failed silently
      }
    } else {
      // Fallback: copy text to clipboard
      const copyText = url ? `${text}\n\n${url}` : text;
      await navigator.clipboard.writeText(copyText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button
      onClick={handleShare}
      className="flex items-center gap-1.5 rounded-full px-2 py-1.5 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
      title={t("share")}
    >
      {copied ? (
        <Check className="h-4 w-4 text-accent" />
      ) : (
        <Share className="h-4 w-4" />
      )}
      {copied && (
        <span className="text-xs text-accent">{t("copiedToClipboard")}</span>
      )}
    </button>
  );
}
