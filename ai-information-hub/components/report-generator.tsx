"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { FileText, Download, Loader2, X, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useSettings } from "@/lib/settings-context";
import ReactMarkdown from "react-markdown";

interface ReportGeneratorProps {
  weekId: string;
}

export function ReportGenerator({ weekId }: ReportGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [reportContent, setReportContent] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const { language, t } = useSettings();

  // Cleanup abort controller on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const generateReport = useCallback(async () => {
    setIsGenerating(true);
    setIsDone(false);
    setReportContent("");
    setError(null);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const timeoutId = setTimeout(() => controller.abort(), 120000);

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekId, language }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error("Failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No reader");

      const decoder = new TextDecoder();
      let content = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        content += decoder.decode(value, { stream: true });
        setReportContent(content);
      }

      setIsDone(true);
    } catch (err) {
      const isAbort = err instanceof DOMException && err.name === "AbortError";
      if (!isAbort) setError(t("reportError"));
    } finally {
      clearTimeout(timeoutId);
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  }, [weekId, language, t]);

  const handleOpen = () => {
    setIsOpen(true);
    generateReport();
  };

  const handleClose = () => {
    abortControllerRef.current?.abort();
    setIsOpen(false);
    setIsGenerating(false);
  };

  const exportMarkdown = () => {
    const blob = new Blob([reportContent], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-report-${weekId}-${language}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportDocx = async () => {
    const { Document, Packer, Paragraph, TextRun, HeadingLevel } = await import("docx");

    const paragraphs: InstanceType<typeof Paragraph>[] = [];
    const lines = reportContent.split("\n");

    for (const line of lines) {
      if (line.startsWith("# ")) {
        paragraphs.push(new Paragraph({
          text: line.replace("# ", ""),
          heading: HeadingLevel.HEADING_1,
          spacing: { before: 400, after: 200 },
        }));
      } else if (line.startsWith("## ")) {
        paragraphs.push(new Paragraph({
          text: line.replace("## ", ""),
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 300, after: 150 },
        }));
      } else if (line.startsWith("### ")) {
        paragraphs.push(new Paragraph({
          text: line.replace("### ", ""),
          heading: HeadingLevel.HEADING_3,
          spacing: { before: 200, after: 100 },
        }));
      } else if (line.startsWith("- ")) {
        paragraphs.push(new Paragraph({
          children: [new TextRun(line.replace("- ", ""))],
          bullet: { level: 0 },
        }));
      } else if (line.startsWith("**") && line.endsWith("**")) {
        paragraphs.push(new Paragraph({
          children: [new TextRun({ text: line.replace(/\*\*/g, ""), bold: true })],
          spacing: { before: 100, after: 50 },
        }));
      } else if (line.trim()) {
        paragraphs.push(new Paragraph({
          children: [new TextRun(line)],
          spacing: { after: 100 },
        }));
      }
    }

    const doc = new Document({
      sections: [{ children: paragraphs }],
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-report-${weekId}-${language}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <>
      {/* Floating Button — bottom-left, opposite the chat widget */}
      <button
        onClick={handleOpen}
        className={cn(
          "fixed z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-ring",
          "bottom-20 left-4 md:bottom-6 md:left-6"
        )}
        aria-label={t("reportGenerate")}
      >
        <FileText className="h-6 w-6" aria-hidden="true" />
      </button>

      {/* Report Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="relative flex flex-col w-full max-w-3xl h-[85vh] mx-4 rounded-2xl border border-border bg-background shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h2 className="font-display text-xl font-bold">{t("reportTitle")}</h2>
              <Button
                variant="ghost"
                size="icon"
                className="h-11 w-11 focus-visible:ring-2 focus-visible:ring-ring"
                onClick={handleClose}
                aria-label={t("reportClose")}
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </Button>
            </div>

            {/* Content */}
            <ScrollArea className="flex-1 px-6 py-4">
              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown>{reportContent}</ReactMarkdown>
                </div>
              )}
              {isGenerating && (
                <div className="flex items-center gap-2 mt-4 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  <span className="text-sm">{t("reportGenerating")}</span>
                </div>
              )}
            </ScrollArea>

            {/* Footer with export buttons */}
            {isDone && (
              <div className="flex items-center gap-3 border-t border-border px-6 py-4">
                <Button
                  onClick={exportMarkdown}
                  variant="outline"
                  className="gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  {t("reportExportMd")}
                </Button>
                <Button
                  onClick={exportDocx}
                  variant="outline"
                  className="gap-2 focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <FileDown className="h-4 w-4" aria-hidden="true" />
                  {t("reportExportDocx")}
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
