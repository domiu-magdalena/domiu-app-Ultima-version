'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  trend?: {
    value: string;
    positive: boolean;
  };
  className?: string;
  gradient?: 'primary' | 'success' | 'warning' | 'info';
}

export function StatCard({ icon, label, value, trend, className, gradient = 'primary' }: StatCardProps) {
  const gradients = {
    primary: 'from-primary/10 to-primary/5 text-primary',
    success: 'from-success/10 to-success/5 text-success',
    warning: 'from-warning/10 to-warning/5 text-warning',
    info: 'from-info/10 to-info/5 text-info',
  };

  return (
    <div
      className={cn(
        'group rounded-2xl border border-border bg-card p-5 shadow-card transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5',
        className,
      )}
    >
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br transition-transform duration-300 group-hover:scale-110',
            gradients[gradient],
          )}
        >
          {icon}
        </div>
        <div className="flex-1">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-bold tracking-tight text-foreground transition-all duration-300 group-hover:translate-x-0.5">
            {value}
          </p>
          {trend && (
            <p
              className={cn(
                'mt-1 flex items-center gap-0.5 text-xs font-medium',
                trend.positive ? 'text-success' : 'text-destructive',
              )}
            >
              {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              {trend.value}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
