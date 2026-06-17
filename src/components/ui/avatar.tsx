'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { User } from 'lucide-react';

interface AvatarProps {
  src?: string;
  alt?: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-12 w-12 text-base',
  xl: 'h-16 w-16 text-xl',
};

export function Avatar({ src, alt, initials, size = 'md', className }: AvatarProps) {
  if (src) {
    return (
      <div className={cn('relative overflow-hidden rounded-full', sizeClasses[size], className)}>
        <Image
          src={src}
          alt={alt ?? ''}
          fill
          sizes="96px"
          className="object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary',
        sizeClasses[size],
        className,
      )}
    >
      {initials ?? <User className="h-1/2 w-1/2" />}
    </div>
  );
}
