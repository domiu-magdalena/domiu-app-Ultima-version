'use client';

import React, { useRef, useState } from 'react';
import { Loader2, Send } from 'lucide-react';

interface MessageInputProps {
  onSend: (content: string) => Promise<void> | void;
  placeholder?: string;
}

export function MessageInput({ onSend, placeholder = 'Escribe un mensaje...' }: MessageInputProps) {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const content = text.trim();
    if (!content || sending) return;

    setSending(true);
    setError('');
    try {
      await onSend(content);
      setText('');
      inputRef.current?.focus();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'No se pudo enviar el mensaje. Intenta nuevamente.');
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-border bg-card p-3 pb-[calc(.75rem+env(safe-area-inset-bottom))] sm:p-4">
      {error && <p className="mb-2 rounded-lg bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">{error}</p>}
      <div className="flex items-end gap-2 rounded-2xl bg-muted p-1.5 ring-1 ring-border focus-within:ring-primary/40">
        <textarea
          ref={inputRef}
          rows={1}
          value={text}
          onChange={(event) => setText(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              event.currentTarget.form?.requestSubmit();
            }
          }}
          placeholder={placeholder}
          className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          maxLength={500}
          autoComplete="off"
          disabled={sending}
        />
        <button
          type="submit"
          disabled={!text.trim() || sending}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition active:scale-95 disabled:opacity-40"
          aria-label="Enviar mensaje"
        >
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </div>
    </form>
  );
}
