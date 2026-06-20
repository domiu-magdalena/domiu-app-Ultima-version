'use client';

export function BusinessCardSkeletonPremium() {
  return (
    <div className="animate-pulse">
      <div className="mb-3 aspect-[4/3] w-full rounded-2xl bg-gradient-to-br from-muted to-muted/50" />
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 shrink-0 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-3/4 rounded-lg bg-muted" />
          <div className="h-3 w-1/2 rounded-lg bg-muted/70" />
          <div className="h-3 w-1/3 rounded-lg bg-muted/50" />
        </div>
      </div>
    </div>
  );
}

export function CategoryChipSkeleton() {
  return (
    <div className="flex shrink-0 flex-col items-center gap-2 animate-pulse">
      <div className="h-[72px] w-[72px] rounded-2xl bg-muted" />
      <div className="h-3 w-14 rounded-lg bg-muted" />
    </div>
  );
}

export function PromoCarouselSkeleton() {
  return (
    <div className="h-48 animate-pulse rounded-3xl bg-gradient-to-br from-muted to-muted/50 sm:h-56" />
  );
}

export function SectionSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-muted" />
          <div className="h-5 w-28 rounded-lg bg-muted" />
        </div>
        <div className="h-8 w-20 rounded-2xl bg-muted" />
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2">
        <BusinessCardSkeletonPremium />
        <BusinessCardSkeletonPremium />
        <BusinessCardSkeletonPremium />
      </div>
    </div>
  );
}
