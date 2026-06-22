'use client';

import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  subtitle: string;
  trend?: { value: string; positive: boolean };
  colorClass: string;
}

export function LiveKpiCard({ icon, label, value, subtitle, trend, colorClass }: KpiCardProps) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:-translate-y-0.5">
      <div className={`absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full opacity-5 transition-all duration-500 group-hover:opacity-10 group-hover:scale-150 ${colorClass}`} />
      <div className="flex items-start justify-between">
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${colorClass} bg-opacity-10 shadow-lg`}>
          <div className="text-white">{icon}</div>
        </div>
        {trend && (
          <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${
            trend.positive ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend.positive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold tracking-tight text-foreground">{value}</p>
        <p className="mt-0.5 text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}
