'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadGoogleMaps, hasApiKey, isMapsLoaded } from '@/lib/maps/loader';

interface MapsContextValue {
  isReady: boolean;
  hasKey: boolean;
  error: string | null;
  maps: typeof google.maps | null;
}

const MapsContext = createContext<MapsContextValue>({
  isReady: false,
  hasKey: false,
  error: null,
  maps: null,
});

export function MapsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<MapsContextValue>({
    isReady: false,
    hasKey: hasApiKey(),
    error: null,
    maps: null,
  });

  useEffect(() => {
    let active = true;
    const configured = hasApiKey();

    if (!configured) {
      setState({
        isReady: false,
        hasKey: false,
        error: 'La API key de Google Maps no está configurada.',
        maps: null,
      });
      return () => {
        active = false;
      };
    }

    const initialize = async () => {
      try {
        if (!isMapsLoaded()) await loadGoogleMaps();
        if (!active) return;
        if (!window.google?.maps) throw new Error('Google Maps no quedó disponible en el navegador.');
        setState({
          isReady: true,
          hasKey: true,
          error: null,
          maps: window.google.maps,
        });
      } catch (cause) {
        if (!active) return;
        setState({
          isReady: false,
          hasKey: true,
          error: cause instanceof Error ? cause.message : 'No se pudo iniciar Google Maps.',
          maps: null,
        });
      }
    };

    void initialize();
    return () => {
      active = false;
    };
  }, []);

  return <MapsContext.Provider value={state}>{children}</MapsContext.Provider>;
}

export function useMaps(): MapsContextValue {
  return useContext(MapsContext);
}
