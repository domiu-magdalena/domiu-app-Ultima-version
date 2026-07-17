'use client';

import React, { useCallback, useEffect, useRef, useState, memo } from 'react';
import { useMaps } from '@/contexts/MapsContext';
import { AlertTriangle, Loader2, Search } from 'lucide-react';

export interface PlaceResult {
  lat: number;
  lng: number;
  formattedAddress: string;
  placeId?: string;
  city?: string;
  state?: string;
  neighborhood?: string;
  country?: string;
  postalCode?: string;
}

interface PlacesAutocompleteProps {
  onPlaceSelected: (place: PlaceResult) => void;
  onValueChange?: (value: string) => void;
  placeholder?: string;
  defaultValue?: string;
  className?: string;
}

function parseComponents(
  components: google.maps.GeocoderAddressComponent[] | undefined,
  result: PlaceResult,
) {
  for (const component of components || []) {
    if (component.types.includes('locality')) result.city = component.long_name;
    if (!result.city && component.types.includes('administrative_area_level_2')) result.city = component.long_name;
    if (component.types.includes('administrative_area_level_1')) result.state = component.long_name;
    if (
      component.types.includes('neighborhood') ||
      component.types.includes('sublocality') ||
      component.types.includes('sublocality_level_1')
    ) {
      result.neighborhood = component.long_name;
    }
    if (component.types.includes('country')) result.country = component.long_name;
    if (component.types.includes('postal_code')) result.postalCode = component.long_name;
  }
  return result;
}

function PlacesAutocompleteInner({
  onPlaceSelected,
  onValueChange,
  placeholder = 'Buscar dirección...',
  defaultValue = '',
  className = '',
}: PlacesAutocompleteProps) {
  const { isReady, error } = useMaps();
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const [value, setValue] = useState(defaultValue);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  useEffect(() => {
    if (!isReady || !inputRef.current || autocompleteRef.current || !window.google?.maps?.places) return;

    const santaMartaBounds = new google.maps.LatLngBounds(
      { lat: 11.05, lng: -74.35 },
      { lat: 11.35, lng: -73.95 },
    );
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['address'],
      componentRestrictions: { country: 'co' },
      fields: ['address_components', 'formatted_address', 'geometry', 'place_id'],
      bounds: santaMartaBounds,
      strictBounds: false,
    });

    listenerRef.current = autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current?.getPlace();
      if (!place?.geometry?.location) return;

      const result = parseComponents(place.address_components, {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng(),
        formattedAddress: place.formatted_address || inputRef.current?.value || '',
        placeId: place.place_id || undefined,
      });

      setValue(result.formattedAddress);
      onValueChange?.(result.formattedAddress);
      onPlaceSelected(result);
    });

    return () => {
      listenerRef.current?.remove();
      listenerRef.current = null;
      autocompleteRef.current = null;
    };
  }, [isReady, onPlaceSelected, onValueChange]);

  const handleManualGeocode = useCallback(async () => {
    if (!value.trim() || !isReady || !window.google?.maps) return;
    setLoading(true);
    try {
      const geocoder = new google.maps.Geocoder();
      const response = await geocoder.geocode({
        address: value,
        region: 'co',
        componentRestrictions: { country: 'CO' },
      });
      const first = response.results?.[0];
      if (!first) return;

      const result = parseComponents(first.address_components, {
        lat: first.geometry.location.lat(),
        lng: first.geometry.location.lng(),
        formattedAddress: first.formatted_address,
        placeId: first.place_id || undefined,
      });
      setValue(result.formattedAddress);
      onValueChange?.(result.formattedAddress);
      onPlaceSelected(result);
    } finally {
      setLoading(false);
    }
  }, [value, isReady, onPlaceSelected, onValueChange]);

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            setValue(nextValue);
            onValueChange?.(nextValue);
          }}
          placeholder={placeholder}
          autoComplete="street-address"
          inputMode="text"
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void handleManualGeocode();
            }
          }}
          className="w-full rounded-xl border border-border bg-muted/50 py-2.5 pl-10 pr-10 text-sm text-foreground outline-none transition-all focus:border-primary/50 focus:ring-1 focus:ring-primary/20"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {!isReady && (
        <div className="flex items-start gap-2 rounded-xl border border-warning/20 bg-warning/5 px-3 py-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
          <span>
            {error || 'Google Maps no está disponible.'} Puedes escribir la dirección y usar el GPS para capturar coordenadas exactas.
          </span>
        </div>
      )}
    </div>
  );
}

export const PlacesAutocomplete = memo(PlacesAutocompleteInner);
