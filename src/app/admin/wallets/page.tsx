'use client';

import React from 'react';
import { Wallet } from 'lucide-react';

export default function AdminWallets() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Wallets</h1>
        <p className="mt-1 text-sm text-muted-foreground">Gestiona las billeteras digitales del sistema</p>
      </div>
      <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/50 bg-card/50 p-16">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
            <Wallet className="h-8 w-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">Gestión de Wallets</h3>
          <p className="mt-1 text-sm text-muted-foreground">Próximamente podrás ver y administrar todas las billeteras digitales del sistema.</p>
        </div>
      </div>
    </div>
  );
}
