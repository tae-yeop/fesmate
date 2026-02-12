"use client";

import { cn } from "@/lib/utils";

export type StatusBadgeVariant =
  | "live"
  | "soon"
  | "ended"
  | "recruiting"
  | "canceled"
  | "postponed"
  | "dday";

interface StatusBadgeProps {
  variant: StatusBadgeVariant;
  children: React.ReactNode;
  className?: string;
  noPulse?: boolean;
  size?: "sm" | "md";
}

const variantStyles: Record<StatusBadgeVariant, string> = {
  live: "bg-red-500 text-white",
  soon: "bg-amber-500 text-white",
  ended: "bg-stone-400 text-white",
  recruiting: "bg-emerald-500 text-white",
  canceled: "bg-stone-500 text-white",
  postponed: "bg-orange-500 text-white",
  dday: "bg-violet-600 text-white",
};

const sizeStyles: Record<"sm" | "md", string> = {
  sm: "px-2 py-0.5 text-[10px]",
  md: "px-2.5 py-1 text-xs",
};

export function StatusBadge({
  variant,
  children,
  className,
  noPulse = false,
  size = "sm",
}: StatusBadgeProps) {
  const isLive = variant === "live";
  
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 font-bold rounded-full whitespace-nowrap shadow-sm",
        variantStyles[variant],
        sizeStyles[size],
        isLive && !noPulse && "animate-pulse",
        className
      )}
    >
      {isLive && (
        <span 
          className="w-1.5 h-1.5 rounded-full bg-white"
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export function LiveBadge({ className }: { className?: string }) {
  return (
    <StatusBadge variant="live" className={className}>
      LIVE
    </StatusBadge>
  );
}

export function DDayBadge({ 
  daysLeft, 
  className 
}: { 
  daysLeft: number;
  className?: string;
}) {
  if (daysLeft < 0) {
    return (
      <StatusBadge variant="ended" className={className}>
        종료
      </StatusBadge>
    );
  }
  
  if (daysLeft === 0) {
    return (
      <StatusBadge variant="live" className={className}>
        D-DAY
      </StatusBadge>
    );
  }
  
  const variant = daysLeft <= 7 ? "soon" : "dday";
  
  return (
    <StatusBadge variant={variant} className={className}>
      D-{daysLeft}
    </StatusBadge>
  );
}
