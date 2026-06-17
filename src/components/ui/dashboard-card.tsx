'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  action?: {
    label: string;
    onClick?: () => void;
  };
  children: React.ReactNode;
  className?: string;
}

export function DashboardCard({ title, action, children, className }: DashboardCardProps) {
  return (
    <div className={cn('group rounded-2xl border border-border bg-card shadow-card transition-all duration-300 hover:shadow-lg', className)}>
      <div className="flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-transparent via-primary/[0.02] to-transparent px-6 py-4">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {action && (
          <button
            onClick={action.onClick}
            className="flex items-center gap-1 text-xs font-medium text-muted-foreground transition-all duration-200 hover:text-foreground group-hover:gap-1.5"
          >
            {action.label}
            <ChevronRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        )}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}
