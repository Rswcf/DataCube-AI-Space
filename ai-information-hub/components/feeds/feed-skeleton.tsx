"use client";

import { Skeleton } from "@/components/ui/skeleton";

function SkeletonCard() {
  return (
    <div className="px-3 py-3 sm:px-4 sm:py-4">
      <div className="flex gap-2 sm:gap-3">
        {/* Avatar */}
        <Skeleton className="h-10 w-10 sm:h-12 sm:w-12 shrink-0 rounded-full" />

        <div className="flex-1 min-w-0 space-y-2">
          {/* Author line */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-20 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>

          {/* Content lines */}
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>

          {/* Tags */}
          <div className="flex gap-2">
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-3 w-18" />
            <Skeleton className="h-3 w-12" />
          </div>

          {/* Source */}
          <Skeleton className="h-3 w-32" />
        </div>
      </div>
    </div>
  );
}

export function FeedSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="divide-y divide-border">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
