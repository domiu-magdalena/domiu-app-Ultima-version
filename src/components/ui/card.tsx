'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  variant?: 'default' | 'glass' | 'outlined';
}

export function Card({ children, className, hover, onClick, variant = 'default' }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        'rounded-2xl border transition-all duration-300',
        variant === 'default' && 'border-border bg-card shadow-card',
        variant === 'glass' && 'border-white/10 bg-white/5 backdrop-blur-xl shadow-lg',
        variant === 'outlined' && 'border-2 border-dashed border-muted-foreground/20 bg-transparent',
        hover && 'hover:shadow-xl hover:-translate-y-1 hover:border-primary/20',
        onClick && 'cursor-pointer',
        className,
      )}
    >
      {children}
    </div>
  );
}
