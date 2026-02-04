"use client";

import { useState } from "react";
import { Play, Eye, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import Image from "next/image";

interface VideoEmbedProps {
  videoId: string;
  thumbnailUrl?: string;
  duration?: string;
  viewCount?: string;
  title?: string;
}

/**
 * YouTube video embed component with lazy loading.
 *
 * Displays a thumbnail with play button initially, then loads the
 * embedded iframe when clicked to optimize page load performance.
 */
export function VideoEmbed({
  videoId,
  thumbnailUrl,
  duration,
  viewCount,
  title,
}: VideoEmbedProps) {
  const [isPlaying, setIsPlaying] = useState(false);

  // Generate thumbnail URL if not provided
  const thumbnail =
    thumbnailUrl || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  const handlePlay = () => {
    setIsPlaying(true);
  };

  if (isPlaying) {
    return (
      <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black">
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title || "YouTube video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 w-full h-full"
        />
      </div>
    );
  }

  return (
    <div
      className="relative w-full aspect-video rounded-xl overflow-hidden bg-secondary cursor-pointer group"
      onClick={handlePlay}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && handlePlay()}
      aria-label={`Play video: ${title || "YouTube video"}`}
    >
      {/* Thumbnail */}
      <Image
        src={thumbnail}
        alt={title || "Video thumbnail"}
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className="object-cover transition-transform duration-300 group-hover:scale-105"
      />

      {/* Overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />

      {/* Play button */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-600 flex items-center justify-center shadow-lg transition-transform duration-300 group-hover:scale-110">
          <Play className="w-8 h-8 md:w-10 md:h-10 text-white fill-white ml-1" />
        </div>
      </div>

      {/* Video badge */}
      <div className="absolute top-3 left-3">
        <Badge className="bg-red-600 text-white border-0 font-semibold">
          Video
        </Badge>
      </div>

      {/* Stats */}
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {viewCount && (
            <div className="flex items-center gap-1 text-white/90 text-sm">
              <Eye className="w-4 h-4" />
              <span>{viewCount}</span>
            </div>
          )}
          {duration && (
            <div className="flex items-center gap-1 text-white/90 text-sm">
              <Clock className="w-4 h-4" />
              <span>{duration}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Compact video badge for inline display.
 */
export function VideoBadge({
  duration,
  viewCount,
}: {
  duration?: string;
  viewCount?: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Badge className="bg-red-600 text-white border-0 text-xs font-semibold">
        Video
      </Badge>
      {duration && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {duration}
        </span>
      )}
      {viewCount && (
        <span className="text-xs text-muted-foreground flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {viewCount}
        </span>
      )}
    </div>
  );
}
