'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  Bot,
  BrainCircuit,
  Check,
  ChevronDown,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { DomiUMark } from '@/components/brand/DomiULogo';

type ChatMessage = {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
};

const ROLE_COPY: Record<string, { title: string; greeting: string; suggestions: string[] }> = {
  customer: {
    title: 'Domi para clientes',
    greeting:
      'Hola, soy Domi. Puedo ayudarte a elegir productos, explicar precios y seguir tus pedidos.',
    suggestions: [
      'Recomiéndame algo según mis pedidos',
      '¿Cómo va mi último pedido?',
      'Explícame la tarifa de servicio',
    ],
  },
  business: {
    title: 'Domi para comercios',
    greeting:
      'Hola, soy Domi. Puedo revisar tu catálogo, inventario, ventas y estado operativo.',
    suggestions: [
      'Revisa mi inventario y catálogo',
      '¿Cuánto he vendido en productos?',
      '¿Cómo abro o cierro el comercio?',
    ],
  },
  courier: {
    title: 'Domi para repartidores',
    greeting:
      'Hola, soy Domi. Puedo explicarte tus ganancias, saldo, jornada y domicilios.',
    suggestions: [
      'Explícame mi saldo con DomiU',
      '¿Cuánto gané hoy?',
      '¿Cómo cierro mi jornada?',
    ],
  },
  admin: {
    title: 'Domi para administración',
    greeting:
      'Hola, soy Domi. Puedo resumir la operación, explicar finanzas y revisar liquidaciones.',
    suggestions: [
      'Dame el resumen operativo de hoy',
      '¿Cuánto ganó DomiU hoy?',
      'Explícame las liquidaciones pendientes',
    ],
  },
};

function roleKey(role: string | undefined) {
  if (!role) return 'customer';
  if (role === 'business') return 'business';
  if (role === 'courier') return 'courier';
  if (role.includes('admin')) return 'admin';
  return 'customer';
}

export function DomiAssistant() {
  const pathname = usePathname();
  const { profile, loading: authLoading } = useAuth();
  const [open, setOpen] = useState(false);
  const [expandedPrivacy, setExpandedPrivacy] = useState(false);
  const [allowMemory, setAllowMemory] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  const key = roleKey(profile?.role);
  const copy = ROLE_COPY[key];
  const hidden =
    authLoading ||
    !profile ||
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/registro') ||
    pathname.startsWith('/recuperar');

  useEffect(() => {
    if (!profile?.id) return;
    const memoryKey = `domi-memory-consent:${profile.id}`;
    setAllowMemory(window.localStorage.getItem(memoryKey) === 'true');
    setMessages([
      {
        id: 'domi-greeting',
        sender: 'assistant',
        content: copy.greeting,
      },
    ]);
    setSuggestions(copy.suggestions);
    setConversationId(undefined);
  }, [copy.greeting, copy.suggestions, profile?.id]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const statusLabel = useMemo(() => {
    if (sending) return 'Analizando información autorizada…';
    return allowMemory ? 'Memoria personalizada activa' : 'Memoria desactivada';
  }, [allowMemory, sending]);

  if (hidden) return null;

  const changeMemory = (enabled: boolean) => {
    setAllowMemory(enabled);
    if (profile?.id) {
      window.localStorage.setItem(`domi-memory-consent:${profile.id}`, String(enabled));
    }
  };

  const send = async (messageValue?: string) => {
    const message = (messageValue ?? input).trim();
    if (!message || sending) return;
    setInput('');
    setError('');
    setMessages((current) => [
      ...current,
      { id: `user-${crypto.randomUUID()}`, sender: 'user', content: message },
    ]);
    setSending(true);
    try {
      const response = await fetch('/api/domi/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message, conversationId, allowMemory }),
      });
      const payload = (await response.json()) as {
        error?: string;
        reply?: string;
        conversationId?: string;
        suggestions?: string[];
      };
      if (!response.ok || !payload.reply) {
        throw new Error(payload.error || 'Domi no pudo responder');
      }
      setConversationId(payload.conversationId);
      setSuggestions(payload.suggestions ?? []);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${crypto.randomUUID()}`,
          sender: 'assistant',
          content: payload.reply || '',
        },
      ]);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo conectar con Domi');
    } finally {
      setSending(false);
    }
  };

  const reset = () => {
    setConversationId(undefined);
    setMessages([{ id: 'domi-greeting', sender: 'assistant', content: copy.greeting }]);
    setSuggestions(copy.suggestions);
    setError('');
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-[calc(5.5rem+env(safe-area-inset-bottom))] right-4 z-[80] flex h-16 w-16 items-center justify-center rounded-full border-4 border-white bg-slate-950 text-white shadow-2xl transition hover:scale-105 lg:bottom-6 lg:right-6 ${
          open ? 'pointer-events-none scale-90 opacity-0' : 'opacity-100'
        }`}
        aria-label="Abrir Domi"
      >
        <DomiUMark className="h-11 w-11" />
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 ring-2 ring-white">
          <Sparkles className="h-3 w-3" />
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[90] flex items-end justify-end bg-black/35 p-0 backdrop-blur-[2px] sm:p-4 lg:items-end lg:p-6">
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            aria-label="Cerrar Domi"
          />
          <section className="relative flex h-[min(760px,94dvh)] w-full flex-col overflow-hidden rounded-t-[2rem] border bg-card shadow-2xl sm:max-w-[430px] sm:rounded-[2rem]">
            <header className="bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950 px-5 py-5 text-white">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10">
                    <DomiUMark className="h-10 w-10" />
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-xl font-black">Domi</h2>
                      <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-black text-emerald-200">
                        IA
                      </span>
                    </div>
                    <p className="text-xs text-slate-300">{copy.title}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={reset}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:text-white"
                    aria-label="Nueva conversación"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/10 text-slate-300 hover:text-white"
                    aria-label="Cerrar"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-300" />
                {statusLabel}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto bg-muted/25 px-4 py-4">
              <div className="space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[86%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                        message.sender === 'user'
                          ? 'rounded-br-md bg-primary text-primary-foreground'
                          : 'rounded-bl-md border bg-card text-foreground'
                      }`}
                    >
                      {message.sender === 'assistant' && (
                        <div className="mb-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-[0.12em] text-primary">
                          <Bot className="h-3.5 w-3.5" /> Domi
                        </div>
                      )}
                      {message.content}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start">
                    <div className="rounded-2xl rounded-bl-md border bg-card px-4 py-3 text-sm text-muted-foreground shadow-sm">
                      <span className="inline-flex items-center gap-2">
                        <BrainCircuit className="h-4 w-4 animate-pulse text-primary" />
                        Revisando tus datos…
                      </span>
                    </div>
                  </div>
                )}
                <div ref={endRef} />
              </div>

              {suggestions.length > 0 && !sending && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {suggestions.slice(0, 3).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => void send(suggestion)}
                      className="rounded-full border bg-card px-3 py-2 text-left text-xs font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              {error && (
                <p className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
                  {error}
                </p>
              )}
            </div>

            <div className="border-t bg-card p-4">
              <button
                type="button"
                onClick={() => setExpandedPrivacy((value) => !value)}
                className="mb-3 flex w-full items-center justify-between rounded-xl bg-muted/50 px-3 py-2 text-xs"
              >
                <span className="flex items-center gap-2 font-bold">
                  <ShieldCheck className="h-4 w-4 text-primary" /> Privacidad y memoria
                </span>
                <ChevronDown
                  className={`h-4 w-4 transition ${expandedPrivacy ? 'rotate-180' : ''}`}
                />
              </button>
              {expandedPrivacy && (
                <label className="mb-3 flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-xs leading-5">
                  <button
                    type="button"
                    onClick={() => changeMemory(!allowMemory)}
                    className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border ${
                      allowMemory
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-background'
                    }`}
                    aria-pressed={allowMemory}
                  >
                    {allowMemory && <Check className="h-3.5 w-3.5" />}
                  </button>
                  <span>
                    Permitir que Domi recuerde preferencias no sensibles que yo diga explícitamente. Puedo desactivarlo cuando quiera.
                  </span>
                </label>
              )}

              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void send();
                }}
                className="flex items-end gap-2"
              >
                <textarea
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void send();
                    }
                  }}
                  rows={1}
                  maxLength={1500}
                  placeholder="Pregúntale algo a Domi…"
                  className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl border bg-background px-4 py-3 text-sm outline-none focus:border-primary"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground disabled:opacity-50"
                  aria-label="Enviar mensaje"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
              <p className="mt-2 text-center text-[10px] text-muted-foreground">
                Domi puede equivocarse. Verifica decisiones financieras o administrativas.
              </p>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
