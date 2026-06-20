'use client';

import React, { useState } from 'react';
import { adminAuthService } from '@/services/admin-auth';
import { Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface ReAuthModalProps {
  open: boolean;
  onClose: () => void;
  onVerified: () => void;
  title?: string;
  description?: string;
}

export function ReAuthModal({ open, onClose, onVerified, title = 'Verificación de seguridad', description = 'Ingresa nuevamente tu contraseña para continuar con esta acción crítica.' }: ReAuthModalProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const ok = await adminAuthService.reauthenticate(password);
      if (ok) {
        setPassword('');
        onVerified();
      } else {
        setError('Contraseña incorrecta');
      }
    } catch {
      setError('Error al verificar. Intenta de nuevo.');
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-dropdown animate-in fade-in zoom-in-95">
        <div className="mb-5 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <Lock className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">{title}</h3>
            <p className="text-xs text-muted-foreground">{description}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tu contraseña actual"
              className="h-11 w-full rounded-xl border border-border bg-background/50 px-4 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/20"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-destructive/10 px-3 py-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-destructive" />
              <p className="text-xs text-destructive">{error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setPassword(''); setError(''); onClose(); }}
              className="flex-1 rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!password || loading}
              className="flex-1 rounded-xl bg-destructive px-4 py-2.5 text-sm font-medium text-destructive-foreground transition-colors hover:bg-destructive/90 disabled:opacity-50"
            >
              {loading ? 'Verificando...' : 'Verificar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
