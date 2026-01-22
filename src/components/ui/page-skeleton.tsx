import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface PageSkeletonProps {
  variant?: 'dashboard' | 'card' | 'crm' | 'settings';
  className?: string;
}

export function PageSkeleton({ variant = 'dashboard', className }: PageSkeletonProps) {
  if (variant === 'card') {
    return (
      <div className={cn("w-full py-4 px-3 space-y-6 animate-fade-in", className)}>
        {/* Card Image */}
        <Skeleton className="w-full aspect-[3/2] rounded-2xl" />
        
        {/* Name & Title */}
        <div className="space-y-2 px-2">
          <Skeleton className="h-7 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
        
        {/* Contact Rows */}
        <div className="space-y-1">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex items-center gap-4 px-4 py-3">
              <Skeleton className="w-10 h-10 rounded-full" />
              <Skeleton className="h-4 flex-1" />
            </div>
          ))}
        </div>
        
        {/* Share Button */}
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>
    );
  }

  if (variant === 'crm') {
    return (
      <div className={cn("w-full py-4 px-3 space-y-4 animate-fade-in", className)}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-24" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
        
        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-20 rounded-full shrink-0" />
          ))}
        </div>
        
        {/* Contact Cards */}
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'settings') {
    return (
      <div className={cn("w-full py-4 px-3 space-y-4 animate-fade-in", className)}>
        {/* Header */}
        <div className="space-y-2">
          <Skeleton className="h-8 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
        
        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-card border border-border/50">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        
        {/* Settings Items */}
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="p-4 rounded-2xl bg-card border border-border/50 flex items-center gap-4">
              <Skeleton className="w-10 h-10 rounded-xl" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Dashboard variant (default)
  return (
    <div className={cn("w-full py-4 px-3 space-y-6 animate-fade-in", className)}>
      {/* Stats Row */}
      <div className="grid grid-cols-2 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="p-4 rounded-xl bg-card border border-border/50">
            <Skeleton className="h-4 w-20 mb-2" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
      
      {/* Chart Area */}
      <div className="p-4 rounded-xl bg-card border border-border/50">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
      
      {/* List Section */}
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        {[1, 2, 3].map(i => (
          <div key={i} className="p-3 rounded-lg bg-card border border-border/50 flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 animate-pulse">
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    </div>
  );
}

export function StatSkeleton() {
  return (
    <div className="p-4 rounded-xl bg-card border border-border/50 animate-pulse">
      <Skeleton className="h-4 w-20 mb-2" />
      <Skeleton className="h-8 w-16" />
    </div>
  );
}
