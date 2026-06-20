'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

interface SectionHeaderProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  viewAllHref?: string;
}

export function SectionHeader({ icon, title, description, viewAllHref }: SectionHeaderProps) {
  return (
    <motion.div
      className="mb-4 flex items-end justify-between"
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 text-primary shadow-sm">
          {icon}
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
      </div>
      {viewAllHref && (
        <Link
          href={viewAllHref}
          className="inline-flex items-center gap-1 rounded-2xl border border-border/30 bg-card/50 px-3.5 py-2 text-xs font-semibold text-muted-foreground backdrop-blur-sm transition-all hover:border-primary/30 hover:text-primary hover:shadow-sm"
        >
          Ver todo
          <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </motion.div>
  );
}
