/* @vitest-environment jsdom */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DomiAssistant } from '@/components/domi/DomiAssistant';

const authMock = vi.hoisted(() => ({
  current: {
    profile: null as null | Record<string, unknown>,
    isLoading: true,
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authMock.current,
}));

vi.mock('@/contexts/CartContext', () => ({
  useCart: () => ({
    businessId: null,
    items: [],
  }),
}));

describe('DomiAssistant hook lifecycle', () => {
  beforeEach(() => {
    authMock.current = { profile: null, isLoading: true };

    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  it('keeps the same hook order while an authenticated profile is restored', async () => {
    const { rerender } = render(<DomiAssistant />);
    expect(screen.queryByRole('button', { name: 'Abrir Domi' })).toBeNull();

    authMock.current = {
      isLoading: false,
      profile: {
        id: 'customer-1',
        email: 'cliente@domiu.test',
        role: 'customer',
        admin_role: null,
        first_name: 'Kevin',
        last_name: 'Leiva',
        phone: null,
        status: 'active',
        avatar_url: null,
        verified_at: null,
        phone_verified_at: null,
        email_verified_at: null,
        last_login_at: null,
        metadata: null,
        created_at: '2026-07-19T00:00:00.000Z',
        updated_at: '2026-07-19T00:00:00.000Z',
      },
    };

    expect(() => rerender(<DomiAssistant />)).not.toThrow();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Abrir Domi' })).toBeTruthy();
    });
  });
});
