export interface DeliveryZone {
  id: string;
  name: string;
  aliases?: string[];
  description?: string;
}

export const DELIVERY_ZONES: DeliveryZone[] = [
  { id: 'rodadero_sur', name: 'Rodadero Sur', aliases: ['rodadero', 'rodadero sur'] },
  { id: 'villa_marbella', name: 'Villa Marbella', aliases: ['villa marbella', 'villa marbella mnz'] },
  { id: 'sierra_morena', name: 'Sierra Morena', aliases: ['sierra morena'] },
  { id: 'villa_bella', name: 'Villa Bella', aliases: ['villa bella'] },
  { id: 'mallorca', name: 'Mallorca', aliases: ['mallorca'] },
  { id: 'santa_cruz', name: 'Santa Cruz', aliases: ['santa cruz'] },
  { id: 'centro', name: 'Centro', aliases: ['centro'] },
  { id: 'bastidas', name: 'Bastidas', aliases: ['bastidas'] },
  { id: 'el_yucal', name: 'El Yucal', aliases: ['yucal', 'el yucal'] },
];

export function findZoneByText(text: string): DeliveryZone | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const z of DELIVERY_ZONES) {
    if (t.includes(z.name.toLowerCase())) return z;
    if (z.aliases) {
      for (const a of z.aliases) if (t.includes(a.toLowerCase())) return z;
    }
  }
  return null;
}
