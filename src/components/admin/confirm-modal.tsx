'use client';

import React, { useState } from 'react';
import { ReAuthModal } from './re-auth-modal';
import { AlertTriangle } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  requireReauth?: boolean;
}

export function ConfirmModal({
  open, onClose, onConfirm, title, description,
  confirmLabel = 'Confirmar', variant = 'danger',
  requireReauth = false,
}: ConfirmModalProps) {
  const [showReauth, setShowReauth] = useState(false);

  if (!open && !showReauth) return null;

  const handleConfirm = () => {
    if (requireReauth) {
      setShowReauth(true);
    } else {
      onConfirm();
      onClose();
    }
  };

  const handleReauthVerified = () => {
    setShowReauth(false);
    onConfirm();
    onClose();
  };

  const variantStyles = {
    danger: { icon: 'text-destructive', bg: 'bg-destructive/10', btn: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' },
    warning: { icon: 'text-warning', bg: 'bg-warning/10', btn: 'bg-warning text-warning-foreground hover:bg-warning/90' },
    info: { icon: 'text-info', bg: 'bg-info/10', btn: 'bg-info text-info-foreground hover:bg-info/90' },
  };

  const s = variantStyles[variant];

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-dropdown animate-in fade-in zoom-in-95">
            <div className="mb-5 flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${s.bg}`}>
                <AlertTriangle className={`h-5 w-5 ${s.icon}`} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-foreground">{title}</h3>
                <p className="text-xs text-muted-foreground">{description}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-border bg-background/50 px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors disabled:opacity-50 ${s.btn}`}
              >
                {confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
      <ReAuthModal
        open={showReauth}
        onClose={() => setShowReauth(false)}
        onVerified={handleReauthVerified}
        title="Re-autenticación requerida"
        description="Esta acción crítica requiere que ingreses nuevamente tu contraseña."
      />
    </>
  );
}
